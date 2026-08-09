// localStorage 래퍼 — 진행상황·설정 저장(백엔드 없음). 네임스페이스로 다른 앱과 충돌 방지.

const NS = 'jws:'; // jin-word-study

export function load(key, fallback = null) {
  try {
    const v = localStorage.getItem(NS + key);
    return v == null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
  } catch {
    /* 사파리 프라이빗 모드 등에서 실패해도 앱은 계속 동작 */
  }
}
