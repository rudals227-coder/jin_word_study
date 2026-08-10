// 4지선다 퀴즈 — 단어(+예문)를 보고 뜻을 고른다.
//   deckId 가 랜덤 id 면 그 레벨 전체 단어를 한 풀로 낸다. 채점은 각 단어의 원래 테마
//   (w.deckId)에 기록해 진행률이 두 번 세어지지 않게 한다.
//
// 레벨 1: 바로 문제부터. 틀려도 정답을 알려주지 않는다(그 단어는 풀에 남아 다시 나온다).
// 레벨 2: 처음 보는 단어가 대부분이라 "첫 만남이 곧 시험"이 되면 배울 방법이 없다. 그래서
//   ① 안 본 단어를 5개씩 소개 카드로 먼저 보여주고  ② 그 5개를 문제로 내고
//   ③ 틀리면 정답 카드를 다시 띄운 뒤 풀에 남기고  ④ 덱을 다 맞히면 완료 화면.
//   소개 카드는 점수를 올리지 않는다 — 점수가 오르는 경로는 여전히 채점 하나뿐.
// 계약: mount(container, { deckId }) → unmount().
import { el, clear, button } from '../../engine/dom.js';
import { getDecks, randomDeckFor, levelOfRandomId, allWords, getDeck } from '../../data/decks.js';
import { makeChoices, pickNext, pickReview } from '../../model/quiz.js';
import { getProgress, recordAnswer, markSeen, isMastered, hasSeen } from '../../model/progress.js';
import { playCorrect, playWrong } from '../../engine/sound.js';
import { speak, cancel as cancelSpeech, supported as canSpeak } from '../../engine/speech.js';

const INTRO_BATCH = 5;   // 한 번에 소개하는 새 단어 수. 더 늘리면 앞에서 본 걸 잊는다.
const INTRO_FROM_LEVEL = 2;

// 랜덤이면 그 레벨 전체 단어, 아니면 해당 테마. 어느 쪽이든 소속 테마 id(deckId)를 붙여 둔다.
function buildDeck(id) {
  const randomLevel = levelOfRandomId(id);
  if (randomLevel !== null) {
    return { ...randomDeckFor(randomLevel), words: allWords(randomLevel) };
  }
  const d = getDeck(id);
  return d ? { ...d, words: d.words.map((w) => ({ ...w, deckId: d.id })) } : null;
}

// 같은 레벨 테마들의 진행상황을 한 번에 읽어 둔다(단어마다 localStorage를 읽으면 느리다).
function readProgress(level) {
  const m = {};
  for (const d of getDecks(level)) m[d.id] = getProgress(d.id);
  return m;
}

export function mount(container, { deckId } = {}) {
  const deck = buildDeck(deckId);
  if (!deck) { location.hash = '#/'; return () => {}; }

  const words = deck.words;
  const useIntro = deck.level >= INTRO_FROM_LEVEL;
  const recent = [];       // 최근에 낸 단어 id
  let current = null;
  let locked = false;      // 채점 중 중복 탭 방지
  let review = false;      // 레벨 1: 풀을 다 비운 뒤 복습 모드
  let introQueue = [];     // 아직 보여주지 않은 소개 카드
  let timer = null;

  const screen = el('div', 'screen quiz');
  screen.style.setProperty('--accent', deck.accent);

  // 상단바 — 원래 있던 레벨로 돌아간다. '#/' 로 보내면 항상 레벨 1 로 떨어진다.
  const topbar = el('div', 'fc-topbar');
  const back = button('← 홈', () => { location.hash = `#/level/${deck.level}`; });
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
  const sayBtn = button('🔊', () => speak(current && current.example), 'qz-say');
  sayBtn.setAttribute('aria-label', '예문 읽어주기');
  const exampleRow = el('div', 'qz-example-row');
  exampleRow.append(sayBtn, qExample);
  if (!canSpeak()) sayBtn.hidden = true;
  const qMark = el('div', 'qz-mark');
  stage.append(qWord, exampleRow, qMark);

  const grid = el('div', 'qz-choices');

  // 소개 카드 — 뜻까지 다 보여준다. 문제가 아니라 '가르치는' 화면.
  const card = el('div', 'qz-card hidden');
  const cardTag = el('div', 'qz-card-tag');
  const cardWord = el('div', 'qz-card-word');
  const cardMeaning = el('div', 'qz-card-meaning');
  const cardExample = el('div', 'qz-card-example');
  const cardSay = button('🔊', () => speak(current && current.example), 'qz-say');
  cardSay.setAttribute('aria-label', '예문 읽어주기');
  const cardExampleRow = el('div', 'qz-example-row');
  cardExampleRow.append(cardSay, cardExample);
  if (!canSpeak()) cardSay.hidden = true;
  const cardNext = button('알겠어요', () => { cancelSpeech(); afterCard(); }, 'qz-card-btn');
  card.append(cardTag, cardWord, cardMeaning, cardExampleRow, cardNext);

  const done = el('div', 'qz-done hidden');

  // 위/아래 빈 공간의 비율은 CSS 가 정한다(아래를 더 크게 → 덩어리가 위로 올라온다).
  screen.append(topbar, bar, badge, el('div', 'qz-space-top'), stage, card, grid, el('div', 'qz-space-bottom'), done);
  container.appendChild(screen);
  next();

  // ---- 화면 전환 ----
  function showQuizUI() {
    card.classList.add('hidden');
    stage.hidden = false;
    grid.hidden = false;
  }
  function showCardUI() {
    card.classList.remove('hidden');
    stage.hidden = true;
    grid.hidden = true;
  }

  // 소개 카드 / 오답 후 정답 카드. tag 로 둘을 구분한다.
  function showCard(w, tag) {
    current = w;
    cardTag.textContent = tag;
    cardWord.textContent = w.word;
    cardMeaning.textContent = w.meaning;
    cardExample.textContent = w.example || '';
    cardExampleRow.hidden = !w.example;
    showCardUI();
  }

  // 소개 카드에서 '알겠어요' 를 눌렀을 때
  function afterCard() {
    if (introQueue.length) {
      const w = introQueue.shift();
      markSeen(w.deckId, w.id);
      showCard(w, '새 단어');
      return;
    }
    next();
  }

  function next() {
    locked = false;
    cancelSpeech();   // 앞 문제를 읽던 중이면 끊는다
    clear(grid);
    qMark.textContent = '';
    qMark.className = 'qz-mark';

    const progress = readProgress(deck.level);
    const isDone = (w) => isMastered(progress[w.deckId], w.id);

    let pool = words;
    if (useIntro && !review) {
      const seenLeft = words.filter((w) => hasSeen(progress[w.deckId], w.id) && !isDone(w));
      if (seenLeft.length === 0) {
        const unseen = words.filter((w) => !hasSeen(progress[w.deckId], w.id));
        if (unseen.length === 0) { showDone(); return; }
        // 새 묶음을 소개하고 나서 그 단어들을 문제로 낸다.
        introQueue = unseen.slice(0, INTRO_BATCH);
        const first = introQueue.shift();
        markSeen(first.deckId, first.id);
        showCard(first, '새 단어');
        renderProgress(progress);
        return;
      }
      pool = seenLeft;
    }

    let w = review ? pickReview(words, recent) : pickNext(pool, isDone, recent);
    if (!w) {
      if (useIntro) { showDone(); return; }
      review = true;                       // 레벨 1: 다 맞혔다 → 복습 모드
      badge.classList.remove('hidden');
      w = pickReview(words, recent);
    }
    current = w;
    recent.push(w.id);

    qWord.textContent = w.word;
    qExample.textContent = w.example || '';
    exampleRow.hidden = !w.example;
    showQuizUI();

    // 보기는 그 단어의 원래 테마에서 먼저 뽑는다 — 랜덤 모드에서도 난이도가 유지된다.
    const origin = getDeck(w.deckId) || deck;
    makeChoices(w, origin, getDecks(deck.level)).forEach((meaning, i) => {
      const b = el('button', 'qz-choice');
      // 번호가 버튼 안에 들어가므로 정답 비교는 textContent 가 아니라 이 값으로 한다.
      b.dataset.meaning = meaning;
      b.append(el('span', 'qz-num', String(i + 1)), el('span', 'qz-label', meaning));
      b.addEventListener('click', () => answer(meaning));
      grid.append(b);
    });
    renderProgress(progress);
  }

  function answer(picked) {
    if (locked) return;
    locked = true;
    const ok = picked === current.meaning;
    recordAnswer(current.deckId, current.id, ok);
    (ok ? playCorrect : playWrong)();   // 탭 핸들러 안이라 iOS에서도 소리가 난다

    for (const b of grid.children) {
      if (b.dataset.meaning === picked) b.classList.add(ok ? 'correct' : 'wrong');
    }
    qMark.textContent = ok ? '⭕ 정답' : '❌ 아니에요';
    qMark.classList.add(ok ? 'ok' : 'no');
    renderProgress();

    // 틀려도 정답을 알려주지 않는다. 그 단어는 풀에 남아 다시 나오고,
    // 레벨을 다 푼 뒤 '틀린 단어' 노트에서 부모와 함께 본다.
    timer = setTimeout(next, ok ? 900 : 1100);
  }

  function renderProgress(progress) {
    const p = progress || readProgress(deck.level);
    const known = words.reduce((n, w) => n + (isMastered(p[w.deckId], w.id) ? 1 : 0), 0);
    counter.textContent = `${known} / ${words.length}`;
    barFill.style.width = `${(known / words.length) * 100}%`;
  }

  // 덱의 단어를 전부 맞혔을 때. 그 레벨 전체가 끝났으면 레벨 완료로 알린다.
  function showDone() {
    showQuizUI();
    stage.hidden = true;
    grid.hidden = true;

    const levelDecks = getDecks(deck.level);
    const levelLeft = levelDecks.reduce((n, d) => {
      const p = getProgress(d.id);
      return n + d.words.filter((w) => !isMastered(p, w.id)).length;
    }, 0);
    const levelDone = levelLeft === 0;

    clear(done);
    const box = el('div', 'qz-done-card');
    box.append(
      el('div', 'qz-done-emoji', levelDone ? '🏆' : '🎉'),
      el('div', 'qz-done-title', levelDone ? `레벨 ${deck.level} 완료!` : `${deck.title} 완료!`),
      el('div', 'qz-done-sub', levelDone
        ? '이 레벨의 단어를 모두 맞혔어요.'
        : `${words.length}개를 모두 맞혔어요. 남은 단어 ${levelLeft}개.`)
    );
    box.append(
      button('🔁 다시 복습', () => {
        review = true;
        badge.classList.remove('hidden');
        done.classList.add('hidden');
        next();
      }, 'qz-done-btn'),
      button('🏠 홈으로', () => { location.hash = `#/level/${deck.level}`; }, 'qz-done-btn primary')
    );
    done.append(box);
    done.classList.remove('hidden');
  }

  return function unmount() {
    if (timer) clearTimeout(timer);
    cancelSpeech();   // 화면을 떠나도 계속 읽는 것 방지
    clear(container);
  };
}
