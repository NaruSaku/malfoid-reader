'use strict';
(() => {
  const catalog = window.MALFOID;
  const comic = id => catalog?.comics?.find(item => item.id === id);
  const projectUrl = id => `comic.html?comic=${encodeURIComponent(id)}`;
  const pageEdition = (id, chapter) => comic(id)?.chapterPageNumberingVersions?.[chapter] ?? comic(id)?.pageNumberingVersion;
  const migratePage = (id, chapter, page, edition) => {
    const current = pageEdition(id, chapter);
    return Number.isInteger(page) && page >= 0 && current >= 2 && Number(edition) !== current ? page + 1 : page;
  };
  const readerUrl = (id, chapter, page = 0) => {
    const edition = pageEdition(id, chapter);
    return `reader.html?comic=${encodeURIComponent(id)}&chapter=${encodeURIComponent(chapter)}&page=${page}${edition ? `&edition=${edition}` : ''}`;
  };
  const progress = id => {
    try {
      // The original storage key belongs to Draconia, including still-open old readers.
      const raw = (id === 'draconia' ? localStorage.getItem('malfoid.progress') : null) || localStorage.getItem(`malfoid.progress.${id}`);
      const saved = JSON.parse(raw);
      const selected = comic(id)?.chapters.find(chapter => chapter.id === saved?.chapter);
      if (selected && Number.isInteger(saved.page)) {
        saved.page = migratePage(id, selected.id, saved.page, saved.edition);
        const edition = pageEdition(id, selected.id);
        if (edition) saved.edition = edition;
      }
      return selected && Number.isInteger(saved.page) && saved.page >= 0 && saved.page < selected.pages.length ? saved : null;
    } catch { return null; }
  };
  window.ReaderLibrary = { catalog, comic, projectUrl, readerUrl, progress, pageEdition, migratePage };
})();
