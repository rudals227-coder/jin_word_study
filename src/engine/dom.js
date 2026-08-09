// 작은 DOM 헬퍼 — 프레임워크 없이 화면을 조립하기 위한 최소 도구.

export function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

// 버튼 생성 + 클릭 핸들러.
export function button(label, onClick, className = '') {
  const b = el('button', className);
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}
