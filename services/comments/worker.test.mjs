import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker from '../likes/worker.mjs';

function database() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(readFileSync(new URL('../likes/schema.sql', import.meta.url), 'utf8'));
  sql.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  const DB = { prepare(query) { return { bind(...args) { const stmt = sql.prepare(query); return {
    first: async () => stmt.get(...args), execute: () => /^\s*SELECT/i.test(query) ? { results: stmt.all(...args) } : (stmt.run(...args), { results: [] })
  }; } }; }, async batch(statements) {
    sql.exec('BEGIN');
    try { const result = statements.map(s => s.execute()); sql.exec('COMMIT'); return result; }
    catch(e) { sql.exec('ROLLBACK'); throw e; }
  } };
  return { sql, DB };
}
const target = 'draconia:chapter-1';
const visitor = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const input = changes => ({ target, page: 1, visitor, requestId: crypto.randomUUID(), name: '', body: 'A lovely page.', website: '', ...changes });
async function send(env, method, data, headers = {}) {
  const url = new URL('https://example.workers.dev/v1/comments');
  if (method === 'GET') for (const [k,v] of Object.entries(data)) url.searchParams.set(k,String(v));
  const response = await worker.fetch(new Request(url,{ method, headers: { Origin: 'https://narusaku.github.io', 'CF-Connecting-IP': '192.0.2.1', ...(method==='POST' ? {'Content-Type':'application/json'} : {}), ...headers }, ...(method==='POST' ? {body:JSON.stringify(data)} : {}) }), env);
  return { response, body: response.status===204 ? null : await response.json() };
}
test('page isolation, immediate publication, plain text, and private fields', async () => {
  const env=database();
  const comment=input({body:'<img src=x onerror=alert(1)>\nThanks!'});
  const post=await send(env,'POST',comment); assert.equal(post.response.status,201);
  assert.equal(post.body.comment.name,'Anonymous'); assert.equal(post.body.comment.body,comment.body);
  const page=await send(env,'GET',{target,page:1}); assert.equal(page.body.total,1); assert.equal(page.body.comments.length,1);
  assert.deepEqual(Object.keys(page.body.comments[0]).sort(),['body','createdAt','id','name']);
  for(const other of [{target,page:0},{target,page:2},{target:'year-4:year4-chapter-15',page:1}]) assert.equal((await send(env,'GET',other)).body.total,0);
  const row=env.sql.prepare('SELECT * FROM page_comments').get(); assert.match(row.network_hash,/^[a-f0-9]{64}$/); assert.match(row.visitor_hash,/^[a-f0-9]{64}$/); assert(!JSON.stringify(row).includes('192.0.2.1'));
  env.sql.close();
});
test('lost-response retries stay idempotent; owner can hide a comment without deleting its record',async()=>{
  const env=database(),data=input();
  const first=await send(env,'POST',data); const retry=await send(env,'POST',data);
  assert.equal(first.body.comment.id,retry.body.comment.id); assert.equal((await send(env,'GET',{target,page:1})).body.total,1);
  assert.equal((await send(env,'POST',{...data,body:'Changed'})).response.status,409);
  env.sql.prepare("UPDATE page_comments SET status='hidden' WHERE id=?").run(first.body.comment.id);
  assert.equal((await send(env,'GET',{target,page:1})).body.total,0);
  assert.equal((await send(env,'POST',data)).response.status,409);
  assert.equal(env.sql.prepare('SELECT COUNT(*) n FROM page_comments').get().n,1);env.sql.close();
});
test('network rate limit remains effective when browser identifiers change',async()=>{
  const env=database();
  const requests=Array.from({length:8},()=>send(env,'POST',input({visitor:crypto.randomUUID()})));
  const responses=await Promise.all(requests);
  assert.equal(responses.filter(r=>r.response.status===201).length,5);
  assert.equal(responses.filter(r=>r.response.status===429).length,3);
  assert.equal((await send(env,'GET',{target,page:1})).body.total,5);env.sql.close();
});
test('pagination, hidden-row filtering, and safe query validation',async()=>{
  const env=database();
  const insert=env.sql.prepare("INSERT INTO page_comments(request_id,chapter,page,name,body,visitor_hash,network_hash) VALUES(?,?,?,?,?,?,?)");
  for(let i=0;i<25;i++)insert.run(crypto.randomUUID(),target,1,'Reader',`Comment ${i}`,'test','test');
  const first=(await send(env,'GET',{target,page:1})).body;assert.equal(first.comments.length,20);assert.equal(first.total,25);assert(first.nextCursor);
  const last=(await send(env,'GET',{target,page:1,before:first.nextCursor})).body;assert.equal(last.comments.length,5);assert.equal(last.nextCursor,null);
  assert(new Set([...first.comments,...last.comments].map(c=>c.id)).size===25);
  for(const bad of [{target,page:-1},{target,page:'x'},{target,page:1,before:'1 OR 1=1'}])assert.equal((await send(env,'GET',bad)).response.status,400);
  env.sql.close();
});
test('CORS, honeypot, length limits, and backend errors never publish invalid input',async()=>{
  const env=database();
  assert.equal((await send(env,'POST',input(),{Origin:'https://other.example'})).response.status,403);
  for(const changes of [{body:' '},{body:'x'.repeat(2001)},{name:'n'.repeat(41)},{website:'spam'},{page:-1},{visitor:'bad'}])assert.equal((await send(env,'POST',input(changes))).response.status,400);
  assert.equal(env.sql.prepare('SELECT COUNT(*) n FROM page_comments').get().n,0);
  assert.equal((await send({DB:{prepare(){throw Error('offline')}}},'GET',{target,page:1})).response.status,503);env.sql.close();
});
test('short comic comments use separate story keys and preserve printed page numbers', async () => {
  const env = database();
  const keys = ['bv1dnne6peb3', 'bv1ecpm6zerj', 'bv1pjnb6ieja', 'bv1okxu6ret7', 'bv1hkx76peip', 'bv1iijc6ke1e'].map(id => `short-comics:${id}`);
  for (const key of keys) {
    const result = await send(env, 'GET', { target: key, page: 1 });
    assert.equal(result.response.status, 200); assert.equal(result.body.total, 0);
  }
  const post = await send(env, 'POST', input({ target: keys[5], page: 13 }));
  assert.equal(post.response.status, 201);
  assert.equal((await send(env, 'GET', { target: keys[5], page: 13 })).body.total, 1);
  for (const other of [{ target: keys[5], page: 11 }, { target: keys[0], page: 13 }, { target, page: 13 }]) {
    assert.equal((await send(env, 'GET', other)).body.total, 0);
  }
  assert.equal((await send(env, 'GET', { target: 'short-comics:bv1unknown00', page: 1 })).response.status, 400);
  env.sql.close();
});
