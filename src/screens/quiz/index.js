// 4지선다 퀴즈 — 단어(+예문)를 보고 뜻을 고른다.
//   맞히면 문제 풀에서 빠지고, 틀리면 0으로 되돌아가 다시 나온다(정답은 알려주지 않는다).
//   풀을 다 비우면 복습 모드로 자동 전환된다.
//   deckId 가 'random' 이면 모든 테마의 단어를 한 풀로 합쳐 낸다. 이때 채점은
//   각 단어의 원래 테마(w.deckId)에 기록해 진행률이 두 번 세어지지 않게 한다.
// 계약: mount(container, { deckId }) → unmount().
import { el, clear, button } from '../../engine/dom.js';
import { DECKS, RANDOM_DECK, allWords, getDeck } from '../../data/decks.js';
import { makeChoices, pickNext, pickReview } from '../../model/quiz.js';
import { getProgress, recordAnswer, isMastered } from '../../model/progress.js';
import { playCorrect, playWrong } from '../../engine/sound.js';

// 랜덤이면 전체 단어, 아니면 해당 테마. 어느 쪽이든 단어에 소속 테마 id를 붙여 둔다.
function buildDeck(id) {
  if (id === RANDOM_DECK.id) return { ...RANDOM_DECK, words: allWords() };
  const d = getDeck(id);
  return d ? { ...d, words: d.words.map((w) => ({ ...w, deckId: d.id })) } : null;
}

// 테마별 진행상황을 한 번에 읽어 둔다(단어마다 localStorage를 읽으면 느리다).
function readProgress() {
  const m = {};
  for (const d of DECKS) m[d.id] = getProgress(d.id);
  return m;
}

export function mount(container, { deckId } = {}) {
  const deck = buildDeck(deckId);
  if (!deck) { location.hash = '#/'; return () => {}; }

  const words = deck.words;
  const recent = [];       // 최근에 낸 단어 id
  let current = null;
  let locked = false;      // 채점 중 중복 탭 방지
  let review = false;      // 풀을 다 비운 뒤 복습 모드
  let timer = null;

  const screen = el('div', 'screen quiz');
  screen.style.setProperty('--accent', deck.accent);

  // 상단바
  const topbar = el('div', 'fc-topbar');
  const back = button('← 홈', () => { location.hash = '#/'; });
  const counter = el('div', 'fc-counter');
  topbar.append(back, el('div', 'fc-title', `${deck.emoji} ${deck.title}`), counter);

  const bar = el('div', 'fc-bar');
  const barFill = el('span');
  bar.append(barFill);

  const badge = el('div', 'qz-badge hidden', '🔁 복습 모드');

  // 문제 — 이모지는 답을 그대로 알려주므로 여기선 보여주지 않는다.
  const stage = el('div', 'qz-stage');
  const qWord = el('div', 'qz-word');
  const qExample = el('div', 'qz-example');
  const qMark = el('div', 'qz-mark');
  stage.append(qWord, qExample, qMark);

  const grid = el('div', 'qz-choices');

  screen.append(topbar, bar, badge, stage, grid);
  container.appendChild(screen);
  next();

  function next() {
    locked = false;
    clear(grid);
    qMark.textContent = '';
    qMark.className = 'qz-mark';

    const progress = readProgress();
    const isDone = (w) => isMastered(progress[w.deckId], w.id);
    let w = review ? pickReview(words, recent) : pickNext(words, isDone, recent);
    if (!w) {                       // 다 맞혔다 → 복습 모드
      review = true;
      badge.classList.remove('hidden');
      w = pickReview(words, recent);
    }
    current = w;
    recent.push(w.id);

    qWord.textContent = w.word;
    qExample.textContent = w.example || '';
    qExample.hidden = !w.example;

    // 보기는 그 단어의 원래 테마에서 먼저 뽑는다 — 랜덤 모드에서도 난이도가 유지된다.
    const origin = getDeck(w.deckId) || deck;
    for (const meaning of makeChoices(w, origin, DECKS)) {
      grid.append(button(meaning, () => answer(meaning), 'qz-choice'));
    }
    renderProgress(progress);
  }

  function answer(picked) {
    if (locked) return;
    locked = true;
    const ok = picked === current.meaning;
    recordAnswer(current.deckId, current.id, ok);
    (ok ? playCorrect : playWrong)();   // 탭 핸들러 안이라 iOS에서도 소리가 난다

    // 틀려도 정답은 알려주지 않는다 — 그 단어는 풀에 남아 다시 나온다.
    // 고른 버튼만 표시하고, 나머지는 건드리지 않는다.
    for (const b of grid.children) {
      if (b.textContent === picked) b.classList.add(ok ? 'correct' : 'wrong');
    }
    qMark.textContent = ok ? '⭕' : '❌ 아니에요';
    qMark.classList.add(ok ? 'ok' : 'no');
    renderProgress();

    timer = setTimeout(next, ok ? 900 : 1100);
  }

  function renderProgress(progress) {
    const p = progress || readProgress();
    const known = words.reduce((n, w) => n + (isMastered(p[w.deckId], w.id) ? 1 : 0), 0);
    counter.textContent = `${known} / ${words.length}`;
    barFill.style.width = `${(known / words.length) * 100}%`;
  }

  return function unmount() {
    if (timer) clearTimeout(timer);
    clear(container);
  };
}
