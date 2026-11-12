# 운동선수 도핑 약물 교육 사이트

**English summary:** A static, bilingual (Korean/English) educational site about doping in sport: WADA Prohibited List categories, representative substances, and confirmed historical cases (each with an official decision). News is refreshed daily from Google News RSS by a GitHub Actions workflow. It is educational only and is **not medical advice**. It deliberately contains no dosing, cycling, detection-window, masking, or sourcing information. No build step, no server, no database, zero npm dependencies.

---

## 이 사이트는

WADA 금지목록의 전 분류(S0–S9, M1–M3, P1 = 14개)와 대표 물질, CAS 또는 반도핑 기구/국제연맹의 최종 결정이 있는 역사적 사건을 한국어/영어로 소개하는 **교육용** 정적 사이트입니다. 의학적 조언이 아니며, 도핑 실행을 돕는 정보(용량, 투여 방법, 검출 기간, 회피, 구매처 등)는 싣지 않습니다.

## 로컬에서 보기

- `index.html`을 더블클릭하면 바로 열립니다 (`data/*.js`를 `<script>`로 읽기 때문에 `file://`에서도 동작).
- 또는 로컬 서버: `npx serve` (Node 필요), 이후 안내되는 주소로 접속.

## 구조

```
index.html              셸 (헤더, 검색, 언어 전환, 푸터)
assets/css, assets/js   스타일, 라우터/뷰/i18n/검색/안전 렌더 헬퍼
data/*.json             원본 데이터 (편집 대상)
data/*.js               JSON에서 생성된 파일 (직접 편집 금지)
scripts/fetch-news.mjs  뉴스 수집 (Google News RSS ko/en)
scripts/build-data-js.mjs  JSON -> data/*.js 생성
scripts/validate-data.mjs  스키마/참조/안전 패턴 검사
.github/workflows/news.yml 매일 뉴스 갱신 + 데이터 재생성
```

## 데이터 수정 방법

1. `data/categories.json`, `substances.json`, `cases.json` 중 해당 파일을 편집합니다 (`news.json`은 자동 생성).
2. `node scripts/validate-data.mjs` 로 검사합니다.
3. `node scripts/build-data-js.mjs` 로 `data/*.js`를 다시 만듭니다.
4. 커밋 후 push.

JSON만 수정해 push해도 됩니다. `data/*.json` 변경 push 시 Actions(`Update news`)가 `data/*.js`를 자동 재생성해 커밋합니다 (뉴스 수집은 하지 않음).

## GitHub Pages 배포 (단계별)

1. GitHub에서 새 저장소를 만듭니다.
2. 이 폴더를 push 합니다 (기본 브랜치 `main`).
3. 저장소 **Settings > Pages > Build and deployment**: Source = **Deploy from a branch**, Branch = `main`, 폴더 = `/ (root)` 저장.
4. **Settings > Actions > General > Workflow permissions**: **Read and write permissions** 선택 후 저장 (봇이 데이터 커밋을 push 하려면 필요).
5. 몇 분 후 안내되는 Pages 주소에서 사이트를 확인합니다.

## 뉴스 워크플로 수동 실행

저장소의 **Actions** 탭 > **Update news** > **Run workflow**. 완료 후 `chore: update news data` 커밋이 생겼는지 확인합니다.

- 자동 실행: 매일 21:17 UTC (한국 시간 06:17).
- 콘텐츠 검증(안전 패턴 등) 실패는 **경고로만** 표시되고 뉴스 갱신은 계속됩니다. 단, **`news.json` 스키마 검증 실패는 job을 실패**시킵니다 (JSON 편집 오류가 뉴스 장애처럼 보일 수 있으니 실행 로그의 Validate 단계를 확인하세요).
- 한쪽 언어 피드가 실패하면 그 언어의 기존 뉴스를 유지하고, 양쪽 모두 실패하면 파일을 바꾸지 않습니다.

## 60일 비활성 시 스케줄 중단

저장소에 60일간 활동이 없으면 GitHub가 스케줄(cron) 워크플로를 자동으로 비활성화합니다 (자동 유지는 하지 않음).

- 실행 이력 확인: **Actions** 탭 > **Update news** > 최근 실행 목록(최근 날짜가 없으면 중단된 것).
- 재활성화: 같은 화면 상단의 "This scheduled workflow is disabled..." 배너에서 **Enable workflow** 클릭, 이후 **Run workflow**로 수동 실행해 확인.

## Pages가 봇 커밋 후 갱신되지 않을 때 (대체 경로)

"Deploy from a branch" 방식은 보통 봇 커밋에도 재배포됩니다. 갱신되지 않으면:

1. **Settings > Pages > Source**를 **GitHub Actions**로 변경합니다.
2. `.github/workflows/news.yml` 마지막에 `actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages` 단계(및 `pages: write`, `id-token: write` 권한)를 추가합니다.

## 콘텐츠 안전 경계 (Content Safety Boundary)

- **허용:** 물질이 무엇인지, 금지 이유, 일반적 생리 작용(1–2문장), 건강 위험/부작용, 일반 검사 방법 명칭(소변/혈액 검사, 선수 생체여권 ABP, IRMS 등), 규정과 제재, 역사.
- **금지:** 용량·단위가 붙은 수치, 투여 경로/주기/스택, 검출 기간·반감기·청소 시간, 검사 타이밍 회피, 마스킹 방법, 구매처.
- **분류별 주의:** S5(이뇨제·은폐제)는 은폐제가 금지되는 이유만. M1/M2는 규정과 위험·제재만.
- **사건:** CAS 또는 반도핑 기구/국제연맹의 최종 결정이 있는 사건만. 미제재 개인 실명 금지 (Operación Puerto는 사건 단위로만).
- 자동 검사(`validate-data.mjs`)는 위험 패턴을 hard-fail/경고로 잡아내지만 완전하지 않으므로 아래 수동 검토가 필요합니다.

### 기여자 수동 검토 체크리스트 (물질/사건 항목마다 1회)

- [ ] `node scripts/validate-data.mjs` 통과 (hard-fail 0건, 경고는 내용 확인)
- [ ] 용량·단위가 붙은 수치가 없다
- [ ] 투여 경로, 주기, 병용(스택) 설명이 없다
- [ ] 검출 기간, 반감기, 청소 시간이 없다
- [ ] 검사 회피, 은폐/마스킹 방법, 구매처 안내가 없다
- [ ] 작용 설명은 1–2문장의 일반적 수준이다
- [ ] 모든 ko/en 필드(별칭 포함)가 채워져 있고 내용이 서로 일치한다
- [ ] `sources`가 1개 이상이며 모두 `https://` 이다
- [ ] 사건은 최종 결정(`decision`)이 있고, 미확정 의혹이나 미제재 개인 실명이 없다
- [ ] 물질 <-> 사건 상호 참조가 양방향으로 맞다

## 출처 및 크레딧

- WADA Prohibited List 및 각 항목의 `sources`에 표기된 공식 자료 (WADA, CAS, 각 국제연맹/NADO 등).
- 뉴스: Google News RSS. 외부 언론 기사이며 이 사이트가 사실 여부를 검증하지 않습니다.

## 라이선스

TBD by owner
