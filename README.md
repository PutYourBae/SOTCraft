# SOT Craft Ops

SOT Craft Ops is a lightweight web management tool for GTA V roleplay crafting operations. It helps a crew calculate illegal weapon and ammo crafting resources, save crafting sessions, and track progress from planning to completion or cancellation.

## Features

- RAM-7 and 5.56x45 ammo crafting calculator.
- Auto ammo conversion from bullets to craft clips.
- Merged resource summary with top resource priority.
- Session saving with localStorage persistence.
- Crafting history with status filters.
- Final status confirmation for completed and cancelled sessions.
- Required cancellation note before confirming cancelled sessions.
- Dark mode responsive UI.
- Local deploy-safe item and resource assets.

## Tech Stack

- React
- TypeScript
- Vite
- Lucide React
- LocalStorage
- GitHub Pages workflow

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Lint

```bash
npm run lint
```

## Deployment

This project includes a GitHub Pages workflow at `.github/workflows/deploy.yml`. The Vite base path is configured for a repository named `SOTCraft`.

Expected GitHub Pages URL:

```text
https://putyourbae.github.io/SOTCraft/
```

## Asset Attribution

Item and resource icons are stored in `public/resource`. See `public/resource/ATTRIBUTION.md` for license notes.
