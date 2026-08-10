// 화면 레지스트리 — 라우터가 동적 import로 화면 모듈을 불러온다(코드 스플리팅).
// 새 학습 화면을 추가하려면 여기에 항목 하나만 넣으면 된다.
//   각 모듈은 mount(container, params) → unmount() 를 export 해야 함.
const SCREENS = {
  quiz: { load: () => import('./quiz/index.js') },
  notes: { load: () => import('./notes/index.js') },
};

export function getScreen(id) {
  return SCREENS[id] || null;
}
