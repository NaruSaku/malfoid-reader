'use strict';
(() => {
  const section = document.querySelector('#comments');
  if (!section) return;
  const config = window.MALFOID_COMMENTS;
  const widget = section.querySelector('.giscus');
  const status = section.querySelector('.comments-status');
  const loadButton = section.querySelector('.comments-load');
  const discussionLink = section.querySelector('.comments-github');
  const origin = 'https://giscus.app';
  let contextKey = '';
  let requested = false;
  let observer;
  let timeout;
  let anchorHandled = false;
  let loadVersion = 0;

  const theme = () => document.body.classList.contains('reader-light') ? 'light' : 'transparent_dark';
  const frame = () => widget.querySelector('iframe.giscus-frame');
  const message = value => frame()?.contentWindow?.postMessage({ giscus: value }, origin);
  const unavailable = () => {
    clearTimeout(timeout);
    status.textContent = 'Comments could not load. Try again, or open the discussions on GitHub.';
    loadButton.hidden = false;
    loadButton.textContent = 'Try loading comments again';
  };
  const load = () => {
    if (!contextKey || section.hidden) return;
    observer?.disconnect();
    clearTimeout(timeout);
    if (!config?.repoId || !config?.categoryId) {
      status.textContent = 'Comments are being set up. You can visit the discussions on GitHub.';
      loadButton.hidden = true;
      return;
    }
    requested = true;
    const version = ++loadVersion;
    widget.replaceChildren();
    status.textContent = 'Loading comments…';
    loadButton.hidden = true;
    const script = document.createElement('script');
    script.src = `${origin}/client.js`;
    script.async = true;
    script.crossOrigin = 'anonymous';
    const attributes = {
      repo: config.repo, 'repo-id': config.repoId,
      category: config.category, 'category-id': config.categoryId,
      mapping: 'specific', term: contextKey, strict: '1',
      'reactions-enabled': '1', 'emit-metadata': '1',
      'input-position': 'top', theme: theme(), lang: 'en', loading: 'lazy'
    };
    for (const [key, value] of Object.entries(attributes)) script.setAttribute(`data-${key}`, value);
    script.addEventListener('error', () => {
      if (version === loadVersion) unavailable();
    });
    script.addEventListener('load', () => {
      if (version === loadVersion) {
        clearTimeout(timeout);
        status.textContent = '';
      }
    });
    widget.append(script);
    timeout = setTimeout(() => {
      if (version === loadVersion) unavailable();
    }, 12000);
  };
  loadButton.addEventListener('click', load);

  const show = ({ comic, chapter, visible = true }) => {
    const nextKey = chapter ? `malfoid-reader/${comic.id}/${chapter.id}` : `malfoid-reader/${comic.id}`;
    if (nextKey !== contextKey) {
      observer?.disconnect();
      clearTimeout(timeout);
      loadVersion++;
      contextKey = nextKey;
      requested = false;
      widget.replaceChildren();
      status.textContent = '';
      loadButton.hidden = false;
      loadButton.textContent = 'Load comments';
      section.querySelector('.comments-context').textContent = chapter ? `${comic.shortTitle} · Chapter ${chapter.number}: ${chapter.title}` : comic.title;
      section.querySelector('.comments-description').textContent = chapter ? 'Share your thoughts on this chapter. Please mark spoilers for later chapters.' : 'Talk about the comic, share a favorite moment, or leave a note for the artist.';
      section.dataset.discussion = contextKey;
      discussionLink.href = `https://github.com/${config.repo}/discussions`;
      discussionLink.textContent = 'Open GitHub discussions ↗';
      // Keep newly created discussion backlinks independent of the current page number.
      let backlink = document.querySelector('meta[name="giscus:backlink"]');
      if (!backlink) {
        backlink = document.createElement('meta');
        backlink.name = 'giscus:backlink';
        document.head.append(backlink);
      }
      const url = new URL(chapter ? 'reader.html' : 'comic.html', location.href);
      url.searchParams.set('comic', comic.id);
      if (chapter) {
        url.searchParams.set('chapter', chapter.id);
        url.searchParams.set('page', String(chapter.pages.length - 1));
      }
      url.hash = 'comments';
      backlink.content = url.href;
    }
    section.hidden = !visible;
    if (visible && !anchorHandled && location.hash === '#comments') {
      anchorHandled = true;
      requestAnimationFrame(() => section.scrollIntoView({ block: 'start', behavior: 'instant' }));
    }
    if (!visible || requested) return;
    if (!('IntersectionObserver' in window)) { load(); return; }
    observer?.disconnect();
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) load();
    }, { rootMargin: '240px 0px' });
    observer.observe(section);
  };

  window.addEventListener('message', event => {
    if (event.origin !== origin || event.source !== frame()?.contentWindow) return;
    const data = event.data?.giscus;
    if (!data || typeof data !== 'object') return;
    // giscus replaces its script with the iframe, so use its ready/resize message too.
    if (Number.isFinite(Number(data.resizeHeight)) && Number(data.resizeHeight) > 0) {
      clearTimeout(timeout);
      status.textContent = '';
      loadButton.hidden = true;
    }
    if (data.discussion?.url) {
      try {
        const url = new URL(data.discussion.url);
        if (url.origin === 'https://github.com' && url.pathname.startsWith(`/${config.repo}/discussions/`)) {
          discussionLink.href = url.href;
          discussionLink.textContent = 'Open this discussion on GitHub ↗';
        }
      } catch {}
    }
  });
  // The iframe keeps the current discussion and any draft when the reading theme changes.
  new MutationObserver(() => message({ setConfig: { theme: theme() } })).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  window.ReaderComments = { show };
})();
