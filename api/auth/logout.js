import { clearAuthCookieHeaders } from '../_lib/auth.js';

export default function handler(req, res) {
  const secure = (req.headers['x-forwarded-proto'] || 'https') === 'https';
  res.setHeader('Set-Cookie', clearAuthCookieHeaders(secure));
  res.status(200).json({ ok: true });
}
