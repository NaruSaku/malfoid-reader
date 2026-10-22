'use strict';
(() => {
  const library = window.ReaderLibrary;
  const grid = document.querySelector('#comic-grid');
  if (!library?.catalog?.comics || !grid) return;
  library.catalog.comics.forEach(comic => {
    const article = document.createElement('article');
    article.className = 'comic-card';
    const link = document.createElement('a');
    link.href = library.projectUrl(comic.id);
    link.className = 'comic-entry';
    const imageWrap = document.createElement('div');
    imageWrap.className = 'comic-preview';
    const image = document.createElement('img');
    image.src = comic.thumbnail;
    image.alt = `${comic.title}, ${comic.chapters[0].hasCover ? 'cover' : 'first comic page'}`;
    image.width = 480;
    image.height = 720;
    image.loading = 'eager';
    imageWrap.append(image);
    const copy = document.createElement('div'); copy.className = 'comic-entry-copy';
    const meta = document.createElement('p');
    meta.className = 'comic-status';
    meta.textContent = comic.publicationLabel || (comic.complete ? 'COMPLETE ONE-SHOT' : `THROUGH CHAPTER ${comic.throughChapter}`);
    const title = document.createElement('h2');
    title.textContent = comic.title;
    copy.append(meta, title);
    if (comic.tagline) { const tagline = document.createElement('p'); tagline.className = 'comic-tagline'; tagline.textContent = comic.tagline; copy.append(tagline); }
    const description = document.createElement('p');
    description.className = 'comic-description';
    description.textContent = comic.description;
    const stats = document.createElement('p'); stats.className = 'comic-stats'; stats.textContent = `${comic.chapters.length} ${comic.chapters.length === 1 ? 'chapter' : 'chapters'} · ${comic.totalPages} pages`;
    const action = document.createElement('span'); action.className = 'comic-open'; action.textContent = 'View chapters →';
    copy.append(description, stats, action);
    link.append(imageWrap, copy);
    article.append(link);
    const footer = document.createElement('div'); footer.className = 'comic-card-footer';
    const story = document.createElement('a');
    story.href = comic.storyUrl;
    story.textContent = `Story by ${comic.author.name} ↗`;
    story.target = '_blank';
    story.rel = 'noopener noreferrer';
    footer.append(story);
    const saved = library.progress(comic.id);
    if (saved) {
      const resume = document.createElement('a');
      resume.href = library.readerUrl(comic.id, saved.chapter, saved.page);
      resume.className = 'comic-continue'; resume.textContent = 'Continue reading ↗'; footer.append(resume);
    }
    article.append(footer);
    grid.append(article);
  });
  document.querySelector('#comic-count').textContent = String(library.catalog.comics.length).padStart(2, '0');
})();
