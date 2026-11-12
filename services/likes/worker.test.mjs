import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker from './worker.mjs';

const origin = 'https://narusaku.github.io';
const a = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const b = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const target = 'draconia:chapter-5-1';
function database() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  const db = { prepare(query) {
    return { bind(...args) {
      const stmt = sql.prepare(query);
      return { first: async () => stmt.get(...args), execute: () => {
        if (/^\s*SELECT/i.test(query)) return { results: stmt.all(...args) };
        stmt.run(...args); return { results: [] };
      } };
    } };
  }, async batch(statements) {
    sql.exec('BEGIN');
    try { const results = statements.map(s => s.execute()); sql.exec('COMMIT'); return results; }
    catch (e) { sql.exec('ROLLBACK'); throw e; }
  } };
  return { DB: db, sql };
}
async function send(env, method = 'GET', input = { target }, extra = {}) {
  const url = new URL('https://likes.example/v1/likes');
  if (method === 'GET') for (const [key, value] of Object.entries(input)) url.searchParams.set(key, value);
  const response = await worker.fetch(new Request(url, { method,
    headers: { Origin: origin, ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}), ...extra },
    ...(method === 'POST' ? { body: JSON.stringify(input) } : {}) }), env);
  return { response, ...(response.status !== 204 ? { body: await response.json() } : {}) };
}
test('shared totals, duplicate retries, unlikes, and chapter isolation use the actual SQL schema', async () => {
  const env = database();
  assert.deepEqual((await send(env)).body, { target, count: 0, liked: false });
  for (let i = 0; i < 5; i++) assert.equal((await send(env, 'POST', { target, visitor: a, liked: true })).body.count, 1);
  assert.equal((await send(env, 'POST', { target, visitor: b, liked: true })).body.count, 2);
  assert.equal((await send(env, 'GET', { target, visitor: a })).body.liked, true);
  assert.equal((await send(env, 'POST', { target: 'year-4:year4-chapter-15', visitor: a, liked: true })).body.count, 1);
  for (let i = 0; i < 5; i++) assert.equal((await send(env, 'POST', { target, visitor: a, liked: false })).body.count, 1);
  assert.equal((await send(env, 'GET', { target, visitor: a })).body.liked, false);
  assert.equal((await send(env, 'GET', { target, visitor: b })).body.liked, true);
  const stored = env.sql.prepare('SELECT visitor FROM chapter_likes').all();
  assert(stored.every(row => /^[a-f0-9]{64}$/.test(row.visitor)));
  env.sql.close();
});
test('CORS, request validation, and outages do not create votes or false counts', async () => {
  const env = database();
  assert.equal((await send(env, 'POST', { target, visitor: a, liked: true }, { Origin: 'https://other.example' })).response.status, 403);
  assert.equal((await send(env, 'POST', { target, visitor: a, liked: true }, { Origin: '' })).response.status, 403);
  for (const input of [null, {}, { target: '../../bad', visitor: a, liked: true }, { target, visitor: 'bad', liked: true }, { target, visitor: a, liked: 'true' }]) {
    assert.equal((await send(env, 'POST', input)).response.status, 400);
  }
  assert.equal((await send(env, 'POST', { target, visitor: a, liked: true, padding: 'x'.repeat(600) })).response.status, 413);
  const preflight = (await send(env, 'OPTIONS')).response;
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), origin);
  const unavailable = await send({ DB: { prepare() { throw new Error('offline'); } } });
  assert.equal(unavailable.response.status, 503);
  assert.equal(unavailable.body.count, undefined);
  assert.equal(env.sql.prepare('SELECT COUNT(*) n FROM chapter_likes').get().n, 0);
  env.sql.close();
});
