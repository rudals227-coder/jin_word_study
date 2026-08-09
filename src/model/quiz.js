// 퀴즈 로직 — 순수 함수(DOM 모름). 보기 생성 + 다음 문제 선택.
// 진행상황을 직접 읽지 않고 isDone(word) 판단만 넘겨받는다.
// (랜덤 모드에서는 단어마다 소속 테마가 달라 진행상황이 한 덩어리가 아니기 때문)

// 틀린 단어를 바로 다음 문제로 내면 방금 본 답을 기억해서 맞힌다. 최소 이만큼 지난 뒤에.
const RECENT = 5;

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 4지선다 보기. 1순위는 같은 덱(주제가 같아야 진짜 구별 연습이 된다),
// 모자라면 다른 덱에서 채운다. 정답 위치도 매번 섞는다.
export function makeChoices(word, deck, allDecks, n = 4) {
  const same = deck.words.filter((w) => w.id !== word.id);
  const other = allDecks.filter((d) => d.id !== deck.id).flatMap((d) => d.words);
  const used = new Set([word.meaning]);
  const wrong = [];
  for (const w of [...shuffle(same), ...shuffle(other)]) {
    if (wrong.length >= n - 1) break;
    if (used.has(w.meaning)) continue;   // 뜻이 겹치는 보기 차단
    if (w.word === word.word) continue;  // 같은 철자 다른 뜻(orange 등) 차단
    used.add(w.meaning);
    wrong.push(w.meaning);
  }
  return shuffle([word.meaning, ...wrong]);
}

// 다음 문제 — 아직 통과 못한 단어 중에서, 최근에 낸 것은 피해서 고른다.
// 남은 게 없으면 null(= 풀을 다 비웠다).
export function pickNext(words, isDone, recentIds = []) {
  const left = words.filter((w) => !isDone(w));
  if (left.length === 0) return null;
  return pickAvoidingRecent(left, recentIds);
}

// 복습 모드 — 통과 여부와 상관없이 전체에서 고른다.
export function pickReview(words, recentIds = []) {
  return pickAvoidingRecent(words, recentIds);
}

function pickAvoidingRecent(pool, recentIds) {
  const recent = new Set(recentIds.slice(-RECENT));
  const fresh = pool.filter((w) => !recent.has(w.id));
  const from = fresh.length ? fresh : pool;
  return from[Math.floor(Math.random() * from.length)];
}
