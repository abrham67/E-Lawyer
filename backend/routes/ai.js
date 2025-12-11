const express = require('express');
const router = express.Router();
const https = require('https');

// Helper: simple HTTPS POST with timeout and UA
function httpsPostJson(url, payload, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(url);
      const data = Buffer.from(JSON.stringify(payload || {}));
      const req = https.request({
        hostname: u.hostname,
        path: u.pathname + (u.search || ''),
        method: 'POST',
        port: u.port || 443,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length,
          'User-Agent': 'e-legal-connect/ai (node)'
        },
      }, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try { resolve(JSON.parse(body)); } catch (e) { resolve({ raw: body }); }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        });
      });
      req.on('error', reject);
      req.setTimeout(timeoutMs, () => { try { req.destroy(new Error('request_timeout')); } catch {} });
      req.write(data);
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

// Web search providers with graceful fallback
function getJson(url, timeoutMs = 10000) {
  return new Promise((resolve) => {
    try {
      https.get(url, { headers: { 'User-Agent': 'e-legal-connect/ai (node)' } }, (res) => {
        let body = '';
        res.on('data', (c) => body += c);
        res.on('end', () => {
          try { resolve(JSON.parse(body)); } catch { resolve(null); }
        });
      }).on('error', () => resolve(null)).setTimeout(timeoutMs, function () {
        try { this.destroy(new Error('request_timeout')); } catch {}
        resolve(null);
      });
    } catch { resolve(null); }
  });
}

async function webSearchSnippets(q) {
  // 1) SerpAPI (Google search)
  const serpKey = process.env.SERPAPI_KEY;
  if (serpKey) {
    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.set('engine', 'google');
    url.searchParams.set('q', q);
    url.searchParams.set('num', '5');
    url.searchParams.set('api_key', serpKey);
    const serpJson = await getJson(url);
    const serp = (serpJson && Array.isArray(serpJson.organic_results))
      ? serpJson.organic_results.slice(0, 5).map((r) => ({ title: r.title, link: r.link, snippet: r.snippet }))
      : [];
    if (Array.isArray(serp) && serp.length) return { items: serp, provider: 'serpapi' };
  }

  // 2) Google Programmable Search (Custom Search API)
  const cseKey = process.env.GOOGLE_CSE_KEY;
  const cseCx = process.env.GOOGLE_CSE_ID;
  if (cseKey && cseCx) {
    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('key', cseKey);
    url.searchParams.set('cx', cseCx);
    url.searchParams.set('q', q);
    url.searchParams.set('num', '5');
    const cseJson = await getJson(url);
    const cse = (cseJson && Array.isArray(cseJson.items))
      ? cseJson.items.slice(0, 5).map((r) => ({ title: r.title, link: r.link, snippet: r.snippet || r.htmlSnippet || r.title }))
      : [];
    if (Array.isArray(cse) && cse.length) return { items: cse, provider: 'google_cse' };
  }

  // 3) Wikipedia search (free)
  {
    const url = new URL('https://en.wikipedia.org/w/api.php');
    url.searchParams.set('action', 'query');
    url.searchParams.set('list', 'search');
    url.searchParams.set('format', 'json');
    url.searchParams.set('srlimit', '5');
    url.searchParams.set('srprop', 'snippet');
    url.searchParams.set('srsearch', q);
    const wikiJson = await getJson(url);
    if (wikiJson && wikiJson.query && Array.isArray(wikiJson.query.search)) {
      const items = wikiJson.query.search.slice(0, 5).map((r) => ({
        title: r.title,
        link: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/\s/g, '_'))}`,
        snippet: (r.snippet || '').replace(/<[^>]+>/g, '')
      }));
      if (items.length) return { items, provider: 'wikipedia' };
    }
  }

  // 4) DuckDuckGo Instant Answer fallback (free)
  {
    const url = new URL('https://api.duckduckgo.com/');
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'json');
    url.searchParams.set('no_html', '1');
    url.searchParams.set('skip_disambig', '1');
    const ddgJson = await getJson(url);
    const items = [];
    if (ddgJson) {
      if (ddgJson.AbstractURL) {
        items.push({ title: ddgJson.Heading || 'Summary', link: ddgJson.AbstractURL, snippet: ddgJson.AbstractText || '' });
      }
      if (Array.isArray(ddgJson.RelatedTopics)) {
        for (const t of ddgJson.RelatedTopics) {
          if (t && t.FirstURL && t.Text) {
            items.push({ title: t.Text, link: t.FirstURL, snippet: t.Text });
            if (items.length >= 5) break;
          } else if (t && Array.isArray(t.Topics)) {
            for (const tt of t.Topics) {
              if (tt && tt.FirstURL && tt.Text) {
                items.push({ title: tt.Text, link: tt.FirstURL, snippet: tt.Text });
                if (items.length >= 5) break;
              }
            }
            if (items.length >= 5) break;
          }
        }
      }
    }
    if (items.length) return { items, provider: 'duckduckgo' };
  }

  return { items: [], provider: 'none' };
}

// Fetch and lightly clean page text for grounding
async function fetchPageExcerpt(url, maxBytes = 200 * 1024, timeoutMs = 8000) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const mod = u.protocol === 'http:' ? require('http') : require('https');
      const req = mod.get(url, { headers: { 'User-Agent': 'e-legal-connect/ai (node)' } }, (res) => {
        let total = 0;
        let chunks = [];
        res.on('data', (c) => {
          total += c.length;
          if (total <= maxBytes) chunks.push(c);
        });
        res.on('end', () => {
          try {
            const buf = Buffer.concat(chunks);
            let html = buf.toString('utf8');
            // Remove scripts/styles and tags
            html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
            html = html.replace(/<style[\s\S]*?<\/style>/gi, '');
            let text = html.replace(/<[^>]+>/g, ' ');
            text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
            // Collapse whitespace
            text = text.replace(/\s+/g, ' ').trim();
            resolve(text.slice(0, 1500));
          } catch { resolve(''); }
        });
      });
      req.on('error', () => resolve(''));
      req.setTimeout(timeoutMs, function () { try { this.destroy(new Error('request_timeout')); } catch {}; resolve(''); });
    } catch { resolve(''); }
  });
}

// POST /api/ai/ask { query: string, web?: boolean }
router.post('/ask', async (req, res) => {
  try {
    // Back-compat for older payload shape
    const body = req.body || {};
    const query = (body.query || body.question || '').toString();
    const web = !!(body.web ?? body.includeWeb ?? false);
    if (!query || typeof query !== 'string' || query.trim().length < 3) {
      return res.status(400).json({ error: 'query is required (min 3 chars)' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

    let webNotes = [];
    let provider = 'none';
    if (web) {
      try {
        const r = await webSearchSnippets(query);
        webNotes = r.items || [];
        provider = r.provider || 'none';
      } catch (e) {
        provider = 'error';
      }
    }

    // Compose prompt with instructions and optional web findings
    const systemPreamble = [
      'You are E-Legal Connect AI, a helpful assistant for legal research.',
      'Always strive for accurate, current, and jurisdiction-aware answers.',
      'If you are unsure, say so and suggest where to verify.',
      'When using web results, cite sources as [title](url).',
    ].join('\n');

    // Optionally fetch excerpts from top sources to ground the answer better
    let excerpts = '';
    if (webNotes && webNotes.length) {
      const top = webNotes.slice(0, 2);
      const exts = [];
      for (const it of top) {
        const txt = await fetchPageExcerpt(it.link);
        if (txt) exts.push(`Source: ${it.title} (${it.link})\n${txt}`);
      }
      if (exts.length) excerpts = '\n\nSource excerpts (summarize and cite):\n' + exts.join('\n\n');
    }

    const webContext = (webNotes && webNotes.length)
      ? ('\n\nWeb findings:\n' + webNotes.map((r, i) => `(${i + 1}) ${r.title} — ${r.snippet} ${r.link}`).join('\n'))
      : '';

  const prompt = `${systemPreamble}\n\nUser question:\n${query}${webContext}${excerpts}`;

    // If no LLM key configured, degrade gracefully to web-only answer
    if (!GEMINI_API_KEY) {
      if (webNotes && webNotes.length) {
        // Build a simple stitched answer from snippets and excerpts
        const stitched = [
          'Here are relevant sources and key points based on what I could fetch:',
          webNotes.map((r, i) => `- (${i + 1}) ${r.title}: ${r.snippet} (${r.link})`).join('\n'),
          excerpts ? `\nNotes: ${excerpts.slice(0, 400)}` : ''
        ].join('\n');
        return res.json({ ok: true, text: stitched, sources: webNotes, provider });
      }
      return res.status(500).json({ error: 'AI key is not configured and no web results were found' });
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
    const payload = {
      contents: [
        { role: 'user', parts: [{ text: prompt }] }
      ],
      generationConfig: {
        temperature: 0.2,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    };

    let text = '';
    try {
      const resp = await httpsPostJson(endpoint, payload);
      text = resp?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n') || '';
    } catch (e) {
      // On model error, degrade to web-only stitched answer
      if (webNotes && webNotes.length) {
        text = [
          'Here are relevant sources and key points based on what I could fetch:',
          webNotes.map((r, i) => `- (${i + 1}) ${r.title}: ${r.snippet} (${r.link})`).join('\n'),
          excerpts ? `\nNotes: ${excerpts.slice(0, 400)}` : ''
        ].join('\n');
      } else {
        throw e;
      }
    }
    if (!text) {
      text = 'No answer generated.';
    }
    if (web && (!webNotes || webNotes.length === 0)) {
      console.warn('[AI] Web search returned 0 items for query:', query);
    }
    res.json({ ok: true, text, sources: webNotes, provider });
  } catch (err) {
    console.error('AI error:', err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

module.exports = router;
