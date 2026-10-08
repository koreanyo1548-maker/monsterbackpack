# 몬스터 백팩 — 작은 가방, 커다란 군단

가방 퍼즐 + 오토배틀러 모바일 웹 게임. 빌드 없이 `index.html`을 열면 실행됩니다(정적 서버 또는 `file://`).

## 구조
```
index.html            마크업과 스크립트 로드 순서
styles/main.css       전체 스타일
data/game-data.json   수치 테이블(원본). 수정 후 `node tools/build-data.mjs`
data/game-data.js     위 JSON을 <script>로 읽게 만든 생성물 (file://에서는 fetch가 막혀 있음)
scripts/
  battle-sim.js       전투 규칙(DOM·canvas 없음). 뷰는 battle.listener로 이벤트를 받음
  state.js            실행 상태, 저장/복원, 모달·토스트·효과음
  bag.js              가방·피스 배치, 오라, 무리 보너스
  encounter.js        적 스케일링, 조우, 매치업 조언
  codex.js            도감·메뉴·다음 전투 예고
  sprites.js          이미지 경로, 스티커 리그, <img> 헬퍼
  prepare.js          준비 화면(상점, 벤치, 보드, 변이·합성)
  battle.js           가방 → 전장 변환, 카메라, 시작/종료, 보상
  battle-view.js      canvas 그리기, 스티커 애니메이션, 이펙트(battleView), 프레임 루프
  main.js             입력, 모바일 맞춤, boot, 테스트용 window.MonsterBackpack
  sticker-renderer.js, archer-composer.js, mage-composer.js   스티커 파츠 합성
assets/               이미지와 스티커 파츠(제작 절차: assets/stickers/스티커_공용_설명서.md)
tools/                밸런스·회귀 검증과 스티커 빌드 스크립트
```
스크립트는 모듈이 아니라 일반 `<script>`라서 최상위 `const`/`let`/함수를 파일끼리 공유합니다. 로드 순서는 `index.html`을 따르세요.

## 도구 (Playwright 필요: `export NODE_PATH=$(npm root -g)`)
- `node tools/build-data.mjs [--check]` — JSON → JS 생성 / 동기화 검사
- `node tools/sim-regression.mjs [--seeds 6] [--hard N] [--headless] [--root DIR] [--out f.json]` — 12웨이브 × 시드를 헤드리스로 돌려 결과 digest 출력. 전투 코드를 건드리기 전후 출력을 비교하세요.
- `node tools/balance.mjs [--baseline] [--write]` — 웨이브별 `tune`을 맞춤. `--write`는 `data/game-data.json`을 갱신
