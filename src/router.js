// 해시 기반 라우터 (게임 프로젝트와 동일한 방식).
//   #/            → 홈(테마 목록)
//   #/quiz/<id>   → 4지선다 퀴즈
// 화면 이탈 시 이전 화면의 unmount 를 호출해 타이머·이벤트·DOM 을 정리한다.
import { mountHome } from './home/home.js';
import { getScreen } from './screens/registry.js';
import { clear } from './engine/dom.js';

const SCREEN_BY_ROUTE = { quiz: 'quiz' };

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
    currentUnmount = mountHome(container);
  }

  function parseHash(hash) {
    const parts = (hash || '').replace(/^#/, '').split('/').filter(Boolean); // ['quiz','fruits']
    if (SCREEN_BY_ROUTE[parts[0]] && parts[1]) return { name: parts[0], id: parts[1] };
    return { name: 'home' };
  }

  window.addEventListener('hashchange', render);
  render();
}
