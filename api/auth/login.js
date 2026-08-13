import {
  getBaseUrl,
  randomString,
} from '../_lib/auth.js';

const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-modify-playback-state',
  'user-read-playback-state',
  'playlist-read-private',
  'playlist-read-collaborative',
].join(' ');

export default function handler(req, res) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: 'Missing SPOTIFY_CLIENT_ID' });
  }

  const redirectUri = `${getBaseUrl(req)}/api/auth/callback`;
  const state = randomString(16);
  const secure = getBaseUrl(req).startsWith('https');

  res.setHeader(
    'Set-Cookie',
    `spotify_auth_state=${state}; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}; Max-Age=600`
  );

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: SCOPES,
    redirect_uri: redirectUri,
    state,
  });

  res.writeHead(302, { Location: `https://accounts.spotify.com/authorize?${params}` });
  res.end();
}
