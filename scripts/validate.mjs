// Fails the deploy if any data file is broken, so a bad edit never reaches the live site.
import { loadData, checkData, TRACKS } from './lib.mjs';

let failed = false;
for (const [track, { file }] of Object.entries(TRACKS)) {
  let data;
  try {
    data = await loadData(track);
  } catch (e) {
    console.error(`data/${file} is not valid JSON: ${e.message}`);
    failed = true;
    continue;
  }
  const errs = checkData(data);
  if (errs.length) {
    console.error(`data/${file} has ${errs.length} problem(s):\n- ${errs.join('\n- ')}`);
    failed = true;
    continue;
  }
  const r = data.reels;
  console.log(`data/${file} OK: ${data.daily.length} daily ideas, ${r.business.length * r.audience.length * r.twist.length} machine combinations.`);
}
process.exit(failed ? 1 : 0);
