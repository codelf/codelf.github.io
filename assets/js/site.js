/* ═══════════════════════════════════════════════════════════
   Nicolas Delffon · le plan-relief
   1. Langue            (i18n.js)
   2. Navigation        champ de couleur, menu, ancres
   3. Ouverture         le seul moment orchestré au chargement
   4. Scène             (scene.js) : le relief, piloté par le défilement et le pointeur
   5. Démarche          quatre chapitres épinglés, puis le volet de couleur
   6. Le reste          manifeste mot à mot, tracés, copie de l'adresse
   ═══════════════════════════════════════════════════════════ */
import { initLang, onLang, meta } from './i18n.js';

const root = document.documentElement;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const qs = new URLSearchParams(location.search);

/* sans GSAP (script bloqué), la page se lit telle quelle */
if (!gsap || !ScrollTrigger) { root.classList.add('static'); root.classList.remove('intro-pending'); }
const still = root.classList.contains('static');

initLang();

if (!still) {
  gsap.registerPlugin(ScrollTrigger);
  gsap.ticker.lagSmoothing(0);
  ScrollTrigger.config({ ignoreMobileResize: true });
}

/* ═══════════════════════ 2. navigation ═══════════════════════ */

const navH = () => parseFloat(getComputedStyle(root).getPropertyValue('--nav-h')) || 72;
const menu = $('#menu'), menuBtn = $('#menuBtn');
let menuOpen = false, menuTimer = 0;

function setMenu(open) {
  if (open === menuOpen) return;
  menuOpen = open;
  clearTimeout(menuTimer);
  if (open) { menu.hidden = false; void menu.offsetWidth; menu.querySelector('a').focus({ preventScroll: true }); }
  else menuTimer = setTimeout(() => { menu.hidden = true; }, 240);
  root.classList.toggle('menu-open', open);
  root.classList.remove('nav-hidden');
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.dataset.aria = open ? 'menuClose' : 'menuOpen';
  menuBtn.setAttribute('aria-label', meta()[menuBtn.dataset.aria]);
  document.body.style.overflow = open ? 'hidden' : '';
}
menuBtn.addEventListener('click', () => setMenu(!menuOpen));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) { setMenu(false); menuBtn.focus(); } });
matchMedia('(min-width: 1081px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

/* ancres : défilement doux, sans toucher au comportement natif du reste de la page */
function scrollToY(y) { window.scrollTo({ top: Math.max(0, y), behavior: still ? 'auto' : 'smooth' }); }
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href').slice(1), target = id === 'top' ? document.body : document.getElementById(id);
  if (!target) return;
  e.preventDefault();
  setMenu(false);
  scrollToY(id === 'top' ? 0 : target.getBoundingClientRect().top + window.scrollY);
  if (id !== 'top') { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
  history.replaceState(null, '', id === 'top' ? location.pathname + location.search : '#' + id);
});

$('#nav').addEventListener('focusin', () => root.classList.remove('nav-hidden'));

if (!still) {
  /* la navigation prend l'encre du champ qu'elle survole */
  $$('[data-field]').forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec, start: () => `top ${navH() / 2}px`, end: () => `bottom ${navH() / 2}px`,
      onToggle: (self) => { if (self.isActive) root.dataset.nav = sec.dataset.field; },
    });
  });
  /* elle s'efface quand on descend, revient dès qu'on remonte */
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (self) => {
      if (menuOpen) return;
      if (self.scroll() < 140 || self.direction < 0) root.classList.remove('nav-hidden');
      else root.classList.add('nav-hidden');
    },
  });
  /* lien de la section courante */
  $$('.nav-links a').forEach((a) => {
    const sec = document.getElementById(a.getAttribute('href').slice(1));
    if (sec) ScrollTrigger.create({ trigger: sec, start: 'top 55%', end: 'bottom 55%', onToggle: (self) => a.setAttribute('aria-current', String(self.isActive)) });
  });
} else {
  const fields = $$('[data-field]');
  const sync = () => {
    const y = navH() / 2;
    for (const sec of fields) { const r = sec.getBoundingClientRect(); if (r.top <= y && r.bottom > y) { root.dataset.nav = sec.dataset.field; break; } }
  };
  addEventListener('scroll', sync, { passive: true }); sync();
}

/* ═══════════════════════ 3. ouverture ═══════════════════════ */

if (!still) {
  /* la classe d'attente tombe d'abord : GSAP doit lire des transformations neutres, pas celles du CSS */
  root.classList.remove('intro-pending');
  gsap.set('.hero-title .line-i', { y: 0, yPercent: 112 });
  gsap.set(['.hero-place', '.hero-side', '.hero-note', '.nav'], { autoAlpha: 0 });
  gsap.timeline({ defaults: { ease: 'expo.out' } })
    .to('.hero-title .line-i', { yPercent: 0, duration: 1.2, stagger: 0.09 }, 0.12)
    .to('.nav', { autoAlpha: 1, duration: 0.6, ease: 'power2.out' }, 0.2)
    .to('.hero-place', { autoAlpha: 1, duration: 0.7, ease: 'power2.out' }, 0.5)
    .fromTo('.hero-side', { y: 16 }, { autoAlpha: 1, y: 0, duration: 0.9 }, 0.6)
    .to('.hero-note', { autoAlpha: 1, duration: 0.7, ease: 'power2.out' }, 0.95);
}

/* ═══════════════════════ 4. scène ═══════════════════════ */

let scene = null;
const story = { hero: 0, voyage: 0, contact: 0 };
let forced = null;                                    // réglage : ?debug&s=2.5 fige le récit à cette valeur
const applyStory = () => { if (scene) scene.setStory(forced == null ? story.hero + story.voyage * 4 : forced); };
const windows = new Set();
const pauseBtn = $('#pause');
let paused = false;

let syncScene = function () {
  if (!scene) return;
  const contactOnly = windows.has('contact') && !windows.has('methode') && !windows.has('top');
  scene.setMode(contactOnly ? 'contact' : 'story', story.contact);
  const on = windows.size > 0 && !still;
  scene.setRunning(on);
  root.classList.toggle('scene-on', on);
};

/* Où les étiquettes du relief peuvent-elles s'afficher sans toucher le texte des chapitres ni le repère d'étapes ?
   On le mesure sur la page (le texte change avec la langue et la largeur) et on le donne à la scène. */
function measureClear() {
  const stage = $('#stage');
  if (!scene || still || !stage) return;
  const box = stage.getBoundingClientRect(), range = document.createRange();
  if (!box.width || !box.height) return;
  const top = $('.chapters').getBoundingClientRect().top - box.top;
  let right = 0, bottom = 0;
  $$('.chapter').forEach((ch) => {
    $$('.clip-i, .chapter-p, .livrable span', ch).forEach((el) => { range.selectNodeContents(el); right = Math.max(right, range.getBoundingClientRect().right - box.left); });
    const last = $('.livrable', ch);
    bottom = Math.max(bottom, top + last.offsetTop + last.offsetHeight);
  });
  const rail = $('.rail').getBoundingClientRect();
  scene.setClear({
    stacked: matchMedia('(max-width: 760px)').matches,       // texte au-dessus du relief, et non à sa gauche
    x: (right + 60) / box.width, r: (rail.left - box.left - 56) / box.width, y: (bottom + 46) / box.height,
  });
}

async function bootScene() {
  const canvas = $('#scene');
  try {
    const mod = await import('./scene.js');
    scene = mod.createScene(canvas, { labels: $$('.lab'), coarse: !fine });
  } catch (err) {
    root.classList.add('no-gl');
    if (qs.has('debug')) console.error(err);     // en réglage, on veut voir pourquoi le relief n'a pas démarré
    return;
  }
  /* ?debug expose la scène ; ?debug&y=3200 amène la page à cette hauteur (captures de contrôle) */
  if (qs.has('debug')) {
    window.__relief = { scene, story, applyStory, gsap, ScrollTrigger };
    /* ?k0=tx,ty,tz,d,th,ph,ox,oy remplace un cadrage (k0…k7, kc pour le contact) */
    qs.forEach((v, k) => {
      const m = /^k(\d|c)$/.exec(k); if (!m) return;
      const n = v.split(',').map(Number), key = m[1] === 'c' ? scene.debug.CONTACT : scene.debug.KEYS[+m[1]];
      Object.assign(key, { T: n.slice(0, 3), d: n[3], th: n[4], ph: n[5], off: n.slice(6, 8) });
      scene.snap();
    });
    if (qs.has('lens')) { const l = qs.get('lens').split(',').map(Number); scene.pinLens(l[0], l[1], l[2] || 4.1); }
    if (qs.has('s')) {
      const s = qs.get('s');
      if (s === 'contact') { windows.add('contact'); story.contact = 0.6; scene.setMode('contact', 0.6); syncScene = () => {}; }
      else { forced = +s; applyStory(); }
      scene.setIntro(1); scene.snap();
    }
    const dbg = document.createElement('style');
    dbg.textContent = '#scene{transition:none!important}' + (qs.has('bare') ? '.hero-in,.voyage-in,.contact-in,.nav,.hero-scrim,.stage-scrim,.contact-scrim,.pause{visibility:hidden!important}' : '');
    document.head.append(dbg);
    if (qs.has('y')) setTimeout(() => { const y = qs.get('y'); window.scrollTo(0, y.endsWith('vh') ? (parseFloat(y) / 100) * innerHeight : +y); }, 300);
  }

  if (still) {
    /* animations réduites : une seule image, le relief déjà cartographié */
    scene.setIntro(1); scene.setAll(1); scene.setStory(0); scene.renderOnce();
    root.classList.add('gl-ready');
    addEventListener('resize', () => { scene.resize(); scene.renderOnce(); });
    return;
  }

  applyStory();
  root.classList.add('gl-ready');
  const intro = { v: 0 };
  if (forced == null) gsap.to(intro, { v: 1, duration: 2.6, delay: 0.15, ease: 'power2.out', onUpdate: () => scene.setIntro(intro.v) });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) windows.add(en.target.id); else windows.delete(en.target.id); });
    syncScene();
  });
  $$('[data-window]').forEach((el) => io.observe(el));

  /* le pointeur : loupe sur le relevé, légère parallaxe de la caméra */
  if (fine) {
    addEventListener('pointermove', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      scene.setPointer((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1, true);
    }, { passive: true });
    root.addEventListener('mouseleave', () => scene.setPointer(0, 0, false));
  }

  let rz = 0;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { scene.resize(); measureClear(); }, 120); });
  measureClear();

  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    scene.setPaused(paused);
    pauseBtn.classList.toggle('is-paused', paused);
    pauseBtn.dataset.aria = paused ? 'play' : 'pause';
    pauseBtn.setAttribute('aria-label', meta()[pauseBtn.dataset.aria]);
  });
}

/* ═══════════════════════ 5. démarche ═══════════════════════ */

const voyage = $('#methode'), wipe = $('#wipe');
const railItems = $$('.rail li');
let railIdx = -1;
function setRail(p) {
  const i = Math.min(3, Math.max(0, Math.floor(p * 4 + 0.02)));
  if (i === railIdx) return;
  railIdx = i;
  railItems.forEach((li, k) => {
    li.classList.toggle('is-on', k === i);
    const b = $('button', li);
    if (k === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
  });
}

if (!still) {
  /* l'ouverture s'éloigne : la caméra s'approche du relevé */
  gsap.to(story, { hero: 1, ease: 'none', onUpdate: applyStory, scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.7 } });

  const chapters = $$('.chapter');
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: voyage, start: 'top top', end: 'bottom bottom', scrub: 0.8, onUpdate: (self) => setRail(self.progress) },
  });
  /* toutes les durées sont comptées sur la même échelle : un chapitre = 1 */
  tl.to(story, { voyage: 1, duration: 4, onUpdate: applyStory }, 0);
  chapters.forEach((ch, i) => {
    const title = $('.clip-i', ch), rest = $$('.chapter-p, .livrable', ch);
    if (i === 0) {
      gsap.set(ch, { autoAlpha: 1 });
      gsap.fromTo(title, { yPercent: 112 }, { yPercent: 0, ease: 'power3.out', scrollTrigger: { trigger: voyage, start: 'top 72%', end: 'top 8%', scrub: 0.6 } });
      gsap.fromTo(rest, { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, stagger: 0.12, ease: 'power2.out', scrollTrigger: { trigger: voyage, start: 'top 52%', end: 'top 2%', scrub: 0.6 } });
    } else {
      tl.set(ch, { autoAlpha: 1 }, i + 0.02)
        .fromTo(title, { yPercent: 112 }, { yPercent: 0, duration: 0.2, ease: 'power3.out' }, i + 0.02)
        .fromTo(rest, { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.17, stagger: 0.04, ease: 'power2.out' }, i + 0.08);
    }
    if (i < chapters.length - 1) tl.to(ch, { autoAlpha: 0, y: -30, duration: 0.13 }, i + 0.86);
  });

  /* le volet, de la couleur des balises, s'ouvre depuis celle du premier chantier et devient la section suivante */
  const w = { r: 0 };
  tl.to(w, {
    r: 1, duration: 0.17, ease: 'power1.in',
    onUpdate: () => {
      const c = scene ? scene.siteScreen(0) : [50, 50];
      wipe.style.clipPath = `circle(${(w.r * 152).toFixed(2)}% at ${c[0].toFixed(1)}% ${c[1].toFixed(1)}%)`;
      /* la navigation change d'encre quand le volet atteint le haut de l'écran, là où elle se trouve */
      if (windows.has('methode') && voyage.getBoundingClientRect().bottom > innerHeight * 0.5) {
        const radius = (w.r * 1.52 * Math.hypot(innerWidth, innerHeight)) / Math.SQRT2;
        const reach = Math.hypot((c[0] / 100 - 0.5) * innerWidth, (c[1] / 100) * innerHeight - navH() / 2);
        root.dataset.nav = radius > reach + innerWidth * 0.3 ? 'marque' : 'sol';
      }
    },
  }, 3.83);

  $$('.rail button').forEach((b) => b.addEventListener('click', () => {
    const top = voyage.getBoundingClientRect().top + scrollY, span = voyage.offsetHeight - innerHeight;
    scrollToY(top + ((+b.dataset.go + 0.45) / 4) * span);
  }));
  setRail(0);
}

/* ═══════════════════════ 6. le reste ═══════════════════════ */

/* manifeste : les mots se révèlent au fil de la lecture */
const manifeste = $('#manifesteText');
let manifesteST = null;
function splitManifeste() {
  if (!manifeste || still) return;
  if (manifesteST) { manifesteST.scrollTrigger.kill(); manifesteST.kill(); }
  const words = manifeste.textContent.trim().split(/ +/);
  manifeste.textContent = '';
  words.forEach((word, i) => {
    const s = document.createElement('span');
    s.className = 'w'; s.textContent = word;
    manifeste.append(s, i < words.length - 1 ? ' ' : '');
  });
  manifesteST = gsap.to($$('.w', manifeste), {
    opacity: 1, duration: 1.8, stagger: 1, ease: 'none',
    scrollTrigger: { trigger: manifeste, start: 'top 80%', end: 'bottom 46%', scrub: 0.5 },
  });
}

if (!still) {
  splitManifeste();
  /* les tracés : le fil qui relie les offres, puis les étapes du parcours */
  gsap.fromTo('.trace-fill', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '#offres', start: 'top 64%', end: 'bottom 64%', scrub: 0.5 } });
  gsap.fromTo('.itin-fill', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '#itin', start: 'top 66%', end: 'bottom 66%', scrub: 0.5 } });
  gsap.to(story, { contact: 1, ease: 'none', onUpdate: () => syncScene(), scrollTrigger: { trigger: '#contact', start: 'top bottom', end: 'bottom bottom', scrub: 0.8 } });
  /* l'accent de chaque pictogramme se trace à l'arrivée de sa ligne */
  $$('.effet').forEach((li) => ScrollTrigger.create({ trigger: li, start: 'top 82%', once: true, onEnter: () => li.classList.add('is-seen') }));

  onLang(() => { splitManifeste(); ScrollTrigger.refresh(); measureClear(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { ScrollTrigger.refresh(); measureClear(); });
}

/* copie de l'adresse */
const copy = $('#copy'), copied = $('#copied'), mail = $('#mail');
if (copy && mail) {
  let timer = 0;
  const done = () => { copied.textContent = meta().copied; clearTimeout(timer); timer = setTimeout(() => { copied.textContent = ''; }, 2600); };
  const select = () => { const r = document.createRange(); r.selectNodeContents(mail); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
  copy.addEventListener('click', () => {
    try { navigator.clipboard.writeText(mail.textContent).then(done, select); } catch (e) { select(); }
  });
}

bootScene();
