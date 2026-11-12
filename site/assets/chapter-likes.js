'use strict';
(() => {
  const endpoint = window.MALFOID_LIKES?.endpoint;
  const comicId = new URLSearchParams(location.search).get('comic') || 'draconia';
  const comic = window.ReaderLibrary?.comic(comicId);
  if (!endpoint || !comic) return;
  const chapters = new Map(comic.chapters.map(chapter => [chapter.id, chapter]));
  const cards = [];
  for (const link of document.querySelectorAll('.chapter-card-link')) {
    const chapterId = new URL(link.href, location.href).searchParams.get('chapter');
    const chapter = chapters.get(chapterId);
    const meta = link.querySelector('.chapter-meta');
    if (!chapter || !meta) continue;
    const row = document.createElement('div');
    row.className = 'chapter-meta-row';
    const likes = document.createElement('span');
    likes.className = 'chapter-like-count';
    likes.setAttribute('aria-label', `Like count for Chapter ${chapter.number} is loading`);
    const heart = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    heart.setAttribute('viewBox', '0 0 24 24');
    heart.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z');
    heart.append(path);
    const count = document.createElement('span');
    count.textContent = '—';
    likes.append(heart, count);
    meta.before(row); row.append(meta, likes);
    cards.push({ target: `${comic.id}:${chapter.id}`, number: chapter.number, likes, count });
  }
  const formatter = new Intl.NumberFormat('en');
  let loading = false;
  const load = async card => {
    try {
      const url = new URL(endpoint);
      url.searchParams.set('target', card.target);
      // Public totals only: listing chapters never creates an identifier or a vote.
      const response = await fetch(url, { credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('Likes unavailable');
      const result = await response.json();
      if (result.target !== card.target || !Number.isSafeInteger(result.count) || result.count < 0) throw new Error('Invalid count');
      const text = `${formatter.format(result.count)} ${result.count === 1 ? 'like' : 'likes'}`;
      card.count.textContent = formatter.format(result.count);
      card.likes.setAttribute('aria-label', `Chapter ${card.number}: ${text}`);
      card.likes.title = text;
    } catch {
      card.count.textContent = '—';
      card.likes.setAttribute('aria-label', `Likes for Chapter ${card.number} are temporarily unavailable`);
      card.likes.title = 'Likes temporarily unavailable';
    }
  };
  const refresh = async () => {
    if (loading || document.visibilityState === 'hidden') return;
    loading = true;
    const queue = [...cards];
    try {
      await Promise.all(Array.from({ length: Math.min(4, queue.length) }, async () => {
        while (queue.length) await load(queue.shift());
      }));
    } finally { loading = false; }
  };
  window.addEventListener('focus', refresh);
  window.addEventListener('pageshow', event => { if (event.persisted) refresh(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh(); });
  refresh();
})();
