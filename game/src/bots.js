// The Regent's brain: three temperaments that read their own hand, never yours.
// Apprentice plays loose, Adept plays the percentages, Master saves charges for the swing.

import { cardOf, statRange } from './rules.js';

function normalized(match, key, value) {
  const { min, max } = statRange(match.deck, key);
  if (max === min) return 0.5;
  return (value - min) / (max - min);
}

function handCards(match, player) {
  return player.hand.map((id) => cardOf(match, id));
}

function statScores(match, player) {
  const cards = handCards(match, player);
  return match.deck.stats.map((stat) => {
    const norms = cards.map((card) => normalized(match, stat.key, card.stats[stat.key])).sort((a, b) => b - a);
    return { key: stat.key, label: stat.label, best: norms[0], second: norms[1] ?? norms[0] };
  });
}

export function botCall(match) {
  const bot = match.players[1];
  const scores = statScores(match, bot);
  if (match.difficulty === 'apprentice') {
    const shuffled = scores.slice().sort(() => match.random() - 0.5);
    return shuffled[0].key;
  }
  if (match.difficulty === 'master') {
    const ranked = scores.slice().sort((a, b) => (b.best + b.second * 0.35) - (a.best + a.second * 0.35));
    return ranked[0].key;
  }
  return scores.slice().sort((a, b) => b.best - a.best)[0].key;
}

export function botCommit(match) {
  const bot = match.players[1];
  const cards = handCards(match, bot);
  const key = match.stat;
  const ranked = cards
    .filter((card) => card.tier <= bot.energy)
    .map((card) => {
      const value = normalized(match, key, card.stats[key]);
      const cover = match.deck.stats
        .filter((stat) => stat.key !== key)
        .reduce((sum, stat) => sum + normalized(match, stat.key, card.stats[stat.key]), 0) / (match.deck.stats.length - 1);
      return { card, value, score: value + cover * 0.2 };
    })
    .sort((a, b) => b.score - a.score);

  if (!ranked.length) return null;
  if (match.difficulty === 'apprentice') {
    const chosen = ranked[Math.floor(match.random() * ranked.length)] ?? ranked[0];
    const charge = bot.charges > 0 && bot.energy >= chosen.card.tier + 1 && match.random() > 0.9;
    return { cardId: chosen.card.id, charge };
  }
  const chosen = ranked[0];
  const swing = chosen.value < (match.difficulty === 'master' ? 0.45 : 0.3);
  const pressure = bot.life <= 6;
  const canCharge = bot.charges > 0 && bot.energy >= chosen.card.tier + 1;
  const wantsCharge = canCharge && (swing || (pressure && match.difficulty === 'master' && match.random() > 0.5));
  return { cardId: chosen.card.id, charge: wantsCharge };
}

export function botFlavor(match) {
  const key = match.stat;
  const label = match.deck.stats.find((stat) => stat.key === key)?.label ?? key;
  if (match.difficulty === 'master') return `The Regent weighs ${label} like a merchant weighs coin.`;
  if (match.difficulty === 'apprentice') return `The Regent slaps down a card and calls ${label}.`;
  return `The Regent studies ${label} before it commits.`;
}
