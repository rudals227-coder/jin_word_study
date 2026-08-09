// 진행상황 백업/복원 — 순수 로직(DOM 모름). 파일 입출력은 engine/file.js 가 담당.
//   백업 파일 형식:
//   { format, version, savedAt, progress: { <덱id>: { <단어id>: {c,w} } } }
import { DECKS } from '../data/decks.js';
import { getProgress, setProgress, isMastered } from './progress.js';

const FORMAT = 'jin-word-study/progress';
const VERSION = 1;

// 기록이 있는 테마만 담는다(빈 테마까지 넣으면 파일만 커진다).
export function buildBackup(savedAt) {
  const progress = {};
  for (const d of DECKS) {
    const p = getProgress(d.id);
    if (Object.keys(p).length) progress[d.id] = p;
  }
  return { format: FORMAT, version: VERSION, savedAt, progress };
}

// 남이 만든 파일이나 손으로 고친 파일이 들어올 수 있으니 형식을 확인한다.
export function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('파일을 읽을 수 없어요. 백업 파일이 맞는지 확인해 주세요.');
  }
  if (!data || data.format !== FORMAT) throw new Error('이 앱의 백업 파일이 아니에요.');
  if (!data.progress || typeof data.progress !== 'object') throw new Error('백업 내용이 비어 있어요.');
  return data;
}

// 백업에 담긴 '알아요' 단어 수 — 덮어쓰기 전에 사용자에게 보여준다.
export function countBackup(data) {
  let n = 0;
  for (const p of Object.values(data.progress)) {
    if (!p || typeof p !== 'object') continue;
    for (const wordId of Object.keys(p)) if (isMastered(p, wordId)) n++;
  }
  return n;
}

// 지금 데이터에 없는 테마 id는 건너뛴다(테마 이름이 바뀐 옛 백업 대비).
export function applyBackup(data) {
  const known = new Set(DECKS.map((d) => d.id));
  let applied = 0;
  const skipped = [];
  for (const [deckId, p] of Object.entries(data.progress)) {
    if (!known.has(deckId)) { skipped.push(deckId); continue; }
    setProgress(deckId, p);
    applied++;
  }
  return { applied, skipped };
}
