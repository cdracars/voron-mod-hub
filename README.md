# Voron Mod Hub

Voron Mod Hub is a static Next.js experience for browsing the community-maintained [VoronUsers](https://github.com/VoronDesign/VoronUsers) catalog. The app ingests the massive markdown table from `printer_mods/README.md`, converts it into structured JSON, and ships a fast, client-side filtered view that is safe to host on GitHub Pages.

## Highlights
- 🔄 **Automated data refresh** – `npm run parse` fetches & re-parses the VoronUsers table into `public/mods.json`.
- ⚡️ **Instant filtering** – search by title, creator, or description and filter by core printer families completely on the client.
- 📦 **Static export ready** – `npm run build:static` emits an `out/` folder that deploys directly to GitHub Pages.
- 🚀 **Daily rebuilds** – a GitHub Actions workflow (push, schedule, manual) refreshes the data, commits it when necessary, builds, and deploys.

## Project Structure
```
voron-mod-hub/
├── .github/workflows/build.yml   # CI: parse → build → deploy
├── public/mods.json              # Generated data source
├── scripts/parseReadme.ts        # README parser (GitHub Actions + local)
├── src/
│   ├── components/               # UI primitives (FilterPanel, ModCard, ModGrid)
│   ├── lib/types.ts              # Shared Mod/compatibility types
│   ├── pages/                    # Pages router entry points
│   │   ├── _app.tsx / _document.tsx
│   │   └── index.tsx             # Main UI + filtering logic
│   └── styles/globals.css        # Tailwind v4 entrypoint + tokens
├── next.config.ts                # Static export + image tweaks for Pages
└── package.json                  # npm scripts (dev, parse, build:static, etc.)
```

## Local Development
```bash
npm install
npm run parse       # Fetch & rebuild public/mods.json
npm run dev         # Start Next.js on http://localhost:3000
npm run lint        # ESLint with Next.js config
npm run build       # Production build (SSR)
npm run build:static  # Build + export to ./out for GitHub Pages
```

### Data Refresh Details
1. `scripts/parseReadme.ts` downloads `printer_mods/README.md` (override with `VORON_USERS_README_URL`).
2. The script walks the markdown table, carries forward blank creator cells, infers compatibility flags for the five primary printer families, and stores the result in `public/mods.json` with a `lastUpdated` timestamp.
3. The Next.js page reads `public/mods.json` at build time via `getStaticProps` and hydrates the client-side filters.

### GitHub Pages Workflow
`.github/workflows/build.yml` runs on pushes to `main`, on a nightly cron (`0 0 * * *`), and manually:
1. `npm ci`
2. `npm run parse`
3. Commit `public/mods.json` if it changed
4. `npm run build:static` → `out/`
5. Upload artifact + deploy via `actions/deploy-pages`

Ensure **Actions → General → Workflow permissions** is set to “Read and write” so the workflow can commit the data file.

## Environment
No secrets are required. Everything is derived from public GitHub data. If the VoronUsers table layout ever changes, update `scripts/parseReadme.ts` accordingly.
