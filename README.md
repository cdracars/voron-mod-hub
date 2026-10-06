# Voron Mod Hub

Voron Mod Hub is a static Next.js experience for browsing the community-maintained [VoronUsers](https://github.com/VoronDesign/VoronUsers) catalog. The app ingests the massive markdown table from `printer_mods/README.md`, converts it into structured JSON, and ships a fast, client-side filtered view that is safe to host on GitHub Pages.

## Highlights
- 🔄 **Automated data refresh** – `npm run parse` fetches & re-parses the VoronUsers table into `public/mods.json`.
- ⚡️ **Instant filtering** – search by title, creator, or description and filter by core printer families completely on the client.
- 📦 **Static export ready** – `npm run build:static` emits an `out/` folder that deploys directly to GitHub Pages.
- 🚀 **Daily rebuilds** – a GitHub Actions workflow (push, schedule, manual) refreshes the data, commits it when necessary, builds, and deploys.
- 🖼 **Automatic previews** – nightly builds try to grab the first image from each mod’s README so cards feel more visual without any manual curation.
- ☀️ **Theme + permalinked filters** – visitors can toggle light/dark/system modes and share URLs (`?q=query&printers=v2_4`) that restore search/filter state automatically.

## Project Structure
```
voron-mod-hub/
├── .github/workflows/build.yml   # CI: parse → build → deploy
├── public/mod-images/            # Cached JPG snapshots generated from README GIFs
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
npm run smoke       # Lint + static build (matches CI smoke step)
```

### Data Refresh Details
1. `scripts/parseReadme.ts` downloads `printer_mods/README.md` (override with `VORON_USERS_README_URL`).
2. The script walks the markdown table, carries forward blank creator cells, infers compatibility flags for the five primary printer families, and stores the result in `public/mods.json` with a `lastUpdated` timestamp.
3. GIF previews are cached as JPGs in `public/mod-images/` with metadata recorded in `data/imageCache.json` so subsequent runs only refetch changed mods.
4. The Next.js page reads `public/mods.json` at build time via `getStaticProps` and hydrates the client-side filters.

### GitHub Pages Workflow
`.github/workflows/build.yml` runs on pushes to `main`, on a nightly cron (`0 0 * * *`), and manually:
1. `npm ci`
2. `npm run parse`
3. Commit `public/mods.json` if it changed
4. `npm run smoke` (lint + build, produces `out/`)
5. Upload artifact + deploy via `actions/deploy-pages`

Ensure **Actions → General → Workflow permissions** is set to “Read and write” so the workflow can commit the data file.

## Environment
No secrets are required. Everything is derived from public GitHub data. If the VoronUsers table layout ever changes, update `scripts/parseReadme.ts` accordingly.

## Support

If Voron Mod Hub is useful to you, you can support its continued upkeep on
[Ko-fi](https://ko-fi.com/cdracars66494).
