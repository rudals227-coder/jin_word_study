// 홈 — 테마 카드 그리드 + 맨 끝에 랜덤 카드, 하단에 백업/복원.
// 우상단 배지에 지금까지 알게 된 단어 수를 누적으로 보여준다.
// 계약: mountHome(container) → unmount().
import { el, clear, button } from '../engine/dom.js';
import { DECKS, RANDOM_DECK } from '../data/decks.js';
import { countKnown } from '../model/progress.js';
import { buildBackup, parseBackup, countBackup, applyBackup } from '../model/backup.js';
import { saveTextFile, pickTextFile } from '../engine/file.js';

const LOCK_AFTER = 20000; // 자물쇠를 풀어둔 채 두면 아이가 눌러버린다 → 자동 재잠금(ms)

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

  // ---- 백업/복원 (어른용) — 자물쇠를 풀어야 눌린다 ----
  const note = el('div', 'tool-note');
  const backupBtn = button('백업', onBackup, 'tool-btn');
  const restoreBtn = button('복원', onRestore, 'tool-btn');
  const lockBtn = button('🔒', toggleLock, 'lock-btn');
  let unlocked = false;
  let lockTimer = null;

  const tools = el('div', 'home-tools');
  tools.append(lockBtn, backupBtn, restoreBtn);
  home.append(tools, note);
  setLocked(true);

  container.appendChild(home);

  function setLocked(locked) {
    unlocked = !locked;
    lockBtn.textContent = locked ? '🔒' : '🔓';
    lockBtn.classList.toggle('unlocked', !locked);
    backupBtn.disabled = locked;
    restoreBtn.disabled = locked;
    if (lockTimer) { clearTimeout(lockTimer); lockTimer = null; }
    if (!locked) lockTimer = setTimeout(() => setLocked(true), LOCK_AFTER);
  }

  function toggleLock() {
    const willUnlock = !unlocked;
    setLocked(!willUnlock);
    say(willUnlock ? '잠금을 풀었어요. 20초 뒤 다시 잠깁니다.' : '');
  }

  async function onBackup() {
    if (!unlocked) return;
    const now = new Date();
    const data = buildBackup(now.toISOString());
    const n = countBackup(data);
    if (n === 0) { say('아직 저장할 기록이 없어요.'); return; }

    const name = `jin-word-study-${now.toISOString().slice(0, 10)}.json`;
    const text = JSON.stringify(data, null, 2);
    try {
      const how = await saveTextFile(name, text);
      if (how === 'cancel') return;
      say(`${n}개 기록을 ${name} 로 내보냈어요.`);
      setLocked(true);
    } catch {
      showRaw(text);  // 공유·다운로드 둘 다 막힌 환경
    }
  }

  async function onRestore() {
    if (!unlocked) return;
    let picked;
    try {
      picked = await pickTextFile();
    } catch {
      say('파일을 열 수 없어요.');
      return;
    }
    if (!picked) return;

    let data;
    try {
      data = parseBackup(picked.text);
    } catch (e) {
      say(e.message);
      return;
    }
    const n = countBackup(data);
    const when = String(data.savedAt || '').slice(0, 10);
    if (!confirm(`백업(${when})에 '알아요' ${n}개가 들어 있어요.\n지금 기록을 덮어씁니다. 계속할까요?`)) return;

    const { applied, skipped } = applyBackup(data);
    if (applied === 0) { say('복원할 테마가 없었어요.'); return; }
    // 카드·배지 숫자를 다시 그리려면 화면을 새로 그려야 한다.
    location.reload();
  }

  function say(msg) {
    clear(note);
    note.textContent = msg;
  }

  // 최후 수단 — 내용을 화면에 띄워 직접 복사하게 한다.
  function showRaw(text) {
    clear(note);
    note.append(el('div', null, '파일로 저장할 수 없는 환경이에요. 아래 내용을 복사해 두세요.'));
    const ta = el('textarea', 'raw-box');
    ta.value = text;
    ta.readOnly = true;
    note.append(ta);
    ta.focus();
    ta.select();
  }

  return function unmount() {
    if (lockTimer) clearTimeout(lockTimer);
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
