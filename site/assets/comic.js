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
  const anthology = data.kind === 'anthology';
  const entryLabel = anthology ? 'Short comic' : 'Chapter';
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
  if (anthology) {
    document.body.classList.add('short-comic-collection');
    $('.comic-hero .eyebrow').textContent = 'A SHORT COMIC COLLECTION';
    const byline = $('.byline'); byline.replaceChildren();
    for (const [label, person] of [['ORIGINAL COMICS', data.artist], ['ENGLISH TRANSLATION & COLOURING', data.translator]]) {
      const line = document.createElement('span'); line.append(`${label} BY `);
      const link = document.createElement('a'); link.href = person.url; link.textContent = person.name;
      link.target = '_blank'; link.rel = 'noopener noreferrer'; line.append(link); byline.append(line);
    }
    $('#begin-story').textContent = 'Read the first comic →';
    $('.section-heading .eyebrow').textContent = 'THE SHORT COMICS';
    $('#story-note-title').textContent = 'Meet the original creator.';
    $('.story-note .eyebrow').textContent = 'ORIGINAL COMICS & CREDITS';
    $('#original-story').textContent = 'Watch the original on bilibili ↗';
  }
  const first = data.chapters[0];
  const beginUrl = library.readerUrl(data.id, first.id);
  $('#begin-story').href = beginUrl;
  $('#hero-art').href = beginUrl;
  $('#hero-art').setAttribute('aria-label', `Read ${data.title}`);
  $('#hero-image').src = data.preview;
  $('#hero-image').alt = `${data.title}, ${first.hasCover ? 'cover' : 'first comic page'}`;
  $('#art-caption').textContent = anthology ? `${data.chapters.length} SHORT COMICS · ${data.totalPages} PAGES` : (first.hasCover ? 'EVERY STORY HAS A FIRST CHAPTER' : (data.complete ? `THE COMPLETE ${data.totalPages}-PAGE COMIC` : `${data.totalPages} COMIC PAGES · ${data.chapters.length} CHAPTERS`));
  if (data.complete) $('#chapters-title').textContent = anthology ? 'Six little stories.' : 'The complete story.';
  const grid = $('#chapter-grid');
  if (data.chapters.length === 1) grid.classList.add('single-chapter');
  const chapterOrder = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
  const compareChapterNumbers = (a, b) => chapterOrder.compare(String(a), String(b));
  const comicNumbers = new Set(data.chapters.map(chapter => chapter.number));
  const novelOnly = (data.novelOnlyChapters || [])
    .filter(chapter => !comicNumbers.has(chapter.number) && (chapter.status === 'skipped' || compareChapterNumbers(chapter.number, data.throughChapter) <= 0))
    .sort((a, b) => compareChapterNumbers(a.number, b.number));
  if (novelOnly.length) {
    const section = document.createElement('section');
    section.className = 'novel-only-section';
    section.id = 'novel-only-chapters';
    section.setAttribute('aria-labelledby', 'novel-only-title');
    const panel = document.createElement('div'); panel.className = 'novel-only-chapters';
    const heading = document.createElement('h2'); heading.id = 'novel-only-title'; heading.textContent = 'Novel-only chapters';
    const explanation = document.createElement('p');
    explanation.textContent = 'These original-novel chapters are not included in the comic adaptation.';
    const list = document.createElement('ul');
    novelOnly.forEach(item => {
      const entry = document.createElement('li');
      const number = document.createElement('span'); number.textContent = `Chapter ${item.number}`;
      const status = document.createElement('span'); status.className = 'adaptation-status'; status.textContent = 'Not Adapted';
      entry.append(number, status); list.append(entry);
    });
    const original = document.createElement('a'); original.className = 'text-link'; original.href = data.storyUrl; original.target = '_blank'; original.rel = 'noopener noreferrer'; original.textContent = 'Read the original novel ↗';
    panel.append(heading, explanation, list, original); section.append(panel); $('#chapters').after(section);
  }
  data.chapters.forEach(chapter => {
    const article = document.createElement('article');
    article.className = 'chapter-card';
    const link = document.createElement('a');
    link.href = library.readerUrl(data.id, chapter.id);
    link.className = 'chapter-card-link';
    const imageWrap = document.createElement('div'); imageWrap.className = 'chapter-cover';
    const image = document.createElement('img');
    image.src = chapter.thumbnail;
    image.alt = `${entryLabel} ${chapter.number}: ${chapter.title}, ${chapter.hasCover ? 'cover' : 'first page'}`;
    image.width = 480; image.height = 720; image.loading = 'lazy';
    imageWrap.append(image);
    const overlay = document.createElement('span'); overlay.className = 'cover-action'; overlay.textContent = anthology ? 'Read comic →' : 'Read chapter →'; imageWrap.append(overlay);
    const meta = document.createElement('p'); meta.className = 'chapter-meta'; meta.textContent = `${entryLabel.toUpperCase()} ${chapter.number} / ${chapter.pageCount} PAGES`;
    const heading = document.createElement('h3'); heading.textContent = data.id === 'year-4' ? `Chapter ${chapter.number}` : chapter.title;
    link.append(imageWrap, meta, heading); article.append(link);
    const story = document.createElement('a'); story.href = chapter.storyUrl; story.className = 'chapter-story'; story.textContent = anthology ? 'Original on bilibili ↗' : 'Original chapter ↗'; story.target = '_blank'; story.rel = 'noopener noreferrer'; article.append(story);
    grid.append(article);
  });
  $('#story-setting').textContent = data.setting.toUpperCase();
  $('#collection-count').textContent = anthology ? `${data.chapters.length} SHORT COMICS` : `${data.chapters.length} ${novelOnly.length ? 'COMIC ' : ''}${data.chapters.length === 1 ? 'CHAPTER' : 'CHAPTERS'}`;
  $('#publication-note').textContent = data.publicationNote || (data.complete ? `The complete comic · ${data.totalPages} pages.` : `Available through Chapter ${data.throughChapter}. More chapters will be added by the artist.`);
  $('#story-credit').textContent = anthology ? data.credits : `Read the original story by ${data.author.name}.`;
  $('#original-story').href = data.storyUrl;
  window.ReaderComments?.show({ comic: data });
  const saved = library.progress(data.id);
  if (saved) {
    const chapter = data.chapters.find(item => item.id === saved.chapter);
    const resume = $('#resume-link');
    resume.href = library.readerUrl(data.id, saved.chapter, saved.page);
    resume.textContent = `Continue ${entryLabel} ${chapter.number} · ${chapter.pages[saved.page].label} ↗`;
    resume.hidden = false;
  }
})();
