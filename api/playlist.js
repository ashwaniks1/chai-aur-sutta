const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

let cachedToken = null;
let tokenExpiresAt = 0;

async function getSpotifyToken(clientId, clientSecret) {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`Spotify auth failed (${response.status})`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return cachedToken;
}

async function fetchAllPlaylistTracks(token, playlistId) {
  const tracks = [];
  let url = `${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks?limit=100&fields=items(track(id,name,artists(name),album(name,images),duration_ms,preview_url,external_urls)),next`;

  while (url) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`Spotify playlist fetch failed (${response.status})`);
    }

    const data = await response.json();
    for (const item of data.items || []) {
      const track = item.track;
      if (!track?.id) continue;

      tracks.push({
        id: track.id,
        title: track.name,
        artist: track.artists.map((a) => a.name).join(', '),
        album: track.album?.name || '',
        cover: track.album?.images?.[0]?.url || '',
        durationMs: track.duration_ms,
        previewUrl: track.preview_url,
        spotifyUrl: track.external_urls?.spotify || '',
      });
    }

    url = data.next;
  }

  return tracks;
}

async function fetchPlaylistMeta(token, playlistId) {
  const response = await fetch(
    `${SPOTIFY_API_BASE}/playlists/${playlistId}?fields=name,description,images,external_urls,owner(display_name)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!response.ok) {
    throw new Error(`Spotify playlist meta failed (${response.status})`);
  }

  return response.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({
      error: 'Missing Spotify credentials',
      hint: 'Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in Vercel environment variables.',
    });
  }

  const playlistId = req.query.id || process.env.SPOTIFY_PLAYLIST_ID;
  if (!playlistId) {
    return res.status(400).json({ error: 'Missing playlist id' });
  }

  try {
    const token = await getSpotifyToken(clientId, clientSecret);
    const [meta, tracks] = await Promise.all([
      fetchPlaylistMeta(token, playlistId),
      fetchAllPlaylistTracks(token, playlistId),
    ]);

    return res.status(200).json({
      id: playlistId,
      name: meta.name,
      description: meta.description,
      cover: meta.images?.[0]?.url || '',
      spotifyUrl: meta.external_urls?.spotify || '',
      owner: meta.owner?.display_name || '',
      tracks,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
