# 몬스터 백팩 — 작업 지침

## 절대 규칙: 백업 폴더 `backups/`는 건드리지 않는다

`backups/` 아래에는 `main`을 시점별로 복사해 둔 **읽기 전용 스냅샷**이 있습니다
(예: `backups/2026-10-07_main-b9e0b19/`). 다른 작업을 할 때 아래를 지킵니다.

- `backups/` 안의 파일을 **수정, 삭제, 이동, 이름 변경, 덮어쓰기, 포맷 정리, 자동 수정(lint --fix 등)하지 않는다.**
- 게임 코드·이미지·도구를 고칠 때는 **저장소 루트의 `index.html`, `assets/`, `tools/`만** 고친다.
  백업 안의 같은 이름 파일(`backups/.../index.html` 등)을 대신 고치는 실수를 하지 않는다.
- 검색, 일괄 치환, 리팩터링, 테스트, 밸런스 도구 실행 범위에서 `backups/`를 **제외**한다.
  (예: `grep -r ... --exclude-dir=backups`, `rg ... -g '!backups/**'`, 파일 목록을 뽑을 때도 제외)
- 이미지를 `assets/`에 추가·교체하거나 `index.html`의 경로를 바꿀 때, 백업 폴더에는 반영하지 않는다.
  백업은 "그때 모습 그대로"가 목적이다.
- 백업과 현재 파일이 다른 것은 정상이다. "동기화"하거나 "차이를 맞추려고" 백업을 갱신하지 않는다.
- 새 백업은 **사용자가 요청할 때만** 만든다. 만들 때는 **새 폴더**로 만든다
  (`backups/YYYY-MM-DD_main-<커밋해시 7자리>/`). 기존 백업 폴더 위에 덮어쓰지 않는다.
  각 백업 폴더에는 기준 커밋과 내용을 적은 `README.md`를 둔다.
- 백업을 복원하거나 참고만 해야 한다면 **읽기만** 하고, 필요한 내용은 루트 쪽 파일에 새로 반영한다.
  백업 폴더 자체를 삭제하려면 반드시 사용자에게 먼저 확인한다.
- 사용자가 명시적으로 "백업을 수정/삭제하라"고 하지 않는 한 위 규칙이 항상 우선한다.

## 프로젝트 개요

- 한국어 모바일 웹 게임. 가방 배치형 오토배틀러. 본체는 단일 파일 `index.html`(HTML, CSS, JS 한 파일).
- 이미지는 `assets/`(`characters/`, `materials/`, `ui/`, `backgrounds/`)에 있고, `index.html`이 상대 경로로 읽는다.
  따라서 `index.html`과 `assets/`는 항상 같은 위치에 둔다.
- `tools/balance.mjs`: 라운드별 적 배율(`index.html`의 `TUNE`)을 시뮬레이션으로 맞추는 도구.
  `TUNE`은 손으로 고치지 말고 도구의 `--write`로 갱신한다.
  실행: `NODE_PATH=$(npm root -g) node tools/balance.mjs --seeds 12 --verify 24 --write`
- 저장 데이터는 `localStorage`(`monster-backpack-v2` 키, 내부 `version: 3`)와 도감(`monster-backpack-codex`).
  세이브 구조를 바꾸면 `restore()`의 검증과 버전을 함께 손본다.

## 작업 방식

- 브라우저 확인은 Playwright(Chromium)로 한다. 모바일 화면(412×741, 430×900, 360×640)과 가로 모드를 함께 본다.
  `file://`로 `index.html`을 직접 열어도 이미지가 로드되어야 한다.
- 전투 코드를 시뮬레이션만 돌릴 때는 `window.__TEST__=true`로 두어 `finishBattle` 타이머가 돌지 않게 한다.
- 변경은 브랜치에서 작업하고 PR을 **draft**로 올린다. **머지는 사용자가 요청할 때만** 한다(squash).
  머지한 뒤에는 작업 브랜치를 `origin/main`과 같게 맞춘다(`--force-with-lease`).
- 전투 규칙이나 수치를 바꾸면 밸런스 도구로 다시 확인하고, 결과 표를 PR에 적는다.
- 이미지 에셋을 교체할 때는 기존 캔버스 크기와 투명 여백(6px), 발끝 정렬을 유지해
  `SPRITE_BASE_W`, `SPRITE_FOOT`와 어긋나지 않게 한다.
