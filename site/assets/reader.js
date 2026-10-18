'use strict';
(() => {
  const library = window.ReaderLibrary;
  const comicId = new URLSearchParams(location.search).get('comic') || 'draconia';
  const data = library?.comic(comicId);
  const container = document.querySelector('#comic-pages');
  if (!data?.chapters?.length) {
    container.textContent = 'This comic is not in the collection. ';
    const back = document.createElement('a'); back.href = './'; back.textContent = 'Browse all comics →'; container.append(back);
    document.querySelector('.reader-tools').hidden = true;
    document.querySelector('.page-navigation').hidden = true;
    document.querySelector('#original-chapter').hidden = true;
    return;
  }
  const $ = selector => document.querySelector(selector);
  const readStorage = (key, fallback) => { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } };
  const writeStorage = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
  let chapterIndex = 0;
  let pageIndex = 0;
  let mode = readStorage('malfoid.mode', 'page') === 'scroll' ? 'scroll' : 'page';
  let scrollFrame = 0;
  let scrollTrackingAfter = 0;
  const chapterSelect = $('#chapter-select');
  const pageSelect = $('#page-select');
  const chapter = () => data.chapters[chapterIndex];
  $('#reader-home').href = `${library.projectUrl(data.id)}#chapters`;
  $('#reader-comic-name').textContent = data.shortTitle;
  $('#end-chapters').href = `${library.projectUrl(data.id)}#chapters`;
  $('#end-heading').textContent = data.complete ? 'The end.' : 'Until the next chapter.';
  $('#end-description').textContent = data.complete ? `Thank you for reading ${data.title}.` : 'Read ahead in the original story.';
  const scrollToCurrentPage = () => {
    const target = document.querySelector(`#comic-page-${pageIndex}`);
    if (!target) return;
    // Ignore delayed scroll events from a deliberate page jump or mode change.
    scrollTrackingAfter = performance.now() + 400;
    const headerHeight = document.querySelector('.reader-header').getBoundingClientRect().bottom;
    const toolsHeight = document.querySelector('.reader-tools').getBoundingClientRect().height;
    window.scrollTo({ top: window.scrollY + target.getBoundingClientRect().top - headerHeight - toolsHeight - 12, behavior: 'instant' });
  };

  data.chapters.forEach(item => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = `Chapter ${item.number} · ${item.title}`;
    chapterSelect.append(option);
  });
  const applyLocation = () => {
    const params = new URLSearchParams(location.search);
    const found = data.chapters.findIndex(item => item.id === params.get('chapter'));
    chapterIndex = found < 0 ? 0 : found;
    const requested = Number(params.get('page') || 0);
    pageIndex = Number.isInteger(requested) ? Math.max(0, Math.min(requested, chapter().pages.length - 1)) : 0;
  };
  const save = () => {
    const progress = JSON.stringify({ chapter: chapter().id, page: pageIndex });
    writeStorage(`malfoid.progress.${data.id}`, progress);
    if (data.id === 'draconia') writeStorage('malfoid.progress', progress);
    const url = new URL(location.href);
    url.searchParams.set('chapter', chapter().id);
    url.searchParams.set('page', pageIndex);
    if (data.id !== 'draconia' || url.searchParams.has('comic')) url.searchParams.set('comic', data.id);
    history.replaceState(null, '', url);
  };
  const updateNavigation = () => {
    const current = chapter();
    pageSelect.value = String(pageIndex);
    $('#page-total').textContent = `/ ${current.pageCount}`;
    $('#previous').disabled = chapterIndex === 0 && pageIndex === 0;
    $('#next').disabled = chapterIndex === data.chapters.length - 1 && pageIndex === current.pages.length - 1;
    $('#reader-end').hidden = !(chapterIndex === data.chapters.length - 1 && (mode === 'scroll' || pageIndex === current.pages.length - 1));
    $('#page-announcement').textContent = `Chapter ${current.number}, ${current.pages[pageIndex].label}`;
    document.title = `${current.pages[pageIndex].label} · ${data.shortTitle} · Chapter ${current.number} — Malfoid Reader`;
    save();
  };
  const openZoom = index => {
    const page = chapter().pages[index];
    $('#zoom-image').src = page.src;
    $('#zoom-image').alt = `Chapter ${chapter().number}, ${page.label}`;
    $('#zoom-caption').textContent = `Chapter ${chapter().number} · ${page.label} · Full size`;
    $('#zoom-dialog').showModal();
    document.body.classList.add('zoom-open');
  };
  const makePage = index => {
    const page = chapter().pages[index];
    const figure = document.createElement('figure');
    figure.className = 'comic-figure';
    figure.dataset.page = index;
    figure.id = `comic-page-${index}`;
    const button = document.createElement('button');
    button.className = 'comic-zoom-button';
    button.setAttribute('aria-label', `Enlarge ${page.label.toLowerCase()}`);
    const image = document.createElement('img');
    image.src = page.src;
    image.width = 1024;
    image.height = 1536;
    image.alt = `Chapter ${chapter().number}: ${chapter().title}, ${page.label}`;
    image.loading = index === pageIndex ? 'eager' : 'lazy';
    image.decoding = 'async';
    if (index === pageIndex) image.fetchPriority = 'high';
    button.append(image);
    button.addEventListener('click', () => openZoom(index));
    image.addEventListener('error', () => {
      button.hidden = true;
      const error = document.createElement('p');
      error.className = 'reader-error';
      error.textContent = 'This page could not load. ';
      const retry = document.createElement('button');
      retry.textContent = 'Try again';
      retry.addEventListener('click', () => { button.hidden = false; error.remove(); image.src = page.src; });
      error.append(retry);
      figure.append(error);
    });
    const caption = document.createElement('figcaption');
    caption.textContent = page.label;
    figure.append(button, caption);
    return figure;
  };
  const render = (scrollToPage = true) => {
    cancelAnimationFrame(scrollFrame);
    chapterSelect.value = chapter().id;
    $('#reader-title').textContent = `Chapter ${chapter().number}: ${chapter().title}`;
    $('#original-chapter').href = chapter().storyUrl;
    $('#end-story').href = data.storyUrl;
    $('#mode-page').setAttribute('aria-pressed', String(mode === 'page'));
    $('#mode-scroll').setAttribute('aria-pressed', String(mode === 'scroll'));
    document.body.classList.toggle('scroll-mode', mode === 'scroll');
    pageSelect.replaceChildren();
    chapter().pages.forEach((page, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = page.label;
      pageSelect.append(option);
    });
    container.replaceChildren();
    if (mode === 'page') {
      container.append(makePage(pageIndex));
      if (scrollToPage) window.scrollTo({ top: 0, behavior: 'instant' });
      // Fetch only the next page, rather than the entire chapter.
      if (pageIndex + 1 < chapter().pages.length) {
        const next = new Image();
        next.src = chapter().pages[pageIndex + 1].src;
      }
    } else {
      chapter().pages.forEach((_, index) => container.append(makePage(index)));
      if (scrollToPage) scrollToCurrentPage();
    }
    updateNavigation();
  };
  const go = (targetChapter, targetPage) => {
    if (targetChapter < 0 || targetChapter >= data.chapters.length) return;
    const sameChapter = targetChapter === chapterIndex;
    chapterIndex = targetChapter;
    pageIndex = Math.max(0, Math.min(targetPage, chapter().pages.length - 1));
    if (mode === 'scroll' && sameChapter) {
      scrollToCurrentPage();
      updateNavigation();
    } else render();
  };
  const step = delta => {
    const next = pageIndex + delta;
    if (next < 0) go(chapterIndex - 1, data.chapters[chapterIndex - 1]?.pages.length - 1);
    else if (next >= chapter().pages.length) go(chapterIndex + 1, 0);
    else go(chapterIndex, next);
  };
  $('#previous').addEventListener('click', () => step(-1));
  $('#next').addEventListener('click', () => step(1));
  chapterSelect.addEventListener('change', () => go(data.chapters.findIndex(item => item.id === chapterSelect.value), 0));
  pageSelect.addEventListener('change', () => go(chapterIndex, Number(pageSelect.value)));
  for (const value of ['page', 'scroll']) {
    $(`#mode-${value}`).addEventListener('click', () => { mode = value; writeStorage('malfoid.mode', mode); render(); });
  }
  const setTheme = value => {
    const light = value === 'light';
    document.body.classList.toggle('reader-light', light);
    $('#theme-toggle').textContent = light ? 'Dark background ◐' : 'Light background ◐';
    $('#theme-toggle').setAttribute('aria-label', light ? 'Switch to dark background' : 'Switch to light background');
    writeStorage('malfoid.theme', value);
  };
  $('#theme-toggle').addEventListener('click', () => setTheme(document.body.classList.contains('reader-light') ? 'dark' : 'light'));
  $('#close-zoom').addEventListener('click', () => $('#zoom-dialog').close());
  $('#zoom-dialog').addEventListener('close', () => document.body.classList.remove('zoom-open'));
  document.addEventListener('keydown', event => {
    if ($('#zoom-dialog').open || /INPUT|SELECT|TEXTAREA|BUTTON/.test(event.target.tagName) || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowRight' || (mode === 'page' && event.key === 'PageDown')) { event.preventDefault(); step(1); }
    if (event.key === 'ArrowLeft' || (mode === 'page' && event.key === 'PageUp')) { event.preventDefault(); step(-1); }
  });
  window.addEventListener('popstate', () => { applyLocation(); render(); });
  window.addEventListener('scroll', () => {
    if (mode !== 'scroll' || performance.now() < scrollTrackingAfter) return;
    cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(() => {
      if (mode !== 'scroll' || performance.now() < scrollTrackingAfter) return;
      const readingLine = document.querySelector('.reader-tools').getBoundingClientRect().bottom + 35;
      const figures = [...container.querySelectorAll('.comic-figure')];
      const active = figures.find(figure => figure.getBoundingClientRect().bottom > readingLine) || figures.at(-1);
      if (!active) return;
      const selected = Number(active.dataset.page);
      if (selected !== pageIndex) { pageIndex = selected; updateNavigation(); }
    });
  }, { passive: true });
  setTheme(readStorage('malfoid.theme', 'dark'));
  applyLocation();
  render(false);
  if (mode === 'scroll' && pageIndex > 0) scrollToCurrentPage();
})();
