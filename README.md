<div align="center">

# ⚡ Buildify

### The Idea & Build-Brief Machine for Builders & Indie Hackers

[![Live Demo](https://img.shields.io/badge/Live%20Demo-rahil--den.github.io%2Fbuildify-2ea44f?style=for-the-badge&logo=github)](https://rahil-den.github.io/buildify/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Vanilla Web](https://img.shields.io/badge/Built%20With-Vanilla%20HTML%20%2F%20CSS%20%2F%20JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/)

<p align="center">
  <b>Never stare at a blank code editor again.</b><br>
  Buildify turns chaotic brainstorming into production-ready product briefs with interactive slot-machine reels, curated daily drops, and complete monetization roadmaps.
</p>

[Startup Track](https://rahil-den.github.io/buildify/) •
[CLI Track](https://rahil-den.github.io/buildify/cli.html) •
[Web & Mobile Track](https://rahil-den.github.io/buildify/apps.html)

</div>

---

## 💡 What is Buildify?

Most idea generators give you vague one-liners like *"Uber for dog walkers"*. **Buildify does the heavy lifting.**

Every spin and daily feature synthesizes an actionable **Build Brief** designed to take you from concept to first customer:

- **🎯 The Pain Point:** Real friction experienced by a defined target market.
- **💸 Monetization & Pricing:** Who actually opens their wallet and realistic pricing models.
- **📋 Actionable MVP Checklist:** 3 to 6 pragmatic development milestones.
- **🚀 0-to-1 User Acquisition:** A battle-tested blueprint to land your first 10 paying users.
- **🛠️ Recommended Tech Stack:** Practical frameworks, databases, and tools tailored to the project.

---

## 🎰 Three Specialized Tracks

| Portal | File | Reel Dimensions | Daily Spotlight | Focus |
|:---|:---|:---|:---|:---|
| 💼 **Startup Ideas** | [`index.html`](index.html) | `Business Model` × `Audience` × `Twist` | **Idea of the Day** | B2B Micro-SaaS, marketplaces, workflow tools |
| 💻 **CLI Projects** | [`cli.html`](cli.html) | `Terminal Tool` × `User Base` × `Twist` | **Project of the Day** | Developer tools, system utilities, Rust/Go CLIs |
| 📱 **Web & Mobile Apps** | [`apps.html`](apps.html) | `Core App` × `Audience` × `Twist` | **App of the Day** | Consumer apps, niche platforms, mobile tools |

---

## 🔥 Key Features

- **🎰 Physics-Driven Slot Machine:** Spin weighted mechanical reels with dynamic algorithmic grading (`Genius`, `Good`, `Mid`, `Bad`, `Cursed`).
- **📅 Rotating Daily Featured Picks:** Built-in rotating catalog surfacing fresh daily build-ready briefs.
- **⚡ 100% Vanilla & Instant:** Zero npm build step, zero bundling overhead, zero heavy frameworks. Pure modern JavaScript and CSS that runs at 60 FPS in any browser.
- **🛡️ Built-in Quality Validation:** Automated checks verify JSON schema correctness, detect duplicates, and guarantee clean data.

---

## 📁 Repository Structure

```
buildify/
├── index.html              # Startup ideas generator & daily spotlight
├── cli.html                # CLI utilities generator & daily spotlight
├── apps.html               # Web & mobile apps generator & daily spotlight
├── assets/
│   ├── site.css            # Responsive layout & theme styling
│   └── app.js              # Reel machine physics, modals & rotation logic
├── data/
│   ├── ideas.json          # Startup ideas backlog & reel pieces
│   ├── cli.json            # CLI tools backlog & reel pieces
│   └── apps.json           # Web & mobile apps backlog & reel pieces
├── scripts/
│   ├── validate.mjs        # Schema validator & similarity checker
│   └── embed-data.mjs      # Inlines data into HTML for fast loading
├── LICENSE                 # MIT License
└── README.md               # Project documentation
```

---

## 🚀 Quickstart (Run Locally)

No build tools or heavy dependencies required!

### 1. Clone the repository
```bash
git clone https://github.com/rahil-den/buildify.git
cd buildify
```

### 2. Launch a local web server
Any static file server works out of the box:

```bash
# Using Python
python3 -m http.server 8000

# Or using Node
npx serve .
```

Open [http://localhost:8000](http://localhost:8000) in your browser. You can also directly open any `.html` file in your browser.

---

## 🤝 Contributing: Add Your Own Ideas!

We welcome contributions from the community! If you have creative project ideas, cool micro-SaaS concepts, or clever reel pieces, you can easily add them:

### What You Can Add
1. **New Complete Idea**: A full build brief (title, problem, audience, monetization, MVP steps, first 10 users, suggested stack).
2. **Reel Piece**: A new Business Model, Target Audience, or wild Twist to expand the slot machine combinations.

### How to Contribute

1. **Fork** the repository and clone your fork locally.
2. Locate the appropriate file in the `data/` folder:
   - [`data/ideas.json`](data/ideas.json) — for Startup & Micro-SaaS ideas.
   - [`data/cli.json`](data/cli.json) — for Terminal & CLI utilities.
   - [`data/apps.json`](data/apps.json) — for Web & Mobile applications.
3. Add your idea to the `daily` array or your reel piece to the `reels` object following the existing structure.
4. Verify your JSON formatting:
   ```bash
   node scripts/validate.mjs
   ```
5. Commit your changes and open a **Pull Request**! Once reviewed, your idea will go live on the site.

---

## 📜 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for complete details.

---

<div align="center">
  <b>Built for builders. Star ⭐ the repository if you found your next project idea here!</b>
</div>
