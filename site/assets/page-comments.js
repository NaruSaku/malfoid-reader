'use strict';
(() => {
  const endpoint = window.MALFOID_PAGE_COMMENTS?.endpoint;
  if (!endpoint) return;
  const panels = new Map();
  const key = 'malfoid.comments.visitor.v1';
  const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
  const dateFormat = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' });
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const visitor = () => {
    try {
      let value = localStorage.getItem(key);
      if (!uuid.test(value || '')) { value = crypto.randomUUID(); localStorage.setItem(key, value); }
      return value;
    } catch {
      // A session-only identifier still allows a reader with blocked storage to comment.
      return sessionVisitor ||= crypto.randomUUID();
    }
  };
  let sessionVisitor;
  const updateCount = (state, count) => {
    state.total.textContent = count ? count.toLocaleString('en') : '+';
    state.trigger.classList.toggle('has-comments', count > 0);
    const label = `Comments for ${state.label.toLowerCase()} · ${count} ${count === 1 ? 'comment' : 'comments'}`;
    state.trigger.setAttribute('aria-label', label);
    state.trigger.title = label;
  };
  const countObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      countObserver.unobserve(entry.target);
      const state = [...panels.values()].find(panel => panel.trigger === entry.target);
      if (!state || state.loaded || state.previewRequest) continue;
      // Load only nearby page counts, reusing the response if the reader opens the panel.
      state.previewRequest = request({ ...state, cursor: null });
      state.previewRequest.then(result => {
        if (Number.isSafeInteger(result.total) && result.total >= 0 && !state.loaded && !state.posting) updateCount(state, result.total);
      }).catch(() => {
        state.previewRequest = null;
        state.trigger.title = 'Open comments for this page';
      });
    }
  }, { rootMargin: '200px' });
  const request = async (state, input) => {
    const url = new URL(endpoint);
    const options = { credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(15000) };
    if (input) Object.assign(options, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target: state.target, page: state.page, ...input }) });
    else {
      url.searchParams.set('target', state.target); url.searchParams.set('page', String(state.page));
      if (state.cursor) url.searchParams.set('before', String(state.cursor));
    }
    const response = await fetch(url, options);
    let result;
    try { result = await response.json(); } catch { throw new Error('Comments could not load. Please try again.'); }
    if (!response.ok) throw new Error(response.status === 429 ? 'Too many comments. Please wait before posting again.' : (response.status === 400 || response.status === 409 ? result.error : 'Comments are temporarily unavailable. Please try again.'));
    if (result.target !== state.target || result.page !== state.page) throw new Error('Comments could not load. Please try again.');
    return result;
  };
  const addComment = (state, comment, first = false) => {
    if (!Number.isSafeInteger(comment.id) || typeof comment.name !== 'string' || typeof comment.body !== 'string' || !Number.isFinite(Date.parse(comment.createdAt))) throw new Error('Comments could not load. Please try again.');
    if (state.ids.has(comment.id)) return;
    state.ids.add(comment.id);
    const item = el('li', 'page-comment');
    const byline = el('div', 'page-comment-byline');
    const name = el('strong', '', comment.name);
    const time = el('time', '', dateFormat.format(new Date(comment.createdAt)));
    time.dateTime = comment.createdAt;
    byline.append(name, time);
    // Treat every name and comment as plain text, including HTML-looking strings.
    item.append(byline, el('p', 'page-comment-text', comment.body));
    first ? state.list.prepend(item) : state.list.append(item);
  };
  const load = async (state, more = false) => {
    if (state.loading) return;
    state.loading = true;
    state.status.textContent = 'Loading comments…';
    state.retry.hidden = true; state.more.disabled = true;
    if (!more) { state.cursor = null; state.ids.clear(); state.list.replaceChildren(); }
    try {
      const preview = !more && state.previewRequest;
      state.previewRequest = null;
      const result = await (preview || request(state));
      if (!Array.isArray(result.comments) || !Number.isSafeInteger(result.total) || result.total < 0 || (result.nextCursor !== null && (!Number.isSafeInteger(result.nextCursor) || result.nextCursor < 1))) throw new Error('Comments could not load. Please try again.');
      result.comments.forEach(comment => addComment(state, comment));
      state.cursor = result.nextCursor;
      state.more.hidden = !state.cursor;
      state.loaded = true; state.loadedAt = Date.now();
      state.status.textContent = result.total ? '' : 'Be the first to comment on this page.';
      updateCount(state, result.total);
    } catch (error) {
      state.status.textContent = error.message;
      state.retry.hidden = false;
      state.retryMore = more;
    } finally { state.loading = false; state.more.disabled = false; }
  };
  const build = state => {
    const content = el('div', 'page-comments-content');
    const header = el('div', 'page-comments-header');
    const title = el('h2', 'page-comments-title', 'Page comments');
    const close = el('button', 'page-comments-close', '×'); close.type = 'button';
    close.setAttribute('aria-label', `Close comments for ${state.label.toLowerCase()}`);
    close.addEventListener('click', () => {
      state.details.hidden = true;
      state.trigger.setAttribute('aria-expanded', 'false');
      state.trigger.focus({ preventScroll: true });
    });
    header.append(title, close);
    const heading = el('p', 'page-comments-context', `${state.comicName} · ${state.entryLabel} ${state.chapterNumber} · ${state.label}`);
    const note = el('p', 'page-comments-note', 'No sign-in needed. Comments appear publicly as soon as you post. Please keep spoilers on the relevant page.');
    const form = el('form', 'page-comment-form');
    const suffix = `${state.comicId}-${state.chapterId}-${state.page}`;
    const nameLabel = el('label', '', 'Name (optional)');
    const name = el('input'); name.id = `comment-name-${suffix}`; name.name = 'name'; name.maxLength = 40; name.placeholder = 'Anonymous'; name.autocomplete = 'off';
    nameLabel.htmlFor = name.id;
    const bodyLabel = el('label', '', 'Your comment');
    const body = el('textarea'); body.id = `comment-body-${suffix}`; body.name = 'comment'; body.maxLength = 2000; body.rows = 4; body.required = true;
    bodyLabel.htmlFor = body.id;
    const honeyLabel = el('label', 'page-comments-honeypot', 'Leave this field empty');
    honeyLabel.setAttribute('aria-hidden', 'true');
    const honey = el('input'); honey.name = 'website'; honey.tabIndex = -1; honey.autocomplete = 'off'; honeyLabel.append(honey);
    const footer = el('div', 'page-comment-actions');
    const submit = el('button', 'nav-button', 'Post comment'); submit.type = 'submit';
    const counter = el('span', 'page-comment-counter', '0 / 2,000');
    body.addEventListener('input', () => { counter.textContent = `${body.value.length.toLocaleString('en')} / 2,000`; });
    footer.append(submit, counter);
    const submitStatus = el('p', 'page-comments-status'); submitStatus.setAttribute('role', 'status'); submitStatus.setAttribute('aria-live', 'polite');
    for (const field of [name, body]) field.addEventListener('input', () => { if (!state.posting) submitStatus.textContent = ''; });
    form.append(nameLabel, name, bodyLabel, body, honeyLabel, footer, submitStatus);
    state.status = el('p', 'page-comments-status'); state.status.setAttribute('role', 'status');
    state.list = el('ol', 'page-comment-list');
    state.more = el('button', 'quiet-button', 'Load older comments'); state.more.type = 'button'; state.more.hidden = true;
    state.more.addEventListener('click', () => load(state, true));
    state.retry = el('button', 'quiet-button', 'Try again'); state.retry.type = 'button'; state.retry.hidden = true;
    state.retry.addEventListener('click', () => load(state, state.retryMore));
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (state.posting || !body.value.trim()) return;
      const text = body.value.trim(); const chosenName = name.value.trim();
      // Keep the request ID after a lost response, so pressing Post again cannot duplicate a comment.
      if (!state.submission || state.submission.body !== text || state.submission.name !== chosenName) state.submission = { requestId: crypto.randomUUID(), body: text, name: chosenName };
      state.posting = true; submit.disabled = true; name.disabled = true; body.disabled = true;
      submitStatus.textContent = 'Posting…';
      try {
        const result = await request(state, { ...state.submission, visitor: visitor(), website: honey.value });
        addComment(state, result.comment, true);
        body.value = ''; counter.textContent = '0 / 2,000'; state.submission = null;
        submitStatus.textContent = 'Your comment is now public.';
        // Refresh totals after a successful write. A failed refresh must not imply a failed submission.
        await load(state);
      } catch (error) { submitStatus.textContent = error.message; }
      finally { state.posting = false; submit.disabled = false; name.disabled = false; body.disabled = false; }
    });
    content.append(header, heading, note, state.status, state.retry, state.list, state.more, form);
    state.details.append(content);
  };
  window.ReaderPageComments = {
    attach(figure, { comic, chapter, page }) {
      const target = `${comic.id}:${chapter.id}`;
      const panelKey = `${target}:${page.number}`;
      let state = panels.get(panelKey);
      if (!state) {
        const details = el('section', 'page-comments');
        details.id = `page-comments-${comic.id}-${chapter.id}-${page.number}`;
        details.hidden = true;
        const trigger = el('button', 'page-comments-bubble'); trigger.type = 'button';
        trigger.setAttribute('aria-expanded', 'false');
        trigger.setAttribute('aria-controls', details.id);
        trigger.setAttribute('aria-label', `Comments for ${page.label.toLowerCase()}`);
        trigger.title = 'Open comments for this page';
        const total = el('span', 'page-comments-total', '+'); total.setAttribute('aria-hidden', 'true');
        trigger.append(total);
        state = { target, comicId: comic.id, comicName: comic.shortTitle, chapterId: chapter.id, chapterNumber: chapter.number, entryLabel: comic.kind === 'anthology' ? 'Short comic' : 'Chapter',
          page: page.number, label: page.label, details, trigger, total, ids: new Set(), loaded: false, loading: false, posting: false };
        trigger.addEventListener('click', () => {
          details.hidden = !details.hidden;
          trigger.setAttribute('aria-expanded', String(!details.hidden));
          if (details.hidden) return;
          if (!state.list) build(state);
          if (!state.loaded || (!state.posting && Date.now() - state.loadedAt > 30000)) load(state);
          if (!window.matchMedia('(min-width: 1100px)').matches) details.scrollIntoView({ block: 'start', behavior: 'smooth' });
        });
        panels.set(panelKey, state);
      }
      figure.querySelector('.comic-page-artwork').append(state.trigger);
      figure.append(state.details);
      countObserver.observe(state.trigger);
    }
  };
})();
