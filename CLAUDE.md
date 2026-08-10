# CLAUDE.md

이 파일은 Claude Code(claude.ai/code)가 이 저장소에서 작업할 때 참고하는 안내서다.

## What this is

아이를 위한 **단어공부 웹앱**. 바닐라 JS + HTML + CSS, 빌드는 Vite. PC에서 개발하고 실제 사용은 **아이패드 Safari에서 URL 접속**으로 한다. 백엔드 없음 — 전부 클라이언트 사이드 정적 앱이며, 호스팅은 정적 파일만 서빙한다. (자매 프로젝트 `Jin_game_world`와 동일한 스택/배포 방식을 따른다.)

기획/설계 배경과 단어 기능 아이디어는 [GUIDE.md](GUIDE.md), 실행/구조 요약은 [README.md](README.md) 참고.

## Commands

- `npm install` — 의존성 설치 (Vite만)
- `npm run dev` — 개발 서버 (HMR)
- `npm run dev -- --host` — **아이패드 테스트용**. 출력된 Network URL(`http://<PC-LAN-IP>:5173`)을 같은 와이파이의 아이패드 Safari로 접속. Windows 방화벽에서 Node의 사설망 접근 허용 필요.
- `npm run build` — `dist/`에 정적 빌드
- `npm run preview` — 빌드 결과 로컬 확인
- 배포: `main`에 push하면 `.github/workflows/deploy.yml`이 자동 빌드→GitHub Pages 배포. `vite.config.js`의 `base: './'` 덕분에 서브경로에서도 자산 경로가 유지된다.

테스트 러너는 아직 없음. 순수 모델(`model/*.js`)은 DOM에 의존하지 않아 Node로 단위 테스트를 붙이기 쉽다.

## Architecture

**단일 페이지 + 해시 라우팅.** 서버 설정 없이 정적 URL로 동작하도록 history API 대신 해시를 쓴다. 어떤 경로에서 새로고침해도 안전.
- `#/` → 홈 (`src/home/home.js`) — 덱(주제) 카드 그리드
- `#/quiz/<id>` → 해당 테마의 4지선다 퀴즈
- `#/notes/<n>` → 그 레벨의 틀린 단어 노트(부모용, 레벨 완료 후 열림)
- `#/level/<n>` → 홈을 그 레벨로. 레벨은 URL 에 둔다 — 새로고침에 안전하고,
  퀴즈를 마치고 `← 홈` 을 눌렀을 때 원래 레벨로 복귀해야 하기 때문.

라우터(`src/router.js`)는 화면 전환 시 **이전 화면의 unmount를 반드시 호출**해 이벤트·DOM을 정리한다. 학습 화면 로드는 동적 import라 코드 스플리팅된다.

### 화면 모듈 계약 (가장 중요)

모든 학습 화면은 `src/screens/<id>/index.js`에서 이 인터페이스를 export한다:

```js
export function mount(container, params) {
  // container 안에 DOM 생성 + 화면 시작. params 예: { deckId }
  return function unmount() {
    // 타이머·이벤트 해제, DOM 제거
  };
}
```

이 계약만 지키면 화면끼리 서로 몰라도 되고, 라우터가 균일하게 다룬다. (홈은 `mountHome(container)` → unmount 반환.)

### 모델 / 뷰 분리 (원칙)

- **모델(순수)**: `src/model/` — `progress.js`(진행상황), `quiz.js`(보기 생성·출제), `backup.js`(백업/복원). DOM을 모른다. 단위 테스트 용이.
- **데이터(정적)**: `src/data/decks.js` — 단어/덱 데이터. `{ id, word, meaning, emoji }` + 덱 `{ id, title, emoji, accent, words[] }`.
- **뷰**: `src/home/`, `src/screens/*` — 위 모델/데이터를 DOM 렌더 + 입력으로 연결.

### 공용 유틸 (`src/engine/`) — 재사용 헬퍼, 프레임워크 아님

- `dom.js` — `el(tag,cls,text)`, `clear(node)`, `button(label,onClick,cls)`.
- `storage.js` — `load(key,fallback)` / `save(key,value)`. `jws:` 네임스페이스로 localStorage 저장.
- `file.js` — `saveTextFile(name,text)` / `pickTextFile()`. iOS는 `<a download>`가 막히는 경우가 있어
  **공유 시트(Web Share)를 먼저 쓰고 다운로드로 폴백**한다.
- `speech.js` — `speak(text,{lang,rate})` / `cancel()` / `supported()`. 브라우저 내장 Web Speech(TTS).
  **iOS는 사용자 제스처(탭) 후에만 소리가 난다** → 버튼 핸들러 안에서 부를 것.
  다음 문제로 넘어가거나 화면을 떠날 때 `cancel()` 필수.
- `sound.js` — `playCorrect()` / `playWrong()`. 음원 파일 없이 Web Audio API로 효과음을 합성한다. `AudioContext`는 하나만 만들어 재사용. **iOS는 사용자 제스처(탭) 후에만 소리가 난다** → 버튼 핸들러 안에서 부를 것.

### 참조 구현: 퀴즈 (`src/screens/quiz/`)

`index.js` 한 파일. 단어(+예문)를 크게 보여주고 뜻을 4지선다로 고르게 한다. 정답이면 `⭕`+효과음, 오답이면 `❌ 아니에요`만 띄우고 **정답은 알려주지 않는다**(그 단어는 풀에 남아 다시 나온다). 채점 결과는 `model/progress.js`에 누적되고, 풀을 다 비우면 복습 모드로 전환된다. **문제에는 이모지를 띄우지 않는다 — 답이 그대로 새어나간다.** **새 학습 화면을 만들 때 이 구조를 참고.**

### 레벨 2 학습 흐름 (레벨 1 과 다름)

레벨 2 는 처음 보는 단어가 대부분이라 바로 문제를 내면 **배울 방법이 없다**(찍고 틀리고 끝).
그래서 `quiz/index.js` 가 `deck.level >= 2` 일 때만 다음 흐름을 쓴다:

1. 안 본 단어를 **5개씩**(`INTRO_BATCH`) 소개 카드로 먼저 보여준다 — 단어·뜻·예문·🔊
2. 그 5개만 문제로 낸다(소개 안 한 단어는 안 나온다)
3. 틀리면 정답을 알려주지 않고 풀에 남긴다(레벨 1 과 동일). 대신 **틀린 기록이 쌓인다**
4. 덱의 단어를 전부 맞히면 완료 화면. 레벨 전체가 끝나면 '레벨 완료'
5. 레벨을 다 풀면 홈의 **📕 틀린 단어** 가 열린다 — 자물쇠를 푼 부모가 아이와 함께 보는
   읽기 전용 노트(`screens/notes/`). 많이 틀린 단어부터 뜻·예문과 함께 보여준다.

**소개 카드는 점수를 올리지 않는다.** 점수가 오르는 경로는 여전히 채점 하나뿐이다
(예전 플래시카드의 자기신고 버튼이 점수를 부풀렸던 문제를 반복하지 않기 위함).
진행상황의 `s` 필드가 '소개했음'을 기록한다. 옛 기록은 `c`나 `w`가 있으면 본 것으로 간주한다.

### 새 것 추가 절차

- **새 덱(단어 묶음)**: `src/data/decks.js`의 `DECKS` 배열에 객체 하나 추가 → 홈 카드 자동 생성. (뷰/라우터 수정 불필요)
  - **★ 덱 id 는 레벨을 통틀어 유일해야 한다.** 진행상황 저장 키(`jws:progress:<덱id>`)와
    백업 파일의 키가 곧 덱 id 다. 레벨 2 에서 `fruits` 를 재사용하면 레벨 1 기록과 뒤섞인다.
    레벨 1 은 기존 id 유지, **레벨 2 이상은 `l2-` 접두사**(`l2-fruits`). `idPrefix(level)` 참고.
    이 규칙만 지키면 `model/backup.js`·`model/progress.js` 는 손댈 필요가 없다.
  - 새 레벨을 열려면 `LEVELS` 에서 그 레벨의 `ready` 를 `true` 로 바꾼다. `false` 면 홈이 'coming soon' 만 띄운다.
- **새 학습 화면(퀴즈 등)**:
  1. `src/screens/<id>/index.js` 생성 — `mount/unmount` 계약 구현.
  2. `src/screens/registry.js`에 `{ <id>: { load: () => import('./<id>/index.js') } }` 추가.
  3. 필요하면 `src/router.js`에 경로(`#/<id>/...`) 추가.
  4. 모델/뷰 분리를 지킬 것.

## iPad Safari 규약 (전 화면 공통)

- `index.html` viewport 메타로 핀치/더블탭 줌 차단, `viewport-fit=cover`로 노치 영역 활용.
- `main.js`에서 Safari 제스처/더블탭/멀티터치 확대를 JS로 추가 차단.
- body는 `overscroll-behavior: none`(당겨서 새로고침/바운스 방지). `styles.css`에 정의됨.
- **페이지는 절대 스크롤되지 않는다.** `html, body { height:100%; overflow:hidden }` 이고 모든 화면이 한 화면에 들어가야 한다.
  스크롤이 생기면 iOS 주소창이 접혔다 펴지면서 뷰포트 높이가 바뀌어 **화면이 커졌다 작아지는 현상**이 생긴다.
  같은 이유로 `dvh`/`vh` 단위로 높이를 잡지 말고 `height:100%` 를 쓴다.
- 크기는 `clamp(최소, N vh, 최대)` 로 잡아 화면이 짧아지면 알아서 줄어들게 한다. 새 화면도 이 방식을 따를 것.
- **아이 대상**이므로 큰 터치 타깃(60px+)·큰 글씨·강한 색 대비·즉각 피드백을 기본으로.
- 레이아웃은 `safe-area-inset` 여백을 반영.

## 작업 관례

- Bash 명령 실행 전, 그 명령이 무엇을 왜 하는지 한국어로 짧게 설명한다. (전역 `~/.claude/CLAUDE.md`에도 기록됨)
- 커밋/푸시는 사용자가 요청할 때만.
