// The Programme. One screen: a film plays full bleed behind the name, the titles run
// down the left, and moving between them changes reels through black.
import { FILMS } from './films.js?v=4';

const { gsap } = window;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const pad = (n) => String(n).padStart(2, '0');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const now = () => performance.now();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const thumb = (slug) => `assets/thumbs/${slug}-1.jpg`;
const still = (slug) => `assets/stills/${slug}-1.jpg`;

// Every still exists at several widths, and the browser takes the smallest one that is still sharp
// on its own screen: a phone never downloads the version made for a large monitor.
// A film listed here has a smaller original, so it stops at the width given.
const WIDTHS = { 'stone-island': [1920], godspeed: [1920], landing: [2400, 2880] };
const SIZES = '(max-width: 900px) 90vh, max(100vw, 178vh)';   // how wide the still is drawn: it always covers the screen
function picture(slug) {
  const im = new Image();
  im.alt = ''; im.decoding = 'async';
  im.sizes = SIZES;
  im.srcset = [`${still(slug)} 1600w`, ...(WIDTHS[slug] || [2400, 3200]).map((w) => `assets/stills/w${w}/${slug}-1.jpg ${w}w`)].join(', ');
  im.src = still(slug);
  return im;
}

const VIMEO = 'https://player.vimeo.com';
const TUBE = 'https://www.youtube-nocookie.com';
const TITLE = document.title;
const N = FILMS.length;

// The loop the site opens on. It belongs to no entry in the programme.
// `focus` anchors the crop: 0 keeps the top of the frame, 1 the bottom. Her eyes sit high.
const LANDING = { slug: 'landing', video: { vimeo: '1232468980' }, focus: 0.2 };
const DWELL = 13000;       // how long an excerpt runs before the programme moves on by itself
const DWELL_STILL = 9000;  // a film with no excerpt (see makePlate) is held for less
const DWELL_OPEN = 8000;   // and how long the opening loop is held
const PRELOAD = 4500;      // the next reel is threaded this long before the changeover

const S = { index: -1, view: null, opening: false, lastInput: now(), overList: false, touch: false };

const screen = $('#screen'), platesEl = $('#plates'), veil = $('#veil'), shade = $('.shade');
const list = $('#list'), cue = $('#cue'), cueKind = $('#cue-kind'), cueRoles = $('#cue-roles'), cueWatch = $('#cue-watch'), cueBar = $('#cue-bar');
const pointer = $('#pointer'), info = $('#info'), filmFrame = $('#film-frame');
if (fine) document.documentElement.classList.add('fine');

/* ---------- The lists ---------- */
list.innerHTML = FILMS.map((f, i) => `<li><a class="row" href="#/${f.slug}" data-i="${i}"><i>${pad(i + 1)}</i><span>${esc(f.title)}</span></a></li>`).join('');
const rows = $$('.row', list);
$('#index').innerHTML = FILMS.map((f, i) => `<li><a href="#/${f.slug}"><span class="index__title"><i>${pad(i + 1)}</i><span>${esc(f.title)}</span></span><span class="index__kind">${esc(f.kind)}</span><span class="index__roles">${esc(f.roles)}${f.featuring ? `, featuring ${esc(f.featuring)}` : ''}</span><span class="index__watch">Watch film</span></a></li>`).join('');

/* ---------- Plates: one film's picture on the screen ---------- */
const plates = [];
let current = null;    // the plate on screen
let incoming = null;   // the plate about to replace it
let pending = null;    // the next reel, threaded and running out of sight

function makePlate(film) {
  const el = document.createElement('div');
  el.className = 'plate';
  if (film.focus !== undefined) el.style.setProperty('--fy', film.focus);
  const soft = new Image();
  soft.className = 'plate__soft'; soft.alt = ''; soft.decoding = 'async';
  el.appendChild(soft);
  const p = { film, el, frame: null, box: null, stillEl: null, playing: false, sharp: false, dead: false, w: 0, h: 0, pic: 0, readyAt: 0, playAt: 0, timers: [] };
  // The still is the picture itself, so its shape is the picture's shape.
  soft.onload = () => { p.pic = soft.naturalWidth / soft.naturalHeight; fit(p); };
  soft.src = thumb(film.slug);
  p.ready = new Promise((res) => { p.resolve = () => { if (!p.readyAt) { p.readyAt = now(); res(p); } }; });
  p.rolling = new Promise((res) => { p.roll = res; });
  const v = film.video;
  // Only Vimeo can play a silent excerpt cleanly. A YouTube player brings its own lettering
  // and captions with it, so those films hold on a still instead.
  if (v.vimeo && !reduce) {
    const box = document.createElement('div');
    box.className = 'plate__film';
    const f = document.createElement('iframe');
    f.allow = 'autoplay; fullscreen'; f.tabIndex = -1; f.title = ''; f.setAttribute('aria-hidden', 'true');
    f.src = `${VIMEO}/video/${v.vimeo}?background=1&autoplay=1&loop=1&muted=1&autopause=0&dnt=1${v.start ? `#t=${v.start}s` : ''}`;
    f.addEventListener('load', () => hello(p));
    box.appendChild(f); el.appendChild(box);
    p.frame = f; p.box = box;
    fit(p);
  }
  // The still is on screen at once; where there is footage, it takes over as soon as it runs.
  sharpen(p);
  platesEl.appendChild(el);
  plates.push(p);
  return p;
}

function sharpen(p) {
  if (p.sharp) return;
  p.sharp = true;
  const im = picture(p.film.slug);
  im.className = 'plate__still';
  im.onload = () => {
    if (p.dead) return;
    p.el.insertBefore(im, p.box);
    p.stillEl = im;
    requestAnimationFrame(() => requestAnimationFrame(() => p.el.classList.add('is-still')));
    // A held still is never quite still: the slowest push in.
    if (!reduce) gsap.fromTo(im, { scale: 1 }, { scale: 1.045, duration: 22, ease: 'sine.out' });
    p.resolve();
  };
  im.onerror = () => p.resolve();
}

function dispose(p) {
  if (!p || p.dead) return;
  p.dead = true;
  p.timers.forEach(clearTimeout);
  gsap.killTweensOf(p.el);
  if (p.stillEl) gsap.killTweensOf(p.stillEl);
  p.el.remove();
  const k = plates.indexOf(p);
  if (k >= 0) plates.splice(k, 1);
}

function hello(p) {
  const w = p.frame && p.frame.contentWindow;
  if (!w) return;
  const say = (m) => w.postMessage(JSON.stringify(m), VIMEO);
  say({ method: 'addEventListener', value: 'playProgress' });
  say({ method: 'getVideoWidth' });
  say({ method: 'getVideoHeight' });
}

function started(p) {
  if (p.playing || p.dead) return;
  // Give the film a moment to report its shape, so it is never shown at the wrong crop.
  if (!(p.w && p.h)) {
    if (!p.until) { p.until = now() + 500; p.timers.push(setTimeout(() => started(p), 520)); }
    if (now() < p.until) return;
  }
  p.playing = true;
  p.playAt = now();
  p.el.classList.add('is-playing');
  p.resolve();
  p.roll(p);
}

window.addEventListener('message', (e) => {
  if (e.origin !== VIMEO) return;
  const p = plates.find((x) => x.frame && x.frame.contentWindow === e.source);
  if (!p) return;
  let d = e.data;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch (err) { return; } }
  if (!d || typeof d !== 'object') return;
  if (d.event === 'ready') hello(p);
  else if (d.method === 'getVideoWidth' && d.value) { p.w = d.value; shape(p); }
  else if (d.method === 'getVideoHeight' && d.value) { p.h = d.value; shape(p); }
  else if (d.event === 'playProgress' && d.data && d.data.seconds > 0.15) started(p);
});
function shape(p) { if (p.w && p.h) fit(p); }

// Size the footage so the picture covers the screen. Some films carry black bars inside
// the file itself; those are pushed off the edges, so the picture always meets the glass.
function fit(p) {
  if (!p.box) return;
  const W = screen.clientWidth, H = screen.clientHeight;
  const file = p.w && p.h ? p.w / p.h : 16 / 9;
  let pic = p.pic || file;
  if (Math.abs(pic / file - 1) < 0.015) pic = file;
  let bw, bh;
  if (pic >= file) { bw = Math.max(W, H * pic); bh = bw / file; } else { bh = Math.max(H, W / pic); bw = bh * file; }
  p.box.style.width = `${Math.ceil(bw)}px`;
  p.box.style.height = `${Math.ceil(bh)}px`;
}
window.addEventListener('resize', () => plates.forEach(fit));

/* ---------- Shade: only as much as each film's own brightness asks for ---------- */
// How bright each film runs at the top and at the foot of the frame (0 is black, 1 is white),
// measured once from its stills: the brightest reading of each, because the lettering has to
// survive the film's lightest shot. A film added later without an entry gets a middling shade.
const LIGHT = {
  'stone-island': [0.75, 0.77], 'sir-render': [0.19, 0.24], 'crux-ansata': [0.27, 0.3], 'next-life': [0.26, 0.26],
  berlin: [0.5, 0.54], phantoms: [0.79, 0.62], aesop: [0.55, 0.36], 'two-of-us': [0.72, 0.68],
  glasshouse: [0.34, 0.54], dreams: [0.17, 0.17], siegfried: [0.13, 0.14], bambi: [0.55, 0.44],
  home: [0.46, 0.38], godspeed: [0.32, 0.22], landing: [0.22, 0.13],
};
function shadeFor(film) {
  const [top, bot] = LIGHT[film.slug] || [0.4, 0.4];
  shade.style.setProperty('--shade-top', clamp(0.44 + top * 0.6, 0.44, 0.82).toFixed(3));
  shade.style.setProperty('--shade-bot', clamp(0.52 + bot * 0.5, 0.52, 0.88).toFixed(3));
}

/* ---------- The changeover ---------- */
function go(i, { force = false, hold = false } = {}) {
  if (i === S.index && !force) return;
  S.index = i;
  paint();
  const film = i < 0 ? LANDING : FILMS[i];
  if (i >= 0) [1, -1].forEach((d) => picture(FILMS[(i + d + N) % N].slug));
  let next = null;
  if (pending && pending.film === film) { next = pending; pending = null; }
  if (pending) { dispose(pending); pending = null; }
  if (incoming) { dispose(incoming); incoming = null; }
  if (!next) next = makePlate(film);
  incoming = next;
  const swap = () => {
    if (incoming !== next) return;   // overtaken by a later choice
    if (current && current !== next) dispose(current);
    current = next; incoming = null;
    next.el.classList.add('is-on');
    shadeFor(film);
    if (!hold) gsap.to(veil, { opacity: 0, duration: reduce ? 0.2 : 0.8, delay: reduce ? 0 : 0.08, ease: 'power2.out', overwrite: true });
  };
  if (!current) { gsap.killTweensOf(veil); gsap.set(veil, { opacity: 1 }); swap(); }
  else gsap.to(veil, { opacity: 1, duration: reduce ? 0.12 : 0.17, ease: 'power1.in', overwrite: true, onComplete: swap });
}
const step = (dir) => go(S.index < 0 ? (dir > 0 ? 0 : N - 1) : (S.index + dir + N) % N);

let syncPointer = () => {};
function paint() {
  const i = S.index;
  rows.forEach((r, k) => {
    r.classList.toggle('is-on', k === i);
    if (k === i) r.setAttribute('aria-current', 'true'); else r.removeAttribute('aria-current');
  });
  screen.classList.toggle('is-live', i >= 0);
  syncPointer();
  const wasOff = cue.classList.contains('is-off');
  cue.classList.toggle('is-off', i < 0);
  if (i < 0) return;
  const f = FILMS[i];
  if (wasOff) cue.classList.add('is-still');   // appear at its row; never slide in from the first
  cue.style.setProperty('--i', i);
  if (wasOff) { void cue.offsetHeight; cue.classList.remove('is-still'); }   // (reading the height makes the jump take effect first)
  cueKind.textContent = f.kind;
  cueRoles.textContent = f.roles;
  cueWatch.href = `#/${f.slug}`;
  if (!reduce) gsap.fromTo([cueKind, cueRoles, cueWatch], { opacity: 0 }, { opacity: 1, duration: 0.5, delay: 0.14, ease: 'power2.out', overwrite: true });
}

/* ---------- Choosing a film ---------- */
const touched = () => { S.lastInput = now(); };
window.addEventListener('pointerdown', (e) => { S.touch = e.pointerType === 'touch'; touched(); }, true);
window.addEventListener('pointermove', touched, { passive: true });

rows.forEach((r, i) => {
  let t = 0;
  // A moment of intent, so running the pointer down the list does not thrash the screen.
  r.addEventListener('pointerenter', (e) => { if (e.pointerType === 'touch' || S.opening) return; clearTimeout(t); t = setTimeout(() => go(i), 110); });
  r.addEventListener('pointerleave', () => clearTimeout(t));
  r.addEventListener('focus', () => { if (!S.opening && r.matches(':focus-visible')) go(i); });
  // On a touch screen the first tap chooses a film and the second opens it.
  r.addEventListener('click', (e) => { if (S.touch && i !== S.index) { e.preventDefault(); go(i); } });
});
list.addEventListener('pointerenter', () => { S.overList = true; });
list.addEventListener('pointerleave', () => { S.overList = false; });

let down = null;
screen.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
screen.addEventListener('pointerup', (e) => {
  const d = down; down = null;
  if (!d || S.view !== 'home' || S.opening) return;
  const dx = e.clientX - d.x, dy = e.clientY - d.y;
  if (e.pointerType === 'touch' && Math.abs(dy) > 44 && Math.abs(dy) > Math.abs(dx)) { step(dy < 0 ? 1 : -1); return; }
  if (Math.abs(dx) + Math.abs(dy) > 10) return;
  if (S.index >= 0) location.hash = `#/${FILMS[S.index].slug}`; else step(1);
});

let acc = 0, lastWheel = 0, lastStep = 0;
window.addEventListener('wheel', (e) => {
  touched();
  if (S.view !== 'home') return;
  e.preventDefault();
  if (S.opening) return;
  const t = now();
  if (t - lastWheel > 160) acc = 0;
  lastWheel = t;
  if (t - lastStep < 700) return;
  acc += e.deltaY;
  if (Math.abs(acc) >= 50) { step(acc > 0 ? 1 : -1); acc = 0; lastStep = t; }
}, { passive: false });

window.addEventListener('keydown', (e) => {
  touched();
  if (e.key === 'Escape' && S.view !== 'home') { location.hash = '#/'; return; }
  if (S.view !== 'home' || S.opening || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); step(1); }
  else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  else if (e.key === 'Enter' && S.index >= 0 && (!document.activeElement || document.activeElement === document.body)) location.hash = `#/${FILMS[S.index].slug}`;
});

if (fine) {
  gsap.set(pointer, { xPercent: -50, yPercent: -50 });
  const dur = reduce ? 0 : 0.4;
  const px = gsap.quickTo(pointer, 'x', { duration: dur, ease: 'power3' });
  const py = gsap.quickTo(pointer, 'y', { duration: dur, ease: 'power3' });
  let inside = false;
  syncPointer = () => pointer.classList.toggle('is-on', inside && S.view === 'home' && S.index >= 0 && !S.opening);
  screen.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    if (!inside) { inside = true; px(e.clientX, e.clientX); py(e.clientY, e.clientY); syncPointer(); return; }
    px(e.clientX); py(e.clientY);
  });
  screen.addEventListener('pointerleave', () => { inside = false; syncPointer(); });
}

/* ---------- Left alone, the programme runs itself ---------- */
let bar = 0;
gsap.ticker.add(() => {
  const t = now();
  let prog = 0;
  const armed = S.view === 'home' && !S.opening && !reduce && !document.hidden && !S.overList && current && !incoming;
  if (armed) {
    // The clock starts when the picture is really there, and again whenever someone touches anything.
    const base = current.playing ? current.playAt : !current.frame ? current.readyAt : (current.readyAt && t - current.readyAt > 7000 ? current.readyAt + 7000 : 0);
    if (base) {
      const dwell = S.index < 0 ? DWELL_OPEN : current.frame ? DWELL : DWELL_STILL;
      const from = Math.max(base, S.lastInput);
      const after = (S.index + 1) % N;
      prog = (t - from) / dwell;
      if (prog >= 1) { prog = 0; go(after); }
      else if (t - from > dwell - PRELOAD) { if (!pending) pending = makePlate(FILMS[after]); }
      else if (pending) { dispose(pending); pending = null; }
    }
  } else if (pending) { dispose(pending); pending = null; }
  bar = prog >= bar ? prog : bar + (prog - bar) * 0.2;
  if (bar < 0.001) bar = 0;
  cueBar.style.transform = `scaleX(${bar.toFixed(4)})`;
});

/* ---------- One film, and Information ---------- */
function mount(film, fromFilm) {
  const i = FILMS.indexOf(film), v = film.video;
  const src = v.vimeo
    ? `${VIMEO}/video/${v.vimeo}?autoplay=1&title=0&byline=0&portrait=0&dnt=1&color=f3f1ec`
    : `${TUBE}/embed/${v.youtube}?autoplay=1&rel=0&playsinline=1`;
  $('#film-no').textContent = pad(i + 1);
  $('#film-title').textContent = film.title;
  $('#film-kind').textContent = film.kind;
  $('#film-roles').innerHTML = `${esc(film.roles)}${film.featuring ? `<br>Featuring ${esc(film.featuring)}` : ''}`;
  $('#film-next').href = `#/${FILMS[(i + 1) % N].slug}`;
  filmFrame.innerHTML = `<iframe src="${src}" title="${esc(film.title)}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe>`;
  if (fromFilm && !reduce) gsap.fromTo([filmFrame, '.film__strip'], { opacity: 0 }, { opacity: 1, duration: 0.7, delay: 0.12, ease: 'power2.out', overwrite: true });
  document.title = `${film.title} — Ahab Mullick`;
  $('#film-close').focus({ preventScroll: true });
}

function openInfo() {
  document.title = 'Information — Ahab Mullick';
  info.scrollTop = 0;
  if (!reduce) gsap.fromTo($$('.band--bio .band__label, .bio > *', info), { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.2, ease: 'expo.out', stagger: 0.07, delay: 0.4, overwrite: true, clearProps: 'transform' });
  info.focus({ preventScroll: true });
}

let endOpening = () => {};
function show(next, i) {
  const prev = S.view;
  S.view = next;
  document.body.dataset.view = next;
  $$('.nav a[data-nav]').forEach((a) => a.classList.toggle('is-on', a.dataset.nav === (next === 'information' ? 'information' : 'work')));
  if (next !== 'film') filmFrame.innerHTML = '';
  syncPointer();
  if (next === 'home') {
    document.title = TITLE;
    if (prev !== 'home') go(S.index, { force: true, hold: S.opening });
    return;
  }
  // Away from the programme: lights down, and the excerpt stops.
  endOpening();
  if (incoming) { dispose(incoming); incoming = null; }
  if (pending) { dispose(pending); pending = null; }
  gsap.to(veil, { opacity: 1, duration: 0.3, ease: 'power1.in', overwrite: true, onComplete: () => { if (S.view !== 'home' && current) { dispose(current); current = null; } } });
  if (next === 'film') { S.index = i; paint(); mount(FILMS[i], prev === 'film'); } else openInfo();
}

function route() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  if (h === 'information') return show('information');
  const i = FILMS.findIndex((f) => f.slug === h);
  if (i >= 0) return show('film', i);
  return show('home');
}
window.addEventListener('hashchange', route);

// Information scrolls with a little weight. Keys, touch and the scrollbar stay native.
if (!reduce) {
  let target = 0, cur = 0, on = false;
  const tick = (time, dt) => {
    cur += (target - cur) * (1 - Math.pow(0.86, dt / 16.67));
    if (Math.abs(target - cur) < 0.3) { cur = target; on = false; gsap.ticker.remove(tick); }
    info.scrollTop = cur;
  };
  info.addEventListener('wheel', (e) => {
    if (e.ctrlKey) return;
    e.preventDefault();
    if (!on) { target = cur = info.scrollTop; on = true; gsap.ticker.add(tick); }
    const unit = e.deltaMode === 1 ? 18 : e.deltaMode === 2 ? info.clientHeight : 1;
    target = clamp(target + e.deltaY * unit, 0, info.scrollHeight - info.clientHeight);
  }, { passive: false });
}
$('#to-top').addEventListener('click', () => info.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));

/* ---------- The opening ---------- */
// Black. The name. Then the picture comes up out of the dark behind it, and the programme arrives.
function opening() {
  const word = $('#name-word'), rest = $$('.role, .nav');
  gsap.set(word, { yPercent: 118 });
  gsap.set(rest, { autoAlpha: 0 });
  gsap.set(rows, { autoAlpha: 0, y: 10 });
  document.body.classList.remove('is-opening');
  const plate = current;
  let over = false, a = null, b = null;
  const finish = () => {
    if (over) return;
    over = true;
    S.opening = false;
    S.lastInput = now();
    [a, b].forEach((t) => t && t.progress(1));
    gsap.set([word, ...rest, ...rows], { clearProps: 'all' });
    syncPointer();
    // Every film's small still, fetched quietly, so each has something to show the instant it is chosen.
    FILMS.forEach((f) => { new Image().src = thumb(f.slug); });
  };
  endOpening = finish;

  const fonts = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, wait(1200)]) : Promise.resolve();
  fonts.then(() => { if (!over) a = gsap.to(word, { yPercent: 0, duration: 1.6, delay: 0.25, ease: 'expo.out' }); });
  // Wait for the footage itself, within reason; the still stands in if it never comes.
  Promise.all([Promise.race([plate.rolling, wait(4500)]), wait(1900)]).then(() => {
    if (over) return;
    gsap.fromTo(plate.el, { scale: 1.07 }, { scale: 1, duration: 7, ease: 'power2.out' });
    b = gsap.timeline({ onComplete: finish });
    b.to(veil, { opacity: 0, duration: 3.4, ease: 'power1.inOut' }, 0)
      .to(rest, { autoAlpha: 1, duration: 1.4, ease: 'power2.out', stagger: 0.12 }, 1.9)
      .to(rows, { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.03 }, 2.3);
  });
  // Anyone in a hurry can be.
  const hurry = () => { if (!over) [a, b].forEach((t) => t && t.timeScale(5)); };
  ['pointerdown', 'keydown', 'wheel'].forEach((ev) => window.addEventListener(ev, hurry, { passive: true }));
}

const deep = location.hash.replace(/^#\/?/, '') !== '';
S.opening = !reduce && !deep;
if (!S.opening) document.body.classList.remove('is-opening');
route();
if (S.opening) opening();
