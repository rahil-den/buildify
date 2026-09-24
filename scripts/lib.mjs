// Shared helpers for the Buildify data scripts. No dependencies; Node 20+.
import { readFile, writeFile, appendFile } from 'node:fs/promises';

// One data file per page of the site.
export const TRACKS = {
  home: { file: 'ideas.json', name: 'Startup ideas (home page)' },
  cli: { file: 'cli.json', name: 'CLI projects' },
  apps: { file: 'apps.json', name: 'Web & mobile apps' },
};
const fileFor = (track) => new URL(`../data/${TRACKS[track].file}`, import.meta.url);

export async function loadData(track = 'home') {
  return JSON.parse(await readFile(fileFor(track), 'utf8'));
}

export async function saveData(track, data) {
  data.updated = new Date().toISOString();
  await writeFile(fileFor(track), JSON.stringify(data, null, 2) + '\n');
}

export const isoDate = (d) => d.toISOString().slice(0, 10); // UTC calendar date
export const addDays = (d, n) => new Date(d.getTime() + n * 86400000);

// Strip tags and collapse whitespace. The site also escapes everything it renders.
export const clean = (s) => String(s ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
export const slug = (s) => clean(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);

const STOP = new Set(['a', 'an', 'the', 'for', 'of', 'and', 'to', 'in', 'on', 'with', 'your', 'app', 'tool', 'small', 'from']);
const words = (s) => new Set(clean(s).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w && !STOP.has(w)));

// Jaccard similarity of meaningful words, 0..1. Used to reject near-duplicate titles.
export function similar(a, b) {
  const A = words(a), B = words(b);
  if (!A.size || !B.size) return 0;
  let shared = 0;
  for (const w of A) if (B.has(w)) shared++;
  return shared / (A.size + B.size - shared);
}

function text(obj, key, min, max, errs, where) {
  const v = obj?.[key];
  if (typeof v !== 'string' || v.trim().length < min || v.length > max) {
    errs.push(`${where}: "${key}" should be text between ${min} and ${max} characters`);
  }
}

export function checkDaily(x, where = 'idea') {
  const errs = [];
  text(x, 'id', 3, 90, errs, where);
  text(x, 'title', 8, 80, errs, where);
  text(x, 'pitch', 20, 180, errs, where);
  text(x, 'problem', 20, 320, errs, where);
  text(x, 'whoPays', 5, 140, errs, where);
  if (x.pricing !== undefined) text(x, 'pricing', 3, 120, errs, where);
  if (x.stack !== undefined) text(x, 'stack', 3, 140, errs, where);
  text(x, 'firstUsers', 15, 260, errs, where);
  if (!Array.isArray(x.mvp) || x.mvp.length < 3 || x.mvp.length > 6 ||
      x.mvp.some((s) => typeof s !== 'string' || s.length < 3 || s.length > 100)) {
    errs.push(`${where}: "mvp" should be 3 to 6 short steps`);
  }
  if (![1, 2, 3].includes(x.difficulty)) errs.push(`${where}: "difficulty" should be 1, 2 or 3`);
  if (x.tags !== undefined && (!Array.isArray(x.tags) || x.tags.length > 4 ||
      x.tags.some((t) => typeof t !== 'string' || !t.trim() || t.length > 20))) {
    errs.push(`${where}: "tags" should be up to 4 short labels`);
  }
  if (x.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(x.date)) errs.push(`${where}: "date" should look like 2026-09-24`);
  return errs;
}

export function checkPiece(kind, x, data, where = kind) {
  const errs = [];
  text(x, 'text', 3, 70, errs, where);
  text(x, 'short', 2, 26, errs, where);
  if (!Number.isInteger(x.w) || x.w < -2 || x.w > 1) errs.push(`${where}: "w" should be a whole number from -2 to 1`);
  if (kind === 'business') {
    if (!/^(a|an) /i.test(x.text || '')) errs.push(`${where}: business text should start with "a" or "an"`);
    if (!data.money?.byTag?.[x.tag]) errs.push(`${where}: unknown business tag "${x.tag}"`);
  } else {
    if (kind === 'audience' && !/^for /i.test(x.text || '')) errs.push(`${where}: audience text should start with "for"`);
    if (kind === 'twist' && !/^[a-z]/.test(x.text || '')) errs.push(`${where}: twist text should start with a lowercase word so it reads mid-sentence ("where…", "that…", "with…")`);
    const m = x.money;
    if (!m || typeof m.t !== 'string' || m.t.length < 2 || m.t.length > 40 || (m.n !== undefined && (typeof m.n !== 'string' || m.n.length > 70))) {
      errs.push(`${where}: "money" needs a short title "t" (and an optional note "n")`);
    }
  }
  return errs;
}

export function checkData(d) {
  if (!d || typeof d !== 'object') return ['the file is not a JSON object'];
  const errs = [];
  const labels = d.page?.reels;
  if (labels !== undefined && (!Array.isArray(labels) || labels.length !== 3 || labels.some((r) => typeof r?.label !== 'string'))) {
    errs.push('page.reels should list exactly 3 reels, each with a label');
  }
  for (const kind of ['business', 'audience', 'twist']) {
    const pool = d.reels?.[kind];
    if (!Array.isArray(pool) || pool.length < 3) { errs.push(`reels.${kind} needs at least 3 items`); continue; }
    pool.forEach((x, i) => errs.push(...checkPiece(kind, x, d, `reels.${kind}[${i}]`)));
  }
  for (const [tag, list] of Object.entries(d.money?.byTag || {})) {
    if (!Array.isArray(list) || !list.length) errs.push(`money.byTag.${tag} needs at least one entry`);
    if (!Array.isArray(d.build?.byTag?.[tag])) errs.push(`build.byTag.${tag} is missing`);
  }
  if (!Array.isArray(d.daily) || !d.daily.length) {
    errs.push('daily needs at least one idea');
  } else {
    const ids = new Set();
    d.daily.forEach((x, i) => {
      errs.push(...checkDaily(x, `daily[${i}]`));
      if (ids.has(x.id)) errs.push(`daily[${i}]: duplicate id "${x.id}"`);
      ids.add(x.id);
    });
    const dates = d.daily.filter((x) => x.date).map((x) => x.date);
    if (new Set(dates).size !== dates.length) errs.push('daily: two ideas share the same date');
  }
  return errs;
}

// First date on or after `from` that doesn't already have a scheduled idea.
export function nextFreeDate(data, from) {
  const taken = new Set(data.daily.filter((x) => x.date).map((x) => x.date));
  let day = from;
  while (taken.has(isoDate(day))) day = addDays(day, 1);
  return isoDate(day);
}

// Write a (possibly multi-line) step output for GitHub Actions.
export async function setOutput(name, value) {
  const file = process.env.GITHUB_OUTPUT;
  if (!file) { console.log(`[output ${name}] ${value}`); return; }
  const delim = `EOF_${Math.random().toString(36).slice(2)}`;
  await appendFile(file, `${name}<<${delim}\n${value}\n${delim}\n`);
}
