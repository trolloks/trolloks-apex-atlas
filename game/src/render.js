// All DOM rendering: the title, the duel table, packs, the collection, result and modals.
// Rule data is read, never written, here.

import { CREDITS, DECKS, DECK_LIST } from './decks.js';
import { deckProgress } from './collection.js';
import { chargeValue, formatStat, scoutOpen } from './rules.js';

const ICONS = {
  weight: '<path d="M4 9h16M6 9v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9M9 9V6a3 3 0 0 1 6 0v3"/>',
  ruler: '<path d="M3 8h18v8H3zM7 8v3M11 8v3M15 8v3M19 8v3"/>',
  bolt: '<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>',
  hourglass: '<path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 0M8 21c0-5 8-5 8 0M8 3v2c0 4 3 5 4 7 1-2 4-3 4-7V3M8 21v-2c0-4 3-5 4-7 1 2 4 3 4 7v2"/>',
  egg: '<path d="M12 3c4 0 7 6 7 10a7 7 0 0 1-14 0c0-4 3-10 7-10z"/>',
  tower: '<path d="M12 2 5 21h14zM9 14h6M10 9h4"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  crowd: '<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M2 20c0-4 2.7-6 6-6s6 2 6 6M14 20c0-3 1.5-4.8 3.5-4.8S21 17 21 20"/>',
  laurel: '<path d="M12 21c-5-2-7-6-7-11M12 21c5-2 7-6 7-11M5 10 2 8M5 10l1-3M5 14l-3 1M5 14l2 2M19 10l3-2M19 10l-1-3M19 14l3 1M19 14l-2 2"/>',
  circle: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/>',
  'arrow-down': '<path d="M12 3v16M6 13l6 6 6-6"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
  orbit: '<ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(-24 12 12)"/><circle cx="12" cy="12" r="2.4"/><circle cx="20.3" cy="7.4" r="1.3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
  paw: '<circle cx="7" cy="9" r="2.2"/><circle cx="12" cy="7" r="2.2"/><circle cx="17" cy="9" r="2.2"/><path d="M12 12c4 0 7 4 5.5 7-1 2-3 1-5.5 1s-4.5 1-5.5-1C5 16 8 12 12 12z"/>',
  column: '<path d="M4 21h16M5 18h14M6 18V7M10 18V7M14 18V7M18 18V7M4 7h16M4 4h16M6 4l6-2 6 2"/>',
  ring: '<circle cx="12" cy="12" r="6"/><ellipse cx="12" cy="12" rx="11" ry="4" transform="rotate(-18 12 12)"/>',
  star: '<path d="M12 2l2.2 7.2L22 12l-7.8 2.8L12 22l-2.2-7.2L2 12l7.8-2.8z"/>',
  spark: '<path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M19 5l-4 4M9 15l-4 4"/>',
};

function icon(name, cls = '') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] ?? ICONS.star}</svg>`;
}

function emblem(name) {
  const map = { paw: 'paw', column: 'column', ring: 'ring' };
  return icon(map[name] ?? 'star');
}

function esc(text) {
  return String(text).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}

function roman(index) {
  return ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][index] ?? String(index + 1);
}

function statsHtml(deck, card, opts = {}) {
  return deck.stats
    .map((stat) => {
      const called = opts.called === stat.key ? ' called' : '';
      const boosted = opts.boosted && opts.called === stat.key;
      const value = boosted ? chargeValue(card.stats[stat.key]) : card.stats[stat.key];
      return `<li class="stat${called}${boosted ? ' boosted' : ''}" ${boosted ? 'title="Charge: +15%"' : ''}>
        <span class="stat-label">${esc(stat.label)}</span>
        <span class="stat-value">${formatStat(stat, value)}${boosted ? '<span class="charge-mark" aria-label="charged"> +</span>' : ''}</span>
      </li>`;
    })
    .join('');
}

export function cardHtml(deck, card, opts = {}) {
  const index = deck.cards.indexOf(card);
  const classes = ['card', `tier-${card.tier}`];
  if (opts.playable) classes.push('playable');
  if (opts.selected) classes.push('selected');
  if (opts.dim) classes.push('dim');
  if (opts.duel) classes.push('on-table');
  if (opts.outcome) classes.push(opts.outcome);
  return `<div class="${classes.join(' ')}" style="--accent:${deck.accent}"
    ${opts.playable ? `role="button" tabindex="0" data-action="select-card" data-card-id="${card.id}" aria-label="Play ${esc(card.name)}"` : ''}>
    <div class="card-photo">
      <img src="./assets/${card.img}.jpg" alt="${esc(card.name)}" draggable="false">
      <span class="card-rank">${roman(index)}</span>
      <span class="card-tier" title="tier ${card.tier}"></span>
    </div>
    <div class="card-body">
      <div class="card-heading">
        <div class="card-name">${esc(card.name)}</div>
        <div class="card-latin">${esc(card.latin)}</div>
      </div>
      <ul class="card-stats">${statsHtml(deck, card, opts)}</ul>
    </div>
    <div class="card-emblem">${emblem(deck.emblem)}</div>
  </div>`;
}

function miniCardHtml(deck, card, locked) {
  if (locked) {
    return `<div class="mini-card locked" aria-label="Locked card"><img src="./assets/${card.img}.jpg" alt=""><div class="mini-body"><div class="mini-name">${esc(card.name)}</div><div class="mini-stats">Not yet catalogued</div></div></div>`;
  }
  return `<button class="mini-card" data-action="show-card" data-deck="${deck.id}" data-card-id="${card.id}" aria-label="Inspect ${esc(card.name)}">
    <img src="./assets/${card.img}.jpg" alt="">
    <div class="mini-body"><div class="mini-name">${esc(card.name)}</div><div class="mini-stats">${esc(deck.stats[0].label)} ${formatStat(deck.stats[0], card.stats[deck.stats[0].key])} · ${esc(deck.stats[1].label)} ${formatStat(deck.stats[1], card.stats[deck.stats[1].key])}</div></div>
  </button>`;
}

function scorePips(score, target, side) {
  return `<div class="pips ${side}">${Array.from({ length: target }, (_, i) => `<span class="pip${i < score ? ' on' : ''}"></span>`).join('')}</div>`;
}

/* ---------------- title ---------------- */

export function renderTitle(root, ui) {
  const { collection, deckId, mode, difficulty } = ui;
  root.innerHTML = `
    <div class="title-wrap">
      <div class="masthead"><hr class="rule"><div class="eyebrow">The field guide duel &middot; est. 2026</div><hr class="rule"></div>
      <h1 class="wordmark">Apex <em>Atlas</em></h1>
      <p class="tagline">Real champions. Real numbers. One table.</p>
      <div class="deck-rail">
        ${DECK_LIST.map((deck) => {
          const progress = deckProgress(collection, deck);
          return `<button class="deck-pick ${deck.id === deckId ? 'selected' : ''}" data-action="pick-deck" data-deck="${deck.id}" aria-pressed="${deck.id === deckId}">
            <img src="./assets/${deck.cards[0].img}.jpg" alt="">
            <span class="deck-badge">${emblem(deck.emblem)}</span>
            <span class="deck-pick-body">
              <span class="deck-name">${esc(deck.name)}</span>
              <span class="deck-tag">${esc(deck.tagline)}</span>
              <span class="deck-meter"><span class="meter-track"><span class="meter-fill" style="width:${(progress.owned / progress.total) * 100}%"></span></span>${progress.owned}/${progress.total}</span>
            </span>
          </button>`;
        }).join('')}
      </div>
      <div class="mode-panel">
        <span class="seg-label">Mode</span>
        <span class="seg">
          <button data-action="pick-mode" data-mode="solo" class="${mode === 'solo' ? 'on' : ''}">Solo vs Regent</button>
          <button data-action="pick-mode" data-mode="local" class="${mode === 'local' ? 'on' : ''}">Local 2P</button>
        </span>
        <span class="seg-label" ${mode === 'local' ? 'style="opacity:.35"' : ''}>Regent</span>
        <span class="seg" ${mode === 'local' ? 'style="opacity:.35"' : ''}>
          ${['apprentice', 'adept', 'master'].map((level) => `<button data-action="pick-difficulty" data-difficulty="${level}" class="${difficulty === level ? 'on' : ''}">${level[0].toUpperCase() + level.slice(1)}</button>`).join('')}
        </span>
      </div>
      <div class="title-actions">
        <button class="btn primary" data-action="start-match">Enter the duel</button>
        <button class="btn ghost" data-action="collection">Collection</button>
        <button class="btn ghost" data-action="packs" ${collection.packs ? '' : 'disabled'}>Open pack${collection.packs === 1 ? '' : 's'} <span class="pack-pill" style="margin-left:8px"><b>${collection.packs}</b></span></button>
      </div>
      <p class="title-sub">3 decks &middot; 24 real cards &middot; Wikipedia facts &middot; offline in your browser</p>
    </div>
    <div class="title-foot">
      <span>Apex Atlas &middot; an original make.fun entry</span>
      <span class="links">
        <button class="linkish" data-action="help">How to play</button>
        <button class="linkish" data-action="sources">Sources &amp; credits</button>
        <button class="linkish" data-action="mute">${ui.muted ? 'Sound off' : 'Sound on'}</button>
      </span>
    </div>`;
}

/* ---------------- match ---------------- */

function slotHtml(match, index, ui) {
  const player = match.players[index];
  const commit = match.committed[index];
  const revealed = match.phase === 'resolve' || (match.phase === 'reveal' && ui.revealNow);
  if (commit && revealed) {
    const card = match.deck.cards.find((c) => c.id === commit.cardId);
    const side = match.result?.sides?.[index];
    const outcome = match.result && match.result.winner >= 0 ? (match.result.winner === index ? 'winner' : 'loser') : '';
    return cardHtml(match.deck, card, {
      duel: true,
      called: match.stat,
      boosted: side?.charge,
      outcome,
    });
  }
  if (commit) return `<div class="card-back" aria-label="Card committed">${emblem(match.deck.emblem)}<span class="back-mark">SET</span></div>`;
  return `<div class="empty-slot">${match.phase === 'call' ? 'Call a stat' : 'Commit a card'}</div>`;
}

function handHtml(match, index, ui) {
  const player = match.players[index];
  const isYou = index === 0;
  const active = match.mode === 'local'
    ? index === (ui.committer ?? 0) && match.phase === 'commit' && match.committed[index] === null
    : isYou && match.phase === 'commit' && match.committed[0] === null && !ui.busy;
  const label = match.mode === 'local' ? player.name : isYou ? 'Your hand' : 'Regent hand';
  if (!isYou && match.mode === 'solo' && !scoutOpen(match)) {
    return `<div class="hand-cards opponent right" aria-label="Opponent hand">
      ${player.hand.map(() => `<div class="card-back">${emblem(match.deck.emblem)}</div>`).join('')}
    </div>`;
  }
  return `<div class="hand-cards ${isYou ? '' : 'opponent right'}" data-hand="${index}" aria-label="${esc(label)}">
    ${player.hand
      .map((id) => {
        const card = match.deck.cards.find((c) => c.id === id);
        return cardHtml(match.deck, card, {
          playable: active && match.phase === 'commit',
          selected: ui.selectedCard === id && index === (ui.committer ?? 0),
          dim: !active && match.phase === 'commit',
        });
      })
      .join('')}
  </div>`;
}

function statChips(match, ui) {
  const canCall = match.phase === 'call' && !ui.busy && (match.mode === 'local' || match.leader === 0);
  return match.deck.stats
    .map((stat) => {
      const called = match.stat === stat.key;
      return `<button class="stat-chip${called ? ' called' : ''}" data-action="call-stat" data-stat="${stat.key}" ${canCall ? '' : 'disabled'}>
        ${icon(stat.icon)}<span>${esc(stat.label)}</span>${called && match.phase !== 'call' ? '<span class="chip-value">&#10003;</span>' : ''}
      </button>`;
    })
    .join('');
}

function compareHtml(match) {
  if (match.result) {
    const stat = match.result.stat;
    const [a, b] = match.result.sides;
    return `<div class="compare-values">
        <span class="you">${formatStat(stat, a.value)}</span><span class="sep">&ndash;</span><span class="bot">${formatStat(stat, b.value)}</span>
      </div>
      <div class="compare-label">${esc(stat.label)}</div>`;
  }
  if (match.stat) {
    const stat = match.deck.stats.find((s) => s.key === match.stat);
    return `<div class="compare-values"><span class="you">?</span><span class="sep">&ndash;</span><span class="bot">?</span></div><div class="compare-label">${esc(stat.label)}</div>`;
  }
  return `<div class="compare-values" style="opacity:.5">VS</div><div class="compare-label">Call the stat</div>`;
}

export function renderMatch(root, match, ui) {
  const leader = match.players[match.leader];
  const you = match.players[0];
  const rival = match.players[1];
  const actor = match.players[ui.committer ?? 0];
  const last = match.log[match.log.length - 1] ?? '';
  const result = match.result;
  const winnerName = (index) => match.mode === 'local'
    ? match.players[index].name
    : index === 0 ? 'You' : 'The Regent';
  const trickLine = result
    ? result.winner === 0
      ? { text: result.bonus ? `${winnerName(0)} take${match.mode === 'local' ? 's' : ''} it + momentum` : `${winnerName(0)} take${match.mode === 'local' ? 's' : ''} the trick`, cls: 'win' }
      : result.winner === 1
        ? { text: result.bonus ? `${winnerName(1)} + momentum` : `${winnerName(1)} takes the trick`, cls: 'loss' }
        : { text: 'Dead heat: no point', cls: 'tie' }
    : { text: match.phase === 'call' ? `${leader.name} calls the stat` : 'Cards are set', cls: '' };
  const busyNote = ui.busy ? 'The Regent is thinking…' : '';
  const hint = match.phase === 'call'
    ? match.mode === 'local' ? `${leader.name}, call a stat` : (match.leader === 0 ? 'Call one of the five stats' : 'The Regent calls the stat…')
    : match.phase === 'commit'
      ? match.mode === 'local'
        ? `${actor.name}, choose a card`
        : (match.committed[0] ? 'The Regent chooses…' : 'Choose a card, then commit')
      : busyNote || 'Revealing…';
  root.innerHTML = `
    <header class="hud">
      <div class="score-panel left">
        <span class="crest">${icon('star')}</span>
        <div><div class="who">${esc(you.name)}<small>${esc(match.deck.name)}</small></div>${scorePips(you.score, match.target, '')}</div>
        <div class="score-num">${you.score}</div>
      </div>
      <div class="trick-center">
        <div class="eyebrow">Trick ${match.trick}</div>
        <div class="target">First to ${match.target}</div>
        <div class="streak">${you.run ? `${you.name} &times;${you.run} streak` : rival.run ? `${rival.name} &times;${rival.run} streak` : ''}</div>
      </div>
      <div class="score-panel right">
        <span class="crest">${emblem(match.deck.emblem)}</span>
        <div><div class="who">${esc(rival.name)}<small>${match.mode === 'solo' ? esc(match.difficulty) + ' bot' : 'second duelist'}</small></div>${scorePips(rival.score, match.target, 'right')}</div>
        <div class="score-num">${rival.score}</div>
      </div>
    </header>
    <div class="call-bar">
      <span class="call-label">Call the stat</span>
      <div class="stat-chips">${statChips(match, ui)}</div>
      <span class="call-hint">${hint.includes('call') ? '' : ''}</span>
    </div>
    <div class="duel">
      <div class="duel-side">
        <span class="side-label">${esc(you.name)}</span>
        <div class="slot">${slotHtml(match, 0, ui)}</div>
      </div>
      <div class="duel-center">
        <div class="vs">VS</div>
        ${compareHtml(match)}
        <div class="trick-result ${trickLine.cls}">${esc(trickLine.text)}</div>
      </div>
      <div class="duel-side">
        <span class="side-label">${esc(rival.name)}</span>
        <div class="slot">${slotHtml(match, 1, ui)}</div>
      </div>
    </div>
    <div class="chronicle"><span class="chr-label">Chronicle</span><span class="chr-text">${esc(last)}</span></div>
    <div class="hand-area ${match.mode === 'local' ? 'local' : ''}">
      <div class="hand-meta">
        <div class="eyebrow">${match.mode === 'local' ? 'Duelists&rsquo; hands' : 'Your hand'}</div>
        <div class="hand-note">${you.hand.length + rival.hand.length} cards at the table</div>
      </div>
      ${handHtml(match, 0, ui)}
      <div class="hand-controls">
        <div class="charge-row"><span>${esc(actor.name)} charges</span><span class="charge-pips">${[0, 1].map((i) => `<span class="charge-pip${i < actor.charges ? '' : ' spent'}">${icon('bolt')}</span>`).join('')}</span></div>
        <button class="toggle ${ui.chargeArmed ? 'on' : ''}" data-action="toggle-charge" ${actor.charges > 0 && match.phase === 'commit' && ui.selectedCard ? '' : 'disabled'}>${ui.chargeArmed ? 'Charge armed +15%' : 'Arm a charge +15%'}</button>
        <div class="hand-cta">
          <button class="btn primary small" data-action="commit" ${ui.selectedCard && match.phase === 'commit' && match.committed[ui.committer ?? 0] === null && !ui.busy ? '' : 'disabled'}>Commit card</button>
          <span class="hint">${esc(hint)}</span>
        </div>
        <div class="scout-row">
          <span>Scout</span>
          <button class="toggle" data-action="scout" ${match.mode === 'solo' && !you.scouted && match.phase !== 'over' ? '' : 'disabled'}>${you.scouted ? 'Used' : 'Peek his hand'}</button>
        </div>
      </div>
      ${handHtml(match, 1, ui)}
    </div>`;
}

/* ---------------- packs ---------------- */

export function renderPack(root, ui) {
  const { collection, opened } = ui;
  root.innerHTML = `
    <div class="masthead" style="width:min(900px,92vw)"><hr class="rule"><div class="eyebrow">Atlas booster</div><hr class="rule"></div>
    <div class="pack-stage">
      ${opened
        ? `<div class="pack-cards">${opened.cards.map(({ deck, card }) => cardHtml(deck, card, {})).join('')}</div>`
        : `<div class="pack-visual" data-action="open-pack" role="button" tabindex="0" aria-label="Open booster pack">
            <span class="seal">${icon('star')}</span>
            <span class="pack-title">Atlas</span>
            <span class="pack-sub">Booster &middot; two cards</span>
            <span class="pack-sub" style="margin-top:10px;color:var(--brass)">Click to break the seal</span>
          </div>`}
    </div>
    ${opened
      ? `<div class="pack-note">${opened.cards.length ? opened.cards.map(({ deck, card }) => `${esc(deck.short)} &middot; ${esc(card.name)}`).join('  &nbsp;|&nbsp;  ') : 'The atlas is complete.'}${opened.shards ? ` &nbsp;+${opened.shards} shards` : ''}</div>`
      : `<div class="pack-note">${collection.packs} sealed pack${collection.packs === 1 ? '' : 's'} in your satchel</div>`}
    <div class="btn-row">
      ${opened && collection.packs > 0 ? `<button class="btn primary" data-action="open-pack">Open another</button>` : ''}
      <button class="btn" data-action="title">Back to title</button>
      <button class="btn ghost" data-action="collection">Collection</button>
    </div>`;
}

/* ---------------- collection ---------------- */

export function renderCollection(root, collection) {
  root.innerHTML = `
    <div class="collection-head">
      <div>
        <div class="eyebrow">Your field atlas</div>
        <div class="collection-title">The Collection</div>
      </div>
      <div class="btn-row">
        <span class="pack-pill">Packs <b>${collection.packs}</b></span>
        <span class="pack-pill">Wins <b>${collection.wins}</b></span>
        <button class="btn small" data-action="packs" ${collection.packs ? '' : 'disabled'}>Open a pack</button>
        <button class="btn small ghost" data-action="title">Back</button>
      </div>
    </div>
    ${DECK_LIST.map((deck) => {
      const progress = deckProgress(collection, deck);
      return `<section class="deck-section">
        <div class="deck-section-head">
          <h3><span style="color:${deck.accent}">${emblem(deck.emblem)}</span> ${esc(deck.name)}</h3>
          <span>${progress.owned}/${progress.total} catalogued &middot; ${esc(deck.tagline)}</span>
        </div>
        <div class="collection-row">
          ${deck.cards.map((card) => miniCardHtml(deck, card, !collection.unlocked[deck.id]?.includes(card.id))).join('')}
        </div>
      </section>`;
    }).join('')}
    <p class="fine" style="color:var(--muted);font-size:10px;letter-spacing:.08em;margin:2px 0 0">Win duels to earn packs. Each pack adds two random cards from any deck to your atlas. All cards are playable in every mode.</p>`;
}

/* ---------------- result ---------------- */

export function renderResult(root, match, reward) {
  const won = match.winner === 0;
  root.innerHTML = `
    <div class="result-panel">
      <div class="result-kicker">${won ? 'The atlas is yours' : 'The atlas closes'}</div>
      <div class="result-title ${won ? 'win' : 'loss'}">${won ? 'Victory' : 'Defeat'}</div>
      <div class="result-score">${match.players[0].score} &ndash; ${match.players[1].score}</div>
      <div class="result-stats">
        <div class="result-stat"><b>${match.trick}</b><span>Tricks</span></div>
        <div class="result-stat"><b>${match.players[0].bestStreak}</b><span>Best streak</span></div>
        <div class="result-stat"><b>${won ? 'Won' : 'Lost'}</b><span>${esc(match.deck.short)}</span></div>
      </div>
      <div class="result-pack">${reward === 1 ? 'You earned 1 booster pack' : `You earned ${reward} booster packs`}</div>
      <div class="btn-row">
        <button class="btn primary" data-action="rematch">Duel again</button>
        <button class="btn" data-action="packs">Open packs</button>
        <button class="btn ghost" data-action="title">Title</button>
      </div>
    </div>`;
  root.hidden = false;
}

/* ---------------- modals ---------------- */

export function renderCardModal(deck, card, credit) {
  return `
    <h2>${esc(card.name)}</h2>
    <p class="fine" style="font-family:var(--serif);font-style:italic">${esc(card.latin)} &middot; ${esc(deck.name)}</p>
    <div style="display:grid;grid-template-columns:220px 1fr;gap:22px;margin-top:16px;align-items:start">
      ${cardHtml(deck, card, {})}
      <div>
        <ul style="list-style:none;padding:0;margin:0;display:grid;grid-template-columns:1fr 1fr;gap:6px 16px">
          ${deck.stats.map((stat) => `<li style="display:flex;justify-content:space-between;border-bottom:1px dotted rgba(242,228,200,.14);padding:5px 0;font-size:12px"><span style="color:var(--muted);text-transform:uppercase;letter-spacing:.1em;font-size:9px">${esc(stat.label)}</span><b>${formatStat(stat, card.stats[stat.key])}</b></li>`).join('')}
        </ul>
        <p style="margin-top:14px">${esc(card.fact)}</p>
        <p class="fine">Source: <a href="https://en.wikipedia.org/wiki/${esc(card.source)}" target="_blank" rel="noreferrer">en.wikipedia.org/wiki/${esc(card.source.replace(/_/g, ' '))}</a></p>
        ${credit ? `<p class="fine">Photo: ${esc(credit.artist)} &middot; ${esc(credit.license)} &middot; Wikimedia Commons</p>` : ''}
      </div>
    </div>`;
}

export function renderHelp() {
  return `
    <h2>How to duel</h2>
    <p>Apex Atlas is a card duel of real-world facts. You and your rival each hold three cards from the same deck; the first to <b>7 points</b> wins.</p>
    <ol>
      <li><b>Call the stat.</b> The leader chooses one of the deck's five stats &mdash; mass, height, moons, whatever the deck offers.</li>
      <li><b>Commit a card.</b> Both duelists choose a card in secret. The card with the higher value in the called stat takes the trick and one point.</li>
      <li><b>Burn a charge.</b> Each duelist has two charges. Arm one before you commit for +15% to the called stat &mdash; a bluff or a rescue.</li>
      <li><b>Ride momentum.</b> Three tricks in a row earns a bonus point. A dead heat scores nothing and keeps the call.</li>
      <li><b>Scout once.</b> In solo play, spend your one scouting run to see the Regent's hand for a trick.</li>
    </ol>
    <p><b>Local 2P:</b> pass the mouse. Both hands are open; each duelist chooses in turn before the reveal.</p>
    <p><b>Packs:</b> every duel earns a booster pack, and a win earns two. Each pack adds two random cards from any deck to your collection.</p>
    <p class="fine">All numbers are whole-number approximations drawn from the linked Wikipedia articles; the game is a work of playful comparison, not a scientific database.</p>`;
}

export function renderSources() {
  return `
    <h2>Sources &amp; credits</h2>
    <p>Card facts and figures follow English Wikipedia. Photographs and planet images are free-licensed works from Wikimedia Commons; each is credited below.</p>
    <div class="credits-grid">
      ${CREDITS.map((credit) => `<div><span>${esc(credit.title)}</span><span>${esc(credit.artist)} &middot; ${esc(credit.license)}</span></div>`).join('')}
    </div>
    <h3>Licences</h3>
    <p class="fine">Public domain and CC0 images are used as-is. CC BY, CC BY 2.0 and CC BY-SA images are credited above and linked from each card&rsquo;s detail panel. Wikipedia text is paraphrased; the game links every card to its source article. Apex Atlas itself is MIT licensed.</p>
    <h3>Built for</h3>
    <p class="fine">make.fun&rsquo;s &ldquo;Make the best card game&rdquo; bounty. Engine, rules, art direction and code written for this entry; no game engine or third-party library is bundled.</p>`;
}
