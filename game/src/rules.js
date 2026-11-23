// Apex Atlas match rules: a duel of tricks over a shared deck of real-world cards.
// The leader calls one of five stats; both duelists commit a card and may burn a charge
// for +15%; the higher value takes the trick and one point, three in a row add a bonus.

import { CRESTS, CREST_KEYS, DECKS, TRAITS, crestOf, traitOf } from './decks.js';
import { createRng, shuffle } from './rng.js';

export const START_LIFE = 30;
export const HAND_SIZE = 4;
export const TRICK_ENERGY = 3;
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

export function newMatch({ deckId, unlockedIds, mode = 'solo', difficulty = 'adept', seed = Date.now(), life = START_LIFE }) {
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
    life,
    streak: 0,
    run: 0,
    bestStreak: 0,
    charges: 2,
    chargeUsed: false,
    energy: TRICK_ENERGY,
    scouted: false,
  }));
  const match = {
    deck,
    deckId,
    mode,
    difficulty,
    life,
    random: rng,
    seed,
    players,
    leader: 0,
    trick: 1,
    omen: CREST_KEYS[Math.floor(rng() * CREST_KEYS.length)],
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
  say(match, `${names[0]} opens the atlas. Break ${life} Resolve to win the duel.`);
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
  const card = cardOf(match, cardId);
  if (useCharge && player.charges <= 0) useCharge = false;
  const cost = card.tier + (useCharge ? 1 : 0);
  if (cost > player.energy) return false;
  player.energy -= cost;
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
    const omen = crestOf(match.deck, card) === match.omen;
    let value = commit.charge ? chargeValue(raw) : raw;
    if (omen) value = Math.round(value * 1.1 * 10) / 10;
    return { card, raw, value, charge: commit.charge, omen };
  });
  const [a, b] = sides;
  let winner = -1;
  let tiebreak = null;
  if (a.value > b.value) winner = 0;
  else if (b.value > a.value) winner = 1;
  else {
    const aApex = traitOf(a.card) === 'apex';
    const bApex = traitOf(b.card) === 'apex';
    if (aApex !== bApex) {
      winner = aApex ? 0 : 1;
      tiebreak = 'apex';
    }
  }

  match.result = { stat, sides, winner, tiebreak, omen: match.omen };
  if (sides.some((side) => side.omen)) {
    const marked = sides.filter((side) => side.omen).map((side) => side.card.name).join(' and ');
    say(match, `${CRESTS[match.omen].name} omen: ${marked} gains +10%.`);
  }
  if (winner === -1) {
    for (const player of match.players) {
      player.streak = 0;
      player.run = 0;
    }
    say(match, `Dead heat: ${a.value} to ${b.value}. No point, the call stands.`);
  } else {
    const player = match.players[winner];
    const other = match.players[1 - winner];
    player.run += 1;
    player.bestStreak = Math.max(player.bestStreak, player.run);
    const loserCard = sides[1 - winner].card;
    const loserTrait = traitOf(loserCard);
    if (loserTrait === 'stalwart') {
      say(match, `${loserCard.name} stands stalwart: no momentum from this trick.`);
    } else {
      player.streak += 1;
    }
    if (loserTrait === 'swift' && other.charges < 2) {
      other.charges += 1;
      say(match, `${loserCard.name} is swift: its duelist recovers a charge.`);
    }
    let damage = 4;
    const winnerValue = Math.abs(sides[winner].value);
    const loserValue = Math.abs(sides[1 - winner].value);
    if (winnerValue > 0) {
      if (loserValue === 0 || winnerValue >= loserValue * 2) damage += 2;
      if (loserValue === 0 || winnerValue >= loserValue * 4) damage += 2;
    }
    other.streak = 0;
    other.run = 0;
    if (player.streak === 3) {
      damage += 2;
      player.streak = 0;
      match.result.bonus = true;
      say(match, `Three in a row: ${player.name} adds momentum damage.`);
    }
    other.life = Math.max(0, other.life - damage);
    match.result.damage = damage;
    say(match, `${player.name} takes the trick, ${a.value} to ${b.value}: ${damage} damage.${tiebreak === 'apex' ? ' Apex breaks the tie.' : ''}`);
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
    player.energy = TRICK_ENERGY;
    drawToHand(match, player);
  }
  if (match.players.some((player) => player.life <= 0)) {
    match.over = true;
    match.phase = 'over';
    const top = match.players[0].life > 0 ? 0 : 1;
    match.winner = top;
    say(match, `${match.players[top].name} wins the duel, ${match.players[1 - top].name}'s Resolve is broken.`);
    return;
  }
  // The call alternates: both duelists get to steer a trick, and a hot hand cannot lock the lead.
  match.leader = 1 - match.leader;
  match.committed = [null, null];
  match.stat = null;
  match.result = null;
  match.trick += 1;
  match.omen = CREST_KEYS[Math.floor(match.random() * CREST_KEYS.length)];
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

export function formatNumber(value) {
  const digits = Number.isInteger(value) ? 0 : 1;
  return value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatStat(stat, value) {
  return `${formatNumber(value)}${stat.unit ? ` ${stat.unit}` : ''}`;
}

export function statLabel(deck, key) {
  const stat = deck.stats.find((s) => s.key === key);
  return stat ? stat.label : key;
}
