/* ═══════════════════════════════════════════════════════════
   Nicolas Delffon · site de services
   1. Langue (français dans la page, anglais ci-dessous)
   2. Scène : un nuage de points qui passe du relevé brut à la carte,
      aux chantiers, à la boucle d'agents, puis à l'outil en service
   3. Défilement : chapitres, manifeste, itinéraire, navigation
   Aucune dépendance externe.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var smooth = function (v) { return v * v * (3 - 2 * v); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  /* ═══════════════════════ 1. langue ═══════════════════════ */

  var EN = {
    'skip': 'Skip to content',
    'nav.methode': 'Approach', 'nav.realisations': 'Work', 'nav.aide': 'What I do', 'nav.apropos': 'About', 'nav.cta': 'Write to me',
    'hero.kicker': 'Data and artificial intelligence advisory. Sainte-Adèle, Laurentians.',
    'hero.l1': 'Tools that live up to',
    'hero.l2': 'your mission.',
    'hero.sub': 'I work with organizations that want to put their data and artificial intelligence to work for their mission: lightening repetitive work, informing decisions and giving teams time back for what matters most.',
    'hero.cta1': 'Write to me', 'hero.cta2': 'See my approach',
    'hero.sign': 'Nicolas Delffon. Trained in computer science and urban planning, twenty years of experience in data and geomatics.',
    'hero.note': 'Simulated survey. <span class="hover-only">Hover it: the map appears underneath. </span>Scroll: it becomes a tool.',
    'lab.demandes': 'Requests', 'lab.terrain': 'Field work', 'lab.fin': 'Finance', 'lab.projets': 'Projects', 'lab.docs': 'Records',
    'lab.c1': 'Project 1', 'lab.c2': 'Project 2', 'lab.c3': 'Project 3',
    'lab.plan': 'plans', 'lab.dev': 'builds', 'lab.qa': 'checks', 'lab.human': 'a person answers for it',
    'ch1.t': 'Understand',
    'ch1.p': 'Everything starts with the people who do the work. How a request comes in, who handles it, where it waits, where it gets lost. We turn it into a map the whole team can read and correct.',
    'ch1.chip': 'A map of how you work, reviewed by the team',
    'ch2.t': 'Choose',
    'ch2.p': 'Not everything deserves a tool. We keep the projects that will have the most effect, at a cost the organization can carry. Sometimes the best answer is a clearer rule or a better-organized folder.',
    'ch2.chip': 'Priority projects, with their cost and their limits',
    'ch3.t': 'Build',
    'ch3.p': 'I build version after version, and you see every step. AI agents do a large share of the development and check each other; I direct the work and answer for it. Your feedback steers what comes next.',
    'ch3.chip': 'Versions the team tries at every step',
    'ch4.t': 'Hand over',
    'ch4.p': 'A tool is worth something when the team makes it its own. I document it, train the people who will use it and stay reachable. Wherever AI is involved, a person keeps the last word.',
    'ch4.chip': 'A documented tool and a team that masters it',
    'manifeste': 'Technology is not the goal. The goal is a team that spends less time in its spreadsheets and more time with the people it serves.',
    'real.h': 'What it changes, in practice',
    'r1.t': 'Giving teams their time back',
    'r2.t': 'Making data speak',
    'r3.t': 'Preserving an organization’s memory',
    'r4.t': 'Knowing a territory better',
    'aides.h': 'What I can do with you',
    'aides.sub': 'Four ways to start. Each can stand on its own or lead to the next.',
    'm1.t': 'See clearly', 'm1.k': 'Diagnostic and roadmap',
    'm1.p': 'We examine how you work, your data and your tools, with the people who do the work. You leave with a clear roadmap: the projects that matter, in what order, at what cost.',
    'm1.w': 'My commitment: to tell you when the best answer is not digital.',
    'm2.t': 'Free up time', 'm2.k': 'Automation',
    'm2.p': 'Double entry, workbooks grown unmanageable, checks done line by line: I replace them with robust, documented tools connected to your systems, so your teams can devote themselves to their mission.',
    'm2.w': 'My commitment: to clarify the way of working before automating anything.',
    'm3.t': 'Integrate AI with discernment', 'm3.k': 'Artificial intelligence',
    'm3.p': 'I put AI where it brings real value: reading documents, preparing an analysis, flagging what deserves attention. A person checks and keeps the decision.',
    'm3.w': 'My commitment: to tell you plainly when AI adds nothing.',
    'm4.t': 'Build solid foundations', 'm4.k': 'Data, dashboards and maps',
    'm4.p': 'A reliable, documented database, then dashboards and maps that answer the questions that matter to you. Geomatics is my first trade: when the question is “where?”, I am on home ground.',
    'm4.w': 'My commitment: to plan from the start who will maintain the data.',
    'apropos.h': 'Who I am',
    'apropos.p1': 'My name is Nicolas Delffon. Trained in computer science and urban planning, I have spent twenty years putting data and maps to work for organizations. I founded and led Anagraph, a geomatics studio, then led Jakarto, a 3D mapping company.',
    'apropos.p2': 'What guides me: that technology serves people and the common good. I measure a tool by the time, clarity and confidence it gives back to a team.',
    'apropos.p3': 'You work directly with me. AI agents do a large share of the development under my direction, which lets me run several projects at once. When a project calls for a team, I know how to bring one together and lead it: I did it for eleven years.',
    'apropos.p4': 'I live in Sainte-Adèle, in the Laurentians.',
    'w1.when': 'Before 2015', 'w1.t': 'Nature-Action Québec, then Effigis',
    'w1.p': 'Head of the geomatics department at an environmental non-profit, then project manager in a firm.',
    'w2.when': '2015 to 2023', 'w2.t': 'Anagraph',
    'w2.p': 'Founder and president of a geomatics studio: a team of ten specialists, decision-support tools for public and private clients.',
    'w3.when': 'Volunteering', 'w3.t': 'Canadian Institute of Geomatics',
    'w3.p': 'President of the Montreal branch.',
    'w4.when': '2023 to 2026', 'w4.t': 'Jakarto',
    'w4.p': 'Vice-President of Professional Services, then General Manager of a company in 3D mapping and AI-built asset inventories.',
    'w5.when': 'Since 2026', 'w5.t': 'Independent advisor',
    'w5.p': 'I support organizations in their data and artificial intelligence projects.',
    'recrute.h': 'I am also open to a position.',
    'recrute.p': 'If your organization is looking for someone to lead its data, digital or artificial intelligence projects, write to me. A position interests me as much as an engagement, as long as the work is meaningful.',
    'contact.h': 'Let’s talk about your organization.',
    'contact.p': 'Tell me what you want to achieve. A first conversation commits you to nothing, and if I am not the right person, I will tell you plainly.',
    'contact.copy': 'Copy address',
    'contact.where': 'Sainte-Adèle, in the Laurentians. Across Quebec, in French or English.',
    'coords': '45.95° N, 74.13° W'
  };

  var META = {
    fr: {
      title: 'Nicolas Delffon. Des outils à la hauteur de votre mission.',
      desc: 'Conseil en données et en intelligence artificielle pour les organisations. Nicolas Delffon, Sainte-Adèle, Laurentides.',
      nav: 'Navigation principale', voyage: 'Ma démarche, du premier échange à l’outil transmis', lang: 'Switch to English', copied: 'Adresse copiée'
    },
    en: {
      title: 'Nicolas Delffon. Tools that live up to your mission.',
      desc: 'Data and artificial intelligence advisory for organizations. Nicolas Delffon, Sainte-Adèle, Laurentians, Quebec.',
      nav: 'Main navigation', voyage: 'My approach, from the first conversation to the tool handed over', lang: 'Passer au français', copied: 'Address copied'
    }
  };

  var i18nNodes = $$('[data-i18n]');
  var FR = {};
  i18nNodes.forEach(function (n) { var k = n.getAttribute('data-i18n'); if (!(k in FR)) FR[k] = n.innerHTML; });

  var lang = 'fr';
  var mWords = [];
  var afterLang = function () {};

  function splitManifeste() {
    var el = $('#manifesteText');
    if (!el) return;
    var words = el.textContent.trim().split(/ +/);
    el.innerHTML = words.map(function (w) { return '<span class="w">' + w + '</span>'; }).join(' ');
    mWords = $$('.w', el);
  }

  function setLang(l, remember) {
    lang = l === 'en' ? 'en' : 'fr';
    i18nNodes.forEach(function (n) {
      var k = n.getAttribute('data-i18n');
      var v = lang === 'en' ? EN[k] : FR[k];
      if (v != null) n.innerHTML = v;
    });
    var m = META[lang];
    root.lang = lang === 'en' ? 'en-CA' : 'fr-CA';
    document.title = m.title;
    var d = $('meta[name="description"]'); if (d) d.setAttribute('content', m.desc);
    var b = $('#lang'); if (b) { b.textContent = lang === 'en' ? 'FR' : 'EN'; b.setAttribute('aria-label', m.lang); }
    var nv = $('.nav-links'); if (nv) nv.setAttribute('aria-label', m.nav);
    var vy = $('#methode'); if (vy) vy.setAttribute('aria-label', m.voyage);
    splitManifeste();
    if (remember) { try { localStorage.setItem('lang', lang); } catch (e) {} }
    root.classList.remove('lang-pending');
    afterLang();
  }

  (function () {
    var initial = 'fr';
    try { initial = localStorage.getItem('lang') || 'fr'; } catch (e) {}
    if (location.hash === '#en') initial = 'en';
    if (location.hash === '#fr') initial = 'fr';
    setLang(initial, false);
    var b = $('#lang');
    if (b) b.addEventListener('click', function () { setLang(lang === 'fr' ? 'en' : 'fr', true); });
  })();

  /* ═══════════════════════ 2. scène ═══════════════════════ */

  var X0 = -1.3, X1 = 1.3, Z0 = -0.85, Z1 = 0.85;
  /* cinq collines : (cx, cz, amplitude, sx, sz, rotation) */
  var HILLS = [
    [-0.55, -0.10, 1.00, 0.34, 0.26, 0.5],
    [0.20, -0.32, 0.78, 0.30, 0.22, -0.4],
    [0.72, 0.12, 0.92, 0.28, 0.30, 0.2],
    [-0.05, 0.36, 0.62, 0.36, 0.20, 0.1],
    [-0.98, 0.40, 0.50, 0.22, 0.22, 0.0]
  ];
  function H(x, z) {
    var h = 0.06 * Math.sin(3.1 * x + 1.3) * Math.cos(2.7 * z - 0.6) + 0.04 * Math.sin(5.3 * x - 2.1 * z);
    for (var i = 0; i < HILLS.length; i++) {
      var q = HILLS[i], c = Math.cos(q[5]), s = Math.sin(q[5]);
      var dx = x - q[0], dz = z - q[1];
      var u = (c * dx + s * dz) / q[3], v = (-s * dx + c * dz) / q[4];
      h += q[2] * Math.exp(-0.5 * (u * u + v * v));
    }
    return h;
  }

  /* le massif retombe à zéro vers les bords : les courbes de niveau se referment dans le cadre */
  function Hs(x, z) {
    var ex = clamp01(Math.min(x - X0, X1 - x) / 0.34), ez = clamp01(Math.min(z - Z0, Z1 - z) / 0.28);
    var h = H(x, z) * smooth(ex) * smooth(ez) - 0.012;
    return h > 0 ? h : 0;
  }

  var YS = 0.5;                                   // exagération verticale du relief
  var LOOP = { cx: 0.06, cz: 0.02, r: 0.5 };
  var NODE_ANGLES = [-Math.PI / 2, Math.PI / 6, 5 * Math.PI / 6];   // planifie, développe, contrôle
  var PEAKS = [HILLS[0], HILLS[2], HILLS[1]];                        // chantiers 1, 2, 3
  var PEAK_SCALE = [1.25, 1.02, 0.86];

  function buildStates(N) {
    var seed = 20261111;
    var R = function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    var G = function () { return Math.sqrt(-2 * Math.log(R() + 1e-9)) * Math.cos(6.283185307 * R()); };
    var TAU = 6.283185307;

    var pos = [], par = [];
    for (var s = 0; s < 5; s++) { pos.push(new Float32Array(N * 3)); par.push(new Float32Array(N * 3)); }
    var rnd = new Float32Array(N * 4);
    for (var i = 0; i < N * 4; i++) rnd[i] = R();
    var set = function (st, i, x, y, z, tone, alpha, spin) {
      var P = pos[st], Q = par[st], j = i * 3;
      P[j] = x; P[j + 1] = y; P[j + 2] = z; Q[j] = tone; Q[j + 1] = alpha; Q[j + 2] = spin || 0;
    };

    /* 0 · relevé brut : le relief, balayé ligne par ligne, avec son bruit */
    var ROWS = 96, LX = -0.55, LY = 0.62, LZ = -0.56;   // lumière du nord-ouest, comme sur une carte ombrée
    for (i = 0; i < N; i++) {
      var row = Math.floor(R() * ROWS);
      var z = Z0 + (row + 0.5 + (R() - 0.5) * 0.4) / ROWS * (Z1 - Z0);
      var x = X0 + R() * (X1 - X0);
      var y = Hs(x, z) * YS + G() * 0.008;
      if (R() < 0.05) y += G() * 0.05;
      var e0 = 0.004;
      var nx0 = -(Hs(x + e0, z) - Hs(x - e0, z)) / (2 * e0) * YS, nz0 = -(Hs(x, z + e0) - Hs(x, z - e0)) / (2 * e0) * YS;
      var nl = Math.sqrt(nx0 * nx0 + 1 + nz0 * nz0);
      var shade = clamp01((nx0 * LX + LY + nz0 * LZ) / nl);
      set(0, i, x, y, z, 0, 0.12 + 0.74 * Math.pow(1 - shade, 1.6) + 0.08 * R(), 0);
    }

    /* 1 · la carte : chaque point se pose sur une courbe de niveau */
    var STEP = 0.07, level1 = new Uint8Array(N);
    var tmp = [0, 0, 0];
    function onContour(out) {
      for (var tries = 0; tries < 40; tries++) {
        var x = X0 + R() * (X1 - X0), z = Z0 + R() * (Z1 - Z0);
        var k = Math.round(Hs(x, z) / STEP);
        if (k < 1) continue;
        var index = k % 5 === 0;
        if (!index && R() < 0.3) continue;
        var level = k * STEP, ok = false;
        for (var it = 0; it < 5; it++) {
          var e = 1e-3;
          var gx = (Hs(x + e, z) - Hs(x - e, z)) / (2 * e), gz = (Hs(x, z + e) - Hs(x, z - e)) / (2 * e);
          var g2 = gx * gx + gz * gz;
          if (g2 < 1e-4) break;
          var dh = Hs(x, z) - level, sx = dh * gx / g2, sz = dh * gz / g2;
          var sl = Math.sqrt(sx * sx + sz * sz);
          if (sl > 0.06) { sx *= 0.06 / sl; sz *= 0.06 / sl; }
          x -= sx; z -= sz;
          if (Math.abs(Hs(x, z) - level) < 0.0015) { ok = true; break; }
        }
        if (!ok || x < X0 || x > X1 || z < Z0 || z > Z1) continue;
        out[0] = x; out[1] = z; out[2] = index ? 1 : 0;
        return true;
      }
      return false;
    }
    for (i = 0; i < N; i++) {
      if (onContour(tmp)) {
        level1[i] = 1;
        set(1, i, tmp[0], 0, tmp[1], tmp[2] ? 1 : 0.92, tmp[2] ? 0.96 : 0.4, Hs(tmp[0], tmp[1]) * YS);
      } else {
        set(1, i, X0 + Math.round(R() * 20) / 20 * (X1 - X0), 0, Z0 + Math.round(R() * 13) / 13 * (Z1 - Z0), 0, 0.2, 0);
      }
    }

    /* 2 · les chantiers : la carte s'efface, les points voisins de trois sommets se resserrent en cibles */
    var order = [], dmin = new Float32Array(N), near = new Uint8Array(N);
    for (i = 0; i < N; i++) {
      var px = pos[1][i * 3], pz = pos[1][i * 3 + 2], best = 1e9, bj = 0;
      for (var j = 0; j < 3; j++) { var d = Math.hypot(px - PEAKS[j][0], pz - PEAKS[j][1]); if (d < best) { best = d; bj = j; } }
      dmin[i] = best; near[i] = bj; order.push(i);
    }
    order.sort(function (a, b) { return dmin[a] - dmin[b]; });
    var quota = [Math.round(N * 0.15), Math.round(N * 0.125), Math.round(N * 0.105)], used = [0, 0, 0];
    var chosen = new Int8Array(N).fill(-1);
    for (var o = 0; o < N; o++) {
      var id = order[o], t = near[id];
      if (used[t] < quota[t]) { chosen[id] = t; used[t]++; }
      if (used[0] >= quota[0] && used[1] >= quota[1] && used[2] >= quota[2]) break;
    }
    for (i = 0; i < N; i++) {
      var c = chosen[i];
      if (c < 0) { set(2, i, pos[1][i * 3], 0, pos[1][i * 3 + 2], 0.15, par[1][i * 3 + 1] * 0.36, 0); continue; }
      var sc = PEAK_SCALE[c], u = R(), ang = R() * TAU, rr;
      if (u < 0.2) rr = Math.sqrt(R()) * 0.03 * sc;
      else if (u < 0.52) rr = 0.088 * sc + G() * 0.003;
      else rr = 0.158 * sc + G() * 0.003;
      set(2, i, PEAKS[c][0] + Math.cos(ang) * rr, 0, PEAKS[c][1] + Math.sin(ang) * rr, 1, 1, 0);
    }

    /* 3 · la boucle d'agents : trois nœuds, des lots de travail qui circulent */
    for (i = 0; i < N; i++) {
      var w = R();
      if (w < 0.14) {
        set(3, i, X0 + Math.round(R() * 20) / 20 * (X1 - X0) + G() * 0.003, 0, Z0 + Math.round(R() * 13) / 13 * (Z1 - Z0) + G() * 0.003, 0, 0.26, 0);
      } else if (w < 0.47) {
        var n = Math.floor(R() * 3), a = R() * TAU;
        var rad = R() < 0.62 ? Math.sqrt(R()) * 0.074 : 0.116 + G() * 0.003;
        set(3, i, LOOP.cx + Math.cos(NODE_ANGLES[n]) * LOOP.r + Math.cos(a) * rad, 0, LOOP.cz + Math.sin(NODE_ANGLES[n]) * LOOP.r + Math.sin(a) * rad, 1, 0.96, 0);
      } else {
        var th = R() < 0.72 ? Math.floor(R() * 9) * TAU / 9 + G() * 0.085 : R() * TAU;
        var lr = LOOP.r + G() * 0.007;
        set(3, i, LOOP.cx + Math.cos(th) * lr, 0, LOOP.cz + Math.sin(th) * lr, 1, 0.82, 1);
      }
    }

    /* 4 · l'outil en service : une application, son menu, ses indicateurs, ses résultats qui montent */
    var items = [], total = 0;
    var seg = function (x0, z0, x1, z1, tone, alpha, k) { var wgt = Math.hypot(x1 - x0, z1 - z0) * (k || 1); items.push({ t: 0, a: [x0, z0, x1, z1], tone: tone, alpha: alpha, w: wgt }); total += wgt; };
    var fill = function (x0, z0, x1, z1, tone, alpha) { var wgt = Math.abs((x1 - x0) * (z1 - z0)) * 40; items.push({ t: 1, a: [x0, z0, x1, z1], tone: tone, alpha: alpha, w: wgt }); total += wgt; };
    var disc = function (cx, cz, r, tone, alpha) { items.push({ t: 2, a: [cx, cz, r], tone: tone, alpha: alpha, w: 0.05 }); total += 0.05; };
    var box = function (x0, z0, x1, z1, tone, alpha) { seg(x0, z0, x1, z0, tone, alpha); seg(x1, z0, x1, z1, tone, alpha); seg(x1, z1, x0, z1, tone, alpha); seg(x0, z1, x0, z0, tone, alpha); };
    var WX0 = -0.98, WX1 = 0.98, WZ0 = -0.62, WZ1 = 0.62;
    box(WX0, WZ0, WX1, WZ1, 0, 0.9);
    seg(WX0, -0.49, WX1, -0.49, 0, 0.8);
    disc(-0.905, -0.555, 0.014, 1, 1); disc(-0.855, -0.555, 0.014, 1, 1); disc(-0.805, -0.555, 0.014, 1, 1);
    seg(-0.58, -0.49, -0.58, WZ1, 0, 0.55);
    [-0.37, -0.25, -0.13, -0.01, 0.11].forEach(function (zz, q) { seg(-0.9, zz, -0.68, zz, q === 0 ? 1 : 0, q === 0 ? 1 : 0.5, q === 0 ? 1.6 : 0.9); });
    [[-0.5, -0.07], [-0.01, 0.42], [0.48, 0.91]].forEach(function (xx) {
      box(xx[0], -0.41, xx[1], -0.19, 0, 0.7);
      seg(xx[0] + 0.05, -0.33, xx[0] + 0.2, -0.33, 1, 1, 2.4);
      seg(xx[0] + 0.05, -0.25, xx[0] + 0.3, -0.25, 0, 0.42, 0.8);
    });
    seg(-0.5, 0.5, 0.3, 0.5, 0, 0.75);
    [0.14, 0.2, 0.18, 0.28, 0.34, 0.42, 0.52].forEach(function (hh, q) { var bx = -0.47 + q * 0.108; fill(bx, 0.5 - hh, bx + 0.07, 0.492, 1, 0.94); });
    [-0.06, 0.06, 0.18, 0.3, 0.42].forEach(function (zz) { seg(0.42, zz, 0.5, zz, 1, 0.85, 1.6); seg(0.54, zz, 0.91, zz, 0, 0.45, 0.9); });
    for (i = 0; i < N; i++) {
      var pick = R() * total, it2 = items[0];
      for (var m = 0; m < items.length; m++) { pick -= items[m].w; if (pick <= 0) { it2 = items[m]; break; } }
      var A = it2.a, qx, qz;
      if (it2.t === 0) { var f = R(); qx = A[0] + (A[2] - A[0]) * f + G() * 0.0016; qz = A[1] + (A[3] - A[1]) * f + G() * 0.0016; }
      else if (it2.t === 1) { qx = A[0] + (A[2] - A[0]) * R(); qz = A[1] + (A[3] - A[1]) * R(); }
      else { var da = R() * TAU, dr = Math.sqrt(R()) * A[2]; qx = A[0] + Math.cos(da) * dr; qz = A[1] + Math.sin(da) * dr; }
      set(4, i, qx, 0, qz, it2.tone, it2.alpha, 0);
    }

    return { pos: pos, par: par, rnd: rnd };
  }

  var VERT = [
    'attribute vec3 aA; attribute vec3 aB; attribute vec3 aPA; attribute vec3 aPB; attribute vec4 aR;',
    'uniform mat4 uVP; uniform vec2 uOff; uniform vec2 uC;',
    'uniform float uT, uTime, uPix, uRise, uFade, uScanX, uScanW, uSpinA, uSpinB, uLensW, uDrape;',
    'uniform vec2 uLens;',
    'varying float vTone; varying float vAlpha;',
    'vec2 rot(vec2 v, float a){ float c = cos(a), s = sin(a); return vec2(c*v.x - s*v.y, s*v.x + c*v.y); }',
    'void main(){',
    '  float t = clamp((uT - aR.x * 0.45) / 0.55, 0.0, 1.0);',
    '  t = t * t * (3.0 - 2.0 * t);',
    '  float tArc = t;',
    '  float lens = uLensW * (1.0 - smoothstep(0.3, 0.38, distance(aB.xz, uLens)));',   // la loupe : la carte se forme sous le curseur
    '  float hole = uLensW * (1.0 - smoothstep(0.24, 0.4, distance(aA.xz, uLens))) * (1.0 - lens);',
    '  t = max(t, lens);',
    '  vec3 a = aA; vec3 b = aB;',
    '  a.xz = uC + rot(a.xz - uC, uSpinA * aPA.z);',
    '  b.xz = uC + rot(b.xz - uC, uSpinB * aPB.z);',
    '  b.y += aPB.z * uDrape;',
    '  vec3 p = mix(a, b, t);',
    '  float arc = sin(tArc * 3.14159265);',
    '  p.y += arc * (0.04 + 0.2 * aR.y);',
    '  p.xz += arc * (aR.zw - 0.5) * 0.16;',
    '  p.y *= uRise;',
    '  p.xz += 0.0022 * vec2(sin(uTime * 0.9 + aR.w * 50.0), cos(uTime * 0.8 + aR.z * 50.0));',
    '  float tone = mix(aPA.x, aPB.x, t);',
    '  float alpha = mix(aPA.y, aPB.y, t) * (1.0 - 0.72 * hole);',
    '  float s = exp(-pow((p.x - uScanX) / 0.05, 2.0)) * uScanW;',
    '  tone = clamp(tone + s, 0.0, 1.0);',
    '  alpha = clamp(alpha + s * 0.5, 0.0, 1.0);',
    '  vec4 clip = uVP * vec4(p, 1.0);',
    '  clip.xy += uOff * clip.w;',
    '  gl_Position = clip;',
    '  gl_PointSize = max(1.0, uPix * (0.75 + 0.7 * aR.y) * (1.0 + 0.45 * tone) * (1.0 + s * 0.6));',
    '  vTone = tone; vAlpha = alpha * uFade;',
    '}'
  ].join('\n');

  var FRAG = [
    'precision mediump float;',
    'varying float vTone; varying float vAlpha;',
    'uniform vec3 uInk; uniform vec3 uAcc;',
    'void main(){',
    '  float r = length(gl_PointCoord - 0.5);',
    '  float m = 1.0 - smoothstep(0.3, 0.5, r);',
    '  gl_FragColor = vec4(mix(uInk, uAcc, vTone), vAlpha * m);',
    '}'
  ].join('\n');

  function persp(fovy, aspect, n, f) {
    var t = 1 / Math.tan(fovy / 2);
    return [t / aspect, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0];
  }
  function lookAt(e, c, u) {
    var zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2], l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
    var xx = u[1] * zz - u[2] * zy, xy = u[2] * zx - u[0] * zz, xz = u[0] * zy - u[1] * zx; l = Math.hypot(xx, xy, xz); xx /= l; xy /= l; xz /= l;
    var yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return [xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0, -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1];
  }
  function mul(a, b) {
    var o = new Array(16);
    for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    return o;
  }

  var scene = null;   // { setTarget(p), setVisible(bool), relayout() }

  function initScene(canvas, sticky, labels) {
    var gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) throw new Error('WebGL indisponible');

    function shader(type, src) {
      var sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || 'shader');
      return sh;
    }
    var prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link');
    gl.useProgram(prog);

    var N = window.innerWidth < 760 ? 9000 : 15000;
    var S = buildStates(N);
    var mk = function (data) { var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); return b; };
    var posB = S.pos.map(mk), parB = S.par.map(mk), rndB = mk(S.rnd);
    var loc = { aA: gl.getAttribLocation(prog, 'aA'), aB: gl.getAttribLocation(prog, 'aB'), aPA: gl.getAttribLocation(prog, 'aPA'), aPB: gl.getAttribLocation(prog, 'aPB'), aR: gl.getAttribLocation(prog, 'aR') };
    var U = {};
    ['uVP', 'uOff', 'uC', 'uT', 'uTime', 'uPix', 'uRise', 'uFade', 'uScanX', 'uScanW', 'uSpinA', 'uSpinB', 'uLens', 'uLensW', 'uDrape', 'uInk', 'uAcc'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    Object.keys(loc).forEach(function (k) { gl.enableVertexAttribArray(loc[k]); });
    gl.bindBuffer(gl.ARRAY_BUFFER, rndB); gl.vertexAttribPointer(loc.aR, 4, gl.FLOAT, false, 0, 0);
    var bound = -1;
    function bind(seg) {
      bound = seg;
      gl.bindBuffer(gl.ARRAY_BUFFER, posB[seg]); gl.vertexAttribPointer(loc.aA, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, posB[seg + 1]); gl.vertexAttribPointer(loc.aB, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, parB[seg]); gl.vertexAttribPointer(loc.aPA, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, parB[seg + 1]); gl.vertexAttribPointer(loc.aPB, 3, gl.FLOAT, false, 0, 0);
    }
    gl.uniform3f(U.uInk, 0.114, 0.110, 0.102);
    gl.uniform3f(U.uAcc, 0.639, 0.251, 0.102);
    gl.uniform2f(U.uC, LOOP.cx, LOOP.cz);
    gl.clearColor(0.980, 0.980, 0.969, 1);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    /* étiquettes : position dans le plan de la carte, état où elles apparaissent */
    var labs = $$('.lab', labels).map(function (el) {
      var st = +el.getAttribute('data-state'), at = el.getAttribute('data-at'), node = el.getAttribute('data-node');
      var x = 0, z = 0, lift = 0;
      if (at) { var q = at.split(','); x = +q[0]; z = +q[1]; z += +(el.getAttribute('data-dy') || 0); }
      else if (node === 'c') { x = LOOP.cx; z = LOOP.cz; }
      else if (node != null) { var a = NODE_ANGLES[+node], rr = LOOP.r + 0.27; x = LOOP.cx + Math.cos(a) * rr; z = LOOP.cz + Math.sin(a) * rr; }
      return { el: el, st: st, x: x, z: z, keep: el.hasAttribute('data-keep'), shown: false };
    });

    var FOV = 28 * Math.PI / 180, DXW = 2.72, DZW = 1.82;
    var W = 1, Hh = 1, dpr = 1, aspect = 1, dist = 6, pix = 2, offX = 0.4, offY = 0, narrow = false;
    function layout() {
      W = canvas.clientWidth || window.innerWidth; Hh = canvas.clientHeight || window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(Hh * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      aspect = W / Hh; narrow = W < 860;
      var fw, fh;
      if (narrow) { offX = 0; offY = 0.4; fw = 0.94; fh = 0.38; } else { offX = 0.44; offY = 0.0; fw = 0.5; fh = 0.66; }
      var tf = Math.tan(FOV / 2);
      dist = Math.max((DZW / 2) / (tf * fh), (DXW / 2) / (tf * aspect * fw));
      pix = dpr * Math.max(1.3, Math.min(2.3, Math.min(W, Hh) / 470));
    }
    layout();

    var p = 0, pTarget = 0, visible = true, last = 0, t0 = -1, mx = 0, my = 0, tmx = 0, tmy = 0, raf = 0;
    var ptrX = -1, ptrY = -1, ptrAt = -10, lensW = 0, lensX = 0, lensZ = 0, vpArr = new Float32Array(16);
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    window.addEventListener('pointermove', function (e) {
      tmx = e.clientX / window.innerWidth * 2 - 1; tmy = e.clientY / window.innerHeight * 2 - 1;
      if (e.pointerType === 'mouse' || e.pointerType === 'pen') { ptrX = e.clientX; ptrY = e.clientY; ptrAt = performance.now() / 1000; }
    }, { passive: true });

    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) { last = now / 1000; return; }
      var t = now / 1000;
      if (t0 < 0) { t0 = t; last = t; }
      var dt = Math.min(0.05, t - last); last = t;
      p += (pTarget - p) * Math.min(1, dt * 7);
      if (Math.abs(pTarget - p) < 0.0005) p = pTarget;
      mx += (tmx - mx) * Math.min(1, dt * 3); my += (tmy - my) * Math.min(1, dt * 3);

      var seg = Math.min(3, Math.floor(p)), f = p - seg;
      if (seg !== bound) bind(seg);

      var k = smooth(clamp01(p));                         // 0 : vue oblique du relief · 1 : vue en plan
      var pitch = lerp(0.52, Math.PI / 2 - 0.02, k) - my * 0.035;
      var yaw = lerp(0.13 * Math.sin((t - t0) * 0.21), 0, k) + mx * lerp(0.07, 0.035, k);
      var D = dist * lerp(0.92, 1, k);
      var cp = Math.cos(pitch), sp = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw);
      var tgt = [0, lerp(0.12, 0, k), lerp(-0.02, 0, k)];
      var eye = [tgt[0] + D * cp * sy, tgt[1] + D * sp, tgt[2] + D * cp * cy];
      var up = [-sp * sy, cp, -sp * cy];
      var VP = mul(persp(FOV, aspect, 0.1, 100), lookAt(eye, tgt, up));
      var oy = offY + (narrow ? lerp(0.23, 0, k) : lerp(-0.1, 0, k));

      /* loupe : le rayon du pointeur rencontre le relief, la carte s'y dessine */
      var lensOn = 0;
      if (fine && seg === 0 && p < 0.04 && t - ptrAt < 2.2 && ptrX >= 0) {
        var fx = tgt[0] - eye[0], fy = tgt[1] - eye[1], fz = tgt[2] - eye[2], fl = Math.hypot(fx, fy, fz); fx /= fl; fy /= fl; fz /= fl;
        var rx = fy * up[2] - fz * up[1], ry = fz * up[0] - fx * up[2], rz = fx * up[1] - fy * up[0];
        var tf2 = Math.tan(FOV / 2), ndx = (ptrX / W * 2 - 1 - offX) * tf2 * aspect, ndy = (1 - ptrY / Hh * 2 - oy) * tf2;
        var dx = fx + rx * ndx + up[0] * ndy, dy = fy + ry * ndx + up[1] * ndy, dz = fz + rz * ndx + up[2] * ndy;
        if (dy < -1e-4) {
          var y0 = 0.12, tt = 0, hx = 0, hz = 0;
          for (var it = 0; it < 6; it++) {          // le rayon du pointeur rejoint la surface du relief
            tt = (y0 - eye[1]) / dy; hx = eye[0] + dx * tt; hz = eye[2] + dz * tt;
            y0 = lerp(y0, Hs(hx, hz) * YS, 0.8);
          }
          if (hx > X0 - 0.15 && hx < X1 + 0.15 && hz > Z0 - 0.15 && hz < Z1 + 0.15) { lensOn = 1; lensX += (hx - lensX) * Math.min(1, dt * 12); lensZ += (hz - lensZ) * Math.min(1, dt * 12); }
        }
      }
      lensW += (lensOn - lensW) * Math.min(1, dt * (lensOn ? 5 : 2.2));

      var intro = clamp01((t - t0) / 1.9), rise = 1 - Math.pow(1 - intro, 3);
      var spin = (t - t0) * 0.34;
      vpArr.set(VP);
      gl.uniformMatrix4fv(U.uVP, false, vpArr);
      gl.uniform2f(U.uOff, offX, oy);
      gl.uniform2f(U.uLens, lensX, lensZ);
      gl.uniform1f(U.uLensW, seg === 0 ? clamp01(lensW * 1.1) : 0);
      gl.uniform1f(U.uDrape, seg === 0 ? 1 - smooth(clamp01(f * 1.3)) : 0);
      gl.uniform1f(U.uT, f);
      gl.uniform1f(U.uTime, t - t0);
      gl.uniform1f(U.uPix, pix);
      gl.uniform1f(U.uRise, lerp(0.02, 1, rise));
      gl.uniform1f(U.uFade, clamp01((t - t0) / 1.1));
      gl.uniform1f(U.uScanX, X0 - 0.35 + (((t - t0) * 0.19) % 1) * (X1 - X0 + 0.7));
      gl.uniform1f(U.uScanW, seg === 0 ? (1 - smooth(clamp01(f * 1.8))) * (1 - 0.85 * lensW) : 0);
      gl.uniform1f(U.uSpinA, seg === 3 ? spin : 0);
      gl.uniform1f(U.uSpinB, seg === 2 ? spin : 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.POINTS, 0, N);

      /* étiquettes */
      var top = sticky.getBoundingClientRect().top;
      for (var i = 0; i < labs.length; i++) {
        var L = labs[i];
        var w = clamp01(1 - Math.abs(p - L.st) * 2.3);
        if (L.keep) w = Math.max(w, 0.5 * clamp01(1 - Math.abs(p - 2) * 2.3));
        if (w < 0.01) { if (L.shown) { L.el.style.opacity = 0; L.shown = false; } continue; }
        var cw = VP[3] * L.x + VP[11] * L.z + VP[15];
        var nx = (VP[0] * L.x + VP[8] * L.z + VP[12]) / cw + offX, ny = (VP[1] * L.x + VP[9] * L.z + VP[13]) / cw + oy;
        var sx = (nx * 0.5 + 0.5) * W, sy2 = (1 - (ny * 0.5 + 0.5)) * Hh - top;
        L.el.style.transform = 'translate(' + sx.toFixed(1) + 'px,' + sy2.toFixed(1) + 'px) translate(-50%,-50%)';
        L.el.style.opacity = w.toFixed(3);
        L.shown = true;
      }
    }
    raf = requestAnimationFrame(frame);

    window.addEventListener('resize', layout);
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); cancelAnimationFrame(raf); root.classList.add('static'); });

    return {
      setTarget: function (v) { pTarget = v; },
      setVisible: function (v) { visible = v; },
      relayout: layout
    };
  }

  var canvas = $('#scene'), sticky = $('#sticky'), labelBox = $('#labels');
  if (reduce || !canvas || !sticky) {
    root.classList.add('static');
  } else {
    try { scene = initScene(canvas, sticky, labelBox); }
    catch (err) { root.classList.add('static'); if (window.console) console.warn('Scène indisponible :', err); }
  }

  /* ═══════════════════════ 3. défilement ═══════════════════════ */

  var nav = $('#nav'), voyage = $('#methode'), chapters = $$('.chapter');
  var manifeste = $('#manifeste'), itin = $('#itin');
  var vh = 1, vTop = 0, vH = 1, mTop = 0, mH = 1, iTop = 0, iH = 1;

  function measure() {
    vh = window.innerHeight;
    var y = window.scrollY || window.pageYOffset;
    var r = voyage.getBoundingClientRect(); vTop = r.top + y; vH = r.height;
    r = manifeste.getBoundingClientRect(); mTop = r.top + y; mH = r.height;
    r = itin.getBoundingClientRect(); iTop = r.top + y; iH = r.height;
  }

  function update() {
    var y = window.scrollY || window.pageYOffset;
    nav.classList.toggle('is-stuck', y > 24);

    if (!root.classList.contains('static')) {
      var s0 = vTop - 0.7 * vh, s1 = vTop + vH - vh;
      var v = clamp01((y - s0) / (s1 - s0));
      var q = v * 4, ks = Math.min(3, Math.floor(q)), loc = q - ks;
      if (scene) {
        scene.setTarget(v >= 1 ? 4 : ks + smooth(clamp01(loc / 0.55)));
        scene.setVisible(y < s1 + vh * 1.1);
      }
      var pin = 0.7 * vh / (s1 - s0);                 // valeur de v où la section s'épingle
      for (var i = 0; i < chapters.length; i++) {
        var a = i === 0 ? pin * 0.8 : i / 4 + 0.035, b = i === chapters.length - 1 ? 9 : (i + 1) / 4 + 0.02;
        chapters[i].classList.toggle('is-on', v >= a && v < b);
      }

      manifeste.style.setProperty('--open', smooth(clamp01((y + vh - mTop) / (vh * 0.85))).toFixed(3));
      var wp = clamp01((y + vh * 0.74 - mTop) / (mH * 0.6));
      var n = Math.floor(wp * (mWords.length + 1));
      for (i = 0; i < mWords.length; i++) mWords[i].classList.toggle('on', i < n);
    }
    itin.style.setProperty('--p', clamp01((y + vh * 0.72 - iTop) / iH).toFixed(3));
  }

  var ticking = false;
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; update(); }); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { measure(); update(); });
  window.addEventListener('load', function () { measure(); update(); });
  afterLang = function () { measure(); update(); };
  measure(); update();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); update(); });

  /* entrée du titre */
  var enter = function () { requestAnimationFrame(function () { root.classList.add('is-in'); }); };
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(enter); setTimeout(enter, 1200); } else enter();

  /* section courante dans la navigation */
  if ('IntersectionObserver' in window) {
    var links = {};
    $$('.nav-links a').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { var a = links[e.target.id]; if (a) a.setAttribute('aria-current', e.isIntersecting ? 'true' : 'false'); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(links).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* copie de l'adresse */
  var copy = $('#copy'), copied = $('#copied'), mail = $('#mail');
  if (copy && mail) {
    copy.addEventListener('click', function () {
      var done = function () { copied.textContent = META[lang].copied; setTimeout(function () { copied.textContent = ''; }, 2600); };
      var select = function () { var r = document.createRange(); r.selectNodeContents(mail); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); };
      try { navigator.clipboard.writeText(mail.textContent).then(done, select); } catch (e) { select(); }
    });
  }
})();
