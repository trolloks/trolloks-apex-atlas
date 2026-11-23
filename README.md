[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/trolloks/trolloks-apex-atlas/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/trolloks/trolloks-apex-atlas/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

# Apex Atlas

An original card duel about the real world. Two duelists share one deck of real animals,
wonders or worlds; each card carries five comparable numbers; the leader calls a stat and
both commit a card. Higher takes the trick, three in a row earns momentum, and the first to
break 30 Resolve wins. Two-player local and three bot temperaments, plus booster packs that
unlock more of the atlas.

Built for [make.fun's "Make the best card game" bounty](https://make.fun/bounty/best-card-game-20261122-1826). Everything runs offline from
`game/`: no build step, no network requests, no third-party engine.

## Play

```sh
node serve.ts          # serves game/ on http://localhost:8080
```

Then open <http://localhost:8080>.

## The duel

- Four-card hands; the stat call alternates each trick.
- Each card carries a **crest** (Sun, Moon or Star) and a **trait**:
  **Apex** wins ties, **Swift** refunds a charge when it loses, **Stalwart**
  denies the winner momentum.
- Each trick reveals an **omen** crest; its cards add 10% to the called stat.
- Two charges per duel add 15%, one scouting run opens the Regent's hand, and
  three tricks in a row add +2 damage. First to break 30 Resolve wins.
- Booster packs unlock the rest of the atlas across all three decks.

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
