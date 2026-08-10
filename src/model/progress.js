// 학습 진행상황 — 순수 로직(뷰를 모름). localStorage에 덱별로 단어 상태를 저장.
//   저장 형태: { [wordId]: { c: 연속 정답 수, w: 틀린 횟수 } }
//   c >= MASTER_AT 이면 '알아요' → 문제 풀에서 빠진다.
import { load, save } from '../engine/storage.js';

// 몇 번 맞히면 '알아요'로 넘길지. 1이면 한 번에 통과.
// 틀리면 0으로 리셋되므로 이 값을 올리면 그만큼 연속으로 맞혀야 한다.
export const MASTER_AT = 1;

const key = (deckId) => 'progress:' + deckId;

// 구버전 형식('known'|'learning' 문자열)으로 저장된 값도 읽을 수 있게 정규화.
//   s = 뜻을 소개 카드로 본 적 있음(레벨 2 학습 흐름에서 쓴다).
//   맞히거나 틀린 적이 있으면 어차피 본 것이므로 s 를 세워 옛 기록도 자연스럽게 맞춘다.
function normalize(raw) {
  const out = {};
  for (const [id, v] of Object.entries(raw || {})) {
    if (typeof v === 'string') out[id] = { c: v === 'known' ? MASTER_AT : 0, w: 0, s: 1 };
    else if (v && typeof v === 'object') {
      const c = v.c | 0, w = v.w | 0;
      out[id] = { c, w, s: (v.s | 0) || c || w ? 1 : 0 };
    }
  }
  return out;
}

export function getProgress(deckId) {
  return normalize(load(key(deckId), {}));
}

// 퀴즈 채점 결과. 맞으면 +1, 틀리면 0으로 되돌려 다시 풀로 보낸다.
export function recordAnswer(deckId, wordId, correct) {
  const p = getProgress(deckId);
  const cur = p[wordId] || { c: 0, w: 0 };
  p[wordId] = correct ? { c: cur.c + 1, w: cur.w } : { c: 0, w: cur.w + 1 };
  save(key(deckId), p);
  return p;
}

// 백업 복원용 — 통째로 덮어쓴다. normalize 를 거치므로 손상된 값은 걸러진다.
export function setProgress(deckId, raw) {
  save(key(deckId), normalize(raw));
  return getProgress(deckId);
}

// 소개 카드로 뜻을 보여줬다고 기록. 점수(c)는 건드리지 않는다 — 점수는 채점으로만 오른다.
export function markSeen(deckId, wordId) {
  const p = getProgress(deckId);
  const cur = p[wordId] || { c: 0, w: 0, s: 0 };
  p[wordId] = { c: cur.c, w: cur.w, s: 1 };
  save(key(deckId), p);
  return p;
}

export function hasSeen(progress, wordId) {
  const v = progress && progress[wordId];
  if (typeof v === 'string') return true;
  return !!(v && ((v.s | 0) || (v.c | 0) || (v.w | 0)));
}

export function isMastered(progress, wordId) {
  const v = progress && progress[wordId];
  if (typeof v === 'string') return v === 'known'; // 정규화 안 된 구버전 값이 들어와도 안전하게
  return ((v && v.c) | 0) >= MASTER_AT;
}

export function resetDeck(deckId) {
  save(key(deckId), {});
}

// 한 번이라도 틀린 단어를 모은다(오답 노트용).
// 지금 맞히는지와 무관하게 w > 0 이면 담고, 많이 틀린 것부터 정렬한다.
export function wrongWords(decks) {
  const out = [];
  for (const d of decks) {
    const p = getProgress(d.id);
    for (const w of d.words) {
      const n = ((p[w.id] && p[w.id].w) | 0);
      if (n > 0) out.push({ deck: d, word: w, wrong: n });
    }
  }
  return out.sort((a, b) => b.wrong - a.wrong);
}

// 그 레벨의 단어를 전부 맞혔는가.
export function isLevelDone(decks) {
  return decks.length > 0 && decks.every((d) => countKnown(d.id, d.words) === d.words.length);
}

// 덱에서 통과한 단어 수.
export function countKnown(deckId, words) {
  const p = getProgress(deckId);
  return words.reduce((n, w) => n + (isMastered(p, w.id) ? 1 : 0), 0);
}
