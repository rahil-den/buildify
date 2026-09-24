// Copies each page's data file into the page itself (the <script id="buildify-data"> block),
// so pages render the latest ideas instantly and still work when opened straight from disk.
// The deploy workflow runs this on every publish. Run `node scripts/embed-data.mjs` yourself
// if you want double-clicked local pages to show your newest edits.
import { readFile, writeFile, readdir } from 'node:fs/promises';

const dir = process.argv[2] || new URL('..', import.meta.url).pathname;
for (const name of (await readdir(dir)).filter((n) => n.endsWith('.html'))) {
  const path = `${dir}/${name}`;
  const html = await readFile(path, 'utf8');
  const src = html.match(/data-src="([^"]+)"/)?.[1];
  if (!src) continue;
  const json = JSON.stringify(JSON.parse(await readFile(`${dir}/${src}`, 'utf8'))).replace(/</g, '\\u003c');
  const next = html.replace(/(<script type="application\/json" id="buildify-data">)[\s\S]*?(<\/script>)/, (_, open, close) => open + json + close);
  await writeFile(path, next);
  console.log(`embedded ${src} into ${name}`);
}
