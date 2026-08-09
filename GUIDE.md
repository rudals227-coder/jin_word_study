# 아이 단어공부 앱 — 개발 가이드 (바이브 코딩용)

> 이 문서는 **스택·구조·배포**(확정 수준)와 **단어 공부 기능**(비교용 초안)을 정리한 기획/설계 노트다.
> 기존 게임 프로젝트(Jin Game World)의 방식을 그대로 이 앱에 맞게 옮겼다.
> "무엇을 왜 만드는지"의 기준 문서이며, 실제 실행/구조 요약은 [README.md](README.md), 코딩 규약은 [CLAUDE.md](CLAUDE.md) 참고.

---

## 0. 기본 철학 (게임 프로젝트에서 그대로 가져오는 것)
- **백엔드 없는 순수 클라이언트 정적 앱**. 서버는 파일(HTML/JS/CSS)만 전달, 로직은 전부 브라우저에서.
- **PC에서 개발 → 아이패드 Safari에서 URL 접속으로 사용**.
- **화면을 독립 모듈로 만들어 레지스트리에 등록**하면 홈에 자동 노출.
- **모델(순수 로직) / 뷰(렌더+입력) 분리** → 단위 테스트 쉬움.

## 1. 개발 스택
| 영역 | 선택 | 비고 |
|---|---|---|
| 언어 | 바닐라 JS (ES 모듈) + HTML + CSS | 프레임워크 없음(게임 프로젝트와 동일 철학) |
| 빌드/개발서버 | **Vite** | HMR, 코드 스플리팅, `base:'./'`로 서브경로 배포 |
| UI | **DOM + CSS 중심** | 단어 앱은 텍스트/카드 위주 → Canvas는 **선택적**(그림카드·애니메이션·미니게임에만) |
| 저장 | **localStorage** | 진행상황·즐겨찾기·설정. 단어 데이터는 정적 JS |
| 효과음 | **Web Audio API (합성)** | 정답/오답음을 코드로 생성. 음원 파일·CDN 없음. (발음 TTS는 도입했다가 제거) |
| 이미지/아이콘 | **이모지 / 인라인 SVG / 번들 에셋** | 외부 CDN 금지(오프라인·정적 배포 안전) |
| 대상 | 아이패드 Safari | 터치·큰 글씨·큰 버튼 |

> 게임 프로젝트와의 차이: **Canvas 의존도가 낮음**. 대신 **localStorage(진도)**의 비중이 큼. 나머지 뼈대는 동일하게 재사용.

## 2. 아키텍처
- **단일 페이지 + 해시 라우팅** (`#/` 홈, `#/quiz/<id>` 퀴즈). 서버 설정 없이 정적 URL, 어느 경로든 새로고침 안전.
- **화면 모듈 계약** (게임의 `mount/unmount` 그대로):
  ```js
  export function mount(container, params) {
    // container 안에 화면 구성 + 시작
    return function unmount() { /* 타이머·이벤트·DOM 정리 */ };
  }
  ```
- **레지스트리**: `src/screens/registry.js` 한 곳에서 학습 화면을 동적 import.
- **공용 유틸(`src/engine/`)**: `storage.js`(localStorage), `sound.js`(효과음), `dom.js`(헬퍼).
- **순수 모델(`src/model/`)**: 진행상황·채점·간격반복(SRS) 계산은 DOM을 모르는 순수 함수로.

## 3. 데이터 모델 (예시)
```js
// 단어 하나 (src/data/decks.js)
{ id:'apple', word:'apple', meaning:'사과', emoji:'🍎' }

// 덱(주제 묶음)
{ id:'fruits', title:'과일', emoji:'🍎', accent:'#ff6b6b', words:[...] }

// 진행상황(localStorage, 덱별) — src/model/progress.js
{ [wordId]: { c: 맞힌_횟수, w: 틀린_횟수 } }   // c >= MASTER_AT 이면 풀에서 빠짐

// 설정(localStorage): 글자크기, 사운드 on/off  (※ 아직 미구현, 향후)
```

## 4. 아이 대상 UX 규약 (게임 iPad 규약 + 확장)
- viewport 줌 차단, `overscroll-behavior:none`, `safe-area` 여백 — 게임 프로젝트 그대로.
- **큰 터치 타깃(최소 60px+)·큰 글씨·강한 색 대비**.
- **즉각 피드백**: 소리 + 애니메이션 + 별/스티커 보상.
- **읽기 전 아동 대응**: 그림·아이콘·음성 위주, 텍스트 최소.
- **부모 영역**(설정·진도)은 간단한 잠금으로 살짝 감춤. (향후)

## 5. 개발 워크플로 (명령어)
```
npm install                 # 의존성 설치(Vite)
npm run dev                 # 개발 서버(HMR)
npm run dev -- --host       # 아이패드 테스트: 출력된 Network URL을 같은 와이파이 아이패드 Safari로
npm run build               # dist/ 정적 빌드
npm run preview             # 빌드 결과 로컬 확인
```

## 6. 배포 (GitHub Pages)
- `.github/workflows/deploy.yml`: **main에 push하면 자동 빌드 → GitHub Pages 배포**.
- `vite.config.js`의 `base: './'` → 서브경로(`/저장소명/`)에서도 자산 경로 유지.
- 흐름:
  1. GitHub에 새 저장소 생성(예: `jin_word_study`).
  2. `git remote add origin <url>` → `git push -u origin main`.
  3. 저장소 Settings → Pages → Source를 **GitHub Actions**로.
  4. 이후 `git push` 때마다 자동 재배포 → `https://<아이디>.github.io/<저장소>/`.
- 대안 호스팅: Netlify / Vercel / Cloudflare Pages (git 연동 또는 `dist/` 업로드).

## 7. 새 화면/덱 추가 절차
- **새 덱**: `src/data/decks.js`의 `DECKS`에 객체 하나 추가 → 홈에 자동 노출.
- **새 학습 화면(퀴즈 등)**:
  1. `src/screens/<id>/index.js` — `mount/unmount` 구현.
  2. `src/screens/registry.js`에 등록.
  3. 라우터(`src/router.js`)에 경로 추가.
  4. 내부는 모델/뷰 분리 유지.

## 8. 폴더 구조
```
src/
  main.js               # 부트 + 라우터 시작 (+ iPad 줌 방지)
  router.js             # 해시 라우터(mount/unmount 전환)
  styles.css
  home/home.js          # 홈(덱 카드 그리드)
  screens/
    registry.js
    quiz/index.js       # 4지선다 퀴즈(채점·효과음·진행저장)
  data/decks.js         # 단어 데이터(정적)
  model/progress.js     # 학습 진행상황(순수)
  engine/
    storage.js sound.js dom.js
```

---

## 9. 단어 공부 기능 — 초안 (⚠️ 비교용, 재정의 예정)

> 아래는 방향 잡기용 아이디어 모음이다. 실제 기능은 사용자가 직접 정의한 내용으로 교체한다.
> 현재 구현된 학습 화면은 **4지선다 퀴즈 1개**다. (플래시카드는 만들었다가 제거 — 자기신고 버튼이 퀴즈 점수를 그대로 올려버려 채점 모델과 충돌했다.)

- **퀴즈 모드**: 4지선다 뜻 고르기. ← *현재 구현됨*. 추가 후보: 단어 고르기(한→영), **그림 매칭**, 받아쓰기.
- **간격 반복(SRS)**: 틀린 단어는 자주, 맞힌 단어는 뜸하게 → `dueAt` 재계산해 오늘 복습할 단어만 출제.
- **진도·보상**: 스티커/별, **연속 학습(streak)**, 덱 완주율, 오늘의 목표.
- **부모 대시보드**: 학습 단어 수, 취약 단어 목록, 학습 시간.
- **접근성/설정**: 글자 크기, 사운드 on/off.

### 아직 결정 안 된 것 (정하면 이 문서에 반영)
- [ ] 대상 연령: 읽기 전(그림·음성 위주) vs 읽기 가능(글자·철자 위주)
- [ ] 학습 언어 방향: 영어→한국어 / 한국어→영어 / 그림→단어
- [ ] 퀴즈 유형 우선순위, SRS 도입 여부
- [ ] 보상 체계(스티커/별/레벨)
- [ ] 단어 데이터 규모·주제(덱) 목록
