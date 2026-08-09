import './styles.css';
import { startRouter } from './router.js';

// iOS Safari: 핀치/더블탭 확대 방지 (게임 프로젝트와 동일).
['gesturestart', 'gesturechange', 'gestureend'].forEach((ev) =>
  document.addEventListener(ev, (e) => e.preventDefault())
);
document.addEventListener(
  'touchmove',
  (e) => { if (e.touches.length > 1) e.preventDefault(); },
  { passive: false }
);
let lastTouchEnd = 0;
document.addEventListener(
  'touchend',
  (e) => {
    const now = Date.now();
    if (now - lastTouchEnd < 300) e.preventDefault();
    lastTouchEnd = now;
  },
  { passive: false }
);
document.addEventListener('dblclick', (e) => e.preventDefault());

startRouter(document.getElementById('app'));
