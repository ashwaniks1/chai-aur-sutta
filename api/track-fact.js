const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const WIKI_SUMMARY = 'https://en.wikipedia.org/api/rest_v1/page/summary/';

function trimFact(text, max = 150) {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= max) return cleaned;

  const slice = cleaned.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  const trimmed = lastSpace > 80 ? slice.slice(0, lastSpace) : slice;
  return `${trimmed}…`;
}

function metadataFacts({ title, artist, album, releaseYear }) {
  const facts = [];
  if (album && releaseYear) {
    facts.push(`From «${album}» (${releaseYear}) — tapri speaker certified.`);
  } else if (album) {
    facts.push(`From the album «${album}».`);
  }
  facts.push(`«${title}» — ${artist} on rotation at Chai aur Sutta.`);
  return facts;
}

async function wikiSearch(query) {
  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: query,
    format: 'json',
    origin: '*',
    srlimit: '4',
  });

  const response = await fetch(`${WIKI_API}?${params}`);
  if (!response.ok) return [];

  const data = await response.json();
  return (data.query?.search || []).map((item) => item.title);
}

async function wikiSummary(title) {
  const encoded = encodeURIComponent(title.replace(/ /g, '_'));
  const response = await fetch(`${WIKI_SUMMARY}${encoded}`);
  if (!response.ok) return null;

  const data = await response.json();
  if (data.type === 'disambiguation' || !data.extract) return null;
  return trimFact(data.extract);
}

async function findWikiFact(title, artist, album) {
  const queries = [
    `${title} ${artist} song`,
    `${title} song ${album}`,
    `${title} Bollywood song`,
    `${title} song`,
  ];

  for (const query of queries) {
    const titles = await wikiSearch(query);
    for (const pageTitle of titles) {
      const extract = await wikiSummary(pageTitle);
      if (extract && extract.length > 40) return extract;
    }
  }

  return null;
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

  const title = req.query.title?.trim();
  const artist = req.query.artist?.trim() || '';
  const album = req.query.album?.trim() || '';
  const releaseYear = req.query.year?.trim() || '';

  if (!title) {
    return res.status(400).json({ error: 'Missing title' });
  }

  try {
    const facts = [];
    const wikiFact = await findWikiFact(title, artist, album);
    if (wikiFact) facts.push(wikiFact);

    facts.push(...metadataFacts({ title, artist, album, releaseYear }));

    const unique = [...new Set(facts)].slice(0, 4);
    return res.status(200).json({ facts: unique });
  } catch (error) {
    return res.status(200).json({
      facts: metadataFacts({ title, artist, album, releaseYear }),
    });
  }
}
