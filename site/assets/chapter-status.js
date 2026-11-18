'use strict';
(() => {
  const id = new URLSearchParams(location.search).get('comic') || 'draconia';
  const comic = window.ReaderLibrary?.comic(id);
  if (!comic) return;
  document.querySelectorAll('.chapter-card').forEach(card => {
    const link = card.querySelector('.chapter-card-link');
    const chapterId = new URL(link.href).searchParams.get('chapter');
    const chapter = comic.chapters.find(item => item.id === chapterId);
    if (!chapter?.inProgress) return;
    const note = document.createElement('p');
    note.className = 'chapter-status';
    note.textContent = chapter.publicationNote;
    link.append(note);
  });
})();
