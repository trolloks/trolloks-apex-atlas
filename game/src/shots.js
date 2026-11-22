// Staged scenes for the entry's screenshots. Each is the real renderer and the real game
// state, arranged by hand and addressed with ?shot=name&seed=N; nothing here runs in play.

import { DECKS, DECK_LIST } from './decks.js';
import { fullCollection } from './collection.js';
import { newMatch, callStat, commitCard, reveal, drawToHand } from './rules.js';

function fillHand(match, index, ids) {
  const player = match.players[index];
  player.hand = ids.slice();
  drawToHand(match, player);
}

function baseMatch(deckId, seed = 11) {
  const deck = DECKS[deckId];
  return newMatch({
    deckId,
    unlockedIds: deck.cards.map((card) => card.id),
    mode: 'solo',
    difficulty: 'master',
    seed,
    target: 7,
  });
}

function duelScene() {
  const match = baseMatch('wonders', 23);
  match.trick = 6;
  match.players[0].score = 3;
  match.players[1].score = 2;
  match.players[0].streak = 2;
  match.players[0].run = 2;
  fillHand(match, 0, ['taj', 'eiffel', 'machu', 'petra']);
  fillHand(match, 1, ['colosseum', 'wall', 'liberty', 'pyramid']);
  match.committed = [null, null];
  match.players[0].hand = ['taj', 'eiffel', 'machu', 'petra'];
  match.players[1].hand = ['colosseum', 'wall', 'liberty', 'pyramid'];
  callStat(match, 'height');
  commitCard(match, 0, 'taj', false);
  commitCard(match, 1, 'colosseum', true);
  match.players[0].score = 3;
  match.players[1].score = 2;
  reveal(match);
  match.players[0].hand = ['eiffel', 'machu', 'wall', 'liberty'];
  match.players[1].hand = ['pyramid', 'petra', 'eiffel', 'machu'];
  match.players[0].draw = ['taj', 'colosseum', 'pyramid', 'petra'];
  match.players[1].draw = ['wall', 'liberty', 'taj', 'colosseum'];
  match.log = [
    'You call HEIGHT. The Regent commits without a word.',
    'You take the trick, 73 m to 55.2 m. The Taj stands tall.',
  ];
  return { match, ui: {}, screen: 'match' };
}

function winScene() {
  const match = baseMatch('beasts', 31);
  match.trick = 9;
  match.players[0].score = 7;
  match.players[1].score = 4;
  match.players[0].bestStreak = 3;
  match.players[0].run = 3;
  match.over = true;
  match.phase = 'over';
  match.winner = 0;
  match.stat = 'mass';
  match.committed = [null, null];
  fillHand(match, 0, ['blue-whale', 'elephant', 'cheetah', 'grizzly']);
  fillHand(match, 1, ['crocodile', 'python', 'ostrich', 'peregrine']);
  match.log = ['The blue whale outweighs the court. The Regent concedes.'];
  return { match, reward: 2, screen: 'result' };
}

function lossScene() {
  const match = baseMatch('worlds', 43);
  match.trick = 10;
  match.players[0].score = 5;
  match.players[1].score = 7;
  match.players[1].bestStreak = 3;
  match.players[1].run = 3;
  match.over = true;
  match.phase = 'over';
  match.winner = 1;
  match.stat = 'moons';
  fillHand(match, 0, ['earth', 'mars', 'mercury', 'venus']);
  fillHand(match, 1, ['saturn', 'jupiter', 'neptune', 'uranus']);
  match.log = ['Saturn\u2019s swarm of moons seals the atlas. The Regent bows.'];
  return { match, reward: 1, screen: 'result' };
}

export function stageShot(name) {
  const collection = fullCollection();
  if (name === 'title') {
    return { screen: 'title', title: { collection, deckId: 'beasts', mode: 'solo', difficulty: 'master', muted: true } };
  }
  if (name === 'duel') return duelScene();
  if (name === 'victory') return winScene();
  if (name === 'defeat') return lossScene();
  return { screen: 'title', title: { collection, deckId: 'wonders', mode: 'solo', difficulty: 'master', muted: true } };
}

export const SHOT_NAMES = ['title', 'duel', 'victory', 'defeat'];
export const SHOT_DECKS = DECK_LIST.map((deck) => deck.id);
