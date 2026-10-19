import crypto from 'crypto';

// Vercel Serverless Function: /api/verify-otp
// Method: POST
// Body: { "token": "...", "otp": "123456" }
// Returns: { ok:true, phone:"9876543210" } if valid.

function sha256Hex(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

function hmacHex(secret, msg) {
  return crypto.createHmac('sha256', secret).update(msg).digest('hex');
}

function base64urlDecode(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  return Buffer.from(b64 + pad, 'base64').toString('utf8');
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

    const { token, otp } = (typeof req.body === 'string') ? JSON.parse(req.body) : (req.body || {});

    const tokenStr = String(token || '').trim();
    const otpStr = String(otp || '').trim();

    if (!tokenStr || !otpStr) {
      res.status(400).json({ ok: false, error: 'token and otp are required' });
      return;
    }

    if (!/^[0-9]{6}$/.test(otpStr)) {
      res.status(400).json({ ok: false, error: 'Invalid OTP. Expect 6 digits.' });
      return;
    }

    const parts = tokenStr.split('.');
    if (parts.length !== 2) {
      res.status(400).json({ ok: false, error: 'Invalid token format' });
      return;
    }

    const [payloadB64, sig] = parts;
    const expectedSig = hmacHex(secret, payloadB64);
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      res.status(401).json({ ok: false, error: 'Invalid token signature' });
      return;
    }

    const payloadJson = base64urlDecode(payloadB64);
    const payload = JSON.parse(payloadJson);

    const phone = String(payload.phone || '').trim();
    const exp = Number(payload.exp || 0);
    const otpHash = String(payload.otpHash || '');

    if (!/^[0-9]{10}$/.test(phone) || !exp || !otpHash) {
      res.status(400).json({ ok: false, error: 'Invalid token payload' });
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    if (now > exp) {
      res.status(401).json({ ok: false, error: 'OTP expired' });
      return;
    }

    const computedHash = sha256Hex(`${phone}|${otpStr}|${exp}`);
    if (computedHash !== otpHash) {
      res.status(401).json({ ok: false, error: 'Incorrect OTP' });
      return;
    }

    res.status(200).json({ ok: true, phone });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Server error', details: String(e?.message || e) });
  }
}
