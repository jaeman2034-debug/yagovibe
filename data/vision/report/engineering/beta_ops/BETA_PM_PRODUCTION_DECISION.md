# PM Production Decision

**Decision ID:** `BETA-PM-PRODUCTION-DECISION-001`  
**Layer:** Engineering · Track A · PM  
**notOpsSoT:** true  
**Status:** 🔒 **DECISION LOCK** (PM 승인 · **GO with Open Issue** · 2026-07-21)

> ❌ Operations SoT 아님 · ❌ Synthetic 혼입 금지  
> 본 문서는 `BETA_WEEK_02_PRODUCTION_REVIEW.md` 및 LOCK된 Beta records의 **Official Fact**만을 근거로 작성함.  
> **최종 판정(GO / GO with Open Issue / HOLD)은 PM 승인 시 확정** — 현재 단계에서 단정하지 않음.

---

## 0. 판정 대상 (Review 범위)

| 항목 | 내용 |
|---|---|
| **상위 Review** | `beta_ops/BETA_WEEK_02_PRODUCTION_REVIEW.md` (REVIEW DRAFT) |
| **운영 근거** | `BETA-DAY-008.json` ~ `BETA-DAY-012.json` (`OFFICIAL_FACT_LOCKED`) |
| **이슈 근거** | `issues/BETA-ISSUE-001.json` (`OPEN`) |
| **Beta 전체 맥락** | Day-01 ~ Day-12 ALL LOCK (Week-1 + Week-2) — 본 판정의 **직접 근거는 Week-2** |
| **판정 시점** | 2026-07-21 (Week-2 종료 직후) |

**참조 (판정 범위 외 · 맥락용):**

- Week-1 종합: `YAGO_VISION_ENGINEERING_TRACKER.md` § Beta Week-1
- VOC SoT: `YAGO_VOC_Trigger_로그.md` · Backlog: `E2_ENGINEERING_BACKLOG.md`

---

## 1. Official Fact 요약 (판정 근거)

### 1.1 운영 안정성 (Week-2 · Day-08 ~ 12)

| 항목 | Official Fact |
|---|---|
| Coach Report 생성 | **5/5일** 정상 |
| Parent Report 생성 | **5/5일** 정상 |
| 알림톡 발송 | **5/5일** 정상 |
| 모바일 열람 | **5/5일** 정상 |
| 기타 운영 오류 | **5/5일** 없음 |
| 로그인 이슈 관측 | **5/5일** — `BETA-ISSUE-001`로 분리 (운영 오류와 별도) |

### 1.2 사용자 활용성 (Week-2 · Gate)

| Persona | Gate | Official Fact |
|---|---|---|
| **Coach** | 4/4 Y | **5/5일** 충족 (이해 · 활용 · 재사용 · 독립 사용) |
| **Parent** | 3/4 Y | **5/5일** — 이해 · 자녀 이해 · 재사용 Y · **독립 사용 N** |

**Coach 활용 원문 (Day-12 · 대표):**

> "2주 차 마지막 날까지 리포트 데이터를 쭉 대조해 보니까 경기 후반전에 체력이 급감하던 선수들의 데이터가 훈련 강도 조절 덕분에 안정세로 돌아선 게 눈으로 증명되네요. 경기 운영 전술의 확신을 주는 데 이만한 데이터 근거가 없습니다."

**Parent 활용 원문 (Day-12 · 대표):**

> "매주 시합 끝날 때마다 리포트 수치를 비교해 주니까 아이가 지난번 시합보다 어떤 구역에서 더 많이 뛰었고 발전했는지 눈에 확 들어와서 칭찬해 주기가 너무 수월해요."

### 1.3 VOC (Week-2 종료 시점)

| VOC ID | Count | Week-2 delta | 출처 패턴 |
|---|---:|---:|---|
| VOC-011 | **14** | +4 | Parent · 또래/평균 기준선 |
| VOC-012 | **7** | +4 | Coach · 기간 데이터 비교 활용 |

---

## 2. 잔여 이슈 (Official Fact)

### 2.1 BETA-ISSUE-001

| 항목 | 내용 |
|---|---|
| **상태** | ⚠️ **OPEN** |
| **영향** | `parent_login_friction` |
| **관측 Fact** | Beta 기간 iPhone + 카카오톡 인앱 브라우저에서 `/login` 페이지 재요구 반복 관측. Android에서는 동일 현상 미관측. |
| **Week-2** | Day-08 ~ 12 **5/5일** iPhone 재현 · Android 미재현 |
| **Parent Gate 연계** | 독립 사용 **N** × 5일 |
| **원인** | `devAnalysisMemo` — 세션/쿠키/인증 흐름 등 **미확인** (Official Fact 아님) |

**Parent 마찰 원문 (Day-12):**

> "내용은 참 좋은데 들어갈 때 로그인 창 뜨는 건 오늘도 똑같네요. 매번 비밀번호를 새로 타이핑하고 들어가는 절차는 확실히 번거롭긴 합니다."

### 2.2 기타 잔여 과제

| 과제 | 근거 | 비고 |
|---|---|---|
| Parent 독립 사용 | Gate N × Week-2 5일 | ISSUE-001 연계 |
| VOC Backlog | VOC-011=14 · VOC-012=7 | 제품 개선 항목 · Backlog 관리 |

---

## 3. 판정 근거 정리 (Fact → PM 검토 포인트)

PM은 아래 Fact를 바탕으로 §4 최종 판정을 결정함. **본 섹션은 판정을 단정하지 않음.**

### 3.1 운영 안정성

- Week-2 핵심 운영 경로(Report · 알림톡 · 모바일)는 **5일 연속 정상**.
- 운영 오류는 **보고되지 않음**.
- 로그인 이슈는 운영 오류와 **별도 이슈**로 분류됨.

### 3.2 사용자 활용성

- Coach: Gate **4/4 × 5일** · 훈련·전술·선발 결정 활용 원문 다수.
- Parent: 내용 이해·자녀 대화 활용 **반복 확인** · 독립 사용은 **미충족**.

### 3.3 잔여 이슈 영향도 (PM 검토 질문)

> **`BETA-ISSUE-001`을 OPEN 상태로 유지한 채 Production 운영에 진입할 수 있는가?**

| 검토 축 | Official Fact |
|---|---|
| 이슈 재현성 | Week-2 **5/5일** iPhone+카카오 인앱 재현 |
| 영향 범위 | Parent 독립 사용 Gate N · Android 미재현 |
| 해결 상태 | **OPEN** · Fix Verification 미완료 |
| 활용 vs 마찰 | Parent는 리포트 활용 Y · 로그인 마찰 원문 반복 |

---

## 4. 최종 판정 (PM 승인 · LOCK)

| 필드 | 값 |
|---|---|
| **판정 결과** | **GO with Open Issue** |
| **판정일** | 2026-07-21 |
| **승인자 (PM)** | PM |
| **판정 유형** | Production 운영 진행 + Known Issue OPEN 유지 |

```text
[x] GO with Open Issue  — Production 전환 + BETA-ISSUE-001 OPEN 유지 + P1 관리
[ ] GO
[ ] HOLD
```

### 4.1 PM 판정 근거 (Official Fact 기반 · PM 판단)

**1. 핵심 기능 안정성 (Official Fact)**

- Week-2(Day-08~12) 동안 Coach/Parent Report 생성, 알림톡 발송, 모바일 열람이 **5/5일 정상**으로 관측됨.
- 기타 운영 오류는 **5/5일 보고되지 않음**.
- 로그인 이슈는 운영 오류와 별도로 `BETA-ISSUE-001`에 분리 관리됨.

**2. 실전 활용성 (Official Fact)**

- Coach Gate **4/4 × 5일** — 훈련·전술·선발 결정 활용 원문 반복 확인.
- Parent Gate **3/4 × 5일** — 리포트 이해·자녀 대화 활용 반복 확인 · 독립 사용 N.

**3. 잔여 이슈 영향도 (PM 판단)**

- `BETA-ISSUE-001`은 Week-2 **5/5일** iPhone+카카오 인앱 환경에서 재현 · Android 미재현 · **OPEN** 유지.
- PM은 본 이슈를 **운영 중 개선 가능한 Known Issue**로 판단함.
- Production 운영을 진행하되, `BETA-ISSUE-001`은 **P1 우선순위**로 지속 관리함.

> 위 §4.1의 1~2는 Official Fact 요약이며, 3은 PM의 운영 판단임.

### 4.2 Action Items (GO with Open Issue · 확정)

| # | Action | 상태 |
|---:|---|---|
| 1 | `BETA-ISSUE-001` OPEN 유지 + P1 Fix 일정 등록 | ✅ 확정 |
| 2 | iPhone+카카오 인앱 환경 모니터링·에스컬레이션 경로 정의 | ✅ 확정 |
| 3 | Parent 독립 사용 Gate 재검증 일정 수립 | ✅ 확정 |
| 4 | Production 운영 Run Sheet (알려진 제약 포함) 작성 | ✅ 완료 → `../production_ops/PRODUCTION_RUN_SHEET.md` |
| 5 | Beta 종료 기록 확정 (Day-01~12 LOCK · Decision LOCK) | ✅ 완료 |

---

## 5. Tracker / Ledger 반영 (승인 후 · 완료)

| 대상 | 항목 | 상태 |
|---|---|---|
| Decision | `BETA_PM_PRODUCTION_DECISION.md` | 🔒 **DECISION LOCK** |
| Review | `BETA_WEEK_02_PRODUCTION_REVIEW.md` | 🔒 **REVIEW LOCK** |
| Ledger | `ENG_PRODUCTION_GO_OPEN_ISSUE` | ✅ 확정 |
| Tracker | § 배포 판정 · Beta 종료 | ✅ 갱신 |

**반영 완료 (2026-07-21):**

- [x] `BETA_WEEK_02_PRODUCTION_REVIEW.md` → REVIEW LOCK
- [x] `BETA_PM_PRODUCTION_DECISION.md` → DECISION LOCK
- [x] `YAGO_VISION_ENGINEERING_TRACKER.md` § 배포 판정 갱신
- [x] `YAGO_VISION_OPERATIONS_PROGRAM_ROADMAP.md` Ledger 항목 확정

---

## 6. 기록 정합성

| 항목 | 상태 |
|---|---|
| Day-01 ~ Day-12 records | ✅ ALL `OFFICIAL_FACT_LOCKED` |
| Week-2 Production Review | 🔒 REVIEW LOCK |
| VOC Registry | ✅ VOC-011=14 · VOC-012=7 |
| BETA-ISSUE-001 | ⚠️ OPEN (P1 관리) |
| Fact / devAnalysisMemo | ✅ 분리 유지 |
| Production | ▶ **GO with Open Issue** (PM 2026-07-21) |

---

**Prepared:** Engineering Track A  
**Updated:** 2026-07-21  
**Upstream:** `beta_ops/BETA_WEEK_02_PRODUCTION_REVIEW.md`  
**Records:** `beta_ops/records/BETA-DAY-008.json` ~ `BETA-DAY-012.json` · `beta_ops/issues/BETA-ISSUE-001.json`
