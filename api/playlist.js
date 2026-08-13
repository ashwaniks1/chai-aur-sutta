import {
  getAccessToken,
  fetchAllPlaylistTracks,
  fetchPlaylistMeta,
} from './_lib/spotify.js';

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

  if (!process.env.SPOTIFY_REFRESH_TOKEN) {
    return res.status(500).json({
      error: 'Missing Spotify refresh token',
      hint:
        'Spotify requires user authorization to read playlist tracks. Run: node scripts/get-spotify-refresh-token.js then add SPOTIFY_REFRESH_TOKEN to Vercel.',
    });
  }

  const playlistId = req.query.id || process.env.SPOTIFY_PLAYLIST_ID;
  if (!playlistId) {
    return res.status(400).json({ error: 'Missing playlist id' });
  }

  try {
    const token = await getAccessToken(clientId, clientSecret);
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
    const status = error.status || 500;
    const hint =
      status === 403
        ? 'Ensure the playlist is yours (or you collaborate on it) and your Spotify account is added to the app allowlist in the Spotify Developer Dashboard.'
        : undefined;

    return res.status(status).json({
      error: error.message,
      hint,
    });
  }
}
