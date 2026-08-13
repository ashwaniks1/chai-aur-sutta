import { YouTube } from 'youtube-sr';

const YOUTUBE_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';

async function searchViaYouTubeApi(query, apiKey) {
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
  return data.items?.[0]?.id?.videoId || null;
}

async function searchViaScraper(query) {
  const results = await YouTube.search(query, { limit: 3, type: 'video' });
  return results.find((video) => video?.id)?.id || null;
}

async function findVideoId(query) {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (apiKey) {
    try {
      const videoId = await searchViaYouTubeApi(query, apiKey);
      if (videoId) return videoId;
    } catch {
      // fall through to scraper search
    }
  }

  return searchViaScraper(query);
}

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

  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Missing search query' });
  }

  try {
    const videoId = await findVideoId(query);
    if (!videoId) {
      return res.status(404).json({ error: 'No video found' });
    }

    return res.status(200).json({ videoId });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
