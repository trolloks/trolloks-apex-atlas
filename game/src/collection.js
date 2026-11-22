// The Atlas collection and its booster packs. Progress is kept in localStorage; packs hold
// two cards drawn from any deck's still-locked cards, so every pack can open something new.

import { DECK_LIST, DECKS } from './decks.js';
import { createRng, shuffle } from './rng.js';

const KEY = 'apex-atlas-collection-v1';
const BASE_CARDS = 4;

function baseCollection() {
  const unlocked = {};
  for (const deck of DECK_LIST) unlocked[deck.id] = deck.cards.slice(0, BASE_CARDS).map((card) => card.id);
  return { unlocked, packs: 1, kindling: 0, wins: 0, matches: 0, shards: 0, packsOpened: 0 };
}

export function loadCollection() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? 'null');
    if (raw && raw.unlocked) {
      for (const deck of DECK_LIST) {
        if (!Array.isArray(raw.unlocked[deck.id])) raw.unlocked[deck.id] = [];
      }
      return raw;
    }
  } catch {
    // A private window without storage starts from a fresh atlas.
  }
  return baseCollection();
}

export function saveCollection(collection) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(collection));
  } catch {
    // Progress lasts this visit only when storage is unavailable.
  }
}

export function fullCollection() {
  const collection = baseCollection();
  for (const deck of DECK_LIST) collection.unlocked[deck.id] = deck.cards.map((card) => card.id);
  collection.packs = 1;
  return collection;
}

export function unlockedCards(collection) {
  return DECK_LIST.flatMap((deck) =>
    deck.cards.filter((card) => collection.unlocked[deck.id]?.includes(card.id)).map((card) => ({ deck, card })),
  );
}

export function lockedCards(collection) {
  return DECK_LIST.flatMap((deck) =>
    deck.cards.filter((card) => !collection.unlocked[deck.id]?.includes(card.id)).map((card) => ({ deck, card })),
  );
}

export function deckProgress(collection, deck) {
  const owned = deck.cards.filter((card) => collection.unlocked[deck.id]?.includes(card.id)).length;
  return { owned, total: deck.cards.length };
}

/** Open one pack: two locked cards, or shards once the atlas is complete. */
export function openPack(collection, seed = Date.now()) {
  if (collection.packs <= 0) return { cards: [], shards: 0 };
  const rng = createRng(seed);
  const locked = shuffle(lockedCards(collection), rng);
  const opened = locked.slice(0, 2);
  const shards = opened.length < 2 ? (2 - opened.length) * 25 : 0;
  for (const { deck, card } of opened) {
    if (!collection.unlocked[deck.id]) collection.unlocked[deck.id] = [];
    collection.unlocked[deck.id].push(card.id);
  }
  collection.packs -= 1;
  collection.packsOpened += 1;
  collection.shards += shards;
  saveCollection(collection);
  return { cards: opened, shards };
}

/** Award packs after a match: one for playing, one more for winning. */
export function awardMatch(collection, won) {
  collection.matches += 1;
  collection.packs += won ? 2 : 1;
  if (won) collection.wins += 1;
  saveCollection(collection);
  return won ? 2 : 1;
}

export function starterDeckIds(deckId) {
  return DECKS[deckId].cards.slice(0, BASE_CARDS).map((card) => card.id);
}
