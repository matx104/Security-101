/* ============================================================
   Security 101 — Study Edition. The petal renderer.
   Content-as-data: content/modules.json in, mastery out.
   Progress lives in localStorage, in the learner's browser
   alone — check a lesson, it stays checked.
   ============================================================ */

const STORE_KEY = 'qalam-s101-v1';

const dom = {
  modules:  document.getElementById('modules'),
  notice:   document.getElementById('notice'),
  pct:      document.getElementById('progress-pct'),
  count:    document.getElementById('progress-count'),
  bar:      document.getElementById('progress-bar'),
  fill:     document.getElementById('progress-fill'),
  reset:    document.getElementById('reset')
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function safeUrl(value) {
  if (typeof value !== 'string' || value === '') return null;
  try {
    const url = new URL(value, window.location.href);
    return (url.protocol === 'https:' || url.protocol === 'http:') ? url.href : null;
  } catch {
    return null;
  }
}

/* ---------- mastery, kept by the learner ---------------------------------- */

function loadProgress() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORE_KEY) || '{}');
    return (raw && typeof raw === 'object') ? raw : {};
  } catch {
    return {};
  }
}

function saveProgress(done) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(done));
  } catch {
    /* private mode — progress lives for this visit only */
  }
}

let done = loadProgress();

/* ---------- rendering ------------------------------------------------------- */

let openModule = null;
let openLesson = null;

function allLessons(data) {
  return data.modules.flatMap((m) => m.lessons);
}

function renderProgress(data) {
  const lessons = allLessons(data);
  const total = lessons.length;
  const complete = lessons.filter((l) => done[l.id]).length;
  const pct = total ? Math.round((complete / total) * 100) : 0;

  dom.pct.textContent = `${pct}%`;
  dom.count.textContent = `${complete} of ${total} lessons`;
  dom.fill.style.width = `${pct}%`;
  dom.bar.setAttribute('aria-valuenow', String(pct));
}

function toggleLesson(id, node) {
  openLesson = openLesson === id ? null : id;
  for (const lesson of dom.modules.querySelectorAll('.lesson')) {
    lesson.classList.toggle('lesson--open', lesson.dataset.lesson === openLesson);
  }
}

function toggleModule(id) {
  openModule = openModule === id ? null : id;
  for (const mod of dom.modules.querySelectorAll('.mod')) {
    mod.classList.toggle('mod--open', mod.dataset.module === openModule);
  }
}

function render(data) {
  dom.modules.textContent = '';

  for (const mod of data.modules) {
    const section = el('section', 'mod');
    section.dataset.module = mod.id;

    const heading = el('h2', 'mod__h');

    const head = el('button', 'mod__head');
    head.type = 'button';
    head.setAttribute('aria-expanded', 'false');
    head.setAttribute('aria-controls', `mod-${mod.id}`);
    head.append(
      el('span', 'mod__num', `Module ${mod.num}`),
      el('span', 'mod__title', mod.title),
      el('span', 'mod__done'),
      el('span', 'mod__chev', '▾')
    );
    head.addEventListener('click', () => toggleModule(mod.id));

    const body = el('div', 'mod__body');
    body.id = `mod-${mod.id}`;
    body.setAttribute('role', 'region');
    body.setAttribute('aria-labelledby', `mod-h-${mod.id}`);

    const scroller = el('div', 'mod__scroller');
    scroller.append(el('p', 'mod__blurb', mod.blurb || ''));

    for (const lesson of mod.lessons) {
      scroller.append(buildLesson(lesson));
    }

    body.append(scroller);
    heading.append(head);
    section.append(heading, body);
    dom.modules.append(section);
  }

  refresh(data);
}

function buildLesson(lesson) {
  const isDone = Boolean(done[lesson.id]);
  const node = el('article', 'lesson' +
    (isDone ? ' lesson--done' : '') +
    (lesson.quiz ? ' lesson--quiz' : ''));
  node.dataset.lesson = lesson.id;

  const row = el('button', 'lesson__row');
  row.type = 'button';
  row.setAttribute('aria-expanded', 'false');

  const check = el('span', 'lesson__check', '✓');
  check.setAttribute('aria-hidden', 'true');

  row.append(
    check,
    el('span', 'lesson__id', lesson.id),
    el('span', 'lesson__name', lesson.title),
    el('span', 'lesson__mins', lesson.quiz ? 'quiz' : `~${lesson.minutes || 30} min`),
    el('span', 'lesson__chev', '▸')
  );
  row.addEventListener('click', () => toggleLesson(lesson.id, node));

  /* the check itself is its own target: mark without opening */
  const checkButton = el('button', 'lesson__mark');
  checkButton.type = 'button';
  checkButton.className = 'sr-toggle';
  checkButton.setAttribute('aria-pressed', String(isDone));
  checkButton.setAttribute('aria-label',
    `Mark “${lesson.title}” as ${isDone ? 'not done' : 'done'}`);
  checkButton.style.cssText =
    'position:absolute;left:1rem;margin-top:0.55rem;width:1.5rem;height:1.5rem;' +
    'opacity:0;cursor:pointer;';
  checkButton.addEventListener('click', (event) => {
    event.stopPropagation();
    if (done[lesson.id]) delete done[lesson.id];
    else done[lesson.id] = true;
    saveProgress(done);
    node.classList.toggle('lesson--done', Boolean(done[lesson.id]));
    checkButton.setAttribute('aria-pressed', String(Boolean(done[lesson.id])));
    checkButton.setAttribute('aria-label',
      `Mark “${lesson.title}” as ${done[lesson.id] ? 'not done' : 'done'}`);
    refresh(APP_DATA);
  });
  row.style.position = 'relative';
  row.append(checkButton);

  const detail = el('div', 'lesson__detail');
  const inner = el('div', 'lesson__inner');
  const pad = el('div', 'lesson__pad');

  if (lesson.objective) pad.append(el('p', 'lesson__objective', lesson.objective));

  if (Array.isArray(lesson.keys) && lesson.keys.length) {
    const keys = el('ul', 'keys');
    for (const key of lesson.keys) keys.append(el('li', null, key));
    pad.append(keys);
  }

  const href = safeUrl(lesson.href);
  if (href) {
    const read = el('a', 'lesson__read');
    read.href = href;
    read.target = '_blank';
    read.rel = 'noopener noreferrer';
    read.append(el('span', null, lesson.quiz ? 'Take the quiz' : 'Read the full lesson'), el('span', null, ' ↗'));
    pad.append(read);
  }

  inner.append(pad);
  detail.append(inner);
  node.append(row, detail);
  return node;
}

/* module counts + the master bar, after any change */
let APP_DATA = null;

function refresh(data) {
  if (!data) return;
  renderProgress(data);

  for (const mod of dom.modules.querySelectorAll('.mod')) {
    const lessons = data.modules.find((m) => m.id === mod.dataset.module).lessons;
    const complete = lessons.filter((l) => done[l.id]).length;
    const label = mod.querySelector('.mod__done');
    label.textContent = '';
    label.append(
      document.createTextNode(''),
      (() => { const b = el('b', null, complete); return b; })(),
      document.createTextNode(`/${lessons.length}`)
    );
  }
}

/* ---------- boot ---------------------------------------------------------------- */

async function boot() {
  if (dom.reset) {
    dom.reset.addEventListener('click', () => {
      done = {};
      saveProgress(done);
      render(APP_DATA);
    });
  }

  try {
    if (window.__MODULES__ && typeof window.__MODULES__ === 'object') {
      APP_DATA = window.__MODULES__;
    } else {
      const res = await fetch('content/modules.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      APP_DATA = await res.json();
    }
    render(APP_DATA);
    if (openModule) toggleModule(openModule);
  } catch (error) {
    console.error('Security 101: could not load modules —', error);
    dom.notice.textContent =
      `The modules could not be loaded from content/modules.json: ${error.message}. ` +
      'The original curriculum remains readable in the fork.';
    dom.notice.hidden = false;
  }
}

boot();
