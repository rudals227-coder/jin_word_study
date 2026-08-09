// 홈 — 제목 옆 레벨 전환(1~5) + 테마 카드 그리드 + 랜덤 카드, 하단에 백업/복원.
// 아직 단어가 없는 레벨(ready:false)은 카드 대신 'coming soon' 만 보여준다.
// 계약: mountHome(container, { level }) → unmount().
import { el, clear, button } from '../engine/dom.js';
import { LEVELS, getLevel, getDecks, randomDeckFor } from '../data/decks.js';
import { countKnown } from '../model/progress.js';
import { buildBackup, parseBackup, countBackup, applyBackup } from '../model/backup.js';
import { saveTextFile, pickTextFile } from '../engine/file.js';

const LOCK_AFTER = 20000; // 자물쇠를 풀어둔 채 두면 아이가 눌러버린다 → 자동 재잠금(ms)

export function mountHome(container, { level = 1 } = {}) {
  const lv = getLevel(level) || LEVELS[0];
  const decks = getDecks(lv.n);

  const home = el('div', 'home');

  let knownAll = 0;
  let totalAll = 0;
  for (const d of decks) {
    knownAll += countKnown(d.id, d.words);
    totalAll += d.words.length;
  }

  // ---- 헤더: 제목 + 레벨 버튼 ... 알아요 배지 ----
  const levelRow = el('div', 'level-row');
  for (const item of LEVELS) {
    const b = button(item.title, () => { location.hash = `#/level/${item.n}`; }, 'level-btn');
    if (item.n === lv.n) b.classList.add('active');
    if (!item.ready) b.classList.add('soon');
    levelRow.append(b);
  }

  const title = el('div', 'home-title');
  title.append(el('div', 'brand', '📚 진 단어공부'), levelRow);

  const header = el('div', 'home-header');
  header.append(title);

  // 준비 안 된 레벨에서 '0 알아요'를 띄우면 다 잊은 것처럼 보인다 → 배지를 감춘다.
  if (lv.ready) {
    const badge = el('div', 'know-badge');
    badge.append(
      el('div', 'know-num', String(knownAll)),
      el('div', 'know-label', '알아요')
    );

    // 숫자만으로는 얼마나 왔는지 감이 안 온다 → 원형 게이지로 채워진 정도를 같이 보여준다.
    // 내림으로 계산한다. 반올림하면 473/474 가 100% 로 보여 다 끝낸 줄 안다.
    const pct = totalAll ? Math.floor((knownAll / totalAll) * 100) : 0;
    const ring = el('div', 'pct-badge');
    ring.style.setProperty('--p', String(pct));
    ring.setAttribute('aria-label', `전체 ${totalAll}개 중 ${pct}% 완료`);
    ring.append(el('div', 'pct-num', `${pct}%`));

    const stats = el('div', 'home-stats');
    stats.append(badge, ring);
    header.append(stats);
  }
  home.append(header);

  // ---- 본문: 카드 그리드 또는 coming soon ----
  if (lv.ready) {
    const grid = el('div', 'deck-grid');
    for (const deck of decks) {
      grid.append(deckCard(deck, countKnown(deck.id, deck.words), deck.words.length));
    }
    // 랜덤은 별도 단어 목록이 아니라 그 레벨 전체를 섞은 것 → 합계를 그대로 쓴다.
    const random = deckCard(randomDeckFor(lv.n), knownAll, totalAll);
    random.classList.add('random');
    grid.append(random);
    home.append(grid);
  } else {
    const soon = el('div', 'coming-soon');
    soon.append(
      el('div', 'soon-emoji', '🚧'),
      el('div', 'soon-title', 'coming soon'),
      el('div', 'soon-sub', `${lv.title} 단어는 아직 준비 중이에요.`)
    );
    home.append(soon);
  }

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

  // 백업은 레벨과 무관하게 전체 기록을 담는다(덱 id 가 전역 유일하므로 그대로 된다).
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

    const { applied } = applyBackup(data);
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

function deckCard(deck, known, total) {
  const card = el('button', 'deck-card');
  card.style.setProperty('--accent', deck.accent);
  card.innerHTML =
    `<div class="deck-emoji">${deck.emoji}</div>` +
    `<div class="deck-title">${deck.title}</div>` +
    `<div class="deck-meta">${known}/${total} 알아요</div>` +
    `<div class="deck-bar"><span style="width:${total ? (known / total) * 100 : 0}%"></span></div>`;
  card.addEventListener('click', () => { location.hash = `#/quiz/${deck.id}`; });
  return card;
}
