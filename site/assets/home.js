'use strict';
(() => {
  const data = window.MALFOID;
  const grid = document.querySelector('#chapter-grid');
  if (!data || !grid) return;
  data.chapters.forEach((chapter, index) => {
    const article = document.createElement('article');
    article.className = 'chapter-card';
    const link = document.createElement('a');
    link.href = `reader.html?chapter=${encodeURIComponent(chapter.id)}&page=0`;
    link.className = 'chapter-card-link';
    const imageWrap = document.createElement('div');
    imageWrap.className = 'chapter-cover';
    const image = document.createElement('img');
    image.src = chapter.thumbnail;
    image.alt = `Chapter ${chapter.number}: ${chapter.title} cover`;
    image.width = 480;
    image.height = 720;
    image.loading = 'lazy';
    imageWrap.append(image);
    const overlay = document.createElement('span');
    overlay.className = 'cover-action';
    overlay.textContent = 'Read chapter →';
    imageWrap.append(overlay);
    const meta = document.createElement('p');
    meta.className = 'chapter-meta';
    meta.textContent = `CHAPTER ${chapter.number}  /  ${chapter.pageCount} PAGES`;
    const title = document.createElement('h3');
    title.textContent = chapter.title;
    const description = document.createElement('p');
    description.className = 'chapter-description';
    description.textContent = chapter.description;
    link.append(imageWrap, meta, title, description);
    article.append(link);
    const story = document.createElement('a');
    story.href = chapter.storyUrl;
    story.className = 'chapter-story';
    story.textContent = 'Original chapter ↗';
    story.target = '_blank';
    story.rel = 'noopener noreferrer';
    article.append(story);
    grid.append(article);
  });
  document.querySelector('#collection-count').textContent = `${data.chapters.length} CHAPTERS`;
  document.querySelector('#publication-note').textContent = `Available through Chapter ${data.throughChapter}.`;
  try {
    const saved = JSON.parse(localStorage.getItem('malfoid.progress'));
    const chapter = data.chapters.find(item => item.id === saved?.chapter);
    if (chapter && Number.isInteger(saved.page) && saved.page >= 0 && saved.page < chapter.pages.length) {
      const resume = document.querySelector('#resume-link');
      resume.href = `reader.html?chapter=${encodeURIComponent(chapter.id)}&page=${saved.page}`;
      resume.textContent = `Continue Chapter ${chapter.number} · ${chapter.pages[saved.page].label} ↗`;
      resume.hidden = false;
    }
  } catch { /* Reading stays available when browser storage is disabled. */ }
})();
