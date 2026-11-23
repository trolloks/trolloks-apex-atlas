// Boot and screen flow: title, the duel loop, packs, the collection and the result overlay.
// Game rules live in rules.js, the bot in bots.js and every DOM string in render.js.

import { CREDITS, DECKS } from './decks.js';
import { awardMatch, loadCollection, openPack as openAtlasPack } from './collection.js';
import { newMatch, callStat, commitCard, reveal, finishTrick, scoutHand } from './rules.js';
import { botCall, botCommit, botFlavor } from './bots.js';
import { createEffects } from './effects.js';
import { isMuted, sound, toggleMute } from './audio.js';
import {
  renderCardModal,
  renderCollection,
  renderHelp,
  renderMatch,
  renderPack,
  renderResult,
  renderSources,
  renderTitle,
} from './render.js';
import { stageShot } from './shots.js';
import { createRng } from './rng.js';

const app = document.getElementById('app');
const screens = {
  title: document.getElementById('screen-title'),
  match: document.getElementById('screen-match'),
  pack: document.getElementById('screen-pack'),
  collection: document.getElementById('screen-collection'),
  result: document.getElementById('screen-result'),
};
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modal-body');
const statusLine = document.getElementById('status');
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const shotSeed = Number.parseInt(params.get('seed') ?? '', 10);
const effects = createEffects(document.getElementById('fx'), shotName ? createRng(20261122) : Math.random);

const state = {
  screen: 'title',
  collection: loadCollection(),
  deckId: 'beasts',
  mode: 'solo',
  difficulty: 'master',
  match: null,
  ui: { selectedCard: null, chargeArmed: false, busy: false, committer: 0 },
  muted: isMuted(),
  result: false,
  resultReward: 0,
  packOpened: null,
  timer: 0,
  token: 0,
  shot: Boolean(shotName),
};

function announce(text) {
  statusLine.textContent = text;
}

function clearTimer() {
  if (state.timer) window.clearTimeout(state.timer);
  state.timer = 0;
}

function later(fn, ms) {
  clearTimer();
  const token = state.token;
  state.timer = window.setTimeout(() => {
    state.timer = 0;
    if (token === state.token) fn();
  }, ms);
}

function activeScreen() {
  if (state.screen === 'result') return 'match';
  return state.screen;
}

function render() {
  const active = activeScreen();
  for (const [name, node] of Object.entries(screens)) {
    if (name === 'result') continue;
    node.hidden = name !== active;
  }
  if (active === 'title') renderTitle(screens.title, state);
  if (active === 'match') renderMatch(screens.match, state.match, state.ui);
  if (active === 'pack') renderPack(screens.pack, { collection: state.collection, opened: state.packOpened });
  if (active === 'collection') renderCollection(screens.collection, state.collection);
  if (state.result) {
    renderResult(screens.result, state.match, state.resultReward);
  } else {
    screens.result.hidden = true;
  }
}

/* ---------- match flow ---------- */

function playerActor() {
  if (!state.match) return 0;
  if (state.match.mode === 'local') {
    if (state.match.committed[0] === null) return 0;
    if (state.match.committed[1] === null) return 1;
    return 0;
  }
  return 0;
}

function refreshCommitter() {
  state.ui.committer = state.match ? playerActor() : 0;
}

function startMatch() {
  clearTimer();
  state.token += 1;
  state.result = false;
  state.packOpened = null;
  state.ui = { selectedCard: null, chargeArmed: false, busy: false, committer: 0 };
  const deck = DECKS[state.deckId];
  state.match = newMatch({
    deckId: state.deckId,
    unlockedIds: state.collection.unlocked[state.deckId] ?? [],
    mode: state.mode,
    difficulty: state.difficulty,
    seed: (Date.now() ^ Math.floor(Math.random() * 0xffff)) >>> 0,
  });
  state.screen = 'match';
  refreshCommitter();
  render();
  announce(`${deck.name}: ${state.match.players[0].name} to call the first stat.`);
  if (state.match.mode === 'solo' && state.match.leader === 1) later(botTakeCall, 900);
}

function botTakeCall() {
  if (!state.match || state.match.mode !== 'solo' || state.match.phase !== 'call') return;
  if (state.match.leader !== 1) return;
  const match = state.match;
  const key = botCall(match);
  if (!key) return;
  callStat(match, key);
  state.ui.busy = false;
  announce(botFlavor(match));
  sound.select();
  render();
  if (match.phase === 'reveal') later(doReveal, 450);
}

function doReveal() {
  if (!state.match || state.match.phase !== 'reveal') return;
  const result = reveal(state.match);
  sound.reveal();
  refreshCommitter();
  render();
  if (!result) return;
  const winner = result.winner;
  announce(
    winner === -1
      ? 'A dead heat: no point.'
      : `${state.match.players[winner].name} takes the trick, ${result.sides[0].value} to ${result.sides[1].value}.`,
  );
  later(() => {
    if (!state.match) return;
    finishTrick(state.match);
    if (state.match.over) {
      endMatch();
      return;
    }
    state.ui.selectedCard = null;
    state.ui.chargeArmed = false;
    state.ui.busy = false;
    refreshCommitter();
    render();
    if (state.match.mode === 'solo' && state.match.leader === 1) later(botTakeCall, 900);
  }, 2500);
}

function endMatch() {
  const match = state.match;
  const won = match.winner === 0;
  state.resultReward = awardMatch(state.collection, won);
  state.result = true;
  state.screen = 'result';
  refreshCommitter();
  render();
  if (won) {
    sound.win();
    effects.burst(150);
    announce(`Victory, ${match.players[0].life} Resolve left. ${state.resultReward} packs earned.`);
  } else {
    sound.lose();
    announce(`Defeat, the Regent had ${match.players[1].life} Resolve left. ${state.resultReward} pack earned.`);
  }
}

function afterCommit(committer) {
  const match = state.match;
  if (!match) return;
  if (match.phase === 'reveal') {
    refreshCommitter();
    render();
    later(doReveal, 380);
    return;
  }
  if (match.mode === 'solo' && committer === 0) {
    state.ui.busy = true;
    refreshCommitter();
    render();
    later(() => {
      if (!state.match || state.match.phase !== 'commit') return;
      const bot = state.match.players[1];
      const choice = botCommit(state.match);
      if (!choice) return;
      commitCard(state.match, 1, choice.cardId, choice.charge);
      state.ui.busy = false;
      sound.place();
      refreshCommitter();
      render();
      if (state.match.phase === 'reveal') later(doReveal, 400);
    }, 800);
  } else {
    refreshCommitter();
    render();
  }
}

/* ---------- packs and collection ---------- */

function showPacks() {
  state.screen = 'pack';
  state.result = false;
  state.packOpened = null;
  render();
}

function openPackNow() {
  if (state.collection.packs <= 0) return;
  state.packOpened = openAtlasPack(state.collection, Date.now());
  sound.pack();
  render();
  announce(`Opened a pack: ${state.packOpened.cards.map(({ card }) => card.name).join(', ') || 'atlas complete'}.`);
}

function showCollection() {
  state.screen = 'collection';
  state.result = false;
  render();
}

function showTitle() {
  clearTimer();
  state.match = null;
  state.result = false;
  state.screen = 'title';
  render();
}

/* ---------- modals ---------- */

function showModal(html) {
  modalBody.innerHTML = html;
  modal.hidden = false;
  document.getElementById('modal-close').focus();
}

function closeModal() {
  modal.hidden = true;
  modalBody.innerHTML = '';
}

function showCard(deckId, cardId) {
  const deck = DECKS[deckId];
  const card = deck?.cards.find((entry) => entry.id === cardId);
  if (!card) return;
  const credit = CREDITS.find((entry) => entry.title.toLowerCase() === card.name.toLowerCase());
  showModal(renderCardModal(deck, card, credit));
}

/* ---------- events ---------- */

app.addEventListener('click', (event) => {
  const el = event.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  if (action === 'pick-deck') {
    state.deckId = el.dataset.deck;
    sound.select();
    render();
  } else if (action === 'pick-mode') {
    state.mode = el.dataset.mode;
    sound.select();
    render();
  } else if (action === 'pick-difficulty') {
    state.difficulty = el.dataset.difficulty;
    sound.select();
    render();
  } else if (action === 'start-match' || action === 'rematch') {
    startMatch();
  } else if (action === 'call-stat') {
    if (!state.match || state.match.phase !== 'call') return;
    if (state.match.mode === 'solo' && state.match.leader !== 0) return;
    callStat(state.match, el.dataset.stat);
    sound.select();
    state.ui.selectedCard = null;
    state.ui.chargeArmed = false;
    refreshCommitter();
    render();
  } else if (action === 'select-card') {
    if (!state.match || state.match.phase !== 'commit') return;
    if (state.match.mode === 'solo' && state.ui.committer !== 0) return;
    state.ui.selectedCard = el.dataset.cardId;
    state.ui.chargeArmed = false;
    sound.select();
    render();
  } else if (action === 'toggle-charge') {
    state.ui.chargeArmed = !state.ui.chargeArmed;
    sound.select();
    render();
  } else if (action === 'commit') {
    if (!state.match || !state.ui.selectedCard || state.match.phase !== 'commit') return;
    const committer = state.ui.committer;
    if (state.match.committed[committer] !== null) return;
    const committed = commitCard(state.match, committer, state.ui.selectedCard, state.ui.chargeArmed);
    if (!committed) return;
    state.ui.selectedCard = null;
    state.ui.chargeArmed = false;
    sound.place();
    afterCommit(committer);
  } else if (action === 'scout') {
    if (!state.match || !scoutHand(state.match)) return;
    sound.select();
    render();
  } else if (action === 'packs') {
    showPacks();
  } else if (action === 'open-pack') {
    openPackNow();
  } else if (action === 'collection') {
    showCollection();
  } else if (action === 'title') {
    showTitle();
  } else if (action === 'help') {
    showModal(renderHelp());
  } else if (action === 'sources') {
    showModal(renderSources());
  } else if (action === 'show-card') {
    showCard(el.dataset.deck, el.dataset.cardId);
  } else if (action === 'mute') {
    state.muted = toggleMute();
    render();
  }
});

document.getElementById('modal-close').addEventListener('click', closeModal);
modal.addEventListener('click', (event) => {
  if (event.target === modal) closeModal();
});

app.addEventListener('keydown', (event) => {
  const el = event.target.closest?.('[data-action]');
  if (!el) return;
  if (event.key !== 'Enter' && event.key !== ' ') return;
  if (el.dataset.action === 'show-card' || el.dataset.action === 'select-card') {
    event.preventDefault();
    el.click();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (!modal.hidden) closeModal();
    return;
  }
  if (event.key.toLowerCase() === 'm' && event.target === document.body) {
    state.muted = toggleMute();
    render();
    return;
  }
  if (!state.match || state.screen !== 'match' || !modal.hidden) return;
  if (event.target.closest?.('[data-action="show-card"], [data-action="select-card"]')) return;
  const match = state.match;
  if (/^[1-5]$/.test(event.key) && match.phase === 'call') {
    const stat = match.deck.stats[Number(event.key) - 1];
    if (stat) {
      const chip = screens.match.querySelector(`[data-stat="${stat.key}"]`);
      chip?.click();
    }
    return;
  }
  if (/^[1-3]$/.test(event.key) && match.phase === 'commit') {
    const actor = match.players[state.ui.committer];
    const id = actor.hand[Number(event.key) - 1];
    if (id) {
      state.ui.selectedCard = id;
      state.ui.chargeArmed = false;
      sound.select();
      render();
    }
    return;
  }
  if (event.key === 'Enter' && state.ui.selectedCard) {
    screens.match.querySelector('[data-action="commit"]:not([disabled])')?.click();
  }
  if (event.key.toLowerCase() === 'c') {
    screens.match.querySelector('[data-action="toggle-charge"]:not([disabled])')?.click();
  }
  if (event.key.toLowerCase() === 's') {
    screens.match.querySelector('[data-action="scout"]:not([disabled])')?.click();
  }
});

/* ---------- screenshots ---------- */

async function waitForPaint() {
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
  try {
    await document.fonts.ready;
  } catch {
    // Font loading is best effort.
  }
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

async function runShot(name) {
  clearTimer();
  state.shot = true;
  const scene = stageShot(name);
  state.collection = scene.title?.collection ?? state.collection;
  if (scene.screen === 'title') {
    Object.assign(state, { screen: 'title', ...scene.title, match: null, result: false });
  } else if (scene.screen === 'result') {
    state.match = scene.match;
    state.result = true;
    state.resultReward = scene.reward;
    state.screen = 'result';
    state.ui = { selectedCard: null, chargeArmed: false, busy: false, committer: 0 };
  } else {
    state.match = scene.match;
    state.screen = 'match';
    state.result = false;
    state.ui = { selectedCard: null, chargeArmed: false, busy: false, committer: 0 };
  }
  render();
  if (name === 'victory') effects.burst(110);
  effects.freeze(name === 'victory' ? 44 : 1);
  await waitForPaint();
  await new Promise((resolve) => setTimeout(resolve, name === 'victory' ? 650 : 120));
  window.__shotReady = true;
}

/* ---------- boot ---------- */

effects.start();
window.__apexState = state;
if (shotName) {
  runShot(shotName).catch((error) => {
    console.error(error);
    window.__shotReady = true;
  });
} else {
  render();
  announce('Apex Atlas. Choose a deck and enter the duel.');
  // A first visit gets a nudge toward the pack screen, but never a modal.
  if (state.collection.packs > 0 && state.collection.matches === 0) {
    // nothing forced
  }
}
