import {
  authCookieHeaders,
  exchangeCode,
  getBaseUrl,
  parseCookies,
} from '../_lib/auth.js';

export default async function handler(req, res) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res.status(500).send('Missing Spotify credentials');
  }

  const { code, state, error } = req.query;
  if (error) {
    return res.redirect('/?auth_error=' + encodeURIComponent(error));
  }

  const cookies = parseCookies(req.headers.cookie);
  if (!state || state !== cookies.spotify_auth_state) {
    return res.status(400).send('Invalid OAuth state');
  }

  const redirectUri = `${getBaseUrl(req)}/api/auth/callback`;
  const secure = redirectUri.startsWith('https');

  try {
    const tokens = await exchangeCode(clientId, clientSecret, code, redirectUri);
    res.setHeader('Set-Cookie', authCookieHeaders(tokens, secure));
    res.writeHead(302, { Location: '/' });
    res.end();
  } catch (err) {
    res.status(500).send(err.message);
  }
}
