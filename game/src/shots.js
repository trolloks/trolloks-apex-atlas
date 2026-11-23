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
    life: 30,
  });
}

function duelScene() {
  const match = baseMatch('wonders', 23);
  match.trick = 6;
  match.players[0].life = 22;
  match.players[1].life = 18;
  match.players[0].streak = 2;
  match.players[0].run = 2;
  fillHand(match, 0, ['eiffel', 'taj', 'machu', 'petra']);
  fillHand(match, 1, ['colosseum', 'wall', 'liberty', 'pyramid']);
  match.committed = [null, null];
  match.players[0].hand = ['eiffel', 'taj', 'machu', 'petra'];
  match.players[1].hand = ['colosseum', 'wall', 'liberty', 'pyramid'];
  match.omen = 'sun';
  callStat(match, 'height');
  commitCard(match, 0, 'eiffel', true);
  commitCard(match, 1, 'colosseum', false);
  reveal(match);
  match.players[0].hand = ['taj', 'machu', 'wall', 'liberty'];
  match.players[1].hand = ['pyramid', 'petra', 'eiffel', 'machu'];
  match.players[0].draw = ['taj', 'colosseum', 'pyramid', 'petra'];
  match.players[1].draw = ['wall', 'liberty', 'taj', 'colosseum'];
  match.log = [
    'You call HEIGHT. The Regent commits without a word.',
    'You take the trick, 417.5 m to 48 m: 10 damage. The Eiffel stands tall.',
  ];
  return { match, ui: {}, screen: 'match' };
}

function winScene() {
  const match = baseMatch('beasts', 31);
  match.trick = 9;
  match.omen = 'moon';
  match.players[0].life = 15;
  match.players[1].life = 0;
  match.players[0].bestStreak = 3;
  match.players[0].run = 3;
  match.over = true;
  match.phase = 'over';
  match.winner = 0;
  match.stat = 'mass';
  match.committed = [{ cardId: 'blue-whale', charge: false }, { cardId: 'crocodile', charge: true }];
  match.result = {
    stat: { key: 'mass', label: 'Mass', unit: 'kg', icon: 'weight' },
    sides: [
      { card: match.deck.cards.find((c) => c.id === 'blue-whale'), raw: 150000, value: 165000, charge: false, omen: true },
      { card: match.deck.cards.find((c) => c.id === 'crocodile'), raw: 1000, value: 1150, charge: true, omen: false },
    ],
    winner: 0,
    omen: 'moon',
    damage: 8,
  };
  match.players[0].hand = ['elephant', 'cheetah', 'grizzly', 'peregrine'];
  match.players[1].hand = ['python', 'ostrich', 'elephant', 'cheetah'];
  match.players[0].draw = ['blue-whale', 'crocodile', 'python', 'ostrich'];
  match.players[1].draw = ['blue-whale', 'crocodile', 'grizzly', 'peregrine'];
  match.log = ['The blue whale outweighs the court. The Regent concedes.'];
  return { match, reward: 2, screen: 'result' };
}

function lossScene() {
  const match = baseMatch('worlds', 43);
  match.trick = 10;
  match.omen = 'star';
  match.players[0].life = 0;
  match.players[1].life = 18;
  match.players[1].bestStreak = 3;
  match.players[1].run = 3;
  match.over = true;
  match.phase = 'over';
  match.winner = 1;
  match.stat = 'moons';
  match.committed = [{ cardId: 'earth', charge: false }, { cardId: 'saturn', charge: false }];
  match.result = {
    stat: { key: 'moons', label: 'Moons', unit: 'known', icon: 'moon' },
    sides: [
      { card: match.deck.cards.find((c) => c.id === 'earth'), raw: 1, value: 1.1, charge: false, omen: true },
      { card: match.deck.cards.find((c) => c.id === 'saturn'), raw: 146, value: 160.6, charge: false, omen: true },
    ],
    winner: 1,
    omen: 'star',
    damage: 8,
  };
  match.players[0].hand = ['mars', 'mercury', 'venus', 'jupiter'];
  match.players[1].hand = ['uranus', 'neptune', 'earth', 'mars'];
  match.players[0].draw = ['earth', 'saturn', 'uranus', 'neptune'];
  match.players[1].draw = ['earth', 'saturn', 'venus', 'jupiter'];
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
