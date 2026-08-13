const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

let cachedToken = null;
let tokenExpiresAt = 0;

async function parseSpotifyError(response) {
  try {
    const data = await response.json();
    return data.error?.message || data.error || response.statusText;
  } catch {
    return response.statusText;
  }
}

async function requestSpotifyToken(body, clientId, clientSecret) {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body).toString(),
  });

  if (!response.ok) {
    const message = await parseSpotifyError(response);
    throw new Error(`Spotify auth failed (${response.status}): ${message}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return cachedToken;
}

export async function getAccessToken(clientId, clientSecret) {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
  if (refreshToken) {
    return requestSpotifyToken(
      {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      },
      clientId,
      clientSecret
    );
  }

  return requestSpotifyToken({ grant_type: 'client_credentials' }, clientId, clientSecret);
}

function normalizeTrack(rawTrack) {
  if (!rawTrack?.id) return null;

  return {
    id: rawTrack.id,
    title: rawTrack.name,
    artist: (rawTrack.artists || []).map((a) => a.name).join(', '),
    album: rawTrack.album?.name || '',
    cover: rawTrack.album?.images?.[0]?.url || '',
    durationMs: rawTrack.duration_ms,
    previewUrl: rawTrack.preview_url,
    spotifyUrl: rawTrack.external_urls?.spotify || '',
  };
}

export async function fetchAllPlaylistTracks(token, playlistId) {
  const tracks = [];
  const fields =
    'items(item(type,id,name,artists(name),album(name,images),duration_ms,preview_url,external_urls),track(id,name,artists(name),album(name,images),duration_ms,preview_url,external_urls)),next';
  let url = `${SPOTIFY_API_BASE}/playlists/${playlistId}/items?limit=50&market=IN&fields=${encodeURIComponent(fields)}`;

  while (url) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const message = await parseSpotifyError(response);
      const error = new Error(`Spotify playlist fetch failed (${response.status}): ${message}`);
      error.status = response.status;
      throw error;
    }

    const data = await response.json();
    for (const entry of data.items || []) {
      const rawTrack = entry.item?.type === 'track' ? entry.item : entry.track;
      const track = normalizeTrack(rawTrack);
      if (track) tracks.push(track);
    }

    url = data.next;
  }

  return tracks;
}

export async function fetchPlaylistMeta(token, playlistId) {
  const response = await fetch(
    `${SPOTIFY_API_BASE}/playlists/${playlistId}?market=IN&fields=name,description,images,external_urls,owner(display_name)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!response.ok) {
    const message = await parseSpotifyError(response);
    const error = new Error(`Spotify playlist meta failed (${response.status}): ${message}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}
