# Buildify — the idea machine

Pull the lever, get a business × audience × twist. Plus a build-ready **idea of the day**, with a problem, buyer, pricing, MVP checklist and a plan for the first ten users.

Everything the site shows lives in `data/ideas.json`, not in the code. That file grows three ways:

1. **You edit it** (add ideas, reel pieces, anything).
2. **Daily ideas from Claude** (optional): a GitHub Action writes tomorrow's idea every morning and adds one new reel piece.
3. **Suggestions from visitors**: they fill in a GitHub form, you add the `approved` label, and it's scheduled on the site automatically.

With none of the optional parts turned on, the site still changes every day by rotating through the 24 hand-picked ideas.

## What's in here

```
index.html                  the whole site (loads data/ideas.json)
data/ideas.json             every idea, reel piece and build brief
scripts/validate.mjs        checks ideas.json before each deploy
scripts/daily-ideas.mjs     writes the daily idea with Claude (runs in GitHub Actions)
scripts/add-submission.mjs  turns an approved suggestion into an idea
.github/workflows/          deploy, daily ideas, approved suggestions
.github/ISSUE_TEMPLATE/     the two "suggest" forms visitors fill in
```

## Preview it on your computer

Double-clicking `index.html` works; it uses a built-in copy of the ideas. To preview exactly like the live site (reading `data/ideas.json`), run this in the folder and open http://localhost:8000:

```
python3 -m http.server
```

## Publish on GitHub Pages (free)

1. Create a new **public** repository on GitHub, e.g. `buildify`.
2. Upload everything in this folder, keeping the folders (`data`, `scripts`, `.github`). The branch must be called `main`.
   The `.github` folder is hidden on Mac and Linux (press Cmd+Shift+. in Finder to show it), and it's easy to miss when dragging files into the browser. Pushing with git avoids that:
   ```
   git init && git add . && git commit -m "Buildify" && git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/buildify.git
   git push -u origin main
   ```
3. In the repo, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
4. Go to the **Actions** tab, open **Deploy site**, and click **Run workflow** (it also runs on every push to `main`).
5. After a minute your site is live at `https://YOUR-USERNAME.github.io/buildify/`.

Want it at `YOUR-USERNAME.github.io` with nothing after it? Name the repository `YOUR-USERNAME.github.io` instead.

## Turn on daily ideas from Claude (optional)

1. Get an API key at https://console.anthropic.com. This is separate from a Claude.ai subscription and is billed per use; one idea a day is a very small amount.
2. In the repo: **Settings → Secrets and variables → Actions → New repository secret**. Name it `ANTHROPIC_API_KEY` and paste the key.
3. Done. Every day at 06:17 UTC the **Daily ideas** workflow writes the ideas for today and tomorrow, checks them, commits `data/ideas.json` and redeploys. Run it by hand from the Actions tab to try it right away.

Every idea is checked before it's saved: required fields, sensible lengths, and not too similar to an existing idea. If Claude's answer fails three times, nothing is saved and the site uses the backlog that day.

To use a different model, add a repository **variable** (not a secret) named `IDEA_MODEL` with a model name from https://docs.claude.com/en/docs/about-claude/models/overview. The default is `claude-sonnet-5`.

Prefer to review AI ideas before they go live? Change `daily-ideas.yml` to open a pull request instead of pushing (for example with the `peter-evans/create-pull-request` action).

## Let visitors suggest ideas

The **Suggest an idea** button and the **Add a reel piece** link open GitHub issue forms in your repo. Visitors need a free GitHub account.

1. Create a label named exactly `approved`: **Issues → Labels → New label**.
2. When a good suggestion comes in, add the `approved` label. The **Add approved idea** workflow adds it to `data/ideas.json`, schedules it on the next free day, comments the date on the issue, closes it and redeploys.
3. If something is missing or too similar to an existing idea, the bot comments with what to fix instead.

Only people with write access can add labels, so nothing goes live without you.

On `github.io` the site works out your repo automatically. On a custom domain, set it in `data/ideas.json`:

```json
"config": { "repo": "YOUR-USERNAME/buildify" }
```

## Editing ideas by hand

Open `data/ideas.json` on GitHub and click the pencil icon.

- **Reel pieces.** `reels.business` items start with "a" or "an" and use a `tag` that exists in `money.byTag` (marketplace, ai, social…). `reels.audience` items start with "for" and `reels.twist` items start with "where"; both carry their own `money: { "t": "title", "n": "note" }`. `w` (−2 to 1) nudges the verdict: the three weights add up to Genius, Good, Mid, Bad or Cursed. Add `"added": "2026-09-24"` and the piece shows a NEW tag for a week.
- **Daily ideas.** `title`, `pitch`, `problem`, `whoPays`, `pricing`, `mvp` (3–6 steps), `firstUsers`, `difficulty` (1–3), `tags`. Give one a `"date": "2026-10-02"` to pin it to that day; ideas without a date rotate on the other days.

Every deploy runs `node scripts/validate.mjs` first, so a typo stops the deploy instead of breaking the site. The failed run in the Actions tab says exactly which entry is wrong.

## Custom domain

Buy a domain, then go to **Settings → Pages → Custom domain** and follow GitHub's DNS instructions. Remember to set `config.repo` as shown above.

## Good to know

- GitHub pauses scheduled workflows in repositories with no activity for 60 days. The daily commits keep it active; without an API key the schedule has nothing to do anyway.
- GitHub Pages caches `ideas.json` for up to ten minutes, so an update can take a moment to show up.
