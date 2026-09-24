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

