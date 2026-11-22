# Apex Atlas — build notes

This repository is an entry in make.fun's "Make the best card game" bounty.

## Hard constraints

- `game/` is the playable artifact: plain static files, no build step, no network
  requests. Every image, script, style and font it loads lives under `game/`.
- `main.ts` is the entrypoint. It copies `game/` and `screenshots/` to
  `MAKEFUN_OUTPUT_DIR` (default `/output`) and writes `dossier.json` with
  `buildDossier` from `vendor/makefun-game.ts`. That file is the kit's copy and is
  never edited.
- `screenshots/` holds three or four real 1280×720 renders, cover first.
- Do not introduce a library: `game/src` is hand-written ES modules and CSS.

## Layout

- `game/src/decks.js` — card data, deck stats, image and Wikipedia sources, credits
- `game/src/rules.js` — match state, tricks, charges, scoring, momentum
- `game/src/bots.js` — the Regent's three temperaments
- `game/src/collection.js` — localStorage collection and booster packs
- `game/src/render.js` — every DOM string: title, table, packs, collection, modals
- `game/src/main.js` — screen flow and the turn loop
- `game/src/shots.js` — staged screenshot scenes (`?shot=title|duel|victory|defeat`)
- `game/src/effects.js`, `game/src/audio.js` — canvas decoration and synthesised sound

## Checks

- `MAKEFUN_OUTPUT_DIR=out node main.ts` twice must produce the same dossier bytes.
- Play with `node serve.ts`, then open <http://localhost:8080>.
- Screenshots: serve the game, then capture `?shot=<name>&seed=1` at 1280×720 once
  `window.__shotReady` is true.
