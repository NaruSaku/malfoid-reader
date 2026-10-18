'use strict';
(() => {
  const catalog = window.MALFOID;
  const comic = id => catalog?.comics?.find(item => item.id === id);
  const projectUrl = id => `comic.html?comic=${encodeURIComponent(id)}`;
  const readerUrl = (id, chapter, page = 0) => `reader.html?comic=${encodeURIComponent(id)}&chapter=${encodeURIComponent(chapter)}&page=${page}`;
  const progress = id => {
    try {
      // The original storage key belongs to Draconia, including still-open old readers.
      const raw = (id === 'draconia' ? localStorage.getItem('malfoid.progress') : null) || localStorage.getItem(`malfoid.progress.${id}`);
      const saved = JSON.parse(raw);
      const selected = comic(id)?.chapters.find(chapter => chapter.id === saved?.chapter);
      return selected && Number.isInteger(saved.page) && saved.page >= 0 && saved.page < selected.pages.length ? saved : null;
    } catch { return null; }
  };
  window.ReaderLibrary = { catalog, comic, projectUrl, readerUrl, progress };
})();
