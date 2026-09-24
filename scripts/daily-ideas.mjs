// Runs once a day in GitHub Actions. For each page of the site (startup ideas, CLI projects,
// web & mobile apps) it makes sure today and tomorrow (UTC) have an "of the day" entry,
// written by Claude and checked before it's saved. Each run also adds one fresh piece to
// one of that page's reels. Without an ANTHROPIC_API_KEY secret it does nothing and every
// page keeps rotating through its curated backlog.
import { loadData, saveData, isoDate, addDays, slug, clean, similar, checkDaily, checkPiece, TRACKS } from './lib.mjs';

const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.IDEA_MODEL || 'claude-sonnet-5';
const MAX_POOL = 60; // cap per reel; the oldest AI-added pieces are dropped first

const SAFETY = 'Never suggest anything involving gambling, adult content, weapons, tracking or surveilling individuals, crypto trading, medical diagnosis or treatment, or legal or investment advice.';

const CONFIG = {
  home: {
    system: `You write build-ready startup ideas for Buildify, a site where students and indie makers find something they could actually ship.
Every idea must be a small, specific product (a SaaS, app or tool) that one to three people could ship as an MVP in a few weekends, with an obvious customer who would pay.
Be concrete and plain-spoken. No hype, no buzzwords. ${SAFETY}
Reply with a single JSON object and nothing else.`,
    what: 'startup idea',
    stack: false,
    twist: "starts with 'where', e.g. 'where everything disappears after 24 hours'",
    themes: ['students and campus life', 'small local businesses', 'freelancers and creators', 'healthcare operations such as scheduling and admin (never diagnosis or treatment)', 'developer tools for tiny teams', 'teachers and education', 'events and communities', 'restaurants, cafés and hospitality', 'nonprofits and volunteers', 'renting and housing', 'hiring and careers', 'personal productivity'],
  },
  cli: {
    system: `You write command-line project ideas for Buildify's CLI page, for developers and students who want to build and publish a useful terminal tool.
Every idea must be a specific CLI or TUI tool one person could ship in a few weekends and publish on Homebrew, npm, PyPI or as a single binary. It should solve a real, recurring annoyance.
Money should be realistic for developer tools: sponsors, a pro license, a hosted or team version.
Be concrete and plain-spoken. No hype. ${SAFETY} Don't suggest security tools that attack or scan systems you don't own.
Reply with a single JSON object and nothing else.`,
    what: 'CLI project',
    stack: true,
    twist: "starts with 'that', 'with' or 'written', e.g. 'that runs fully offline'",
    themes: ['git and code review', 'files and folders', 'CSV and data', 'APIs and HTTP', 'notes and writing', 'servers and monitoring', 'images, audio and video', 'students and learning to code', 'deployment and CI', 'configuration and dotfiles', 'personal productivity', 'documentation'],
  },
  apps: {
    system: `You write full-stack web and mobile app ideas for Buildify's apps page, for students and indie makers who want to ship an app people use every week.
Every idea must be a specific web app, PWA or mobile app that one to three people could ship as an MVP in a few weekends, with a clear user and a clear way to make money.
Be concrete and plain-spoken. No hype. ${SAFETY}
Reply with a single JSON object and nothing else.`,
    what: 'web or mobile app',
    stack: true,
    twist: "starts with 'with', 'that', 'as' or 'where', e.g. 'that works fully offline'",
    themes: ['campus life', 'healthy habits (never medical advice)', 'shared money and bills', 'neighborhoods and local community', 'creators', 'small shops and services', 'travel', 'learning', 'events', 'pets', 'productivity', 'food'],
  },
};

function pieceShape(track, kind, data) {
  const cfg = CONFIG[track];
  const reelName = data.page?.reels?.[['business', 'audience', 'twist'].indexOf(kind)]?.label || kind;
  if (kind === 'business') return `a new "${reelName}" (what it is): {"text": "starts with 'a' or 'an'", "short": "reel label, max 24 characters", "tag": "one of: ${Object.keys(data.money.byTag).join(', ')}", "w": "integer from -2 to 1, how promising this kind of ${cfg.what} tends to be"}`;
  if (kind === 'audience') return `a new "${reelName}" (who it's for): {"text": "starts with 'for', e.g. 'for dog owners'", "short": "reel label, max 24 characters", "money": {"t": "how you'd earn from this group, max 36 characters", "n": "short note, max 60 characters"}, "firstUsers": "where to find the first users, max 160 characters", "w": "integer from -2 to 1"}`;
  return `a new "${reelName}" (the catch): {"text": "${cfg.twist}", "short": "reel label, max 24 characters", "money": {"t": "how the twist makes money, max 36 characters", "n": "short note, max 60 characters"}, "w": "integer from -2 to 1"}`;
}

function prompt(track, data, theme, kind) {
  const cfg = CONFIG[track];
  const titles = data.daily.map((x) => `- ${x.title}`).slice(-80).join('\n');
  const shorts = data.reels[kind].map((x) => x.short).join(', ');
  return `Today's theme: ${theme}.

1. Write one ${cfg.what} of the day for this theme.
2. Write ${pieceShape(track, kind, data)}

Don't repeat or closely echo these existing ones:
${titles}

Existing pieces on that reel (don't repeat them): ${shorts}

Return exactly this JSON shape:
{
  "idea": {
    "title": "8-70 characters and specific",
    "pitch": "one sentence, 20-160 characters, saying what it does",
    "problem": "one or two sentences, 20-300 characters",
    "whoPays": "${track === 'cli' ? 'who uses it and who would pay, 5-120 characters' : 'the buyer, 5-120 characters'}",
    "pricing": "a simple price point, 3-100 characters",${cfg.stack ? '\n    "stack": "a concrete tech stack to build it with, 3-120 characters",' : ''}
    "mvp": ["3 to 5 concrete features, each under 80 characters"],
    "firstUsers": "a concrete way to get the first 10 users, 15-240 characters",
    "difficulty": "1 = weekend project, 2 = a few weekends, 3 = serious build",
    "tags": ["1 to 3 short labels"]
  },
  "piece": { ...the reel piece described in step 2... }
}`;
}

async function askClaude(system, user) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 1500, system, messages: [{ role: 'user', content: user }] }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body = await res.json();
  return (body.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
}

const toInt = (v, lo, hi, dflt) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt; };

function tidyIdea(raw = {}, withStack) {
  const idea = {
    title: clean(raw.title), pitch: clean(raw.pitch), problem: clean(raw.problem),
    whoPays: clean(raw.whoPays), pricing: clean(raw.pricing), stack: withStack ? clean(raw.stack) : '',
    mvp: (Array.isArray(raw.mvp) ? raw.mvp : []).map(clean).filter(Boolean).slice(0, 5),
    firstUsers: clean(raw.firstUsers), difficulty: toInt(raw.difficulty, 1, 3, 2),
    tags: (Array.isArray(raw.tags) ? raw.tags : []).map(clean).filter(Boolean).slice(0, 3),
  };
  for (const k of ['pricing', 'stack']) if (!idea[k]) delete idea[k];
  if (!idea.tags.length) delete idea.tags;
  return idea;
}

function tidyPiece(kind, raw) {
  if (!raw || typeof raw !== 'object') return null;
  const p = { text: clean(raw.text), short: clean(raw.short), w: toInt(raw.w, -2, 1, 0) };
  if (kind === 'business') p.tag = clean(raw.tag).toLowerCase();
  else {
    p.money = { t: clean(raw.money?.t) };
    if (clean(raw.money?.n)) p.money.n = clean(raw.money?.n);
  }
  if (kind === 'audience' && clean(raw.firstUsers)) p.firstUsers = clean(raw.firstUsers);
  return p;
}

async function generate(track, data, theme, kind) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    let parsed;
    try {
      const reply = await askClaude(CONFIG[track].system, prompt(track, data, theme, kind));
      parsed = JSON.parse(reply.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
    } catch (e) {
      console.log(`  attempt ${attempt}: ${e.message}`);
      continue;
    }
    const idea = tidyIdea(parsed.idea, CONFIG[track].stack);
    const errs = checkDaily({ id: 'pending', ...idea });
    if (errs.length) { console.log(`  attempt ${attempt} rejected: ${errs.join('; ')}`); continue; }
    const twin = data.daily.find((x) => similar(x.title, idea.title) >= 0.5);
    if (twin) { console.log(`  attempt ${attempt} rejected: too close to "${twin.title}"`); continue; }

    let piece = tidyPiece(kind, parsed.piece);
    if (piece) {
      const pieceErrs = checkPiece(kind, piece, data);
      const dupe = data.reels[kind].some((x) => x.short.toLowerCase() === piece.short.toLowerCase());
      if (pieceErrs.length || dupe) { console.log(`  skipping reel piece: ${dupe ? 'duplicate' : pieceErrs.join('; ')}`); piece = null; }
    }
    return { idea, piece };
  }
  return null;
}

const wanted = [0, 1].map((n) => isoDate(addDays(new Date(), n)));

for (const [trackIndex, track] of Object.keys(TRACKS).entries()) {
  const data = await loadData(track);
  const missing = wanted.filter((date) => !data.daily.some((x) => x.date === date));
  if (!missing.length) { console.log(`[${track}] today and tomorrow already have entries.`); continue; }
  if (!KEY) { console.log(`[${track}] no ANTHROPIC_API_KEY secret set, so nothing new. The page keeps rotating through its backlog.`); continue; }

  let added = 0;
  for (const date of missing) {
    const dayNum = Math.floor(Date.parse(date) / 86400000);
    const theme = CONFIG[track].themes[dayNum % CONFIG[track].themes.length];
    const kind = ['business', 'audience', 'twist'][(dayNum + trackIndex) % 3];
    const out = await generate(track, data, theme, kind);
    if (!out) { console.log(`[${track}] ${date}: no valid entry after 3 tries; the page uses its backlog that day.`); continue; }

    data.daily.push({ id: `${slug(out.idea.title)}-${date}`, date, source: 'ai', ...out.idea });
    if (out.piece) {
      data.reels[kind].push({ ...out.piece, added: date, source: 'ai' });
      while (data.reels[kind].length > MAX_POOL) {
        const oldest = data.reels[kind].findIndex((x) => x.source === 'ai');
        if (oldest === -1) break;
        data.reels[kind].splice(oldest, 1);
      }
    }
    added++;
    console.log(`[${track}] ${date}: ${out.idea.title}${out.piece ? `  (+ ${kind} piece: ${out.piece.short})` : ''}`);
  }
  if (added) await saveData(track, data);
}
