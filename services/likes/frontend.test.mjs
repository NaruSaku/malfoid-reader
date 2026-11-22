import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const code = readFileSync(new URL('../../site/assets/likes.js', import.meta.url), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
function setup({ storage = true, endpoint = 'https://likes.example/v1/likes' } = {}) {
  const make = () => ({ hidden: true, disabled: false, textContent: '', attributes: {}, events: {},
    setAttribute(k, v) { this.attributes[k] = v; }, addEventListener(k, fn) { this.events[k] = fn; },
    classList: { toggle() {} } });
  const button = make(), count = make(), label = make(), status = make(), root = make();
  root.querySelector = key => ({ button, '.likes-count': count, '.likes-label': label, '.likes-status': status })[key];
  const saved = new Map(), requests = [], events = {};
  const window = { MALFOID_LIKES: { endpoint }, addEventListener(k, fn) { events[k] = fn; } };
  vm.runInNewContext(code, { window, document: { querySelector: () => root }, URL, AbortSignal, Intl, crypto,
    localStorage: { getItem: k => saved.get(k), setItem(k, v) { if (!storage) throw Error('blocked'); saved.set(k, v); }, removeItem: k => saved.delete(k) },
    fetch: (url, options) => new Promise(resolve => requests.push({ url, options, resolve })) });
  const show = number => window.ReaderLikes.show({ comic: { id: 'draconia' }, chapter: { id: `chapter-${number}`, number } });
  const answer = (i, value, ok = true) => requests[i].resolve({ ok, json: async () => value });
  return { window, button, count, label, status, root, saved, requests, events, show, answer };
}
test('pages/modes keep one chapter vote and late responses cannot overwrite a new chapter', async () => {
  const ui = setup();
  ui.show('1'); ui.show('1'); assert.equal(ui.requests.length, 1);
  ui.show('2'); assert.equal(ui.requests.length, 2);
  ui.answer(1, { target: 'draconia:chapter-2', count: 8, liked: false }); await tick();
  ui.answer(0, { target: 'draconia:chapter-1', count: 99, liked: true }); await tick();
  assert.equal(ui.count.textContent, '8');
  assert.match(ui.button.attributes['aria-label'], /Chapter 2/);
  assert.equal(ui.button.attributes['aria-pressed'], 'false');
});
test('an ambiguous write failure re-reads the server before enabling another toggle', async () => {
  const ui = setup(); ui.show('1');
  ui.answer(0, { target: 'draconia:chapter-1', count: 3, liked: false }); await tick();
  const click = ui.button.events.click();
  assert.equal(ui.button.disabled, true);
  assert.equal(ui.count.textContent, '3');
  assert.equal(JSON.parse(ui.requests[1].options.body).liked, true);
  assert(ui.saved.has('malfoid.likes.visitor.v1'));
  ui.answer(1, null, false); await click;
  assert.equal(ui.button.disabled, true); assert.match(ui.status.textContent, /Retry/);
  ui.status.events.click();
  assert.equal(ui.requests[2].options.method, undefined);
  ui.answer(2, { target: 'draconia:chapter-1', count: 4, liked: true }); await tick();
  assert.equal(ui.button.disabled, false); assert.equal(ui.count.textContent, '4');
  assert.equal(ui.button.attributes['aria-pressed'], 'true');
  const unlike = ui.button.events.click();
  assert.equal(JSON.parse(ui.requests[3].options.body).liked, false);
  ui.answer(3, { target: 'draconia:chapter-1', count: 3, liked: false }); await unlike;
  assert.equal(ui.count.textContent, '3'); assert.equal(ui.label.textContent, 'Like');
});
test('unconfigured backend stays hidden; blocked storage allows reading counts but disables voting', async () => {
  const hidden = setup({ endpoint: '' }); assert.equal(hidden.root.hidden, true); assert.equal(hidden.window.ReaderLikes, undefined);
  const ui = setup({ storage: false }); ui.show('1');
  ui.answer(0, { target: 'draconia:chapter-1', count: 5, liked: false }); await tick();
  assert.equal(ui.count.textContent, '5'); assert.equal(ui.button.disabled, true);
  assert.match(ui.status.textContent, /storage/);
});
test('offline loads and malformed responses never display a fabricated zero', async () => {
  const ui = setup(); ui.show('1'); ui.answer(0, null, false); await tick();
  assert.equal(ui.count.textContent, '—'); assert.equal(ui.button.disabled, true);
  ui.status.events.click(); ui.answer(1, { target: 'wrong', count: 0, liked: false }); await tick();
  assert.equal(ui.count.textContent, '—'); assert.equal(ui.button.disabled, true);
});
test('short comics keep their own stable vote key and label', async () => {
  const ui = setup();
  const context = { comic: { id: 'short-comics', kind: 'anthology' }, chapter: { id: 'bv1iijc6ke1e', number: '6' } };
  ui.window.ReaderLikes.show(context); ui.window.ReaderLikes.show(context);
  assert.equal(ui.requests.length, 1);
  assert.equal(new URL(ui.requests[0].url).searchParams.get('target'), 'short-comics:bv1iijc6ke1e');
  ui.answer(0, { target: 'short-comics:bv1iijc6ke1e', count: 7, liked: false }); await tick();
  assert.equal(ui.count.textContent, '7');
  assert.match(ui.button.attributes['aria-label'], /Short comic 6/);
  const click = ui.button.events.click();
  assert.equal(JSON.parse(ui.requests[1].options.body).target, 'short-comics:bv1iijc6ke1e');
  ui.answer(1, { target: 'short-comics:bv1iijc6ke1e', count: 8, liked: true }); await click;
  assert.equal(ui.count.textContent, '8');
});
