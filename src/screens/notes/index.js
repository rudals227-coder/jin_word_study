// 틀린 단어 노트 — 부모와 함께 한 단어씩 공부하고 목록에서 지우는 화면.
//   흐름: 단어만 보여줌 → [뜻 보기] → 뜻·예문 공개 → [아직 몰라요] / [알았어요]
//   '알았어요' 는 틀린 기록(w)만 지운다. 맞힌 횟수(c)는 건드리지 않는다 —
//   점수가 오르는 경로는 퀴즈 채점 하나뿐이라는 원칙을 여기서도 지킨다.
//   많이 틀린 단어부터 나온다.
// 계약: mount(container, { deckId }) → unmount().  deckId 는 레벨 번호 문자열.
import { el, clear, button } from '../../engine/dom.js';
import { getDecks, getLevel } from '../../data/decks.js';
import { wrongWords, clearWrong } from '../../model/progress.js';
import { speak, cancel as cancelSpeech, supported as canSpeak } from '../../engine/speech.js';

export function mount(container, { deckId } = {}) {
  const level = Number(deckId) || 1;
  const lv = getLevel(level);
  const decks = getDecks(level);
  if (!lv || !decks.length) { location.hash = '#/'; return () => {}; }

  const items = wrongWords(decks);   // 들어온 시점에 고정. 지워도 목록이 흔들리지 않게.
  let i = 0;
  let removed = 0;

  const screen = el('div', 'screen notes');

  const topbar = el('div', 'fc-topbar');
  const back = button('← 홈', () => { location.hash = `#/level/${level}`; });
  const counter = el('div', 'fc-counter');
  topbar.append(back, el('div', 'fc-title', `📕 틀린 단어 · ${lv.title}`), counter);

  const bar = el('div', 'fc-bar');
  const barFill = el('span');
  bar.append(barFill);
  screen.append(topbar, bar);

  if (items.length === 0) {
    counter.textContent = '0개';
    screen.append(emptyBox('✨', '틀린 단어가 없어요', '한 번도 안 틀리고 다 맞혔네요.'));
    container.appendChild(screen);
    return () => clear(container);
  }

  // ---- 카드 ----
  const card = el('div', 'note-card');
  const theme = el('div', 'note-card-theme');
  const word = el('div', 'note-card-word');
  const count = el('div', 'note-card-count');
  const meaning = el('div', 'note-card-meaning');
  const example = el('div', 'note-card-example');
  const say = button('🔊', () => speak(items[i] && items[i].word.example), 'note-say');
  say.setAttribute('aria-label', '예문 읽어주기');
  const exampleRow = el('div', 'note-card-example-row');
  exampleRow.append(say, example);
  if (!canSpeak()) say.hidden = true;

  const revealBtn = button('뜻 보기', reveal, 'note-btn primary');
  const keepBtn = button('아직 몰라요', () => advance(false), 'note-btn');
  const doneBtn = button('알았어요 ✓', () => advance(true), 'note-btn ok');
  const answerRow = el('div', 'note-btn-row');
  answerRow.append(keepBtn, doneBtn);

  card.append(theme, word, count, meaning, exampleRow, revealBtn, answerRow);

  const spaceTop = el('div', 'qz-space-top');
  const spaceBottom = el('div', 'qz-space-bottom');
  screen.append(spaceTop, card, spaceBottom);
  container.appendChild(screen);
  render();

  function render() {
    const it = items[i];
    theme.textContent = `${it.deck.emoji} ${it.deck.title}`;
    word.textContent = it.word.word;
    count.textContent = `${it.wrong}번 틀렸어요`;
    meaning.textContent = it.word.meaning;
    example.textContent = it.word.example || '';
    card.style.setProperty('--accent', it.deck.accent);

    // 처음엔 뜻을 감춘다 — 아이가 먼저 떠올려 보게.
    meaning.hidden = true;
    exampleRow.hidden = true;
    revealBtn.hidden = false;
    answerRow.hidden = true;

    counter.textContent = `${i + 1} / ${items.length}`;
    barFill.style.width = `${(i / items.length) * 100}%`;
  }

  function reveal() {
    cancelSpeech();
    meaning.hidden = false;
    exampleRow.hidden = !items[i].word.example;
    revealBtn.hidden = true;
    answerRow.hidden = false;
  }

  function advance(known) {
    cancelSpeech();
    const it = items[i];
    if (known) { clearWrong(it.deck.id, it.word.id); removed++; }
    i += 1;
    if (i >= items.length) { finish(); return; }
    render();
  }

  function finish() {
    barFill.style.width = '100%';
    counter.textContent = `${items.length}개`;
    card.remove();
    spaceTop.remove();
    spaceBottom.remove();
    const left = items.length - removed;
    screen.append(emptyBox(
      '🎉',
      '다 봤어요!',
      left === 0
        ? `${removed}개를 모두 지웠어요. 목록이 비었습니다.`
        : `${removed}개를 지웠어요. ${left}개는 다음에 다시 볼게요.`
    ));
  }

  return function unmount() {
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
