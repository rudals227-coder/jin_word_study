// 해시 기반 라우터 (게임 프로젝트와 동일한 방식).
//   #/             → 홈 (레벨 1)
//   #/level/<n>    → 홈을 그 레벨로
//   #/quiz/<id>    → 4지선다 퀴즈
//   #/notes/<n>    → 그 레벨의 틀린 단어 노트(부모용)
// 레벨을 URL 에 두는 이유: 새로고침해도 안전하고, 퀴즈를 마치고 홈으로 돌아올 때
// 원래 레벨로 복귀해야 하기 때문. 메모리 상태로 두면 매번 레벨 1 로 떨어진다.
// 화면 이탈 시 이전 화면의 unmount 를 호출해 타이머·이벤트·DOM 을 정리한다.
import { mountHome } from './home/home.js';
import { getScreen } from './screens/registry.js';
import { clear } from './engine/dom.js';

const SCREEN_BY_ROUTE = { quiz: 'quiz', notes: 'notes' };

export function startRouter(container) {
  let currentUnmount = null;

  async function render() {
    if (currentUnmount) {
      try { currentUnmount(); } catch (e) { console.error('unmount 오류:', e); }
      currentUnmount = null;
    }
    clear(container);

    const route = parseHash(location.hash);
    const screenId = SCREEN_BY_ROUTE[route.name];
    if (screenId) {
      const mod = await getScreen(screenId).load();
      const now = parseHash(location.hash);
      if (now.name !== route.name || now.id !== route.id) return; // 로딩 중 이동했으면 취소
      currentUnmount = mod.mount(container, { deckId: route.id });
      return;
    }
    // 기본: 홈
    currentUnmount = mountHome(container, { level: route.level });
  }

  function parseHash(hash) {
    const parts = (hash || '').replace(/^#/, '').split('/').filter(Boolean); // ['quiz','fruits']
    if (SCREEN_BY_ROUTE[parts[0]] && parts[1]) return { name: parts[0], id: parts[1] };
    if (parts[0] === 'level' && parts[1]) {
      const n = Number(parts[1]);
      return { name: 'home', level: Number.isInteger(n) && n > 0 ? n : 1 };
    }
    return { name: 'home', level: 1 };
  }

  window.addEventListener('hashchange', render);
  render();
}
