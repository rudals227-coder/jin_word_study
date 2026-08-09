// 파일 저장/불러오기 — 아이패드 Safari 대응.
//   iOS는 <a download> 가 동작하지 않는 경우가 있다(특히 홈 화면에 추가한 전체화면 앱).
//   그래서 공유 시트(Web Share)를 먼저 쓰고, 안 되면 다운로드로 내려간다.
//   둘 다 실패하면 호출한 쪽이 화면에 내용을 띄워 복사하게 한다.

// 반환값: 'share' | 'download' | 'cancel'
export async function saveTextFile(filename, text, mime = 'application/json') {
  if (navigator.canShare) {
    try {
      const file = new File([text], filename, { type: mime });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
        return 'share';
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancel'; // 사용자가 공유 시트를 닫음
      // 그 외 실패는 아래 다운로드로 폴백
    }
  }

  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'download';
}

// 파일 선택. 고르지 않고 닫으면 영영 resolve 되지 않으므로,
// 다음 호출 때 이전 input 을 정리해 쌓이지 않게 한다.
let picker = null;

export function pickTextFile(accept = '.json,application/json') {
  if (picker) picker.remove();
  picker = document.createElement('input');
  picker.type = 'file';
  picker.accept = accept;
  picker.style.display = 'none';
  document.body.appendChild(picker);

  const input = picker;
  return new Promise((resolve) => {
    input.addEventListener('change', async () => {
      const f = input.files && input.files[0];
      resolve(f ? { name: f.name, text: await f.text() } : null);
    }, { once: true });
    input.click();
  });
}
