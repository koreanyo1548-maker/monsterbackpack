# 몬스터 백팩 — 작은 가방, 커다란 군단

가방 퍼즐 + 오토배틀러 모바일 웹 게임. 빌드 없이 `index.html`을 열면 실행됩니다(정적 서버 또는 `file://`).

## 구조
```
index.html            마크업과 스크립트 로드 순서
styles/main.css       전체 스타일
data/game-data.json   수치 테이블(원본). 수정 후 `node tools/build-data.mjs`
data/game-data.js     위 JSON을 <script>로 읽게 만든 생성물 (file://에서는 fetch가 막혀 있음)
scripts/
  battle-sim.js       전투 규칙과 전장 구성(DOM·canvas 없음). createBattle(setup)/step(battle, dt), 뷰는 battle.listener로 이벤트를 받음
  run-rules.js        준비 화면 규칙(DOM·저장소 없음): 배치·회전·이동, 상점, 변이·합성, 전투 후 정산, 보상. 모든 함수가 state를 인자로 받음
  state.js            실행 상태, 저장/복원(localStorage), 모달·토스트·효과음
  bag.js              현재 state에 run-rules를 적용하는 얇은 래퍼와 표시 텍스트
  encounter.js        적 스케일링, 조우, 매치업 조언
  codex.js            도감·메뉴·다음 전투 예고
  sprites.js          이미지 경로, 스티커 리그, <img> 헬퍼
  prepare.js          준비 화면(상점, 벤치, 보드, 변이·합성)
  battle.js           가방을 setup 데이터로 만들어 Sim.createBattle에 넘기고 뷰 필드를 붙임, 카메라, 시작/종료, 보상
  battle-fx.js        스킬·상태이상 연출(부활, 독 폭발, 일제 사격, 방벽, 광란 등, 뷰 전용)
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
- `node tools/sim-node.mjs [--wave 3] [--seed 1]` — 브라우저 없이 Node에서 시뮬레이션을 돌려 시드 재현성을 확인 (이식 시 기준 출력으로 사용)
- `node tools/prepare-regression.mjs [--steps 400] [--seed 1] [--root DIR] [--out f.json]` — 실제 UI 함수로 무작위 플레이(구매·이동·변이·합성·판매·전투·보상)를 하며 매 단계 상태를 기록. 준비 화면 규칙을 건드리기 전후 출력을 비교하세요(마지막 `COV` 줄은 호출 횟수라 비교에서 제외).
- `node tools/rules-node.mjs [--seed 1]` — 브라우저 없이 Node에서 run-rules를 돌려 시드 재현성을 확인
- `node tools/balance.mjs [--baseline] [--write]` — 웨이브별 `tune`을 맞춤. `--write`는 `data/game-data.json`을 갱신
- `node tools/attack-timing.mjs` — 리그가 있는 유닛(오크·골렘·고블린·스켈레톤·마법사)의 공격 모션 점검. `data/game-data.json`의 `windup`(선딜, 초)과 공속이 리그 길이에 맞는지, 실제 전투 시뮬에서 모든 타격 전에 선딜 모션이 보이는지 검사(실패 시 종료 코드 1). 유닛의 `atk`/`rate`/`windup`을 바꾼 뒤 실행하세요.
