// 문장 읽어주기 — 브라우저 내장 Web Speech API(SpeechSynthesis). 음원 파일·서버 없음.
//   iOS Safari 는 사용자 제스처(탭) 이후에만 재생된다 → 버튼 핸들러 안에서 부를 것.
//   목소리는 기기에 설치된 것을 쓴다. iOS 설정 → 손쉬운 사용 → 음성 콘텐츠에서
//   고품질 영어 음성을 받아두면 앱 수정 없이 그대로 좋아진다.

let voices = [];

function refreshVoices() {
  voices = supported() ? window.speechSynthesis.getVoices() : [];
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  refreshVoices();
  // iOS 는 목소리 목록을 비동기로 채운다.
  window.speechSynthesis.onvoiceschanged = refreshVoices;
}

export function supported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

// 읽던 것을 끊는다. 다음 문제로 넘어가거나 화면을 떠날 때 반드시 호출.
export function cancel() {
  if (supported()) window.speechSynthesis.cancel();
}

// rate < 1 이면 천천히. 아이가 따라 듣기 좋게 기본값을 낮춰 뒀다.
export function speak(text, { lang = 'en-US', rate = 0.85 } = {}) {
  if (!supported() || !text) return;
  window.speechSynthesis.cancel(); // 겹쳐 읽지 않게 이전 것 정리

  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;

  if (!voices.length) refreshVoices();
  const base = lang.split('-')[0];
  const v = voices.find((x) => x.lang === lang) || voices.find((x) => x.lang.startsWith(base));
  if (v) u.voice = v;

  window.speechSynthesis.speak(u);
}
