# YAGO Nowon — Payment Signal + Allocation Confirm (Design)

```text
DATE: 2026-07-27 (PS5 CONDITIONAL UNLOCK · 3-axis LOCK)
STATUS: PRODUCT LOCK UPDATED ✅ — implementation NOT started
PS1/PS2: LOCKED ✅
PS5: CONDITIONAL UNLOCK ✅ (member claim ≠ admin confirm)
FEATURE: design LOCK first → MVP scope lock → then code
SPRINT 4 FULL PAYMENT OS / BANK CSV AUTO-MATCH: later phase
P16 KAKAO: post-MVP
ADMIN BOARD MVP: LOCAL VERIFIED ✅
CODE / DEPLOY: HOLD until MVP scope GO
```

**Upstream locks**

- Domain: `docs/YAGO_NOWON_VENUE_RENTAL_DOMAIN_CONTRACT.md` — **D3 Booking ≠ Payment**  
  `ALLOCATED` + `paymentStatus=UNCONFIRMED` is valid; unpaid ≠ auto-cancel  
- Board MVP: `docs/YAGO_NOWON_VENUE_ADMIN_BOARD_MVP_IMPLEMENTATION_DIRECTIVE.md`  
- Operating funnel (대표 · 2026-07-27 product LOCK):

```text
관리자 배정(ALLOCATED 최초 확정)
→ 예약정보·예약번호·QR 생성 (idempotent)
→ 인앱 알림 + FCM (MVP) · 카카오/SMS 후속
→ 회원: 예약 상세 확인 → 계좌이체 → 「입금 확인 요청」(PAYMENT_CLAIMED)
→ 관리자: 통장 확인 → 입금 확인(CONFIRMED) → 최종 확정(FINALIZED)
→ 시스템: 예약 확정 알림
```

관리자 반복 연락·안내 최소화. 관리자 행동 = **배정 · 입금 확인 · 최종 확정** 만.

---

## 0. Purpose

Admin Board에 **입금 시그널**과 **배정 확정**을 붙이고, 배정 직후 **안내·QR·알림을 자동화**하여
협회 담당자가 전화·엑셀 없이 월간 현황만으로 조치할 수 있게 한다.

이 문서는 **제품 LOCK + 시그널 MVP 계약**이다.  
계좌 연동·은행 CSV 자동 대사·PG·환불 엔진은 **포함하지 않는다** (후속 phase).  
회원 「입금 확인 요청」은 **PS5 CONDITIONAL UNLOCK** — 신고≠확정.

---

## 1. Principles (LOCKED with domain)

| # | Principle |
|---|-----------|
| S1 | **배정(ALLOCATED) ≠ 입금(CONFIRMED) ≠ 확정(FINALIZED)** — 세 축 분리 |
| S2 | 미입금 자동 취소 금지 (Q4 / D3) |
| S3 | 입금 **확정(CONFIRMED)** = **협회 관리자 수동 시그널** (은행 API 없음) |
| S4 | 요금 숫자는 Sprint 3 `DISPLAY_ONLY_ESTIMATE` — 시그널과 독립 |
| S5 | 공개 클럽 보드에 타 클럽 입금/확정 상태 노출 금지 |
| S6 | 시그널·확정·클레임 변경도 **append-only 이력** (P13 정신) |
| S7 | **단일 선형 enum 금지** — `REQUESTED→…→FINALIZED` 한 줄 합침 REJECTED |
| S8 | 회원 신고는 `PAYMENT_CLAIMED` / claim 축 — **절대 CONFIRMED로 직행 금지** |

---

## 2. Status model — 3-axis LOCK (2026-07-27)

### 2.0 Forbidden (REJECTED)

```text
REQUESTED → ALLOCATED → PAYMENT_REQUESTED → PAYMENT_CONFIRMED → FINALIZED
= REJECTED (단일 상태값 합침 금지)
```

### 2.1 Three axes (LOCKED)

```text
배정 상태     requestStatus / winner.status
입금 상태     paymentStatus  (+ paymentClaimStatus)
최종 확정     confirmStatus
```

```typescript
// Axis A — allocation (existing)
requestStatus: REQUESTED | ALLOCATED | NOT_ALLOCATED | WITHDRAWN | CANCELLED

// Axis B — payment (extended)
paymentStatus: UNCONFIRMED | CONFIRMED
paymentClaimStatus?: NONE | REQUESTED   // member 「입금 확인 요청」
// 표기 alias: PAYMENT_CLAIMED == paymentClaimStatus === REQUESTED && paymentStatus === UNCONFIRMED

// Axis C — final confirm
confirmStatus: PENDING_PAYMENT | FINALIZED
```

**PAYMENT_CLAIMED LOCK (2026-07-27):**  
회원이 입금했다고 **신고**한 상태이며, 협회 관리자 통장 확인 전까지 **입금 완료(`paymentStatus=CONFIRMED`)로 간주하지 않는다.**  
Canonical: `paymentClaimStatus=REQUESTED` ∧ `paymentStatus=UNCONFIRMED`.  
Member claim path는 `CONFIRMED` / `FINALIZED` 금지.

Allocation write paths today leave `paymentStatus = UNCONFIRMED`.  
`confirmStatus` / `paymentClaimStatus` = design LOCK (PR1 defaults; PR2 claim write).

### 2.2 State matrix

| 운영 단계 | request/winner | paymentStatus | paymentClaimStatus | confirmStatus |
|-----------|----------------|---------------|--------------------|---------------|
| 배정 직후 | ALLOCATED | UNCONFIRMED | NONE | PENDING_PAYMENT |
| 회원 입금 확인 요청 | ALLOCATED | UNCONFIRMED | **REQUESTED** | PENDING_PAYMENT |
| 관리자 입금 확인 | ALLOCATED | **CONFIRMED** | (cleared or kept audit) | PENDING_PAYMENT |
| 최종 확정 | ALLOCATED | CONFIRMED | — | **FINALIZED** |
| 취소/재배정 | CANCELLED / new | reset | reset | reset |

`confirmStatus=FINALIZED` ∧ `paymentStatus≠CONFIRMED` → **금지** (rules).  
회원은 `paymentStatus` / `confirmStatus`를 쓸 수 없음.

### 2.3 Admin board visual signal (UX only)

| Signal | Condition | Copy |
|--------|-----------|------|
| 🔴 미입금 | ALLOCATED ∧ UNCONFIRMED ∧ claim≠REQUESTED ∧ not FINALIZED | 미입금 |
| 🟠 입금 확인 요청 | UNCONFIRMED ∧ claim=REQUESTED ∧ not FINALIZED | 입금 확인 요청 |
| 🟢 입금 완료 | paymentStatus=CONFIRMED ∧ confirm ≠ FINALIZED | 입금 완료 |
| ✅ 확정 | confirmStatus=FINALIZED | 예약 확정 |

MVP 권장 표시: **미입금 / 입금 확인 요청 / 입금 완료 / 예약 확정**.

월간 리스트 행 우측 뱃지 예시:

```text
수락산  07/15  06–08   A클럽   배정 · 🔴 미입금
초안산  07/15  18–20   B클럽   배정 · 🟢 입금 완료
마들    07/16  08–10   —      신청 4팀
육사    07/17  06–08   C클럽   배정 · ✅ 확정
```

---

## 3. Admin actions (MVP)

슬롯 상세 (ALLOCATED) 우측 패널:

```text
배정 클럽 / 배정자 / 배정시간 / allocationSource
입금 시그널: 🔴 미입금 | 🟢 입금 완료
[입금 확인] [입금 해제]     ← manager only
배정 확정:   ✅ / 대기
[배정 확정]                   ← requires payment CONFIRMED
[확정 취소]                   ← optional; requires reason (§5)
재배정 / 취소 / 이력          ← 기존 P11–P13
```

### 3.0 회원 「입금 확인 요청」 (PS5 CONDITIONAL UNLOCK)

```text
버튼 카피: 「입금 확인 요청」  (「입금 완료」 금지 — 오인 방지)
Effect: paymentClaimStatus NONE → REQUESTED
        paymentStatus 는 UNCONFIRMED 유지 (CONFIRMED 직행 금지)
Actor: 배정 팀 멤버 / 신청자 (authenticated)
이력: changeType = PAYMENT_CLAIM
```

### 3.1 입금 확인 (관리자만)

```text
UNCONFIRMED → CONFIRMED
recordedByUid, confirmedAt
claim 해소 (REQUESTED → cleared / audit trail)
이력: changeType = PAYMENT_CONFIRM
사유: optional note (입금자명·메모) — P13 코드 필수는 아님
```

### 3.2 입금 해제 (실수 복구)

```text
CONFIRMED → UNCONFIRMED
confirmStatus must not stay FINALIZED → 자동 PENDING_PAYMENT 강등 또는 해제 금지
권장: FINALIZED면 입금 해제 DENY → 먼저 확정 취소
이력: PAYMENT_UNCONFIRM
```

### 3.3 배정 확정

```text
Requires: winner ALLOCATED ∧ paymentStatus == CONFIRMED
PENDING_PAYMENT → FINALIZED
finalizedByUid, finalizedAt
이력: ALLOCATION_FINALIZE
```

### 3.4 확정 취소 (운영 실수)

```text
FINALIZED → PENDING_PAYMENT (payment stays CONFIRMED)
사유 필수 (P13 reason codes 재사용)
이력: ALLOCATION_UNFINALIZE
재배정/취소: FINALIZED면 경고 강화 또는 DENY until unfinalize — §4 정책
```

---

## 4. Policy decisions

| ID | Question | Decision | Status |
|----|----------|----------|--------|
| PS1 | 입금 확인 시 자동 확정? | **수동 분리** — 입금 확인 ≠ 배정 확정 (각각 클릭) | **LOCKED ✅** 2026-07-16 |
| PS2 | FINALIZED 후 재배정/취소 | **확정 취소(+사유) 후에만** 재배정/취소 가능 | **LOCKED ✅** 2026-07-16 |
| PS3 | 미입금 리마인드 | MVP = 보드 뱃지 + (후속) 알림 | draft |
| PS4 | 입금 기한 UI | 사용 전월까지 (Q3) — 예약 상세에 표시 | **LOCKED ✅** 문구 |
| PS5 | 회원 「입금 확인 요청」 | **CONDITIONAL UNLOCK** — claim=REQUESTED only; CONFIRMED는 관리자만 | **LOCKED ✅** 2026-07-27 |
| PS6 | 이력에 입금·확정·클레임 포함 | YES | LOCKED ✅ |
| PS7 | 상태 모델 | **3축 유지** — 단일 선형 enum REJECTED | **LOCKED ✅** 2026-07-27 |
| PS8 | 배정 Trigger | ALLOCATED **최초** 확정 시만 자동 절차 · idempotent | **LOCKED ✅** 2026-07-27 |
| PS9 | 식별자 | `reservationId` (내부) ≠ `shortReservationCode` (표시·입금메모) | **LOCKED ✅** 2026-07-27 |
| PS10 | 알림 MVP | 인앱 Notification → FCM; Kakao/SMS 후속 | **LOCKED ✅** 2026-07-27 |

### PS5 CONDITIONAL UNLOCK (정식 문구)

```text
PS5 CONDITIONAL UNLOCK

회원은 입금 사실을 신고할 수 있다.
단, 회원 신고는 PAYMENT_CLAIMED (paymentClaimStatus=REQUESTED) 이며
PAYMENT_CONFIRMED (paymentStatus=CONFIRMED) 가 아니다.

최종 입금 확인 권한은 협회 관리자에게만 있다.
```

---

## 5. Change log extension

Extend `venueAllocationChangeLogs.changeType`:

```text
REALLOCATE | CANCEL
| PAYMENT_CLAIM
| PAYMENT_CONFIRM | PAYMENT_UNCONFIRM
| ALLOCATION_FINALIZE | ALLOCATION_UNFINALIZE
```

Fields (reuse):

```text
changedByUid, changedAt, reasonCode?, reasonText?
fromTeamId / toTeamId (N/A for payment — null)
paymentStatusAfter, paymentClaimStatusAfter, confirmStatusAfter
```

---

## 6. Firestore shape (proposal)

### Winner (`venueSlotAllocations`) + winning request

```text
+ paymentStatus: UNCONFIRMED | CONFIRMED
+ paymentClaimStatus: NONE | REQUESTED
+ confirmStatus: PENDING_PAYMENT | FINALIZED
+ reservationId?: string              // internal SoT id (stable)
+ shortReservationCode?: string       // e.g. NW-2507-A3F2 — 입금 메모용
+ paymentConfirmedByUid?, paymentConfirmedAt?
+ paymentClaimedByUid?, paymentClaimedAt?
+ finalizedByUid?, finalizedAt?
```

**SoT recommendation:** winner cursor = board-facing payment/confirm/claim;  
request doc synced in same transaction (allocate pattern).

### Reservation detail (deep link / QR target)

```text
Path (proposal): federations/{slug}/venueReservations/{reservationId}
  or derive from winning request id
QR → authenticated Reservation Detail Page:
  shortReservationCode, venue, date, slot, team,
  bank account guide, amount estimate, payment deadline (사용 전월까지),
  CTA 「입금 확인 요청」 when claim allowed
```

### Rules (sketch — implement later)

- Manager-only: CONFIRMED / FINALIZED / UNCONFIRM  
- Member (assignee team): PAYMENT_CLAIM only  
- FINALIZE only if payment CONFIRMED  
- UNCONFIRM denied if FINALIZED  
- Club cannot set CONFIRMED / FINALIZED  
- Catch-all continues to exclude allocation collections  

### Trigger (PS8)

```text
WHEN requestStatus/winner first becomes ALLOCATED (create or transition)
THEN idempotent job:
  ensure reservationId + shortReservationCode
  ensure confirmStatus=PENDING_PAYMENT, claim=NONE
  enqueue notify (in-app + FCM MVP)
  do NOT re-run on reallocate of same logical booking without new winner
```

---

## 7. Admin Board UX placement

| Surface | Change |
|---------|--------|
| 월간 리스트 | 배정 행에 🔴/🟢/✅ 뱃지 |
| 슬롯 상세 | §3 액션 버튼 |
| 필터 (NICE) | `미입금만` / `확정만` |
| 공개 구장 보드 | **변경 없음** (타팀 입금 비공개) |

클릭 예산 (목표):

```text
입금 확인 = 1클릭 (+선택 메모)
배정 확정 = 1클릭 (입금 완료 후에만 enable)
```

---

## 8. Out of scope (explicit · this MVP)

```text
- 미입금 자동 취소 (Q4 LOCK)
- PG · 가상계좌
- 은행 CSV / 거래내역 자동매칭 runtime (설계만: shortReservationCode 준비)
- 환불 C4 runtime
- 카카오 알림톡 · SMS (post-MVP; MVP = in-app + FCM)
- pricingSnapshot 청구서 persist 강화
- Production deploy without MVP scope GO
```

**In scope (after Implementation GO):**  
ALLOCATED trigger · reservationId/shortCode · QR/detail · claim CTA ·  
admin confirm/finalize · in-app+FCM · board badges · change logs.

---

## 9. Implementation phasing

```text
Phase 0 — PRODUCT LOCK (THIS UPDATE) ✅
  PS5 CONDITIONAL UNLOCK · PS7 3-axis · PS8–PS10
  → next: MVP scope freeze document / PM Implementation GO

Phase 1 — P-Signal MVP (code after GO)
  1. Types: claim + confirmStatus + reservation ids
  2. ALLOCATED idempotent trigger (Functions)
  3. Reservation detail + QR
  4. Member claim API (not CONFIRMED)
  5. Admin confirmPayment / finalize (+ unconfirm/unfinalize)
  6. Rules + board badges + 「입금 확인 요청」큐
  7. notifications + FCM
  8. Local verify — STOP — Production GO separate

Phase 2 — Kakao / SMS · CSV assist match
Phase 3 — Auto-reconcile (optional)
```

---

## 10. Exit criteria → implementation GO

```text
[x] PS1–PS2 LOCK
[x] PS5 CONDITIONAL UNLOCK (2026-07-27)
[x] PS7 3-axis state model LOCK
[x] PS8 Trigger · PS9 ids · PS10 notification order LOCK
[x] MVP scope freeze — docs/YAGO_NOWON_VENUE_PAYMENT_MVP_SCOPE_FREEZE.md
[ ] Implementation GO (code) — start at PR1 only
[ ] Production GO (deploy)
```

---

## Final status

```text
Architecture: PASS
Domain: PASS (PS5 re-LOCK done)
Design phase: CLOSED ✅
MVP Scope Freeze: LOCKED 🔒
Implementation Readiness: READY for PR1 after Implementation GO

PAYMENT SIGNAL + CONFIRM = PRODUCT LOCK UPDATED (2026-07-27)
CODE = NOT STARTED
PRODUCTION = HOLD 🔒
NEXT = Implementation GO → PR1 Reservation Engine
SoT scope = docs/YAGO_NOWON_VENUE_PAYMENT_MVP_SCOPE_FREEZE.md
```
