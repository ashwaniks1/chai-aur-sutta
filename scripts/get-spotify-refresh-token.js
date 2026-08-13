#!/usr/bin/env node
/**
 * One-time setup: get a Spotify refresh token for playlist access.
 *
 * Prerequisites:
 * 1. Spotify app at https://developer.spotify.com/dashboard
 * 2. Redirect URI added: http://127.0.0.1:8888/callback
 * 3. SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in env or .env.local
 *
 * Usage:
 *   SPOTIFY_CLIENT_ID=... SPOTIFY_CLIENT_SECRET=... node scripts/get-spotify-refresh-token.js
 */

const http = require('http');
const { URL } = require('url');

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = 'http://127.0.0.1:8888/callback';
const PORT = 8888;
const SCOPES = [
  'playlist-read-private',
  'playlist-read-collaborative',
].join(' ');

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET first.');
  process.exit(1);
}

const authUrl = new URL('https://accounts.spotify.com/authorize');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('scope', SCOPES);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

  if (url.pathname !== '/callback') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error || !code) {
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end(`<h1>Authorization failed</h1><p>${error || 'Missing code'}</p>`);
    server.close();
    process.exit(1);
  }

  try {
    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const data = await tokenRes.json();
    if (!tokenRes.ok) {
      throw new Error(data.error_description || data.error || tokenRes.statusText);
    }

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>Success!</h1><p>You can close this tab and return to the terminal.</p>');

    console.log('\n✅ Authorization successful!\n');
    console.log('Add this to Vercel → Settings → Environment Variables:\n');
    console.log(`SPOTIFY_REFRESH_TOKEN=${data.refresh_token}\n`);
    console.log('Then redeploy your site.\n');

    server.close();
    process.exit(0);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end(`<h1>Token exchange failed</h1><pre>${err.message}</pre>`);
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log('\nSpotify refresh token setup\n');
  console.log('1. Add this Redirect URI in your Spotify app settings:');
  console.log(`   ${REDIRECT_URI}\n`);
  console.log('2. Open this URL in your browser and approve access:\n');
  console.log(`   ${authUrl.toString()}\n`);
  console.log('Waiting for callback...\n');
});
