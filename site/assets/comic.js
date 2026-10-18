'use strict';
(() => {
  const library = window.ReaderLibrary;
  const id = new URLSearchParams(location.search).get('comic') || 'draconia';
  const data = library.comic(id);
  const $ = selector => document.querySelector(selector);
  if (!data) {
    $('#main').replaceChildren();
    const message = document.createElement('p');
    message.className = 'reader-error';
    message.textContent = 'This comic is not in the collection. ';
    const back = document.createElement('a');
    back.href = './'; back.textContent = 'Browse all comics →';
    message.append(back); $('#main').append(message);
    return;
  }
  document.title = `${data.title} — Malfoid Reader`;
  document.querySelector('meta[name="description"]').content = data.description;
  $('#breadcrumb-title').textContent = data.shortTitle;
  const title = $('#book-title');
  data.headingLines.forEach((line, index) => {
    if (index) title.append(document.createElement('br'));
    const element = document.createElement(line.emphasis ? 'em' : 'span');
    if (line.small) element.className = 'title-connector';
    element.textContent = line.text;
    title.append(element);
  });
  $('#hero-description').textContent = data.heroDescription;
  for (const key of ['artist', 'author']) {
    $(`#${key}-link`).textContent = data[key].name;
    $(`#${key}-link`).href = data[key].url;
  }
  const first = data.chapters[0];
  const beginUrl = library.readerUrl(data.id, first.id);
  $('#begin-story').href = beginUrl;
  $('#hero-art').href = beginUrl;
  $('#hero-art').setAttribute('aria-label', `Read ${data.title}`);
  $('#hero-image').src = data.preview;
  $('#hero-image').alt = `${data.title}, ${first.hasCover ? 'cover' : 'first comic page'}`;
  $('#art-caption').textContent = first.hasCover ? 'EVERY STORY HAS A FIRST CHAPTER' : `THE COMPLETE ${data.totalPages}-PAGE COMIC`;
  if (data.complete) $('#chapters-title').textContent = 'The complete story.';
  const grid = $('#chapter-grid');
  if (data.chapters.length === 1) grid.classList.add('single-chapter');
  data.chapters.forEach(chapter => {
    const article = document.createElement('article');
    article.className = 'chapter-card';
    const link = document.createElement('a');
    link.href = library.readerUrl(data.id, chapter.id);
    link.className = 'chapter-card-link';
    const imageWrap = document.createElement('div'); imageWrap.className = 'chapter-cover';
    const image = document.createElement('img');
    image.src = chapter.thumbnail;
    image.alt = `Chapter ${chapter.number}: ${chapter.title}, ${chapter.hasCover ? 'cover' : 'first page'}`;
    image.width = 480; image.height = 720; image.loading = 'lazy';
    imageWrap.append(image);
    const overlay = document.createElement('span'); overlay.className = 'cover-action'; overlay.textContent = 'Read chapter →'; imageWrap.append(overlay);
    const meta = document.createElement('p'); meta.className = 'chapter-meta'; meta.textContent = `CHAPTER ${chapter.number} / ${chapter.pageCount} PAGES`;
    const heading = document.createElement('h3'); heading.textContent = chapter.title;
    const description = document.createElement('p'); description.className = 'chapter-description'; description.textContent = chapter.description;
    link.append(imageWrap, meta, heading, description); article.append(link);
    const story = document.createElement('a'); story.href = chapter.storyUrl; story.className = 'chapter-story'; story.textContent = 'Original chapter ↗'; story.target = '_blank'; story.rel = 'noopener noreferrer'; article.append(story);
    grid.append(article);
  });
  $('#story-setting').textContent = data.setting.toUpperCase();
  $('#collection-count').textContent = `${data.chapters.length} ${data.chapters.length === 1 ? 'CHAPTER' : 'CHAPTERS'}`;
  $('#publication-note').textContent = data.complete ? `The complete comic · ${data.totalPages} pages.` : `Available through Chapter ${data.throughChapter}. More chapters will be added by the artist.`;
  $('#story-credit').textContent = `Read the original story by ${data.author.name}.`;
  $('#original-story').href = data.storyUrl;
  const saved = library.progress(data.id);
  if (saved) {
    const chapter = data.chapters.find(item => item.id === saved.chapter);
    const resume = $('#resume-link');
    resume.href = library.readerUrl(data.id, saved.chapter, saved.page);
    resume.textContent = `Continue Chapter ${chapter.number} · ${chapter.pages[saved.page].label} ↗`;
    resume.hidden = false;
  }
})();
