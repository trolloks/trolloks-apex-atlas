# Apex Atlas

An original card duel about the real world. Two duelists share one deck of real animals,
wonders or worlds; each card carries five comparable numbers; the leader calls a stat and
both commit a card. Higher takes the trick, three in a row earns momentum, and the first to
seven points wins. Two-player local and three bot temperaments, plus booster packs that
unlock more of the atlas.

Built for make.fun's "Make the best card game" bounty. Everything runs offline from
`game/`: no build step, no network requests, no third-party engine.

## Play

```sh
node serve.ts          # serves game/ on http://localhost:8080
```

Then open <http://localhost:8080>.

## The entry

- `game/` — the playable static game (`index.html`, ES modules, CSS, photos)
- `game/assets/` — free-licensed photographs and planet images from Wikimedia Commons;
  the in-game Sources panel credits every one with author and licence
- `screenshots/` — real 1280×720 renders of the game, cover first
- `main.ts` — copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
- `vendor/makefun-game.ts` — make.fun's dossier builder, unchanged from the kit
- `shots.json` — the query strings used to stage each screenshot
- `CHANGELOG.tsv` — the release log

Run the hand-in locally:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Facts and credits

Card facts and figures follow English Wikipedia; every card links to its source article in
the game. Photographs are public domain, CC0 or CC BY / CC BY-SA works from Wikimedia
Commons, credited per card in the Sources panel. Wikipedia text is paraphrased. Apex Atlas
itself is MIT licensed.
