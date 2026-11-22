'use strict';
(() => {
  const root = document.querySelector('#chapter-likes');
  const endpoint = window.MALFOID_LIKES?.endpoint;
  if (!root || !endpoint) return;
  const button = root.querySelector('button');
  const count = root.querySelector('.likes-count');
  const label = root.querySelector('.likes-label');
  const status = root.querySelector('.likes-status');
  const storageKey = 'malfoid.likes.visitor.v1';
  const states = new Map();
  let current;
  let visitor = '';
  let storageAvailable = true;
  try {
    visitor = localStorage.getItem(storageKey) || '';
    if (visitor && !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(visitor)) visitor = '';
    const probe = `${storageKey}.probe`;
    localStorage.setItem(probe, '1'); localStorage.removeItem(probe);
  } catch { storageAvailable = false; }
  const paint = state => {
    if (state !== current) return;
    root.hidden = false;
    button.disabled = state.pending || !state.loaded || !storageAvailable;
    button.setAttribute('aria-pressed', String(Boolean(state.liked)));
    button.setAttribute('aria-label', `${state.liked ? 'Unlike' : 'Like'} ${state.entryLabel} ${state.number}${state.loaded ? ` · ${state.count} likes` : ''}`);
    count.textContent = state.loaded ? new Intl.NumberFormat('en').format(state.count) : '—';
    label.textContent = state.liked ? 'Liked' : 'Like';
    button.title = `${state.liked ? 'Unlike' : 'Like'} this ${state.entryLabel.toLowerCase()}. No sign-in needed.`;
    status.textContent = !storageAvailable ? 'Enable browser storage to like this chapter.' : (state.message || '');
    root.classList.toggle('likes-error', Boolean(state.message));
    status.disabled = !storageAvailable || state.pending;
  };
  const api = async (state, liked) => {
    const url = new URL(endpoint);
    const data = { target: state.target, ...(visitor ? { visitor } : {}) };
    const options = { credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(10000) };
    if (liked === undefined) {
      for (const [key, value] of Object.entries(data)) url.searchParams.set(key, value);
    } else {
      Object.assign(options, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, liked }) });
    }
    const response = await fetch(url, options);
    if (!response.ok) throw new Error('Likes unavailable');
    const result = await response.json();
    if (result.target !== state.target || !Number.isSafeInteger(result.count) || result.count < 0 || typeof result.liked !== 'boolean') throw new Error('Invalid like count');
    return result;
  };
  const load = async state => {
    if (state.pending) return;
    state.pending = true; paint(state);
    try {
      Object.assign(state, await api(state), { loaded: true, message: '' });
    } catch { state.message = 'Likes unavailable. Retry'; }
    finally { state.pending = false; paint(state); }
  };
  button.addEventListener('click', async () => {
    const state = current;
    if (!state || state.pending || !state.loaded || !storageAvailable) return;
    if (!visitor) {
      try { visitor = crypto.randomUUID(); localStorage.setItem(storageKey, visitor); }
      catch { storageAvailable = false; paint(state); return; }
    }
    state.pending = true; state.message = ''; paint(state);
    try {
      Object.assign(state, await api(state, !state.liked), { message: '' });
    } catch {
      // A response may be lost after a successful write. Re-read before another toggle.
      state.loaded = false; state.message = 'Could not confirm your like. Retry';
    } finally { state.pending = false; paint(state); }
  });
  status.addEventListener('click', () => { if (current?.message) load(current); });
  window.addEventListener('storage', event => {
    if (event.key !== storageKey) return;
    visitor = event.newValue || '';
    for (const state of states.values()) state.loaded = false;
    if (current) load(current);
  });
  window.addEventListener('focus', () => { if (current && !current.pending) load(current); });
  window.ReaderLikes = {
    show({ comic, chapter }) {
      const target = `${comic.id}:${chapter.id}`;
      if (current?.target === target) return;
      if (!states.has(target)) states.set(target, { target, number: chapter.number, entryLabel: comic.kind === 'anthology' ? 'Short comic' : 'Chapter', count: 0, liked: false, loaded: false, pending: false });
      current = states.get(target); paint(current);
      load(current);
    }
  };
})();
