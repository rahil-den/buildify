(() => {
'use strict';

/* ================= Helpers ================= */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const moneyHTML = (m) => (m ? `<b>${esc(m.t)}</b>${m.n ? ` (${esc(m.n)})` : ''}` : '');
const moneyText = (m) => (m ? `${m.t}${m.n ? ` (${m.n})` : ''}` : '');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const DIFF = { 1: 'Weekend project', 2: 'A few weekends', 3: 'Serious build' };

/* ================= Data =================
   Each page (home, CLI projects, web & mobile apps) has its own data file, named in
   <body data-src="...">. A copy is embedded in the page so it renders instantly and works
   when opened straight from disk; the live file is fetched afterwards in case it's newer. */
function normalize(d) {
  const ok = (s) => typeof s === 'string' && s.trim().length > 0;
  if (!d || !d.reels || !d.money || !d.money.byTag) throw new Error('ideas.json is missing reels or money');
  const w = (x) => ({ ...x, w: Number.isFinite(x.w) ? Math.max(-2, Math.min(1, Math.round(x.w))) : 0 });
  const business = (d.reels.business || []).filter((x) => ok(x.text) && ok(x.short) && Array.isArray(d.money.byTag[x.tag])).map(w);
  const audience = (d.reels.audience || []).filter((x) => ok(x.text) && ok(x.short) && x.money && ok(x.money.t)).map(w);
  const twist = (d.reels.twist || []).filter((x) => ok(x.text) && ok(x.short) && x.money && ok(x.money.t)).map(w);
  const daily = (d.daily || []).filter((x) => ok(x.title) && ok(x.pitch) && Array.isArray(x.mvp) && x.mvp.length);
  if (business.length < 3 || audience.length < 3 || twist.length < 3 || !daily.length) throw new Error('ideas.json has too few items');
  const page = { daily: 'Idea of the day', noun: 'idea', who: 'Who pays', ...(d.page || {}) };
  return { updated: d.updated, config: d.config || {}, page, money: d.money, build: d.build || { byTag: {} }, reels: { business, audience, twist }, daily };
}
let DATA = normalize(JSON.parse($('buildify-data').textContent));

const VERDICTS = { genius: { label: 'Genius' }, good: { label: 'Good' }, mid: { label: 'Mid' }, bad: { label: 'Bad' }, cursed: { label: 'Cursed' } };
const scoreToVerdict = (s) => (s >= 3 ? 'genius' : s >= 1 ? 'good' : s >= -1 ? 'mid' : s >= -3 ? 'bad' : 'cursed');
const verdictOf = (c) => scoreToVerdict(c.a.w + c.b.w + c.c.w);
const moneyFor = (c) => [...(DATA.money.byTag[c.a.tag] || []), c.b.money, c.c.money].filter(Boolean);
const isNew = (item) => item.added && Date.now() - Date.parse(item.added) < 8 * 86400000;

/* ================= Icons & reel faces ================= */
const ICON = {
  briefcase: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7.5" width="18" height="12.5" rx="2.2"/><path d="M8.8 7.5V5.6c0-.9.7-1.6 1.6-1.6h3.2c.9 0 1.6.7 1.6 1.6v1.9M3 12.6h18M10.8 12.6v1.7h2.4v-1.7"/></svg>',
  people: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8.2" r="3.3"/><path d="M2.8 19.6c0-3.5 2.8-6 6.2-6s6.2 2.5 6.2 6M15.4 5.2a3.1 3.1 0 0 1 0 6M17.6 13.9c2.2.7 3.6 2.8 3.6 5.4"/></svg>',
  sparkle: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M12 3c.6 4.8 3.2 8.4 9 9-5.8.6-8.4 4.2-9 9-.6-4.8-3.2-8.4-9-9 5.8-.6 8.4-4.2 9-9z"/></svg>',
  terminal: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4" width="19" height="16" rx="2.5"/><path d="M6.5 9.5 9.5 12l-3 2.5M12 15h5"/></svg>',
  devices: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4.5" width="13" height="10" rx="1.8"/><path d="M5.5 18h7"/><rect x="15.5" y="8.5" width="6" height="11" rx="1.5"/><path d="M18 17.3h1"/></svg>',
};
const ARROW_DOWN = '<svg class="f-arrow" viewBox="0 0 12 18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 1.5v14.5M2 12l4 4.2L10 12"/></svg>';
const CHECK = '<span class="chk"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.3 5 8.6l4.6-5"/></svg></span>';
const PILL_ICON = {
  genius: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="7.5" fill="currentColor"/><path d="M8 3.6l1.2 2.7 2.9.3-2.2 1.9.7 2.9L8 9.9l-2.6 1.5.7-2.9-2.2-1.9 2.9-.3z" fill="#fff"/></svg>',
  good: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="7.5" fill="currentColor"/><path d="M4.8 8.3 7 10.4l4.2-4.6" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  mid: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="7.5" fill="currentColor"/><path d="M5 8h6" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>',
  bad: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="7.5" fill="currentColor"/><path d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/></svg>',
  cursed: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="7.5" fill="currentColor"/><path d="M8 4.2v4.6" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/><circle cx="8" cy="11.4" r="1" fill="#fff"/></svg>',
};
const SOUND_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18.3 6.5a8 8 0 0 1 0 11"/></svg>';
const SOUND_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
const DEFAULT_REELS = [
  { label: 'Business', sub: '(what it is)', icon: 'briefcase' },
  { label: 'Audience', sub: '(for whom)', icon: 'people' },
  { label: 'Twist', sub: '(the catch)', icon: 'sparkle' },
];
function meta(i) {
  const r = (Array.isArray(DATA.page.reels) && DATA.page.reels[i]) || DEFAULT_REELS[i];
  return { label: esc(r.label || DEFAULT_REELS[i].label), sub: esc(r.sub || ''), icon: ICON[r.icon] || ICON[DEFAULT_REELS[i].icon] };
}
const restFace = (i) => { const m = meta(i); return `<div class="face face-rest">${m.icon}<div class="f-label">${m.label}</div><div class="f-sub">${m.sub}</div>${ARROW_DOWN}</div>`; };
const valueFace = (i, item) => { const m = meta(i); return `<div class="face face-val"><div class="fv-head">${m.icon}<span>${m.label}</span>${isNew(item) ? '<em class="fv-new">NEW</em>' : ''}</div><div class="fv-text">${esc(item.short)}</div></div>`; };

/* ================= DOM ================= */
const machine = $('machine');
const reels = [0, 1, 2].map((i) => $('reel' + i));
const strips = reels.map((r) => r.querySelector('.strip'));
const rod = $('lvRod'), ball = $('lvBall'), hit = $('lvHit');
const verdictChip = $('mVerdict');
const ideaLegend = $('ideaLegend'), ideaBadge = $('ideaBadge'), ideaSentence = $('ideaSentence');
const moneyList = $('moneyList'), recentList = $('recentList'), soundBtn = $('soundBtn');
const emPx = () => parseFloat(getComputedStyle(machine).fontSize) || 10;
strips.forEach((s, i) => { s.innerHTML = restFace(i); });

/* ================= Sound (Web Audio, no files) ================= */
let ctx = null, master = null, noiseBuf = null, soundOn = true;
function ensureAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
}
function tone(freq, at, dur, opt = {}) {
  if (!ctx || !soundOn) return;
  const { type = 'sine', peak = 0.15, slide = null, lp = null } = opt;
  const t0 = ctx.currentTime + at;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
  let node = o;
  if (lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; node.connect(f); node = f; }
  node.connect(g); g.connect(master);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.start(t0); o.stop(t0 + dur + 0.05);
}
function noise(at, dur, peak, freq, q = 1) {
  if (!ctx || !soundOn) return;
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t0 = ctx.currentTime + at;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f); f.connect(g); g.connect(master);
  s.start(t0, Math.random() * 0.3); s.stop(t0 + dur + 0.02);
}
const SFX = {
  clunk() { noise(0, 0.09, 0.5, 700, 0.8); tone(120, 0, 0.18, { peak: 0.4, slide: 55 }); },
  tick() { noise(0, 0.035, 0.35, 2600, 1.2); tone(1500, 0, 0.045, { type: 'triangle', peak: 0.07 }); },
  ratchet(total) { let t = 0.02, gap = 0.05; while (t < total) { noise(t, 0.014, 0.07, 4000, 2); t += gap; gap = Math.min(0.14, gap * 1.045); } },
  genius() { [1046.5, 1318.5, 1568, 2093].forEach((f, i) => tone(f, i * 0.08, 0.55, { peak: 0.13 })); tone(2637, 0.34, 1.1, { peak: 0.08 }); tone(3136, 0.42, 1.0, { peak: 0.05 }); },
  good() { tone(1318.5, 0, 0.5, { peak: 0.16 }); tone(1975.5, 0.1, 0.9, { peak: 0.15 }); tone(3951, 0.1, 0.6, { peak: 0.025 }); },
  mid() { tone(784, 0, 0.28, { type: 'triangle', peak: 0.12 }); tone(740, 0.15, 0.4, { type: 'triangle', peak: 0.1 }); },
  bad() { tone(247, 0, 0.26, { type: 'sawtooth', peak: 0.08, slide: 208, lp: 1400 }); tone(185, 0.22, 0.5, { type: 'sawtooth', peak: 0.09, slide: 139, lp: 1100 }); },
  cursed() { tone(220, 0, 0.32, { type: 'square', peak: 0.05, slide: 165, lp: 900 }); tone(165, 0.28, 0.32, { type: 'square', peak: 0.05, slide: 123, lp: 800 }); tone(110, 0.56, 0.9, { type: 'square', peak: 0.06, slide: 58, lp: 600 }); },
};
soundBtn.innerHTML = SOUND_ON;
soundBtn.addEventListener('click', () => {
  soundOn = !soundOn;
  soundBtn.innerHTML = soundOn ? SOUND_ON : SOUND_OFF;
  soundBtn.setAttribute('aria-pressed', String(!soundOn));
  soundBtn.setAttribute('aria-label', soundOn ? 'Mute sounds' : 'Unmute sounds');
});

/* ================= Lever =================
   The arm swings toward the viewer around a pivot in the chrome cap,
   so from the front the ball travels straight down past the pivot. */
const RAD = Math.PI / 180;
const L = { px: 45.43, py: 17.5, len: 10.6, rest: 17, max: 140 };
L.lh = L.len * Math.sin(L.rest * RAD);
L.lv = L.len * Math.cos(L.rest * RAD);
let theta = 0;
function renderLever(t) {
  theta = t;
  const up = L.lv * Math.cos(t * RAD);
  const len = Math.max(0.001, Math.hypot(L.lh, up));
  rod.style.height = len + 'em';
  rod.style.top = (L.py - len) + 'em';
  rod.style.transform = `rotate(${Math.atan2(L.lh, up) / RAD}deg)`;
  ball.style.left = (L.px + L.lh) + 'em';
  ball.style.top = (L.py - up) + 'em';
  ball.style.transform = `translate(-50%,-50%) scale(${(1 + 0.16 * Math.sin(t * RAD)).toFixed(4)})`;
}
renderLever(0);
function tween(from, to, ms, ease) {
  return new Promise((res) => {
    if (reduceMotion || ms <= 0) { renderLever(to); res(); return; }
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / ms);
      renderLever(from + (to - from) * ease(p));
      if (p < 1) requestAnimationFrame(step); else res();
    };
    requestAnimationFrame(step);
  });
}
const easeInCubic = (p) => p * p * p;
const easeOutBack = (p) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };

let busy = false, dragging = false, dragY0 = 0, dragT0 = 0, moved = 0, pid = null;
function bump() {
  if (reduceMotion) return;
  machine.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(.18em)' }, { transform: 'translateY(-.05em)' }, { transform: 'translateY(0)' }], { duration: 260, easing: 'ease-out' });
}
async function pull() {
  if (busy) return;
  busy = true;
  ensureAudio();
  hideVerdict();
  await tween(theta, L.max, Math.max(90, 280 * (1 - theta / L.max)), easeInCubic);
  SFX.clunk();
  bump();
  const spinning = runSpin();
  await tween(L.max, 0, 760, easeOutBack);
  await spinning;
  busy = false;
}
async function springBack() { busy = true; await tween(theta, 0, 420, easeOutBack); busy = false; }
function endDrag(commit) {
  if (!dragging) return;
  dragging = false;
  try { hit.releasePointerCapture(pid); } catch (e) {}
  if (commit) pull(); else springBack();
}
hit.addEventListener('pointerdown', (e) => {
  if (busy) return;
  ensureAudio();
  dragging = true; pid = e.pointerId; moved = 0; dragY0 = e.clientY; dragT0 = theta;
  try { hit.setPointerCapture(e.pointerId); } catch (err) {}
  e.preventDefault();
});
hit.addEventListener('pointermove', (e) => {
  if (!dragging || e.pointerId !== pid) return;
  const dy = e.clientY - dragY0;
  moved = Math.max(moved, Math.abs(dy));
  let c = Math.cos(dragT0 * RAD) - (dy / emPx()) / L.lv;
  c = Math.min(1, Math.max(Math.cos(L.max * RAD), c));
  renderLever(Math.acos(c) / RAD);
  if (theta >= L.max * 0.9) endDrag(true);
});
hit.addEventListener('pointerup', () => {
  if (!dragging) return;
  if (moved < 6) { dragging = false; try { hit.releasePointerCapture(pid); } catch (e) {} pull(); return; }
  endDrag(theta >= L.max * 0.4);
});
hit.addEventListener('pointercancel', () => endDrag(false));
hit.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pull(); } });
document.querySelectorAll('.js-pull').forEach((btn) => btn.addEventListener('click', () => {
  ensureAudio();
  const r = machine.getBoundingClientRect();
  if (r.top < innerHeight * 0.85 && r.bottom > innerHeight * 0.2) { pull(); return; }
  machine.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  setTimeout(pull, reduceMotion ? 0 : 600);
}));

/* ================= Reels ================= */
let lastCombo = null;
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
function pickCombo() {
  const R = DATA.reels;
  let c;
  do { c = { a: pick(R.business), b: pick(R.audience), c: pick(R.twist) }; }
  while (lastCombo && c.a.text === lastCombo.a.text && c.b.text === lastCombo.b.text && c.c.text === lastCombo.c.text);
  return c;
}
function fitFace(face) {
  const t = face && face.querySelector('.fv-text');
  if (!t) return;
  t.style.fontSize = '';
  const em = emPx();
  let size = parseFloat(getComputedStyle(t).fontSize), guard = 0;
  while ((t.scrollWidth > t.clientWidth + 1 || t.scrollHeight > t.clientHeight + 1) && size > 8 && guard++ < 30) {
    size -= 0.5;
    t.style.fontSize = (size / em) + 'em';
  }
}
function spinReel(i, pool, item, dur, n) {
  return new Promise((resolve) => {
    const reel = reels[i], strip = strips[i];
    const current = strip.firstElementChild ? strip.firstElementChild.outerHTML : restFace(i);
    let html = valueFace(i, item), prev = item;
    for (let k = 0; k < n; k++) {
      let r; do { r = pick(pool); } while (r === prev && pool.length > 1);
      prev = r; html += valueFace(i, r);
    }
    strip.innerHTML = html + current;
    fitFace(strip.firstElementChild);
    const finish = () => {
      strip.style.transform = 'translateY(0px)';
      while (strip.children.length > 1) strip.lastElementChild.remove();
      SFX.tick();
      reel.classList.remove('landed'); void reel.offsetWidth; reel.classList.add('landed');
      resolve();
    };
    if (reduceMotion) { finish(); return; }
    const h = reel.clientHeight, start = -(n + 1) * h;
    strip.style.transform = `translateY(${start}px)`;
    const a = strip.animate([
      { transform: `translateY(${start}px)`, easing: 'cubic-bezier(.3,0,.6,1)' },
      { transform: `translateY(${start - h * 0.07}px)`, offset: 0.07, easing: 'cubic-bezier(.45,.02,.2,1)' },
      { transform: `translateY(${h * 0.085}px)`, offset: 0.9, easing: 'cubic-bezier(.3,0,.25,1)' },
      { transform: 'translateY(0px)' },
    ], { duration: dur, fill: 'forwards' });
    strip.animate([{ filter: 'blur(0px)' }, { filter: 'blur(1.4px)', offset: 0.14 }, { filter: 'blur(1.4px)', offset: 0.6 }, { filter: 'blur(0px)', offset: 0.84 }, { filter: 'blur(0px)' }], { duration: dur });
    a.onfinish = () => { finish(); a.cancel(); };
  });
}
function runSpin() {
  const combo = pickCombo(), R = DATA.reels;
  lastCombo = combo;
  SFX.ratchet(1.9);
  return Promise.all([
    spinReel(0, R.business, combo.a, 1150, 10),
    spinReel(1, R.audience, combo.b, 1550, 14),
    spinReel(2, R.twist, combo.c, 1950, 18),
  ]).then(() => reveal(combo));
}

/* ================= Machine results ================= */
let currentCombo = null;
function showVerdict(v) { verdictChip.textContent = VERDICTS[v].label; verdictChip.className = `m-verdict show t-${v}`; }
function hideVerdict() { verdictChip.className = 'm-verdict'; }
function reveal(combo) {
  const v = verdictOf(combo);
  showVerdict(v);
  SFX[v]();
  if (v === 'genius') confetti();
  renderIdea(combo, 'Your idea', true);
  addRecent(combo, true);
}
function renderIdea(combo, legend, animate) {
  currentCombo = combo;
  const v = verdictOf(combo);
  ideaLegend.textContent = legend;
  ideaBadge.className = `pill t-${v}`;
  ideaBadge.innerHTML = PILL_ICON[v] + VERDICTS[v].label;
  ideaSentence.innerHTML = `Build ${esc(combo.a.text)} <b>${esc(combo.b.text)}</b> <em>${esc(combo.c.text)}</em>.`;
  moneyList.innerHTML = moneyFor(combo).map((m) => `<li>${CHECK}<span>${moneyHTML(m)}</span></li>`).join('');
  if (animate && !reduceMotion) {
    [ideaBadge, ideaSentence, ...moneyList.children].forEach((el, i) => {
      el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 480, delay: i * 60, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
    });
  }
}
function addRecent(combo, animate) {
  const v = verdictOf(combo);
  const li = document.createElement('li');
  li.innerHTML = `<span class="r-text">Build ${esc(combo.a.text)} ${esc(combo.b.text)} ${esc(combo.c.text)}</span><span class="badge t-${v}">${VERDICTS[v].label}</span>`;
  recentList.prepend(li);
  while (recentList.children.length > 3) recentList.lastElementChild.remove();
  if (animate && !reduceMotion) li.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.16,1,.3,1)' });
}
function confetti() {
  if (reduceMotion) return;
  const colors = ['#1D5A3B', '#CDB9EE', '#F2C94C', '#E57A93', '#8FC7A1'];
  for (let i = 0; i < 28; i++) {
    const p = document.createElement('i');
    p.className = 'confetti';
    p.style.left = (21 + (Math.random() * 6 - 3)) + 'em';
    p.style.top = '3em';
    p.style.background = colors[i % colors.length];
    machine.appendChild(p);
    const dx = (Math.random() * 2 - 1) * 16, dy = 12 + Math.random() * 22, rot = Math.random() * 720 - 360;
    p.animate([
      { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
      { transform: `translate(${dx * 0.5}em,${-6 - Math.random() * 6}em) rotate(${rot * 0.4}deg)`, opacity: 1, offset: 0.3 },
      { transform: `translate(${dx}em,${dy}em) rotate(${rot}deg)`, opacity: 0 },
    ], { duration: 1300 + Math.random() * 500, easing: 'cubic-bezier(.2,.6,.4,1)' }).onfinish = () => p.remove();
  }
}

/* ================= Build briefs (dialog + copy) ================= */
function comboBrief(c) {
  return {
    title: `Build ${c.a.text} ${c.b.text} ${c.c.text}`,
    meta: `Machine verdict: ${VERDICTS[verdictOf(c)].label}`,
    sections: [
      { h: 'MVP in a few weekends', ol: [...(DATA.build.byTag[c.a.tag] || []), `Build the twist in from day one: ${c.c.short}.`] },
      { h: 'How it makes money', ul: moneyFor(c).map(moneyText) },
      { h: 'First users', p: c.b.firstUsers || 'Find ten people in this audience, show them a clickable mockup, and ask what they would pay.' },
      ...(DATA.page.stack ? [{ h: 'Suggested stack', p: DATA.page.stack }] : []),
    ],
  };
}
function dailyBrief(x) {
  return {
    title: x.title,
    meta: x.pitch,
    sections: [
      { h: 'The problem', p: x.problem },
      { h: DATA.page.who, p: x.whoPays + (x.pricing ? ` Pricing idea: ${x.pricing}` : '') },
      ...(x.stack ? [{ h: 'Suggested stack', p: x.stack }] : []),
      { h: `MVP (${DIFF[x.difficulty] || 'A few weekends'})`, ol: x.mvp },
      { h: 'First 10 users', p: x.firstUsers },
    ],
  };
}
function briefMarkdown(b) {
  const out = [`# ${b.title}`, '', b.meta, ''];
  for (const s of b.sections) {
    out.push(`## ${s.h}`);
    if (s.ol) s.ol.forEach((t, i) => out.push(`${i + 1}. ${t}`));
    if (s.ul) s.ul.forEach((t) => out.push(`- ${t}`));
    if (s.p) out.push(s.p);
    out.push('');
  }
  out.push(`From Buildify: ${DATA.page.daily.toLowerCase().replace(/ of the day$/, '')} machine.`);
  return out.join('\n');
}
function briefBody(b) {
  return b.sections.map((s) => `<div class="bd-sec"><h4>${esc(s.h)}</h4>${
    s.ol ? `<ol>${s.ol.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>` :
    s.ul ? `<ul>${s.ul.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : `<p>${esc(s.p)}</p>`}</div>`).join('');
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) {}
  const ta = document.createElement('textarea');
  ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) {}
  ta.remove();
  return ok;
}
const dlg = $('briefDialog');
let dlgBrief = null;
function openBrief(b) {
  dlgBrief = b;
  $('bdTitle').textContent = b.title;
  $('bdMeta').textContent = b.meta;
  $('bdBody').innerHTML = briefBody(b);
  $('bdStatus').textContent = '';
  if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
}
const closeBrief = () => { if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open'); };
$('bdClose').addEventListener('click', closeBrief);
dlg.addEventListener('click', (e) => { if (e.target === dlg) closeBrief(); });
$('bdCopy').addEventListener('click', async () => {
  const ok = await copyText(briefMarkdown(dlgBrief));
  $('bdStatus').textContent = ok ? 'Copied. Paste it into your notes or your AI coding tool.' : 'Copy is blocked here. Select the text above instead.';
});
$('briefBtn').addEventListener('click', () => { if (currentCombo) openBrief(comboBrief(currentCombo)); });

/* ================= Idea of the day =================
   Each calendar day shows the idea scheduled for that date (added by the daily
   GitHub Action or an approved suggestion). Days without one rotate through the
   undated backlog, so everyone sees the same idea on the same day. */
const pad = (n) => String(n).padStart(2, '0');
const localISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayIndex = (d) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
const dateAt = (off) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + off); return d; };
function ideaFor(d) {
  const dated = DATA.daily.find((x) => x.date === localISO(d));
  if (dated) return dated;
  const backlog = DATA.daily.filter((x) => !x.date);
  const list = backlog.length ? backlog : DATA.daily;
  return list[((dayIndex(d) % list.length) + list.length) % list.length];
}
let viewOffset = 0, viewIdea = null;
function renderToday(off, animate) {
  viewOffset = off;
  const d = dateAt(off), x = ideaFor(d);
  viewIdea = x;
  const long = d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  $('tdDate').textContent = off === 0 ? `Today, ${long}` : long;
  $('tdSource').textContent = x.source === 'community' ? `Suggested by ${x.author || 'the community'}` : x.source === 'ai' ? 'Drafted with AI' : 'Hand-picked';
  $('tdTitle').textContent = x.title;
  $('tdPitch').textContent = x.pitch;
  const lvl = [1, 2, 3].includes(x.difficulty) ? x.difficulty : 2;
  $('tdTags').innerHTML = (x.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join('') +
    `<span class="diff" aria-label="Difficulty: ${DIFF[lvl]}">${[1, 2, 3].map((n) => `<i class="${n <= lvl ? 'on' : ''}"></i>`).join('')}<span>${DIFF[lvl]}</span></span>`;
  $('tdProblem').textContent = x.problem || '';
  $('tdWhoLabel').textContent = DATA.page.who;
  $('tdWho').textContent = x.whoPays || '';
  $('tdStackRow').hidden = !x.stack;
  $('tdStack').textContent = x.stack || '';
  $('tdPricingRow').hidden = !x.pricing;
  $('tdPricing').textContent = x.pricing || '';
  $('tdMvpHead').textContent = `MVP in ${lvl === 1 ? 'a weekend' : lvl === 2 ? 'a few weekends' : 'a couple of months'}`;
  $('tdMvp').innerHTML = x.mvp.map((m) => `<li>${esc(m)}</li>`).join('');
  $('tdFirst').textContent = x.firstUsers || '';
  $('tdStatus').textContent = '';
  document.querySelectorAll('#tdArchive .arch').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.off) === off)));
  if (animate && !reduceMotion) ['tdMain', 'tdBrief'].forEach((id) => { const el = $(id); el.classList.remove('today-swap'); void el.offsetWidth; el.classList.add('today-swap'); });
}
function renderArchive() {
  $('tdArchive').innerHTML = [0, -1, -2, -3, -4, -5, -6].map((off) => {
    const d = dateAt(off);
    const label = off === 0 ? 'Today' : off === -1 ? 'Yesterday' : d.toLocaleDateString(undefined, { weekday: 'long' });
    return `<button class="arch" type="button" data-off="${off}" aria-pressed="${off === viewOffset}"><span>${esc(label)}</span><b>${esc(ideaFor(d).title)}</b></button>`;
  }).join('');
}
$('tdArchive').addEventListener('click', (e) => {
  const b = e.target.closest('.arch');
  if (b) renderToday(Number(b.dataset.off), true);
});
$('tdCopy').addEventListener('click', async () => {
  const ok = await copyText(briefMarkdown(dailyBrief(viewIdea)));
  if (ok) $('tdStatus').textContent = 'Copied. Paste it into your notes or your AI coding tool.';
  else openBrief(dailyBrief(viewIdea));
});

/* ================= Suggestions (GitHub issue forms) ================= */
function repoSlug() {
  const r = DATA.config && DATA.config.repo;
  if (typeof r === 'string' && /^[\w.-]+\/[\w.-]+$/.test(r)) return r;
  const host = location.hostname;
  if (host.endsWith('.github.io')) {
    const user = host.split('.')[0];
    const first = location.pathname.split('/').filter(Boolean)[0];
    return first && !first.includes('.') ? `${user}/${first}` : `${user}/${host}`;
  }
  return null;
}
function wireSuggestions() {
  const repo = repoSlug();
  const pageName = { home: 'Startup ideas (home page)', cli: 'CLI projects', apps: 'Web & mobile apps' }[document.body.dataset.track] || 'Startup ideas (home page)';
  [['suggestBtn', 'daily-idea.yml'], ['pieceLink', 'machine-piece.yml']].forEach(([id, template]) => {
    const a = $(id);
    if (repo) {
      a.href = `https://github.com/${repo}/issues/new?template=${template}&page=${encodeURIComponent(pageName)}`;
      a.target = '_blank'; a.rel = 'noopener';
      a.onclick = null;
    } else {
      a.href = '#today';
      a.onclick = (e) => { e.preventDefault(); $('tdStatus').textContent = 'Suggestions open once the site is live on GitHub Pages.'; };
    }
  });
}

/* ================= Everything that depends on the data ================= */
function refreshData() {
  const R = DATA.reels;
  $('comboCount').textContent = `${(R.business.length * R.audience.length * R.twist.length).toLocaleString()} combinations and counting`;
  $('heroTodayTitle').textContent = ideaFor(dateAt(0)).title;
  $('heroTodayLabel').textContent = `Today's ${DATA.page.noun}:`;
  $('tdLegend').textContent = DATA.page.daily;
  $('tdArchive').parentElement.setAttribute('aria-label', `${DATA.page.daily} this week`);
  strips.forEach((s, i) => { if (s.firstElementChild && s.firstElementChild.classList.contains('face-rest')) s.innerHTML = restFace(i); });
  renderArchive();
  renderToday(viewOffset, false);
  wireSuggestions();
}

const R0 = DATA.reels;
const ex = Array.isArray(DATA.page.example) ? DATA.page.example : [];
const byShort = (arr, short) => arr.find((x) => x.short === short) || pick(arr);
renderIdea({ a: byShort(R0.business, ex[0]), b: byShort(R0.audience, ex[1]), c: byShort(R0.twist, ex[2]) }, 'Example idea', false);
for (let k = 0; k < 3; k++) addRecent({ a: pick(R0.business), b: pick(R0.audience), c: pick(R0.twist) }, false);
refreshData();

// Fetch the live data file in case it's newer than the embedded copy (the deploy keeps them
// in sync, so this usually does nothing). Opened from disk it quietly fails, which is fine.
fetch(document.body.dataset.src || 'data/ideas.json', { cache: 'no-cache' })
  .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then((json) => { if (json.updated === DATA.updated) return; DATA = normalize(json); refreshData(); })
  .catch(() => {});
})();
