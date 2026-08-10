// 틀린 단어 노트 — 부모와 함께 보는 화면.
//   [목록] 틀린 단어를 한눈에 훑어본다. 많이 틀린 것부터. 뜻·예문·🔊 를 그대로 보여준다.
//   [재도전] 그 단어들로 4지선다를 다시 푼다. **맞힌 단어만 목록에서 빠진다.**
//     '알았어요' 같은 자기신고로 지우지 않는다 — 실제로 맞혀야 지워진다.
//     맞히면 clearWrong 으로 틀린 기록(w)을 지우고, 채점 결과는 그대로 진행상황에 남는다.
// 계약: mount(container, { deckId }) → unmount().  deckId 는 레벨 번호 문자열.
import { el, clear, button } from '../../engine/dom.js';
import { getDecks, getLevel } from '../../data/decks.js';
import { wrongWords, clearWrong, recordAnswer } from '../../model/progress.js';
import { makeChoices } from '../../model/quiz.js';
import { playCorrect, playWrong } from '../../engine/sound.js';
import { speak, cancel as cancelSpeech, supported as canSpeak } from '../../engine/speech.js';

export function mount(container, { deckId } = {}) {
  const level = Number(deckId) || 1;
  const lv = getLevel(level);
  const decks = getDecks(level);
  if (!lv || !decks.length) { location.hash = '#/'; return () => {}; }

  let timer = null;

  const screen = el('div', 'screen notes');
  const topbar = el('div', 'fc-topbar');
  const back = button('← 홈', () => { location.hash = `#/level/${level}`; });
  const counter = el('div', 'fc-counter');
  const title = el('div', 'fc-title', `📕 틀린 단어 · ${lv.title}`);
  topbar.append(back, title, counter);
  const body = el('div', 'notes-body');
  screen.append(topbar, body);
  container.appendChild(screen);

  showList();

  // ---------- 목록 ----------
  function showList() {
    cancelSpeech();
    clear(body);
    const items = wrongWords(decks);
    counter.textContent = `${items.length}개`;

    if (items.length === 0) {
      body.append(emptyBox('✨', '틀린 단어가 없어요', '한 번도 안 틀렸거나, 재도전으로 다 지웠어요.'));
      return;
    }

    const actions = el('div', 'notes-actions');
    actions.append(
      el('div', 'notes-hint', '많이 틀린 단어가 위에 있어요. 함께 읽어보세요.'),
      button('🔁 재도전', () => showRetry(items), 'notes-retry')
    );

    const list = el('div', 'notes-list');
    for (const it of items) list.append(noteRow(it));
    body.append(actions, list);
  }

  // ---------- 재도전 ----------
  function showRetry(items) {
    cancelSpeech();
    clear(body);

    const pool = items.slice();   // 시작 시점 고정. 한 바퀴 돈다.
    let i = 0;
    let cleared = 0;
    let locked = false;

    const bar = el('div', 'fc-bar');
    const barFill = el('span');
    bar.append(barFill);

    const stage = el('div', 'qz-stage');
    const qWord = el('div', 'qz-word');
    const qExample = el('div', 'qz-example');
    const say = button('🔊', () => speak(pool[i] && pool[i].word.example), 'qz-say');
    say.setAttribute('aria-label', '예문 읽어주기');
    const exampleRow = el('div', 'qz-example-row');
    exampleRow.append(say, qExample);
    if (!canSpeak()) say.hidden = true;
    const qMark = el('div', 'qz-mark');
    stage.append(qWord, exampleRow, qMark);

    const grid = el('div', 'qz-choices');
    body.append(bar, el('div', 'qz-space-top'), stage, grid, el('div', 'qz-space-bottom'));
    ask();

    function ask() {
      locked = false;
      cancelSpeech();
      clear(grid);
      qMark.textContent = '';
      qMark.className = 'qz-mark';

      const { deck, word } = pool[i];
      counter.textContent = `${i + 1} / ${pool.length}`;
      barFill.style.width = `${(i / pool.length) * 100}%`;

      qWord.textContent = word.word;
      qExample.textContent = word.example || '';
      exampleRow.hidden = !word.example;

      makeChoices(word, deck, decks).forEach((meaning, n) => {
        const b = el('button', 'qz-choice');
        b.dataset.meaning = meaning;
        b.append(el('span', 'qz-num', String(n + 1)), el('span', 'qz-label', meaning));
        b.addEventListener('click', () => answer(meaning));
        grid.append(b);
      });
    }

    function answer(picked) {
      if (locked) return;
      locked = true;
      const { deck, word } = pool[i];
      const ok = picked === word.meaning;

      // 채점은 평소대로 기록하고, 맞힌 경우에만 틀린 목록에서 뺀다.
      recordAnswer(deck.id, word.id, ok);
      if (ok) { clearWrong(deck.id, word.id); cleared++; }
      (ok ? playCorrect : playWrong)();

      for (const b of grid.children) {
        if (b.dataset.meaning === picked) b.classList.add(ok ? 'correct' : 'wrong');
      }
      qMark.textContent = ok ? '⭕ 정답' : '❌ 아니에요';
      qMark.classList.add(ok ? 'ok' : 'no');

      timer = setTimeout(() => {
        i += 1;
        if (i >= pool.length) finish();
        else ask();
      }, ok ? 900 : 1100);
    }

    function finish() {
      cancelSpeech();
      clear(body);
      counter.textContent = `${pool.length - cleared}개`;
      const left = pool.length - cleared;
      const box = emptyBox(
        cleared > 0 ? '🎉' : '💪',
        `${cleared}개를 지웠어요`,
        left === 0 ? '틀린 단어가 모두 없어졌어요!' : `${left}개가 남았어요. 다시 도전할 수 있어요.`
      );
      box.append(
        button('📕 목록 보기', showList, 'notes-retry'),
        button('🏠 홈으로', () => { location.hash = `#/level/${level}`; }, 'notes-retry ghost')
      );
      body.append(box);
    }
  }

  function noteRow({ deck, word, wrong }) {
    const row = el('div', 'note-row');
    row.style.setProperty('--accent', deck.accent);

    const head = el('div', 'note-head');
    head.append(
      el('div', 'note-word', word.word),
      el('div', 'note-meaning', word.meaning),
      el('div', 'note-count', `${wrong}번`)
    );
    row.append(el('div', 'note-theme', `${deck.emoji} ${deck.title}`), head);

    if (word.example) {
      const exRow = el('div', 'note-example-row');
      if (canSpeak()) {
        const s = button('🔊', () => speak(word.example), 'note-say');
        s.setAttribute('aria-label', '예문 읽어주기');
        exRow.append(s);
      }
      exRow.append(el('div', 'note-example', word.example));
      row.append(exRow);
    }
    return row;
  }

  return function unmount() {
    if (timer) clearTimeout(timer);
    cancelSpeech();
    clear(container);
  };
}

function emptyBox(emoji, title, sub) {
  const box = el('div', 'notes-empty');
  box.append(
    el('div', 'notes-empty-emoji', emoji),
    el('div', 'notes-empty-title', title),
    el('div', 'notes-empty-sub', sub)
  );
  return box;
}
