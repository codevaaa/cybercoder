import type { AgentTool } from '../types.js';

const TIMEOUT_MS = 20_000;
const MAX_CHARS = 20_000;

/**
 * `web_fetch` — fetch a URL and return readable text content. Strips scripts,
 * styles, and markup so the model gets clean prose/code. Pairs with web_search
 * for real research workflows. Read-only but performs network I/O.
 */
export const webFetchTool: AgentTool = {
  schema: {
    name: 'web_fetch',
    description:
      'Fetch a URL and return its readable text content (HTML stripped to text, or raw for JSON/markdown). Use after web_search to read a specific page or to pull docs/specs.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Absolute http(s) URL to fetch.' },
        max_chars: { type: 'integer', description: `Max characters returned (default ${MAX_CHARS}).` },
      },
      required: ['url'],
    },
  },
  destructive: false,
  async execute(input) {
    const url = String(input.url ?? '').trim();
    if (!/^https?:\/\//i.test(url)) throw new Error('web_fetch requires an absolute http(s) URL');
    const maxChars = Math.min(Number(input.max_chars ?? MAX_CHARS) || MAX_CHARS, 60_000);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CyberCoder/1.0)' },
        signal: controller.signal,
        redirect: 'follow',
      });
      if (!res.ok) return `web_fetch failed: HTTP ${res.status} ${res.statusText}`;

      const contentType = res.headers.get('content-type') || '';
      const raw = await res.text();

      let text: string;
      if (contentType.includes('html')) {
        text = htmlToText(raw);
      } else {
        text = raw; // json, markdown, plain, code — return as-is
      }

      if (text.length > maxChars) {
        return `${text.slice(0, maxChars)}\n\n[truncated at ${maxChars} chars]`;
      }
      return text || '[empty response]';
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return `web_fetch error: ${msg}`;
    } finally {
      clearTimeout(timer);
    }
  },
};

/** Convert HTML to readable text without a DOM library. */
function htmlToText(html: string): string {
  return html
    // Drop non-content blocks entirely.
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<head[\s\S]*?<\/head>/gi, ' ')
    // Preserve some structure as newlines.
    .replace(/<\/(p|div|section|article|li|h[1-6]|tr|br)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    // Strip remaining tags.
    .replace(/<[^>]+>/g, ' ')
    // Decode common entities.
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    // Collapse whitespace.
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
