# YAGO Nowon Venue — Payment / Reservation MVP Scope Freeze

```text
DATE: 2026-07-27
STATUS: MVP SCOPE FREEZE 🔒
DESIGN PHASE: CLOSED ✅
PRODUCT GOVERNANCE: LOCKED ✅
CODE: NOT STARTED (Implementation GO required per PR)
PRODUCTION DEPLOY: HOLD until PR1–PR3 (min) local verify + PM GO
```

**Upstream SoT (do not re-open design without PM)**

| Doc | Role |
|-----|------|
| `docs/YAGO_NOWON_VENUE_RENTAL_DOMAIN_CONTRACT.md` | D3 3-axis · unpaid ≠ auto-cancel |
| `docs/YAGO_NOWON_VENUE_PAYMENT_SIGNAL_AND_CONFIRM_DESIGN.md` | PS1–PS2 · PS5 CONDITIONAL UNLOCK · PS7–PS10 |
| This document | **What may ship in code PRs** |

---

## 0. Design CLOSED — verdict

| Item | Status | Gate |
|------|--------|------|
| Architecture | PASS | ✅ |
| Domain Contract | PASS | ✅ |
| PS5 claim ≠ confirm | CONDITIONAL UNLOCK | ✅ |
| PS7 3-axis state | LOCK | ✅ |
| PS8 ALLOCATED Trigger | LOCK | ✅ |
| PS9 reservationId / shortReservationCode | LOCK | ✅ |
| PS10 Notification MVP order | LOCK | ✅ |

```text
Product policy = CONFIRMED
Implementation may proceed WITHOUT further design change
IF AND ONLY IF work stays inside this Scope Freeze
```

---

## 1. Operating goal (unchanged)

```text
관리자 배정
→ 예약정보·예약번호·QR 생성 (system)
→ 인앱 + FCM 안내 (system)
→ 회원 「입금 확인 요청」 (claim)
→ 관리자 통장 확인 → 입금 확인 (CONFIRMED)
→ 최종 확정 (FINALIZED)
→ 확정 알림 (system)
```

Admin actions only: **배정 · 입금 확인 · 최종 확정**.

---

## 2. State model (frozen)

**FORBIDDEN** — single linear enum:

```text
REQUESTED → ALLOCATED → PAYMENT_REQUESTED → PAYMENT_CONFIRMED → FINALIZED
```

**REQUIRED** — 3 axes:

```text
requestStatus          // 배정
paymentStatus          // UNCONFIRMED | CONFIRMED (admin only → CONFIRMED)
paymentClaimStatus     // NONE | REQUESTED  (= PAYMENT_CLAIMED when REQUESTED + UNCONFIRMED)
confirmStatus          // PENDING_PAYMENT | FINALIZED
```

Member CTA copy: **「입금 확인 요청」** (never 「입금 완료」 as confirm).

### PAYMENT_CLAIMED meaning (LOCKED ✅)

```text
PAYMENT_CLAIMED = 회원이 「입금했다」고 신고한 상태이다,
협회 관리자의 통장 확인 전까지 입금 완료(CONFIRMED)로 간주하지 않는다.

Canonical field (3-axis):
  paymentClaimStatus = REQUESTED
  ∧ paymentStatus     = UNCONFIRMED

Alias (UX / ops copy only):
  PAYMENT_CLAIMED ⇔ claim=REQUESTED ∧ payment=UNCONFIRMED

FORBIDDEN on member claim path:
  paymentStatus → CONFIRMED
  confirmStatus → FINALIZED
```

---

## 3. PR sequence (LOCKED order)

Do not merge later PRs ahead of earlier ones without PM exception.

```text
PR1  Reservation Engine
  ↓
PR2  Payment Claim
  ↓
PR3  Admin Confirm + Finalize
  ↓
PR4  Notification (in-app + FCM) hardening / backfill
  ↓
PR5  Kakao (post-MVP · separate GO)
```

**Note:** PR1 may include a **minimal notify stub** (write `notifications` + optional FCM enqueue) so allocate→detail is usable; full notify reliability / templates = PR4. Kakao/SMS = PR5 only.

---

## 4. PR #1 — Reservation Engine (IN)

First implementation PR. Scope freeze for “start coding.”

| # | Include | Notes |
|---|---------|--------|
| 1 | ALLOCATED Trigger | First transition/create to ALLOCATED only · **idempotent** |
| 2 | Reservation record create | Path per Payment Signal design (winner/request sync OK) |
| 3 | `reservationId` | Internal stable id |
| 4 | `shortReservationCode` | Display + 입금 메모 (e.g. `NW-2507-A3F2`) |
| 5 | QR → Reservation Detail URL | Deep link to detail page |
| 6 | Reservation Detail Page | Venue, date, slot, team, code, account guide placeholder, amount estimate, deadline copy (사용 전월까지) |
| 7 | `confirmStatus=PENDING_PAYMENT` default | On allocate |
| 8 | `paymentClaimStatus=NONE` default | On allocate |
| 9 | `paymentStatus=UNCONFIRMED` | Unchanged default |
| 10 | Minimal App Notification + FCM enqueue | Optional thin wire so user gets link; not Kakao |
| 11 | Audit: reservation created / related change log | Append-only |
| 12 | Types aligned with PS7/PS9 | No UI for claim/confirm yet if split — prefer stubs behind flags |

**PR1 DONE when:** allocate once → reservation + short code exist → QR/detail opens → re-allocate trigger does not duplicate reservation for same winner cursor (idempotent).

### PR1 Definition of Done (DoD) 🔒

```text
PR1 = COMPLETE only if ALL of the following pass:

[ ] D1  관리자가 REQUEST_SELECTION 또는 ADMIN_DIRECT로 ALLOCATED 성공
[ ] D2  federations/{slug}/venueReservations/{reservationId} 문서 1건 생성
[ ] D3  reservationId(내부) ≠ shortReservationCode(표시) 둘 다 persist
[ ] D4  동일 slotAllocationId에 대해 ensure/trigger 재실행 시 문서 중복 없음 (idempotent)
[ ] D5  /federations/{slug}/reservations/{reservationId} 조회 가능
[ ] D6  Detail에 표시: 예약번호·팀·구장·날짜·시간·금액·입금계좌(가이드)·입금기한
[ ] D7  Detail에 QR = 상세 페이지 absolute URL (민감정보 QR payload 금지)
[ ] D8  root notifications 문서 생성 (status=queued, link=detail)
[ ] D9  FCM은 기존 sendPushOnNotificationCreate 파이프라인 enqueue (카카오/SMS 없음)
[ ] D10 paymentClaim / admin CONFIRMED / FINALIZED UI·API 없음 (PR2/PR3 OUT)
[ ] D11 Domain Contract / Scope Freeze OUT 목록 위반 없음

완료 보고에 DoD D1–D11 체크 결과를 포함한다.
```

---

## 5. PR #2 — Payment Claim (IN)

| # | Include |
|---|---------|
| 1 | Member CTA 「입금 확인 요청」 on Reservation Detail |
| 2 | Write `paymentClaimStatus=REQUESTED` (+ claimedBy/At) |
| 3 | **Must not** set `paymentStatus=CONFIRMED` |
| 4 | Change log `PAYMENT_CLAIM` |
| 5 | Admin board badge 🟠 입금 확인 요청 |
| 6 | Notify managers (in-app ± FCM) that claim arrived |

**PR2 DONE when:** member claim visible to federation manager; payment stays UNCONFIRMED.

### PR2 Definition of Done (DoD) 🔒

```text
PR2 = COMPLETE only if ALL of the following pass:

[ ] D1  Reservation Detail에 「입금 확인 요청」 CTA (「입금 완료」 카피 금지)
[ ] D2  클릭 시 paymentClaimStatus NONE → REQUESTED (idempotent 재클릭 시 중복 스팸 없음)
[ ] D3  paymentClaimedByUid / paymentClaimedAt persist (+ optional 입금시각)
[ ] D4  paymentStatus 는 UNCONFIRMED 유지 (CONFIRMED 미변경)
[ ] D5  confirmStatus / FINALIZED 미변경
[ ] D6  change log changeType=PAYMENT_CLAIM (append-only)
[ ] D7  협회 매니저에 인앱 알림(+ FCM queued) 「입금 확인 요청」
[ ] D8  관리자 보드에 🟠 입금 확인 요청 뱃지 및/또는 대기열 표시
[ ] D9  관리자 「입금 확인」·FINALIZED UI/API 없음 (PR3 OUT)
[ ] D10 Domain Contract / Scope Freeze OUT 위반 없음

완료 보고에 DoD D1–D10 체크 결과를 포함한다.
```

---

## 6. PR #3 — Admin Confirm + Finalize (IN)

| # | Include |
|---|---------|
| 1 | Admin 「입금 확인」 → `paymentStatus=CONFIRMED` |
| 2 | Admin 「입금 해제」 (if not FINALIZED) |
| 3 | Admin 「최종 확정」 → `confirmStatus=FINALIZED` (requires CONFIRMED) |
| 4 | Unfinalize (+ reason) per PS2 |
| 5 | Change logs: `PAYMENT_CONFIRM` / `PAYMENT_UNCONFIRM` / `ALLOCATION_FINALIZE` / `ALLOCATION_UNFINALIZE` |
| 6 | Board badges 🟢 / ✅ |
| 7 | Rules: member cannot CONFIRMED/FINALIZED |

**PR3 DONE when:** admin path 배정→claim(optional)→confirm→finalize works; FINALIZED without CONFIRMED impossible.

### PR3 Definition of Done (DoD) 🔒

```text
PR3 = COMPLETE only if ALL of the following pass:

[ ] D1  관리자만 「입금 확인」 → paymentStatus UNCONFIRMED→CONFIRMED
        (+ paymentConfirmedByUid / paymentConfirmedAt)
[ ] D2  관리자만 「입금 확인 해제」 → CONFIRMED→UNCONFIRMED
        (confirmStatus=FINALIZED 이면 DENY — 먼저 확정 취소)
[ ] D3  「예약 확정」은 paymentStatus=CONFIRMED 일 때만 enable
        → confirmStatus PENDING_PAYMENT→FINALIZED (+ finalizedByUid/At)
[ ] D4  「확정 취소」+ 사유 필수 → FINALIZED→PENDING_PAYMENT (payment 유지)
[ ] D5  Audit: PAYMENT_CONFIRM | PAYMENT_UNCONFIRM
              | ALLOCATION_FINALIZE | ALLOCATION_UNFINALIZE
        (UX alias: PAYMENT_CONFIRMED / … / RESERVATION_FINALIZED — same events)
[ ] D6  이벤트 시 회원(createdByUid) 인앱+FCM queued 알림
[ ] D7  보드 뱃지: 🟢 입금 완료 / ✅ 예약 확정
[ ] D8  회원·비매니저는 CONFIRMED/FINALIZED 쓰기 불가 (rules)
[ ] D9  3축 모델 유지 · PR4/PR5(카카오·템플릿 harden) 미포함
[ ] D10 Domain Contract / Scope Freeze OUT 위반 없음

완료 보고에 DoD D1–D10 체크 결과를 포함한다.
```

---

## 7. PR #4 — Notification hardening (IN)

| # | Include |
|---|---------|
| 1 | Templates for: allocated guide · claim received · payment confirmed · finalized |
| 2 | Idempotent notify keys (no duplicate spam) |
| 3 | FCM delivery verify + failure logging |
| 4 | In-app `notifications` list UX if missing |

---

## 8. PR #5 — Kakao (OUT of MVP · separate GO)

| # | Include only after PM GO |
|---|--------------------------|
| 1 | Kakao 알림톡 / 채널 message |
| 2 | SMS fallback (optional) |

---

## 9. Explicit OUT (all PRs until separate GO)

```text
❌ 카카오 알림톡 (until PR5 GO)
❌ SMS (until PR5 GO)
❌ PG 결제
❌ 가상계좌
❌ 은행 API
❌ CSV / 거래내역 자동 매칭 runtime
❌ 자동 CONFIRMED (member or bank)
❌ 자동 FINALIZED on payment confirm (PS1)
❌ 미입금 자동 취소 (Q4)
❌ 환불 C4 runtime
❌ 요금 청구서 persist 강화 / Stripe
❌ Domain Contract redesign / 3-axis collapse
```

---

## 10. Acceptance matrix (MVP complete = PR1+PR2+PR3+PR4)

| Actor | Action | Expected |
|-------|--------|----------|
| Admin | Allocate | Reservation + code + QR/detail + PENDING_PAYMENT |
| System | Trigger | Idempotent; no double reservation |
| Member | Open detail | Sees account/amount/deadline/code |
| Member | 「입금 확인 요청」 | claim=REQUESTED; not CONFIRMED |
| Admin | 「입금 확인」 | CONFIRMED |
| Admin | 「최종 확정」 | FINALIZED only if CONFIRMED |
| System | Notify | In-app + FCM on key transitions |

---

## 11. Governance

```text
Scope creep rule:
  New feature request during PR1–PR4 → add to OUT list or new PR number
  Do not expand PR1 mid-flight without PM written exception

Implementation GO:
  [ ] This Scope Freeze acknowledged
  [ ] Start PR1 only

Production GO:
  [ ] PR1–PR3 verified locally (PR4 recommended)
  [ ] Rules reviewed
  [ ] PM deploy approval
```

---

## Final status

```text
DESIGN PHASE              = CLOSED ✅
MVP SCOPE FREEZE          = LOCKED 🔒 2026-07-27
PR ORDER                  = PR1→PR2→PR3→PR4→PR5 🔒
NEXT                      = Implementation GO for PR1 (Reservation Engine)
CODE / FUNCTIONS / DEPLOY = not authorized by this doc alone
                            (requires explicit Implementation GO per PR)
```
