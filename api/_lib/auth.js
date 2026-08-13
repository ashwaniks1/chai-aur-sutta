const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

export function parseCookies(header = '') {
  return Object.fromEntries(
    header.split(';').map((part) => {
      const [key, ...rest] = part.trim().split('=');
      return [key, decodeURIComponent(rest.join('='))];
    }).filter(([key]) => key)
  );
}

export function getBaseUrl(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
}

export async function refreshAccessToken(clientId, clientSecret, refreshToken) {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Token refresh failed');
  }

  return data;
}

export async function exchangeCode(clientId, clientSecret, code, redirectUri) {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Code exchange failed');
  }

  return data;
}

export function randomString(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

export function authCookieHeaders(tokens, secure) {
  const flags = `Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
  const headers = [
    `spotify_access_token=${encodeURIComponent(tokens.access_token)}; ${flags}; Max-Age=${tokens.expires_in || 3600}`,
  ];
  if (tokens.refresh_token) {
    headers.push(
      `spotify_refresh_token=${encodeURIComponent(tokens.refresh_token)}; ${flags}; Max-Age=2592000`
    );
  }
  return headers;
}

export function clearAuthCookieHeaders(secure) {
  const flags = `Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}; Max-Age=0`;
  return [
    `spotify_access_token=; ${flags}`,
    `spotify_refresh_token=; ${flags}`,
    `spotify_auth_state=; ${flags}`,
  ];
}
