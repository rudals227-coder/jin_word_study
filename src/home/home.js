// 홈 — 테마 카드 그리드 + 맨 끝에 랜덤 카드.
// 우상단 배지에 지금까지 알게 된 단어 수를 누적으로 보여준다.
// 계약: mountHome(container) → unmount().
import { el, clear } from '../engine/dom.js';
import { DECKS, RANDOM_DECK } from '../data/decks.js';
import { countKnown } from '../model/progress.js';

export function mountHome(container) {
  const home = el('div', 'home');

  let knownAll = 0;
  let totalAll = 0;
  for (const d of DECKS) {
    knownAll += countKnown(d.id, d.words);
    totalAll += d.words.length;
  }

  const title = el('div', 'home-title');
  title.append(el('div', 'brand', '📚 진 단어공부'));

  const badge = el('div', 'know-badge');
  badge.append(
    el('div', 'know-num', String(knownAll)),
    el('div', 'know-label', '알아요')
  );

  const header = el('div', 'home-header');
  header.append(title, badge);
  home.append(header);

  const grid = el('div', 'deck-grid');
  for (const deck of DECKS) {
    grid.append(
      deckCard(deck, countKnown(deck.id, deck.words), deck.words.length, `#/quiz/${deck.id}`)
    );
  }
  // 랜덤은 별도 단어 목록이 아니라 전체를 섞은 것 → 합계를 그대로 쓴다.
  const random = deckCard(RANDOM_DECK, knownAll, totalAll, `#/quiz/${RANDOM_DECK.id}`);
  random.classList.add('random');
  grid.append(random);

  home.append(grid);

  container.appendChild(home);
  return function unmount() {
    clear(container);
  };
}

function deckCard(deck, known, total, href) {
  const card = el('button', 'deck-card');
  card.style.setProperty('--accent', deck.accent);
  card.innerHTML =
    `<div class="deck-emoji">${deck.emoji}</div>` +
    `<div class="deck-title">${deck.title}</div>` +
    `<div class="deck-meta">${known}/${total} 알아요</div>` +
    `<div class="deck-bar"><span style="width:${total ? (known / total) * 100 : 0}%"></span></div>`;
  card.addEventListener('click', () => { location.hash = href; });
  return card;
}
