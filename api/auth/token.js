import {
  authCookieHeaders,
  parseCookies,
  refreshAccessToken,
} from '../_lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Missing Spotify credentials' });
  }

  const cookies = parseCookies(req.headers.cookie);
  const secure = (req.headers['x-forwarded-proto'] || 'https') === 'https';

  let accessToken = cookies.spotify_access_token;
  const refreshToken = cookies.spotify_refresh_token;

  if (!accessToken && !refreshToken) {
    return res.status(401).json({ authenticated: false });
  }

  try {
    if (refreshToken) {
      const tokens = await refreshAccessToken(clientId, clientSecret, refreshToken);
      accessToken = tokens.access_token;
      const headers = authCookieHeaders(
        { ...tokens, refresh_token: tokens.refresh_token || refreshToken },
        secure
      );
      res.setHeader('Set-Cookie', headers);
    }

    return res.status(200).json({ authenticated: true, access_token: accessToken });
  } catch {
    return res.status(401).json({ authenticated: false });
  }
}
