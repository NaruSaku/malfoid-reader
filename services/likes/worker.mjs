const SITE = 'https://narusaku.github.io';
const TARGET = /^(?:draconia:chapter-\d{1,3}(?:-\d{1,2})?|year-4:year4-chapter-\d{1,3}|american-vacation:american-vacation-chapter-\d{1,3}|short-comics:(?:bv1dnne6peb3|bv1ecpm6zerj|bv1pjnb6ieja|bv1okxu6ret7|bv1hkx76peip|bv1iijc6ke1e))$/;
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

const publicComment = row => ({ id: row.id, name: row.name, body: row.body,
  createdAt: new Date(row.created_at * 1000).toISOString() });

async function pageComments(request, env, url, reply, headers) {
  const origin = request.headers.get('Origin');
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...headers,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' } });
  if (!['GET', 'POST'].includes(request.method)) return reply({ error: 'Method not allowed.' }, 405);
  if (request.method === 'POST' && origin !== SITE) return reply({ error: 'Origin required.' }, 403);
  let input;
  try {
    if (request.method === 'POST') {
      if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return reply({ error: 'JSON required.' }, 415);
      if (Number(request.headers.get('Content-Length')) > 16384) return reply({ error: 'Comment too large.' }, 413);
      const text = await request.text();
      if (new TextEncoder().encode(text).length > 16384) return reply({ error: 'Comment too large.' }, 413);
      input = JSON.parse(text);
    } else {
      input = Object.fromEntries(url.searchParams);
      if (!/^\d{1,4}$/.test(input.page || '')) return reply({ error: 'Invalid page.' }, 400);
      input.page = Number(input.page);
    }
    if (!input || typeof input.target !== 'string' || !TARGET.test(input.target) ||
        !Number.isInteger(input.page) || input.page < 0 || input.page > 1000) return reply({ error: 'Invalid page.' }, 400);
    if (request.method === 'GET' && input.before !== undefined && (!/^\d{1,16}$/.test(input.before) || !Number.isSafeInteger(Number(input.before)) || Number(input.before) < 1)) return reply({ error: 'Invalid cursor.' }, 400);
    if (request.method === 'POST') {
      if (typeof input.visitor !== 'string' || !VISITOR.test(input.visitor) || typeof input.requestId !== 'string' || !VISITOR.test(input.requestId) ||
          typeof input.body !== 'string' || (input.name !== undefined && typeof input.name !== 'string') ||
          (input.website !== undefined && input.website !== '')) return reply({ error: 'Invalid comment.' }, 400);
      input.body = input.body.replace(/\r\n?/g, '\n').trim();
      input.name = (input.name || '').trim() || 'Anonymous';
      if (!input.body || input.body.length > 2000 || input.name.length > 40 || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(input.body) || /[\x00-\x1f\x7f]/.test(input.name)) return reply({ error: 'Use a name of up to 40 characters and a comment of 1–2,000 characters.' }, 400);
    }
  } catch { return reply({ error: 'Invalid request.' }, 400); }
  try {
    if (request.method === 'GET') {
      const results = await env.DB.batch([
        env.DB.prepare("SELECT id, name, body, created_at FROM page_comments WHERE chapter = ? AND page = ? AND status = 'visible' AND id < ? ORDER BY id DESC LIMIT 21")
          .bind(input.target, input.page, Number(input.before || Number.MAX_SAFE_INTEGER)),
        env.DB.prepare("SELECT COUNT(*) AS total FROM page_comments WHERE chapter = ? AND page = ? AND status = 'visible'").bind(input.target, input.page)
      ]);
      const rows = results[0].results;
      return reply({ target: input.target, page: input.page, total: results[1].results[0].total,
        comments: rows.slice(0, 20).map(publicComment), nextCursor: rows.length > 20 ? rows[19].id : null });
    }
    const ip = request.headers.get('CF-Connecting-IP');
    if (!ip || ip.length > 128) return reply({ error: 'Posting is temporarily unavailable.' }, 503);
    const visitor = await visitorHash(input.visitor);
    // Daily changing network hash; no raw IP address is stored or returned.
    const network = await visitorHash(`${new Date().toISOString().slice(0, 10)}:${ip}`);
    const results = await env.DB.batch([
      env.DB.prepare(`INSERT OR IGNORE INTO page_comments
        (request_id, chapter, page, name, body, visitor_hash, network_hash)
        SELECT ?, ?, ?, ?, ?, ?, ?
        WHERE (SELECT COUNT(*) FROM page_comments WHERE network_hash = ? AND created_at > unixepoch() - 60) < 5
          AND (SELECT COUNT(*) FROM page_comments WHERE network_hash = ? AND created_at > unixepoch() - 3600) < 30
          AND (SELECT COUNT(*) FROM page_comments WHERE visitor_hash = ? AND created_at > unixepoch() - 60) < 5`)
        .bind(input.requestId, input.target, input.page, input.name, input.body, visitor, network, network, network, visitor),
      env.DB.prepare('SELECT * FROM page_comments WHERE request_id = ?').bind(input.requestId)
    ]);
    const row = results[1].results[0];
    if (!row) return reply({ error: 'Too many comments. Please wait before posting again.', retryAfter: 60 }, 429);
    if (row.visitor_hash !== visitor || row.chapter !== input.target || row.page !== input.page || row.body !== input.body || row.name !== input.name || row.status !== 'visible') return reply({ error: 'This submission cannot be reused. Refresh and try again.' }, 409);
    return reply({ target: input.target, page: input.page, comment: publicComment(row) }, 201);
  } catch { return reply({ error: 'Comments are temporarily unavailable.' }, 503); }
}


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
    if (url.pathname === '/v1/comments') return pageComments(request, env, url, reply, headers);
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
