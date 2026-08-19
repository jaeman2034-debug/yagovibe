# K3 Parallel Ops — Run Board (CIE HOLD)

```text
DATE BOARD: 2026-07-16
CIE LEARNING LOOP: HOLD 🔒
  Waiting: AUTHORIZE_HARD_FAIL_CORRECTION_CANDIDATE_DESIGN
  Do NOT: Hard Fail design · Prompt/Eval change · Cycle re-run · Promotion

THIS BOARD SCOPE: K3 evidence + field ops ONLY
FORBIDDEN HERE: CIE Stage C · Stripe · K4 · new product design
SoT: docs/YAGO_K1_PILOT_001_K3_COMPLETION_CHECKLIST.md
```

---

## Why this board exists

CIE Learning Loop is on **HOLD**. Parallel value is **K3 reference validation** (evidence collection, not development).

### K3 PASS still needs ALL 3

| # | Task | Status |
|---|------|--------|
| **P1** | 윤서연 母 external validation quote | ☐ |
| **P2** | Verified completed growth cases → **10/10** (7-field) | **0/10** verified · legacy 5/10 |
| **P3** | Reference Book v1 (Ch 1–7) | ☐ draft |

**Hottest P2 item:** FC-001 = **6/7** · gap = **F5 Growth interpretation** · volume promote **PROHIBITED** until F5 FOUND + PM review.  
Detail: `docs/YAGO_K3_P2_FC001_SEVEN_FIELD_VERIFICATION.md`

---

## K3 Automation Boundary (LOCK)

**Purpose:** Until K3 PASS, restrict AI assistance to preserve evidence governance and auditability.

| Role | Allowed responsibility |
|------|------------------------|
| AI | Interview transcription **draft** · Evidence metadata **draft** · Gate/KPI **draft** · G6 feature-claim analysis · `HOLD` / `PROMOTE` **recommendation** |
| Field operator | G1 interview datetime · G2 participant identity · G3 original existence/preservation · G4 operator verification · G5 consent · `PENDING → VERIFIED` decision |
| PM | Official `VOC_FACT` promotion approval · Official Weekly KPI reflection approval |

```text
FORBIDDEN FOR AI BEFORE K3 PASS:
  - Mark G1–G5 as PASS
  - Change Verification Status to VERIFIED
  - Treat original evidence as fact without operator verification
  - Register Official VOC_FACT
  - Reflect Official Weekly KPI

Flow:
  Field interview
    → AI drafts
    → Field operator verifies G1–G5 and sets VERIFIED
    → AI recommends HOLD or PROMOTE
    → PM approves
    → Official VOC_FACT / Weekly KPI
```

This is a documentation governance boundary only. It authorizes no automation implementation, code change, evidence-store integration, or CIE/Stage C work.

---

## Today — Field Operator Checklist (copy per day)

| Field | Value |
|-------|-------|
| Date | 2026-07-__ |
| Operator | |
| Pilot / teamId | |
| Overall | ☐ GREEN · ☐ YELLOW · ☐ RED |

### A. Beta ops (no CIE / no Stage C)

| # | Action | Done |
|---|--------|:----:|
| A1 | 실제 팀 운영 세션 진행 (일정·출석·소통) | ☐ |
| A2 | 경기/훈련 영상 업로드 (기존 ingest 경로만) | ☐ |
| A3 | AI 분석/리포트 **확인** (관찰·기록만 · 파이프라인 재설계 ❌) | ☐ |
| A4 | 운영 이슈 1줄 기록 (아래 Ops Log) | ☐ |
| A5 | Vision Daily Ops 참고 시: `docs/operations/YAGO_VISION_DAILY_OPERATIONS_CHECKLIST.md` | ☐ |

### B. VOC (interviews — allowed)

**CRITICAL — EXAMPLE vs FACT**

| Label | Use for | Count toward K3 external validation? |
|-------|---------|--------------------------------------|
| `VOC_EXAMPLE` / 검증용 예시 | 인터뷰 구조·질문 흐름·사업계획서 인용 예시 | **NO** ❌ |
| `VOC_FACT` / 실제 인터뷰 | 실제 일시·대상·원문 발언(+가능하면 녹취) · 운영자 확인 | **YES** ✅ |

```text
검증용 예시 문서의 인용문·만족도·개선 요청
= 형식 검증용 ONLY
≠ K3 Fact / ≠ P1 external validation quote
≠ verified growth case volume
```

실제 운영 보고서·Reference Book·IR에는 **VOC_FACT만** 사용한다.

**Feature-claim check (대외/운영 보고서 인용 전):**  
인터뷰에 나온 지표명(히트맵·스프린트·패스 성공률·수비 지표 등)이 **현재 Beta Parent/Coach Vision·Growth 리포트 UI에 실제 표시되는지** 확인한다.  
원문 발언은 보존하되, 보고서 해석에서 “AI 리포트가 제공하는 기능”으로 **일반화·제품 클레임화 금지**(미제공 기능인 경우).

**운영 보고서 3층 분리 (LOCK)**

| Layer | What | Rule |
|-------|------|------|
| ① VOC 원문 | 학부모/코치 발언 그대로 | 수정·윤문으로 Fact 대체 금지 |
| ② 운영자 해석 | 의미 요약 | **현재 Beta 제공 범위 안에서만** 해석 |
| ③ 기능 설명 | 제품이 제공하는 항목 나열 | **구현·UI에 있는 것만** 명시 |

예: 원문에 “히트맵”이 있어도 ①은 보존하고, ②·③에서는 히트맵을 Beta 기능으로 소개하지 않는다.

| VOC에서 자주 나오는 표현 | Beta Parent/Coach 리포트 UI (2026-07 기준) | ③ 기능 설명 |
|--------------------------|---------------------------------------------|------------|
| 피치/선수 **히트맵** | **NOT_IN_UI** | 일반화 금지 |
| **스프린트** 횟수 | **NOT_IN_UI** | 일반화 금지 |
| **패스 성공률** | **NOT_IN_UI** (전방패스% · 패스 **횟수**만) | 성공률로 일반화 금지 |
| **수비** 전용 KPI | **PARTIAL** | 제공 범위 내만 |
| 패스/볼받기/턴오버 **횟수** | **YES** | 일반화 가능 |
| **growthScore** / 성장 변화 | **YES** | 일반화 가능 |
| FII 종합·인사이트 문구 | **YES** | 일반화 가능 |

| # | Action | Done |
|---|--------|:----:|
| B1 | **코치 인터뷰 (우선)** — Parent #01–#03 동일 경기 pairing · 아래 Coach VOC 슬롯 | ☐ |
| B2 | Parent #01–#03 Gate 검증표 — `YAGO_K3_PARENT_VOC_GATE_VERIFICATION_2026-07-16.md` (판정: 전건 HOLD · field evidence 대기) | ✅ sheet · ☐ evidence |
| B3 | **P1** 윤서연 母 외부 검증 — **VOC_FACT만** (동의·verbatim·일시·대상) | ☐ |
| B4 | 운영자 기록 블록 작성 (대표 인용문 · 만족도 · 향후 이용 · 핵심 개선) | ☐ |
| B5 | Feature-claim check 통과 후에만 대외/IR에 “리포트 기능”으로 인용 | ☐ |

**P1 target questions**

```text
왜 좋았는가?
우리 아카데미도 도입하고 싶은가?
코치 반응은 어땠는가?
```

**P1 target quote (LOCK)**

```text
"우리 아카데미도 이런 리포트를 도입했으면 좋겠어요."
또는
"코치 선생님께 보여드렸는데 관심을 보이셨어요."
```

### C. P2 evidence (no invent · no volume promote)

| # | Action | Done |
|---|--------|:----:|
| C1 | FC-001 F5: **PM GO 없이** 연락/리포트 재생성/volume +1 **금지** | 🔒 |
| C2 | 현장 메모만: “이미 보여준 UI/PDF 해석문” 또는 “코치 승인 노트” 후보 경로 기록 | ☐ |
| C3 | 신규 후보 사례는 template만 사용: `docs/templates/k3-growth-case-study-template.txt` | ☐ |
| C4 | Inventory 참고: `docs/YAGO_K3_P2_VERIFIED_GROWTH_CASE_CANDIDATE_INVENTORY.md` | ☐ |

### D. P3 Reference Book (draft only)

| # | Action | Done |
|---|--------|:----:|
| D1 | Ch 초안 메모 (기능 추가 없이 문서만) | ☐ |
| D2 | 확보된 quote/사례 링크만 목차에 붙이기 | ☐ |

---

## Coach VOC slot (1건) — **NEXT PRIORITY** (pair with Parent #01–#03 when possible)

```text
Record class:  ☐ VOC_FACT  ·  ☐ VOC_EXAMPLE  ·  ☐ VOC_FACT_CANDIDATE

Current candidate status: VOC_FACT_CANDIDATE
FACT gate: 운영자 입력 대기
Verification date: 운영자 입력 대기
Operator declaration: 미작성 (운영자의 실제 원본 확인 이후에만 추가)

Date / time (required if FACT):
Coach alias / role:
teamId / match context:
Paired parent candidate (if any):  ☐ #01 김민준  ☐ #02 이한결  ☐ #03 박준우  ☐ other / none
Consent for Reference Book / IR:  Y / N
Operator who verified: 운영자 입력 대기

Q1 이번 AI 리포트가 실제 지도에 도움이 되었는가?
A (verbatim):

Q2 AI 분석과 현장 판단이 일치했는가?
A (verbatim):

Q3 다음 훈련에 반영할 내용이 있었는가?
A (verbatim):

Q4 개선이 필요한 점은 무엇인가?
A (verbatim):

--- 운영자 기록 ---
대표 인용문:
"
"
지도 도움:  ☐높음 ☐보통 ☐낮음
현장 일치:  ☐높음 ☐보통 ☐낮음 · ☐상충 있음(설명:____)
향후 이용:  ☐계속 희망 ☐조건부 ☐안함
핵심 개선 요청:

FACT gate: ☐일시 ☐대상 ☐원문 ☐운영자 확인 ☐동의(필요 시)
Feature-claim: 리포트에 없는 지표를 제품 기능으로 일반화하지 않음

Coach VOC — expressions to verify before ③ productize:
| Expression | Beta UI | Rule |
|------------|---------|------|
| 전방 패스 비율 | YES (Coach) | OK if on screen cited |
| 패스 횟수 / Receive / Turnover | YES | OK |
| 쿼터별 데이터 | CONFIRM | verify UI |
| 팀 대시보드 | CONFIRM | verify route/screen |
| 패스 성공률 | NOT_IN_UI | ① preserve · ③ no claim |
```

---

## Parent VOC slot (1건) — P1 우선

```text
Record class:  ☐ VOC_FACT (실제 인터뷰)  ·  ☐ VOC_EXAMPLE (검증용 예시 — Fact 금지)

Date / time (required if FACT): 2026-07-18 10:36~10:45 KST
Parent alias / identity (required if FACT): 학부모 A
Linked player (if consented): U-12 선수 A
Channel:  in-person / call / chat / other: chat
Recording / notes source:  ☐ 녹취  ·  ☐ 현장필기  ·  ☑ 채팅 원문  ·  ☐ other
Consent for Reference Book / IR / sales: Y
Operator who verified this record: OP-001

--- Interview answers (원문 위주; 요약만 금지 if FACT) ---

Q1 왜 좋았는가?
A (verbatim): "아이의 장점과 부족한 점을 수치로 한눈에 확인할 수 있어서 좋았습니다."

Q2 우리 아카데미도 도입하고 싶은가?
A (verbatim; source question: 다른 학부모님이나 아카데미에도 이 서비스를 추천하고 싶으신가요?): "네. 처음에는 반신반의했는데 실제 리포트를 받아보니 도움이 많이 돼서 추천하고 싶습니다."

Q3 코치 반응은 어땠는가?
A (verbatim): "네. 코치님도 아이들 성장 관리에 도움이 될 것 같다고 말씀하셨습니다."

Q4 개선이 필요한 점? (긍정만이 아닌 개선 요청도 기록)
A (verbatim):

--- 운영자 기록 (Operator) ---

대표 인용문 (Representative Quote) — must be verbatim from above if FACT:
"
"

종합 만족도:  ☐1 ☐2 ☐3 ☐4 ☐5  /5

향후 이용 의사:
  ☐ 계속 이용 희망
  ☐ 상황에 따라 이용
  ☐ 이용하지 않음

핵심 개선 요청 (1줄):

P1 match?  ☑ target quote 근접 · ☐ 부분 · ☐ 해당 없음

FACT gate (all required for VOC_FACT):
  ☑ 실제 인터뷰 일시
  ☑ 실제 인터뷰 대상
  ☑ 실제 원문 발언
  ☑ 운영자 확인
```

---

## PM Review Status

```text
Status
- PM Review Completed

PM Approval
- Approved

Official registration
- Pending record

P1
- Not Declared

K3
- Unchanged

Remarks
- Operator completed evidence verification.
- PM approved the Official VOC_FACT promotion under the existing evidence package.
- Official registration and Official Weekly KPI reflection require separate operating records.
- P1, P2/P3, and K3 statuses remain unchanged.
```

---

## Ops Log (issues — no code)

| Time | Severity | Issue | Workaround | Needs eng? |
|------|----------|-------|------------|------------|
| | LOW/MED/HIGH | | | Y/N |

---

## Weekly KPI stub (fill Fridays)

**LOCK:** Gate 통과 전 `VOC_FACT` 집계 금지. 후보는 `VOC_FACT_CANDIDATE`로만 기록.

| Metric | Candidate (internal) | Official VOC_FACT | Notes |
|--------|---------------------:|------------------:|-------|
| Parent VOC collected | | | Gate 후만 Official ↑ |
| Coach VOC collected | | | 동일 |
| Avg satisfaction /5 | | | Official = FACT only |
| Reuse intent % | | | Official = FACT only |
| Uploads completed | | — | |
| AI reports reviewed by coach | | — | |
| P1 quote secured? | Y/N | — | 윤서연 母 · FACT only |
| Verified 7-field cases | /10 | — | do not inflate |
| FC-001 status | 6/7 F5 gap | — | until PM GO |
| CIE Learning Loop | HOLD | — | no design |

Draft template: `docs/operations/YAGO_K3_WEEKLY_KPI_CANDIDATE_DRAFT_2026-07-16.md`  
Parent Gate: `docs/operations/YAGO_K3_PARENT_VOC_GATE_VERIFICATION_2026-07-16.md`

Template refs:  
`docs/operations/YAGO_VISION_WEEKLY_KPI_REPORT_TEMPLATE.md` ·  
`docs/templates/yago-vision-pilot-kpi-weekly.csv` ·  
`docs/operations/YAGO_K3_VOC_FACT_CANDIDATES_2026-07-16.md` (candidates · not auto Fact)

---

## Parallel tracks (optional, CIE-independent)

| Track | Status note |
|-------|-------------|
| Venue Rental Sprint 1 | Execution-order **exception GO** exists (tenant `federations/nowon-football`) — separate from CIE |
| 협회 CMS / 홈페이지 / 대관 | CIE HOLD와 독립 — 별도 지시 시만 |
| Docs STALE cleanup | 거버넌스 변경 없이 정리만 |

---

## Venue Rental allocation operational verification

```text
STATUS: SUPERSEDED BY STAGE 12O (2026-08-19) — see section below
TENANT: federations/nowon-football
PRIOR NOTE: operator-verified Hosting UI flow (calendar → allocation → readback)
```

**Verified flow (prior):** Calendar and slot read → member-club direct allocation → refresh/readback → reallocation → cancellation → change-log inspection.

**BUG-004:** **CLOSED** — the action controls were visually hidden because undefined Tailwind `primary-700` utilities left white action text on a white background. The Hosting fix uses the defined `primary` and `primary-foreground` tokens; operator re-verification confirmed action controls and allocation operations.

**Remaining open item:** BUG-003 status-filter UX remains OPEN below.

---

## Stage 12O — Production Preallocation VERIFIED COMPLETE (2026-08-19)

```text
PRODUCTION_PREALLOCATION: VERIFIED COMPLETE 🔒
HOSTING_MIGRATION: COMPLETE 🔒
AUTHORITATIVE_PRICING: PRODUCTION VERIFIED 🔒
RA_ALIMTALK_LIVE_SEND: NOT VERIFIED — SEPARATE TRACK 🔒

SoT evidence artifacts (repo root, read-only):
  STAGE_12M_R2_READBACK.json
  STAGE_12L_HF_REPORT.json
  STAGE_12N_REPORT.json
  HOSTING_MIGRATION_PREFLIGHT.json

Canonical Hosting source SHA:
  70fae5f04b9dbdcbf15876a53cbd01dad49e9f70
  branch: origin/vision-v2-i13
```

### Migration history (Production)

| Stage | Result |
|-------|--------|
| 12L Hosting-only deploy | PASS |
| 12L-HF Auth config hotfix (canonical `.env.production`) | PASS |
| 12N Firebase Admin init hotfix (venue pricing callables) | PASS |
| 12M-R2 Production functional verification | PASS |

### Verified case — FROZEN / DO NOT REUSE

| Field | Value |
|-------|-------|
| Status | **VERIFIED COMPLETE / FROZEN / DO NOT REUSE** |
| Venue | `nowon-suraksan` (수락산구장) |
| Date / Time | `2026-09-04` · `10:00–12:00` |
| Team | 상천FC |
| Team ID | `hBLnzeMYOU62Rg94ocmG` |
| Request ID | `req_nowon-suraksan_2026-09-04_1000_hBLnzeMYOU62Rg94ocmG` |
| Slot / Reservation ID | `slot_nowon-suraksan_2026-09-04_1000` |
| pricingStatus | `QUOTED` |
| Authoritative base | `55,000` KRW |
| Lighting | `0` KRW |
| Authoritative total | `55,000` KRW |
| Policy | `nowon-pricing-v2-2026-09-01--nowon-suraksan` · v2 · `BLOCK_2H` |
| request / allocation / reservation | **1 / 1 / 1** |
| Duplicate writes | **0** |
| Slot state | `ALLOCATED` |
| Team linkage | PASS |
| Provider sends | **0** |
| RA / generic gates | **OFF** (unchanged) |

### Notification contract (verified case)

Post-commit queue documents only — **not** provider send:

| Check | Value |
|-------|-------|
| Queue delta | +3 |
| Roles | chairman · coach · manager |
| Status | `queued_sms_pending` |
| provider | `null` |
| sentAt | `null` |
| RA gate | OFF |

```text
QUEUE CREATED != PROVIDER SENT
```

### Failed / aborted cases — DO NOT REUSE (not in verified volume)

| Case | Date / scope | Outcome | Server writes | Retry |
|------|----------------|---------|---------------|-------|
| Historical Canary | 2026-08-26 | failed Canary | — | — |
| Stage 12M attempt | 2026-09-03 · nowon-suraksan · 10:00–12:00 · 상천FC | `app/no-app` (`createVenueAllocationRequest`) | **0** | **NO** |

Neither case counts toward Production preallocation verified volume.

### Scope close

```text
PRODUCTION_PREALLOCATION functional E2E = CLOSED ✅
Next separate track (PM re-GO required):
  RA AlimTalk live send / controlled Canary — new case only
Do NOT reuse 2026-09-04 verified case or 2026-09-03 failed attempt.
```

Detail: `docs/YAGO_NOWON_VENUE_ALLOCATION_WORKFLOW_ALIGNMENT.md` §25–27

---

## Federation CMS read-only UI verification

```text
STATUS: PASS — operator-observed read-only UI scope
```

**Observed:** Dashboard, league/application areas, team and member list views, accounting dashboard, and settings/branding screens loaded and rendered their existing read-only UI.

**Not verified:** Data correctness, unauthorized access denial, empty/error states, or write actions such as branding save, accounting settlement, and Publish/Live updates.

**Boundary:** This is a UI-readiness observation only. It does not change K3 gate status or declare all Federation CMS workflows complete.

---

## Venue Rental UX observation — BUG-003

```text
STATUS: OPEN — analysis only; no code, data, or deployment change
SCOPE: FederationVenueRentalAdminPanel status filter
```

**Symptom:** Selecting a status filter (`전체`, `신청가능`, `신청중`, `선배정`, `배정완료`) leaves the selected-date slot panel and empty state unchanged, making the filter appear non-functional to an operator.

**Confirmed cause:** `calendarStatusFilter` updates correctly, but only changes non-matching calendar-day opacity. It neither filters the selected-date slot list nor renders a zero-result state.

**Terminology decision required:** `배정완료` currently represents request-selected allocations only (`REQUEST_SELECTION`). Admin direct allocations (`ADMIN_DIRECT`) are represented separately as `선배정`.

**Impact:** Venue Rental operating UX only. This is not a K3 gate, KPI, or architecture-status change.

---

## Venue Rental operating requirement — variable duration

```text
STATUS: POST-K3 CANDIDATE — no contract, code, schema, or deployment change
```

**Observed operating requirement:** Support 1-hour, 2-hour, and 3-hour venue reservations in line with the existing spreadsheet workflow.

**Current constraint:** The deployed venue model is locked to 2-hour slots (`P_MIN / SLOT = 2h`). The admin UI maps its time selector from `buildTwoHourSlots()`, which increments by the fixed 120-minute interval; the time windows are not directly hardcoded in the component. Allocation validation also rejects any duration other than 120 minutes.

**Scope clarification:** Changing the shared interval alone would generate 1-hour-only slots. It would not provide the required 1-hour, 2-hour, and 3-hour duration selection model.

**Candidate outcome only:** A future operating model may need start/end-time selection, pricing by duration, and conflict prevention across consecutive time ranges. Detailed design is deferred until Post-K3 authorization.

---

## Explicit non-goals (today)

```text
❌ AUTHORIZE_HARD_FAIL_CORRECTION_CANDIDATE_DESIGN (await PM)
❌ Prompt / Evaluator / Candidate changes
❌ Cycle-002 replay / Cycle-003
❌ Canonical promotion
❌ Production Shadow / Live Coach changes
❌ FC-001 volume 0→1 without F5 + PM review
❌ AI invent of F5 interpretation
```

---

## Recommended next PM decisions (non-binding, K3 only)

1. Field: continue **P1 quote capture** + daily ops A/B.  
2. When ready: **AUTHORIZE_FC001_F5_TARGETED_COLLECTION** (existing narrative / approved coach note only — no invent).  
3. CIE remains HOLD until **AUTHORIZE_HARD_FAIL_CORRECTION_CANDIDATE_DESIGN**.

---

## STOP

```text
CIE = HOLD
K3 = evidence + field ops board ready
No CIE work started from this board.
```
