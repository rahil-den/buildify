// Runs when a maintainer adds the "approved" label to a suggestion issue.
// Turns the issue form into an entry in the right page's data file.
// Issue text is only ever read as data; it's never put into a shell command.
import { readFile } from 'node:fs/promises';
import { loadData, saveData, isoDate, addDays, slug, clean, similar, checkDaily, checkPiece, nextFreeDate, setOutput, TRACKS } from './lib.mjs';

const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
const issue = event.issue;

// Issue forms render as "### Label\n\nvalue" blocks.
function parseForm(body) {
  const out = {};
  for (const part of String(body || '').split(/^###\s+/m).slice(1)) {
    const nl = part.indexOf('\n');
    const label = (nl === -1 ? part : part.slice(0, nl)).trim();
    const value = nl === -1 ? '' : part.slice(nl + 1).trim();
    out[label] = value === '_No response_' ? '' : value;
  }
  return out;
}

async function finish(ok, message) {
  await setOutput('ok', ok ? 'true' : 'false');
  await setOutput('message', message);
  console.log(message);
  process.exit(0);
}

const f = parseForm(issue.body);
const author = clean(f['Credit me as']).slice(0, 40) || `@${issue.user.login}`;
const pageByName = Object.fromEntries(Object.entries(TRACKS).map(([track, t]) => [t.name, track]));
const track = pageByName[clean(f['Which page is it for?'])] || 'home';
const pageName = TRACKS[track].name;
const data = await loadData(track);

if ('Title' in f) {
  const size = { 'Weekend project': 1, 'A few weekends': 2, 'Serious build': 3 };
  const idea = {
    title: clean(f['Title']),
    pitch: clean(f['One-line pitch']),
    problem: clean(f['What problem does it solve?']),
    whoPays: clean(f['Who is it for, and who pays?']),
    pricing: clean(f['Pricing idea']),
    stack: clean(f['Suggested tech stack']),
    mvp: String(f['MVP features (one per line)'] || '').split('\n')
      .map((l) => clean(l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, ''))).filter(Boolean).slice(0, 6),
    firstUsers: clean(f['How would you get the first 10 users?']) ||
      'Find ten people with this problem, show them a clickable mockup, and ask what they would pay.',
    difficulty: size[clean(f['How big is the build?'])] || 2,
    tags: clean(f['Tags (comma-separated)']).split(',').map(clean).filter(Boolean).slice(0, 3),
  };
  for (const k of ['pricing', 'stack']) if (!idea[k]) delete idea[k];
  if (!idea.tags.length) delete idea.tags;

  const date = nextFreeDate(data, addDays(new Date(), 1));
  const entry = { id: `${slug(idea.title)}-${date}`, date, source: 'community', author, issue: issue.number, ...idea };
  const errs = checkDaily(entry);
  if (errs.length) await finish(false, `This suggestion couldn't be added yet:\n\n- ${errs.join('\n- ')}\n\nEdit the issue, then remove and re-add the \`approved\` label.`);
  const twin = data.daily.find((x) => similar(x.title, idea.title) >= 0.6);
  if (twin) await finish(false, `This looks very close to something already on the ${pageName} page: **${twin.title}**. Remove and re-add the \`approved\` label if it's different enough.`);

  data.daily.push(entry);
  await saveData(track, data);
  await finish(true, `Thanks ${author}! This is scheduled on the **${pageName}** page for **${date}**.`);
}

if ('Which reel?' in f) {
  const reels = { 'First reel: what it is': 'business', "Second reel: who it's for": 'audience', 'Third reel: the twist': 'twist' };
  const kind = reels[clean(f['Which reel?'])];
  if (!kind) await finish(false, 'Pick which reel this piece belongs to, then re-add the `approved` label.');

  let phrase = clean(f['Full phrase']);
  if (kind === 'business' && !/^(a|an) /i.test(phrase)) phrase = `${/^[aeiou]/i.test(phrase) ? 'an' : 'a'} ${phrase}`;
  if (kind === 'audience' && !/^for /i.test(phrase)) phrase = `for ${phrase}`;
  if (kind === 'twist') {
    if (track === 'home' && !/^where /i.test(phrase)) phrase = `where ${phrase}`;
    phrase = phrase.charAt(0).toLowerCase() + phrase.slice(1);
  }

  const piece = { text: phrase, short: clean(f['Short label (max 24 characters)']), w: 0 };
  if (kind === 'business') {
    // Dropdown options look like "CLI: Developer workflow"; the part after the colon names the type.
    const TYPES = {
      home: { Marketplace: 'marketplace', Subscription: 'subscription', 'AI tool': 'ai', 'Social or community': 'social', Dating: 'dating', 'Local directory': 'local', Education: 'education', 'Professional network': 'professional', 'Fitness or tracking': 'fitness', Fintech: 'fintech' },
      cli: { 'Developer workflow': 'devflow', 'Files and folders': 'files', Data: 'data', 'Terminal UI': 'tui', 'AI helper': 'ai', 'Servers and deploys': 'ops', Notes: 'notes', 'Images and media': 'media' },
      apps: { Productivity: 'productivity', Social: 'social', Marketplace: 'marketplace', 'Habits and health': 'health', Learning: 'learning', Money: 'money', 'Events and community': 'community', Creators: 'creator' },
    };
    const [prefix, type] = clean(f['Type (first reel only)']).split(/:\s*/);
    const expected = { home: 'Startup', cli: 'CLI', apps: 'App' }[track];
    if (prefix !== expected) await finish(false, `For the ${pageName} page, pick a type that starts with "${expected}:", then re-add the \`approved\` label.`);
    piece.tag = TYPES[track][type];
  } else {
    const raw = clean(f['How would it make money? (second and third reel)']);
    const m = raw.match(/^(.*?)\s*\((.*)\)\s*$/);
    piece.money = m ? { t: m[1], n: m[2] } : { t: raw };
    if (!piece.money.n) delete piece.money.n;
  }
  const where = clean(f['Where would you find the first users? (second reel only)']);
  if (kind === 'audience' && where) piece.firstUsers = where;

  const errs = checkPiece(kind, piece, data);
  if (data.reels[kind].some((x) => x.short.toLowerCase() === piece.short.toLowerCase())) errs.push(`that reel already has "${piece.short}"`);
  if (errs.length) await finish(false, `This piece couldn't be added yet:\n\n- ${errs.join('\n- ')}\n\nEdit the issue, then remove and re-add the \`approved\` label.`);

  data.reels[kind].push({ ...piece, added: isoDate(new Date()), source: 'community', author });
  await saveData(track, data);
  await finish(true, `Thanks ${author}! "${piece.short}" is now on the ${pageName} machine, with a NEW tag for the next week.`);
}

await finish(false, "This issue doesn't look like a suggestion form, so nothing was added.");
