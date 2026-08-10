// 틀린 단어 노트 — 부모와 함께 보는 화면. 문제를 내지 않고 뜻과 예문을 그대로 보여준다.
//   레벨의 모든 단어를 맞힌 뒤에 홈에서 자물쇠를 풀고 들어온다.
//   많이 틀린 단어가 위로 온다. 점수는 전혀 건드리지 않는다(읽기 전용).
// 계약: mount(container, { deckId }) → unmount().  deckId 는 레벨 번호 문자열.
import { el, clear, button } from '../../engine/dom.js';
import { getDecks, getLevel } from '../../data/decks.js';
import { wrongWords } from '../../model/progress.js';
import { speak, cancel as cancelSpeech, supported as canSpeak } from '../../engine/speech.js';

export function mount(container, { deckId } = {}) {
  const level = Number(deckId) || 1;
  const lv = getLevel(level);
  const decks = getDecks(level);
  if (!lv || !decks.length) { location.hash = '#/'; return () => {}; }

  const items = wrongWords(decks);

  const screen = el('div', 'screen notes');

  const topbar = el('div', 'fc-topbar');
  const back = button('← 홈', () => { location.hash = `#/level/${level}`; });
  const counter = el('div', 'fc-counter', `${items.length}개`);
  topbar.append(back, el('div', 'fc-title', `📕 틀린 단어 · ${lv.title}`), counter);
  screen.append(topbar);

  if (items.length === 0) {
    const empty = el('div', 'notes-empty');
    empty.append(
      el('div', 'notes-empty-emoji', '✨'),
      el('div', 'notes-empty-title', '틀린 단어가 없어요'),
      el('div', 'notes-empty-sub', '한 번도 안 틀리고 다 맞혔네요.')
    );
    screen.append(empty);
  } else {
    const hint = el('div', 'notes-hint', '많이 틀린 단어가 위에 있어요. 함께 읽어보세요.');
    const list = el('div', 'notes-list');
    for (const { deck, word, wrong } of items) {
      list.append(noteRow(deck, word, wrong));
    }
    screen.append(hint, list);
  }

  container.appendChild(screen);

  return function unmount() {
    cancelSpeech();
    clear(container);
  };
}

function noteRow(deck, word, wrong) {
  const row = el('div', 'note-row');
  row.style.setProperty('--accent', deck.accent);

  const head = el('div', 'note-head');
  head.append(
    el('div', 'note-word', word.word),
    el('div', 'note-meaning', word.meaning),
    el('div', 'note-count', `${wrong}번 틀림`)
  );
  row.append(el('div', 'note-theme', `${deck.emoji} ${deck.title}`), head);

  if (word.example) {
    const exRow = el('div', 'note-example-row');
    if (canSpeak()) {
      const say = button('🔊', () => speak(word.example), 'note-say');
      say.setAttribute('aria-label', '예문 읽어주기');
      exRow.append(say);
    }
    exRow.append(el('div', 'note-example', word.example));
    row.append(exRow);
  }
  return row;
}
