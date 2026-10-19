const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ==================== In-Memory OTP Store ====================
// phone -> { otp, expiresAt, attempts, createdAt }
const otpStore = new Map();

const OTP_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_ATTEMPTS = 5;

function isValidIndianPhone(phone) {
  return typeof phone === 'string' && /^\d{10}$/.test(phone);
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function saveOtp(phone, otp) {
  otpStore.set(phone, {
    otp,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
    createdAt: Date.now(),
  });
}

function verifyOtp(phone, otp) {
  const entry = otpStore.get(phone);
  if (!entry) return { ok: false, reason: 'OTP_NOT_FOUND' };

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(phone);
    return { ok: false, reason: 'OTP_EXPIRED' };
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(phone);
    return { ok: false, reason: 'TOO_MANY_ATTEMPTS' };
  }

  entry.attempts += 1;

  if (String(otp) !== String(entry.otp)) {
    otpStore.set(phone, entry);
    return { ok: false, reason: 'OTP_INVALID', attemptsLeft: Math.max(0, MAX_ATTEMPTS - entry.attempts) };
  }

  // Success: consume OTP
  otpStore.delete(phone);
  return { ok: true };
}

// ==================== Twilio / Mock Sender ====================
async function sendOtpSms({ phone, otp }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

  const body = `Your Agriculture Calculator OTP is: ${otp}. Valid for 30 minutes.`;

  // Mock mode if Twilio not configured
  if (!accountSid || !authToken || !twilioPhone) {
    console.warn('⚠️ Twilio credentials not configured. Using mock SMS.');
    console.log(`📱 [MOCK SMS] OTP sent to +91${phone}: ${otp}`);
    console.log(`   Message: "${body}"`);
    return {
      success: true,
      messageId: 'mock-' + Date.now(),
      mock: true,
      otp, // only for testing; frontend will show it in mock mode
    };
  }

  const twilio = require('twilio');
  const client = twilio(accountSid, authToken);

  const message = await client.messages.create({
    body,
    from: twilioPhone,
    to: `+91${phone}`,
  });

  console.log(`✅ OTP sent via Twilio to +91${phone}`);
  return { success: true, messageId: message.sid, mock: false };
}

// ==================== Health Check ====================
app.get('/', (req, res) => {
  res.json({
    message: '✅ Agriculture Calculator Backend is Running!',
    version: '1.1.0',
    endpoints: [
      'POST /api/request-otp  (NEW: generates + sends OTP)',
      'POST /api/verify-otp   (NEW: verifies OTP)',
      'POST /api/send-otp     (legacy: send provided otp)',
      'GET /',
    ],
  });
});

// ==================== NEW: Request OTP (Generate + Send) ====================
app.post('/api/request-otp', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!isValidIndianPhone(phone)) {
      return res.status(400).json({ error: 'Invalid phone number. Must be 10 digits.' });
    }

    const otp = generateOtp();
    saveOtp(phone, otp);

    const sent = await sendOtpSms({ phone, otp });

    return res.json({
      success: true,
      message: `OTP sent to +91${phone}`,
      messageId: sent.messageId,
      mock: sent.mock,
      otp: sent.mock ? sent.otp : undefined, // visible only in mock mode
    });
  } catch (error) {
    console.error('❌ request-otp error:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to request OTP' });
  }
});

// ==================== NEW: Verify OTP ====================
app.post('/api/verify-otp', (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!isValidIndianPhone(phone)) {
      return res.status(400).json({ error: 'Invalid phone number. Must be 10 digits.' });
    }

    if (!otp || !/^\d{6}$/.test(String(otp))) {
      return res.status(400).json({ error: 'OTP is required and must be 6 digits.' });
    }

    const result = verifyOtp(phone, otp);

    if (!result.ok) {
      const map = {
        OTP_NOT_FOUND: 'OTP not found. Please request OTP again.',
        OTP_EXPIRED: 'OTP expired. Please request OTP again.',
        TOO_MANY_ATTEMPTS: 'Too many wrong attempts. Please request OTP again.',
        OTP_INVALID: 'Invalid OTP. Please try again.',
      };

      return res.status(400).json({
        success: false,
        error: map[result.reason] || 'OTP verification failed.',
        attemptsLeft: result.attemptsLeft,
      });
    }

    return res.json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    console.error('❌ verify-otp error:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to verify OTP' });
  }
});

// ==================== Legacy: Send OTP (Provided by Client) ====================
// Keeps your old flow working, but now ALSO stores OTP in memory so verify works.
app.post('/api/send-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!isValidIndianPhone(phone)) {
      return res.status(400).json({ error: 'Invalid phone number. Must be 10 digits.' });
    }

    if (!otp || !/^\d{6}$/.test(String(otp))) {
      return res.status(400).json({ error: 'OTP is required and must be 6 digits.' });
    }

    // Store it so verify API works even with legacy send-otp
    saveOtp(phone, String(otp));

    const sent = await sendOtpSms({ phone, otp: String(otp) });

    return res.json({
      success: true,
      message: `OTP sent to +91${phone}`,
      messageId: sent.messageId,
      mock: sent.mock,
      otp: sent.mock ? sent.otp : undefined,
    });
  } catch (error) {
    console.error('❌ SMS Error:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to send OTP' });
  }
});

// ==================== Error Handler ====================
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ==================== Start Server ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('\n========================================');
  console.log('🌾 Agriculture Calculator Backend');
  console.log('========================================');
  console.log(`✅ Server running on: http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  if (accountSid) {
    console.log('📱 SMS Mode: Twilio (Real SMS)');
  } else {
    console.log('📱 SMS Mode: Mock (Development/Testing)');
    console.log('   ℹ️  To enable real SMS, configure Twilio in .env');
  }

  console.log('\n📚 API Documentation:');
  console.log('   GET  / - Health check');
  console.log('   POST /api/request-otp - Generate + Send OTP');
  console.log('   POST /api/verify-otp  - Verify OTP');
  console.log('   POST /api/send-otp    - Legacy: Send OTP (provided)');
  console.log('========================================\n');
});
