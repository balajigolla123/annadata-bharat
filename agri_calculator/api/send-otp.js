import crypto from 'crypto';

// Vercel Serverless Function: /api/send-otp
// Method: POST
// Body: { "phone": "9876543210" }
//
// Generates a 6-digit OTP and returns a signed token.
// Token is stateless: it carries a hash of the OTP + expiry, signed with OTP_SECRET.

const OTP_TTL_SECONDS = 5 * 60; // 5 minutes

function base64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function sha256Hex(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

function hmacHex(secret, msg) {
  return crypto.createHmac('sha256', secret).update(msg).digest('hex');
}

function generateOtp() {
  // crypto-secure 6 digit
  const n = crypto.randomInt(0, 1000000);
  return n.toString().padStart(6, '0');
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'Method not allowed' });
      return;
    }

    const secret = process.env.OTP_SECRET;
    if (!secret) {
      res.status(500).json({ ok: false, error: 'OTP_SECRET is not configured' });
      return;
    }

    const { phone } = (typeof req.body === 'string') ? JSON.parse(req.body) : (req.body || {});

    const phoneStr = String(phone || '').trim();
    if (!/^[0-9]{10}$/.test(phoneStr)) {
      res.status(400).json({ ok: false, error: 'Invalid phone number. Expect 10 digits.' });
      return;
    }

    const otp = generateOtp();
    const exp = Math.floor(Date.now() / 1000) + OTP_TTL_SECONDS;

    // Bind OTP to phone + expiry. You can also add user-agent/IP if you want stricter binding.
    const otpHash = sha256Hex(`${phoneStr}|${otp}|${exp}`);

    const payload = { phone: phoneStr, exp, otpHash };
    const payloadB64 = base64url(JSON.stringify(payload));
    const sig = hmacHex(secret, payloadB64);

    // token format: <payloadB64>.<sig>
    const token = `${payloadB64}.${sig}`;

    // TODO (production): send OTP via SMS gateway (Twilio/Firebase/AWS SNS/etc.)
    // For now, we only return it when OTP_DEBUG=true to help testing.
    const debug = String(process.env.OTP_DEBUG || '').toLowerCase() === 'true';

    res.status(200).json({
      ok: true,
      token,
      expiresAt: new Date(exp * 1000).toISOString(),
      ...(debug ? { debugOtp: otp } : {})
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Server error', details: String(e?.message || e) });
  }
}
