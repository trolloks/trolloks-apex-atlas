// Apex Atlas match rules: a duel of tricks over a shared deck of real-world cards.
// The leader calls one of five stats; both duelists commit a card and may burn a charge
// for +15%; the higher value takes the trick and one point, three in a row add a bonus.

import { DECKS } from './decks.js';
import { createRng, shuffle } from './rng.js';

export const TARGET_POINTS = 7;
export const HAND_SIZE = 4;
export const CHARGE_BONUS = 1.15;

export function statRange(deck, key) {
  const values = deck.cards.map((card) => card.stats[key]);
  return { min: Math.min(...values), max: Math.max(...values) };
}

function buildPile(deck, unlockedIds, rng) {
  const owned = deck.cards.filter((card) => unlockedIds.includes(card.id));
  const cards = owned.length ? owned : deck.cards.slice(0, 4);
  const pile = [];
  while (pile.length < 12) pile.push(...cards.map((card) => card.id));
  return shuffle(pile, rng).slice(0, 12);
}

export function newMatch({ deckId, unlockedIds, mode = 'solo', difficulty = 'adept', seed = Date.now(), target = TARGET_POINTS }) {
  const deck = DECKS[deckId];
  const rng = createRng(seed);
  const names = mode === 'local' ? ['DUELIST I', 'DUELIST II'] : ['YOU', 'THE REGENT'];
  const players = names.map((name, index) => ({
    index,
    name,
    isBot: mode === 'solo' && index === 1,
    hand: [],
    draw: buildPile(deck, unlockedIds, rng),
    discard: [],
    score: 0,
    streak: 0,
    run: 0,
    bestStreak: 0,
    charges: 2,
    chargeUsed: false,
    scouted: false,
  }));
  const match = {
    deck,
    deckId,
    mode,
    difficulty,
    target,
    random: rng,
    seed,
    players,
    leader: 0,
    trick: 1,
    phase: 'call',
    stat: null,
    committed: [null, null],
    result: null,
    log: [],
    scoutTrick: 0,
    over: false,
    winner: null,
  };
  for (const player of players) drawToHand(match, player);
  say(match, `${names[0]} opens the atlas. First to ${target} points takes the duel.`);
  return match;
}

export function drawToHand(match, player) {
  while (player.hand.length < HAND_SIZE) {
    if (!player.draw.length) {
      if (!player.discard.length) break;
      player.draw = shuffle(player.discard.splice(0), match.random);
    }
    const id = player.draw.pop();
    if (id) player.hand.push(id);
  }
}

export function cardOf(match, id) {
  return match.deck.cards.find((card) => card.id === id);
}

export function say(match, text) {
  match.log.push(text);
  if (match.log.length > 24) match.log.shift();
}

export function chargeValue(value) {
  const boosted = value < 0 ? value / CHARGE_BONUS : value * CHARGE_BONUS;
  return Math.round(boosted * 10) / 10;
}

export function callStat(match, key) {
  if (match.phase !== 'call') return false;
  if (!match.deck.stats.some((stat) => stat.key === key)) return false;
  match.stat = key;
  match.phase = 'commit';
  const label = match.deck.stats.find((stat) => stat.key === key).label;
  say(match, `${match.players[match.leader].name} calls ${label.toUpperCase()}.`);
  return true;
}

export function commitCard(match, playerIndex, cardId, useCharge = false) {
  if (match.phase !== 'commit') return false;
  const player = match.players[playerIndex];
  const at = player.hand.indexOf(cardId);
  if (at === -1) return false;
  if (useCharge && player.charges <= 0) useCharge = false;
  player.hand.splice(at, 1);
  if (useCharge) {
    player.charges -= 1;
    player.chargeUsed = true;
  }
  match.committed[playerIndex] = { cardId, charge: useCharge };
  if (match.committed.every(Boolean)) match.phase = 'reveal';
  return true;
}

export function reveal(match) {
  if (match.phase !== 'reveal') return null;
  const stat = match.deck.stats.find((s) => s.key === match.stat);
  const sides = match.committed.map((commit) => {
    const card = cardOf(match, commit.cardId);
    const raw = card.stats[match.stat];
    return { card, raw, value: commit.charge ? chargeValue(raw) : raw, charge: commit.charge };
  });
  const [a, b] = sides;
  let winner = -1;
  if (a.value > b.value) winner = 0;
  else if (b.value > a.value) winner = 1;

  match.result = { stat, sides, winner };
  if (winner === -1) {
    for (const player of match.players) {
      player.streak = 0;
      player.run = 0;
    }
    say(match, `Dead heat: ${a.value} to ${b.value}. No point, the call stands.`);
  } else {
    const player = match.players[winner];
    const other = match.players[1 - winner];
    player.score += 1;
    player.streak += 1;
    player.run += 1;
    player.bestStreak = Math.max(player.bestStreak, player.run);
    other.streak = 0;
    other.run = 0;
    say(match, `${player.name} takes the trick, ${a.value} to ${b.value}.`);
    if (player.streak === 3) {
      player.score += 1;
      player.streak = 0;
      match.result.bonus = true;
      say(match, `Three in a row: ${player.name} claims a momentum point.`);
    }
  }
  match.phase = 'resolve';
  return match.result;
}

export function finishTrick(match) {
  if (match.phase !== 'resolve') return;
  for (let i = 0; i < 2; i += 1) {
    const player = match.players[i];
    const commit = match.committed[i];
    if (commit) player.discard.push(commit.cardId);
    player.chargeUsed = false;
    drawToHand(match, player);
  }
  if (match.players.some((player) => player.score >= match.target)) {
    match.over = true;
    match.phase = 'over';
    const top = match.players[0].score === match.players[1].score ? -1 : match.players[0].score > match.players[1].score ? 0 : 1;
    match.winner = top;
    if (top >= 0) say(match, `${match.players[top].name} wins the duel, ${match.players[top].score} to ${match.players[1 - top].score}.`);
    return;
  }
  const winner = match.result?.winner;
  if (winner >= 0) match.leader = winner;
  match.committed = [null, null];
  match.stat = null;
  match.result = null;
  match.trick += 1;
  match.phase = 'call';
}

export function scoutHand(match) {
  if (match.mode !== 'solo') return false;
  const player = match.players[0];
  if (player.scouted) return false;
  player.scouted = true;
  match.scoutTrick = match.trick + 1;
  say(match, 'You study the Regent\u2019s hand. Its cards stay open for one trick.');
  return true;
}

export function scoutOpen(match) {
  return match.mode === 'solo' && match.players[0].scouted && match.trick < match.scoutTrick;
}

export function formatStat(stat, value) {
  const digits = Number.isInteger(value) ? 0 : 1;
  return `${value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}${stat.unit ? ` ${stat.unit}` : ''}`;
}

export function statLabel(deck, key) {
  const stat = deck.stats.find((s) => s.key === key);
  return stat ? stat.label : key;
}
