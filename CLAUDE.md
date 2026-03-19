# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cambrian is a browser-based evolution simulation with predator-prey dynamics. Creatures with genetic traits (speed, size, eyesight, attack, defense, etc.) live in a 2D world with bushes, berries, water pools, and corpses. They eat, drink, hunt, flee, find mates, reproduce sexually, and evolve through mutation and natural selection. Species emerge via hue-based reproductive isolation. Creatures have health that drains when starving/dehydrated, an injury system (mild/severe/extreme), and leave corpses when they die.

## Running Locally

```bash
npm install         # first time only
npm run dev         # starts Vite dev server with HMR
npm run build       # production build to dist/
npm run preview     # preview production build locally
```

## Architecture

**Entry point:** `index.html` loads `js/main.js` as an ES module.

**Core loop** (`js/main.js`): `requestAnimationFrame` game loop calls `simulation.tick()` → `stats.update()` → `renderer.draw()` → `charts.drawAll()` each frame. Speed multiplier runs multiple ticks per frame.

**Simulation/rendering separation:** `js/simulation.js` is pure logic with zero DOM/Canvas knowledge. `js/renderer.js` handles all Canvas drawing. They communicate through the shared `World` object.

**Key modules:**
- `config.js` — All tunable constants (`WORLD`, `ENERGY`, `INJURY`, `SIM`, `GENE_DEFS`). Config objects are mutable so the UI can adjust values at runtime without restart. `DEFAULTS` stores snapshots for reset.
- `creature.js` — Creature class with state machine: `idle → seekingFood/seekingWater/seekingMate/fleeing/hunting → eating/drinking/mating/killing → pregnant → giveBirth`. Babies start in `growing` state, must reach maturity before mating. Has health, injury levels, and predation logic. Gene values are cached from genome on construction.
- `genome.js` — Gene storage and mutation. `Genome.crossover()` averages both parents' genes then applies mutation.
- `world.js` — Contains creatures, bushes, water pools, corpses. Provides spatial queries (`findNearestBerry`, `findNearestMate`, `findNearestPrey`, `findNearestThreat`, `findNearestCorpse`).
- `corpse.js` — Dead creatures that remain as food sources with a depleting energy pool.
- `food.js` — Bush and Berry classes. Berries arranged in a ring around bush center, with regrow timers.
- `water.js` — WaterPool class.
- `ui.js` — Builds settings/DNA sliders dynamically from `SETTINGS_META` and `DNA_GENES` in config. Tabs for Settings and DNA.
- `stats.js` / `charts.js` — Population statistics tracking and time-series chart rendering.
- `tooltip.js` — Hover tooltips for creatures showing their stats.
- `utils.js` — Shared utilities (e.g., `distSq`).

**Adding a new gene:** Add an entry to `GENE_DEFS` in `config.js`. The DNA UI slider and mutation logic are driven by this array automatically. Then use `genome.get("name")` in creature logic.

## Deployment

Hosted on GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`). On push to `main`, the workflow runs `npm ci && npm run build` and deploys the `dist/` folder. Vite produces content-hashed filenames for cache busting.
