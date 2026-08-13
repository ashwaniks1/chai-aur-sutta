const YOUTUBE_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=172800');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'YouTube API not configured',
      hint: 'Set YOUTUBE_API_KEY for full-track playback fallback.',
    });
  }

  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Missing search query' });
  }

  try {
    const params = new URLSearchParams({
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: '1',
      videoEmbeddable: 'true',
      key: apiKey,
    });

    const response = await fetch(`${YOUTUBE_SEARCH_URL}?${params}`);
    if (!response.ok) {
      throw new Error(`YouTube search failed (${response.status})`);
    }

    const data = await response.json();
    const item = data.items?.[0];
    if (!item) {
      return res.status(404).json({ error: 'No video found' });
    }

    return res.status(200).json({
      videoId: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url || '',
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
