// 학습 진행상황 — 순수 로직(뷰를 모름). localStorage에 덱별로 단어 상태를 저장.
//   저장 형태: { [wordId]: { c: 연속 정답 수, w: 틀린 횟수 } }
//   c >= MASTER_AT 이면 '알아요' → 문제 풀에서 빠진다.
import { load, save } from '../engine/storage.js';

// 몇 번 맞히면 '알아요'로 넘길지. 1이면 한 번에 통과.
// 틀리면 0으로 리셋되므로 이 값을 올리면 그만큼 연속으로 맞혀야 한다.
export const MASTER_AT = 1;

const key = (deckId) => 'progress:' + deckId;

// 구버전 형식('known'|'learning' 문자열)으로 저장된 값도 읽을 수 있게 정규화.
function normalize(raw) {
  const out = {};
  for (const [id, v] of Object.entries(raw || {})) {
    if (typeof v === 'string') out[id] = { c: v === 'known' ? MASTER_AT : 0, w: 0 };
    else if (v && typeof v === 'object') out[id] = { c: v.c | 0, w: v.w | 0 };
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

export function isMastered(progress, wordId) {
  const v = progress && progress[wordId];
  if (typeof v === 'string') return v === 'known'; // 정규화 안 된 구버전 값이 들어와도 안전하게
  return ((v && v.c) | 0) >= MASTER_AT;
}

export function resetDeck(deckId) {
  save(key(deckId), {});
}

// 덱에서 통과한 단어 수.
export function countKnown(deckId, words) {
  const p = getProgress(deckId);
  return words.reduce((n, w) => n + (isMastered(p, w.id) ? 1 : 0), 0);
}
