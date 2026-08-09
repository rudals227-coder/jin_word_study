# 진 단어공부 (Jin Word Study)

아이를 위한 단어공부 웹앱. 바닐라 JS + Vite, 백엔드 없는 정적 앱.
PC에서 개발하고 아이패드 Safari에서 URL 접속으로 사용한다. (Jin Game World와 동일한 스택/배포 방식)

## 명령어
- `npm install` — 의존성 설치(Vite)
- `npm run dev` — 개발 서버(HMR)
- `npm run dev -- --host` — 아이패드 테스트용. 출력된 Network URL을 같은 와이파이 아이패드 Safari로 접속
- `npm run build` — `dist/`에 정적 빌드
- `npm run preview` — 빌드 결과 로컬 확인

## 구조
- 단일 페이지 + 해시 라우팅 (`#/` 홈, `#/quiz/<id>` 퀴즈)
- 화면 모듈 계약: `mount(container, params) → unmount()`
- 모델(순수)/뷰 분리, `engine/`(storage·sound·dom) 공용 유틸
- 단어 데이터는 `src/data/decks.js`(정적), 진행상황은 localStorage
- 학습은 4지선다 퀴즈 하나. 정답/오답 효과음은 Web Audio로 합성(음원 파일 없음)

## 새 덱 추가
`src/data/decks.js`의 `DECKS` 배열에 객체 하나 추가 → 홈에 자동 노출.

## 새 학습 화면(퀴즈 등) 추가
1. `src/screens/<id>/index.js` — `mount/unmount` 구현
2. `src/screens/registry.js`에 등록
3. 라우터에 경로 추가

## 배포 (GitHub Pages)
`main`에 push하면 `.github/workflows/deploy.yml`이 자동 빌드→배포.
`vite.config.js`의 `base: './'` 덕분에 서브경로에서도 동작.
