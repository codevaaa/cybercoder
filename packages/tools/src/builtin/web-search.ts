import type { AgentTool } from '../types.js';

const MAX_RESULTS = 8;
const TIMEOUT_MS = 15_000;

/**
 * `web_search` — keyless web search for the agent. Uses DuckDuckGo's HTML
 * endpoint (no API key, no tracking) and parses the result list. This gives
 * CyberCoder live web research, something Claude Code lacks natively.
 *
 * Read-only (non-destructive) but performs network I/O.
 */
export const webSearchTool: AgentTool = {
  schema: {
    name: 'web_search',
    description:
      'Search the web and return the top results (title, url, snippet). Use for current docs, library versions, error messages, and anything outside the local repo. Keyless.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query.' },
        max_results: { type: 'integer', description: `Max results (default ${MAX_RESULTS}).` },
      },
      required: ['query'],
    },
  },
  destructive: false,
  async execute(input) {
    const query = String(input.query ?? '').trim();
    if (!query) throw new Error('web_search requires a non-empty query');
    const max = Math.min(Number(input.max_results ?? MAX_RESULTS) || MAX_RESULTS, 15);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CyberCoder/1.0)',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `q=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      if (!res.ok) return `web_search failed: HTTP ${res.status}`;
      const html = await res.text();
      const results = parseDuckResults(html, max);
      if (results.length === 0) return `No results for "${query}".`;
      return results
        .map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.snippet}`)
        .join('\n\n');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return `web_search error: ${msg}`;
    } finally {
      clearTimeout(timer);
    }
  },
};

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

/** Parse DuckDuckGo HTML results without a DOM library. */
function parseDuckResults(html: string, max: number): SearchResult[] {
  const out: SearchResult[] = [];
  // Each result block contains a result__a anchor and a result__snippet.
  const linkRe = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  const snippetRe = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g;

  const snippets: string[] = [];
  let sm: RegExpExecArray | null;
  while ((sm = snippetRe.exec(html)) !== null) {
    snippets.push(stripTags(sm[1] ?? ''));
  }

  let lm: RegExpExecArray | null;
  let i = 0;
  while ((lm = linkRe.exec(html)) !== null && out.length < max) {
    const rawHref = lm[1] ?? '';
    const title = stripTags(lm[2] ?? '');
    const url = decodeDuckUrl(rawHref);
    out.push({ title, url, snippet: snippets[i] ?? '' });
    i++;
  }
  return out;
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** DuckDuckGo wraps target URLs as /l/?uddg=<encoded>. Unwrap when present. */
function decodeDuckUrl(href: string): string {
  const m = href.match(/[?&]uddg=([^&]+)/);
  if (m && m[1]) {
    try {
      return decodeURIComponent(m[1]);
    } catch {
      return href;
    }
  }
  return href.startsWith('//') ? `https:${href}` : href;
}
