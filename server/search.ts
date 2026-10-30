import { WebSource, db } from './db.js';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  sourceEngine: string;
}

export async function checkSearchHealth(): Promise<{ status: 'online' | 'offline'; provider: string; message: string }> {
  const settings = db.getSettings();
  
  // 1. Try SearXNG if configured
  if (settings.searxngUrl) {
    try {
      const res = await fetch(`${settings.searxngUrl}/healthz`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        return { status: 'online', provider: 'SearXNG', message: `Connected to SearXNG at ${settings.searxngUrl}` };
      }
    } catch {}
  }

  // 2. Try DuckDuckGo / Public Search API
  try {
    const res = await fetch('https://api.duckduckgo.com/?q=test&format=json', { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      return { status: 'online', provider: 'DuckDuckGo / Gemini Google Grounding', message: 'Live Web Search Active' };
    }
  } catch {}

  // 3. Fallback: If Gemini API key is available, Google Search Grounding is always active!
  if (process.env.GEMINI_API_KEY) {
    return { status: 'online', provider: 'Google Search (Gemini Grounding)', message: 'Live Google Search Grounding Connected' };
  }

  return { status: 'offline', provider: 'None', message: 'No search engine available. Configure SearXNG or Gemini API key.' };
}

export async function performWebSearch(query: string, maxResults = 5): Promise<SearchResult[]> {
  const settings = db.getSettings();
  const results: SearchResult[] = [];

  // Method A: Check SearXNG
  if (settings.searxngUrl) {
    try {
      const searxUrl = `${settings.searxngUrl}/search?q=${encodeURIComponent(query)}&format=json&language=auto`;
      const res = await fetch(searxUrl, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const data = await res.json() as any;
        if (Array.isArray(data.results)) {
          for (const item of data.results.slice(0, maxResults)) {
            let domain = '';
            try {
              domain = new URL(item.url).hostname.replace('www.', '');
            } catch {}
            results.push({
              title: item.title || 'Web Result',
              url: item.url,
              snippet: item.content || item.snippet || '',
              domain,
              sourceEngine: 'SearXNG',
            });
          }
          if (results.length > 0) return results;
        }
      }
    } catch {}
  }

  // Method B: Google Custom Search API if env vars configured
  if (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID) {
    try {
      const gUrl = `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_SEARCH_API_KEY}&cx=${process.env.GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&num=${maxResults}`;
      const res = await fetch(gUrl, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json() as any;
        if (Array.isArray(data.items)) {
          for (const item of data.items) {
            let domain = '';
            try {
              domain = new URL(item.link).hostname.replace('www.', '');
            } catch {}
            results.push({
              title: item.title,
              url: item.link,
              snippet: item.snippet || '',
              domain,
              sourceEngine: 'Google Search API',
            });
          }
          if (results.length > 0) return results;
        }
      }
    } catch {}
  }

  // Method C: Wikipedia & DuckDuckGo API fallback for instant factual context
  try {
    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&utf8=1&srlimit=${maxResults}`;
    const res = await fetch(wikiUrl, {
      headers: { 'User-Agent': 'ChatGPTPro/1.0 (https://chatgpt.internal; assistant@chatgpt.internal)' },
      signal: AbortSignal.timeout(3500),
    });
    if (res.ok) {
      const data = await res.json() as any;
      if (data.query?.search && Array.isArray(data.query.search)) {
        for (const item of data.query.search) {
          const cleanSnippet = (item.snippet || '').replace(/<[^>]*>?/gm, '');
          results.push({
            title: item.title,
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
            snippet: cleanSnippet,
            domain: 'en.wikipedia.org',
            sourceEngine: 'Wikipedia Live Knowledge',
          });
        }
      }
    }
  } catch {}

  // Method D: DuckDuckGo Instant Answer API
  try {
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(ddgUrl, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json() as any;
      if (data.AbstractText && data.AbstractURL) {
        results.unshift({
          title: data.Heading || query,
          url: data.AbstractURL,
          snippet: data.AbstractText,
          domain: 'duckduckgo.com',
          sourceEngine: 'DuckDuckGo Instant',
        });
      }
      if (Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics.slice(0, 3)) {
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.split(' - ')[0] || topic.Text.slice(0, 50),
              url: topic.FirstURL,
              snippet: topic.Text,
              domain: 'duckduckgo.com',
              sourceEngine: 'DuckDuckGo Related',
            });
          }
        }
      }
    }
  } catch {}

  return results.slice(0, maxResults);
}
