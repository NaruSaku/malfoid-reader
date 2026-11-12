const SITE = 'https://narusaku.github.io';
const TARGET = /^(?:draconia:chapter-\d{1,3}(?:-\d{1,2})?|year-4:year4-chapter-\d{1,3}|american-vacation:american-vacation-chapter-\d{1,3})$/;
const VISITOR = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

async function visitorHash(visitor) {
  if (!visitor) return '';
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(visitor));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
}

const summary = (db, target, visitor) => db.prepare(`
  SELECT COALESCE((SELECT total FROM chapter_like_totals WHERE chapter = ?), 0) AS count,
         EXISTS(SELECT 1 FROM chapter_likes WHERE chapter = ? AND visitor = ?) AS liked
`).bind(target, target, visitor);

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store', 'Vary': 'Origin',
      'X-Content-Type-Options': 'nosniff',
      ...(origin === SITE ? { 'Access-Control-Allow-Origin': SITE } : {})
    };
    const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });
    if (origin && origin !== SITE) return reply({ error: 'Origin not allowed.' }, 403);
    const url = new URL(request.url);
    if (url.pathname !== '/v1/likes') return reply({ error: 'Not found.' }, 404);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { ...headers,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' } });
    }
    if (!['GET', 'POST'].includes(request.method)) return reply({ error: 'Method not allowed.' }, 405);
    if (request.method === 'POST' && origin !== SITE) return reply({ error: 'Origin required.' }, 403);
    let input;
    try {
      if (request.method === 'POST') {
        if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) {
          return reply({ error: 'JSON required.' }, 415);
        }
        const text = await request.text();
        if (text.length > 512) return reply({ error: 'Request too large.' }, 413);
        input = JSON.parse(text);
      } else input = Object.fromEntries(url.searchParams);
      if (!input || typeof input.target !== 'string' || !TARGET.test(input.target) ||
          (input.visitor !== undefined && (typeof input.visitor !== 'string' || !VISITOR.test(input.visitor))) ||
          (request.method === 'POST' && (!VISITOR.test(input.visitor || '') || typeof input.liked !== 'boolean'))) {
        return reply({ error: 'Invalid chapter or like.' }, 400);
      }
    } catch { return reply({ error: 'Invalid JSON.' }, 400); }
    try {
      const visitor = await visitorHash(input.visitor);
      let row;
      if (request.method === 'GET') row = await summary(env.DB, input.target, visitor).first();
      else {
        const write = input.liked
          ? env.DB.prepare('INSERT OR IGNORE INTO chapter_likes (chapter, visitor) VALUES (?, ?)')
          : env.DB.prepare('DELETE FROM chapter_likes WHERE chapter = ? AND visitor = ?');
        // D1 executes the batch atomically; retries never increment the same vote twice.
        const results = await env.DB.batch([write.bind(input.target, visitor), summary(env.DB, input.target, visitor)]);
        row = results[1].results[0];
      }
      return reply({ target: input.target, count: row.count, liked: Boolean(row.liked) });
    } catch {
      return reply({ error: 'Likes are temporarily unavailable.' }, 503);
    }
  }
};
