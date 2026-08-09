// 효과음 — 음원 파일 없이 Web Audio API로 그 자리에서 만들어 낸다.
//   외부 자산·CDN 없음(정적 배포 원칙), 번들 용량 증가 0.
//   iOS Safari는 사용자 제스처(탭) 이후에만 소리가 난다 → 버튼 핸들러 안에서 부를 것.
//   AudioContext는 하나만 만들어 재사용한다(화면마다 새로 만들면 iOS에서 금방 한도에 걸린다).

let ctx = null;

function context() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

export function supported() {
  return !!(window.AudioContext || window.webkitAudioContext);
}

// 짧은 음 하나. start/dur는 초 단위.
// gain을 0에서 딱 끊으면 '딱' 하는 잡음이 나므로 짧게 올렸다가 부드럽게 내린다.
function tone(ac, freq, start, dur, peak, type) {
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function play(notes) {
  const ac = context();
  if (!ac) return;
  if (ac.state === 'suspended') ac.resume(); // iOS는 첫 탭 전까지 정지 상태
  for (const n of notes) tone(ac, n.f, n.at, n.dur, n.peak, n.type);
}

// 정답 — 밝게 올라가는 도·미·솔.
export function playCorrect() {
  play([
    { f: 523.25, at: 0.00, dur: 0.12, peak: 0.16, type: 'sine' },
    { f: 659.25, at: 0.09, dur: 0.12, peak: 0.16, type: 'sine' },
    { f: 783.99, at: 0.18, dur: 0.24, peak: 0.18, type: 'sine' },
  ]);
}

// 오답 — 낮게 떨어지는 두 음. 아이가 겁먹지 않게 짧고 부드럽게.
export function playWrong() {
  play([
    { f: 311.13, at: 0.00, dur: 0.14, peak: 0.13, type: 'triangle' },
    { f: 233.08, at: 0.10, dur: 0.22, peak: 0.13, type: 'triangle' },
  ]);
}
