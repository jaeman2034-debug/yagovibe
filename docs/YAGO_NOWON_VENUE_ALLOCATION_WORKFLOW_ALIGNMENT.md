# YAGO Nowon Federation — Venue Allocation Workflow Alignment

```text
DATE: 2026-07-16 (domain) · Production close: 2026-08-19 (Stage 12O)
BOARD UI: PRESERVED
CALENDAR UX / PAYMENT / SPRINT 4: HOLD
PRODUCTION PREALLOCATION: VERIFIED COMPLETE 🔒 (Stage 12M-R2 / 12O)

PM JUDGMENT (2026-08-19):
  PRODUCTION PREALLOCATION E2E = VERIFIED COMPLETE ✅
  HOSTING_MIGRATION = COMPLETE ✅
  AUTHORITATIVE PRICING = PRODUCTION VERIFIED ✅
  RA_ALIMTALK_LIVE_SEND = NOT VERIFIED — SEPARATE TRACK 🔒

Prior PM JUDGMENT (2026-07-16) superseded for deploy/preallocation scope only.
```

---

## 1. PM Operational Clarification

```text
Board shown on /federations/nowon-football/venues/:venueId = KEEP
Internal workflow must match actual Nowon FA operating model:

공단 연간 우선대관권
→ 협회 배정 가능 슬롯
→ 다수 클럽 배정 신청
→ 협회 관리자 조건 검토
→ 1개 클럽 최종 배정
→ 대관료 납부(별도 / HOLD)
```

Not first-requester-wins. Not one REQUESTED occupying the slot.

---

## 2. Actual Federation Operating Model

```text
FEDERATION PRIORITY RENTAL RIGHT
→ FEDERATION ALLOCATION SLOT
→ MULTI-CLUB ALLOCATION REQUESTS
→ FEDERATION ADMIN DECISION
→ ONE CLUB ALLOCATION
→ PAYMENT (separate)
```

---

## 3. Previous Booking Model

Sprint 1–3 used:

```text
venueBookings/{slot_{venueId}_{date}_{HHmm}}
```

- One document per venue+date+start  
- Second club REQUESTED → denied  
- REQUESTED treated as non-AVAILABLE on the board  

---

## 4. Current Code Audit

| Area | Finding |
|------|---------|
| Doc id | `venueSlotBookingDocId` → single active row |
| create | throws if REQUESTED/APPROVED or baseline OCCUPIED |
| Occupancy | REQUESTED → UI non-available |
| Approve | txn + canonical slot id (DA CLOSED) |
| Rules | catch-all excludes venueBookings |

---

## 5. Same-Slot Multi-Club Request Finding

```text
CLASSIFICATION
= SINGLE_REQUEST_SLOT_MODEL_MISMATCH
```

Previous model cannot represent N REQUESTED clubs for one slot.

---

## 6. Request Document Identity

**New collection (minimum clean alignment):**

```text
federations/{federationId}/venueAllocationRequests/{requestId}

requestId =
req_{venueId}_{YYYY-MM-DD}_{HHmm}_{teamId}
```

Fields: federationId, venueId, bookingDate, start/end, teamId, teamName, createdByUid, requestStatus, paymentStatus=UNCONFIRMED, timestamps.

Canonical team identity = `teamId` (not free-text).

---

## 7. Request Status Semantics

| Stored | Domain meaning | Blocking? |
|--------|----------------|-----------|
| REQUESTED | Club submitted | NO |
| ALLOCATED | Federation selected | YES (winner) |
| NOT_ALLOCATED | Not selected | NO |
| WITHDRAWN | Club withdrew | NO |

### Legacy mapping (read-compat)

| venueBookings.bookingStatus | Domain |
|-----------------------------|--------|
| REQUESTED | REQUESTED |
| APPROVED | ALLOCATED |
| REJECTED | NOT_ALLOCATED |
| CANCELLED | WITHDRAWN |

Do not silently rewrite Production booking documents.

---

## 8. Final Allocation Semantics

**Two paths → same winner cursor:**

```text
Path A — REQUEST_SELECTION
  multi-club REQUESTED → admin selects one → ALLOCATED

Path B — ADMIN_DIRECT
  admin picks joined club (teamId) → direct ALLOCATED
  (0 prior requests OK; pending REQUESTED override with explicit ack)
```

**Winner cursor:**

```text
federations/{federationId}/venueSlotAllocations/{slotId}
slotId = slot_{venueId}_{YYYY-MM-DD}_{HHmm}
```

Stores: `allocatedTeamId`, `allocatedRequestId`, `allocatedByUid`, `allocatedAt`,
`allocationSource` (`REQUEST_SELECTION` | `ADMIN_DIRECT`), `status=ALLOCATED`.

Payment remains UNCONFIRMED on the winning request (future obligation identity only).

Admin UI: federation team picker only — no free-text team name invent.

---

## 9. One-Winner Atomic Boundary

Both `allocateVenueSlotToTeam` (Path A) and `adminDirectAllocateVenueSlot` (Path B)
share the same Firestore transaction / cursor:

1. Fail if winner cursor already ALLOCATED  
2. Create winner cursor (immutable; rules deny update)  
3. Winner request → ALLOCATED (+ `allocationSource`)  
4. Peer REQUESTED → NOT_ALLOCATED  

Path B creates the winner request doc if none exists (`ADMIN_DIRECT`).  
If peers already REQUESTED, service throws `PENDING_OVERRIDE_REQUIRED:N` until UI acks.

Rules: only Federation manager may create winner / escalate statuses.  
Client concurrent allocate + rules: second winner create DENY (emulator L).  
Probe O: ADMIN_DIRECT create request + winner ALLOW for manager.

---

## 10. Team/Club Canonical Identity

- Create requires non-empty `teamId` from federation teams list  
- Rules freeze teamId/venue/date/slot after create  
- Winner stores `allocatedTeamId` (ID), optional display name snapshot  

---

## 11. Public Privacy Boundary

Board labels:

- 배정 신청 가능  
- 배정 심사 중 (own pending)  
- 배정 완료 / 우리 팀 배정 (own winner only)  

Public UI does **not** render peer team names or allocated club names.

Rules currently allow public read of winner docs (status boards); **club identity must not be rendered** (UI contract). Full field-level public redaction = remaining hardening if PM requires.

---

## 12. Existing Board Preservation

Route and layout preserved:

- venue title  
- date selector  
- vertical 2h slots  
- selected border  
- pricing estimate card  
- mobile-first width  

Copy alignment only:

- 구장 배정 신청 / 배정 신청  
- 배정 신청 가능 / 배정 심사 중 / 배정 완료  

No calendar dashboard. No payment signal.

---

## 13. Pricing Preservation

Sprint 3 engine v1.1 unchanged:

- Suraksan tiered + lighting  
- Lighting venues = 4  
- Yuksa WEEKEND_ONLY  
- DISPLAY_ONLY_ESTIMATE  

Focused pricing tests: **PASS**.

---

## 14. Payment Separation

```text
REQUESTED → ADMIN ALLOCATE → ALLOCATED → (future PAYMENT_PENDING)
```

Not implemented: 입금했습니다, bank, refund, auto-cancel.

---

## 15. Baseline 235 Semantic Review

```text
CLASSIFICATION
= BASELINE_ALLOCATION_SEMANTIC_RECONCILIATION_REQUIRED
```

**Evidence (docs):** Sprint 2 describes dated XLSX OCCUPIED baseline occupancy with `sourceAllocationLabel` (names only; no teamId FK).  

**Not proven:** “already allocated YAGO club membership” vs “Federation priority window pool”.  

**Actions taken:**

- Production 235 records: **NOT modified**  
- sourceType/status: **unchanged**  
- Quarantine 75: **untouched**  
- Public board: baseline OCCUPIED is **provenance only** — no longer shown as final club `배정 완료`; slots remain requestable under new model  
- Admin panel still lists baseline labels read-only  

Sprint 2 COMPLETE lock history preserved; this is a new alignment phase noting semantic reopen for PM.

---

## 16. Firestore Rules Matrix A–N

Script: `scripts/venue-allocation-rules-matrix.mjs`  
Runtime: `firebase emulators:exec --only firestore` → **PASS**

| # | Probe | Result |
|---|-------|--------|
| A | CLUB_A first request | ALLOW |
| B | Self → ALLOCATED | DENY |
| C | CLUB_B same slot | ALLOW |
| D | CLUB_C same slot | ALLOW |
| E | Anonymous | DENY |
| G | Peer NOT_ALLOCATE | DENY |
| H | Change teamId | DENY |
| I | Change startTime | DENY |
| J | Member winner create | DENY |
| K | Admin allocate path | ALLOW |
| L | Second admin overwrite winner | DENY |
| M | Other club modify | DENY |
| N | Public read winner (UI must hide club id) | ALLOW_READ |
| O | Admin ADMIN_DIRECT create request + winner | ALLOW |
| O | Member ADMIN_DIRECT create | DENY |

Catch-all excludes `venueAllocationRequests` + `venueSlotAllocations`.

---

## 17. Concurrency Proof

- Winner cursor: create-only; update/delete DENY  
- Emulator L: second admin overwrite DENY  
- Client allocate uses transaction (reads before writes)  

Full dual-admin simultaneous txn stress under multi-process load remains recommended before Production deploy.

---

## 18. Focused Tests

| Suite | Result |
|-------|--------|
| `tests/venueAllocationWorkflow.test.ts` (incl. ADMIN_DIRECT) | PASS |
| `tests/venuePricingEngine.test.ts` | PASS |
| Allocation rules emulator matrix A–O | PASS |
| `npm run build` | PASS |

---

## 19. Sprint 1–3 Regression

| Item | Status |
|------|--------|
| Sprint 1 venueBookings path | Preserved (legacy admin section) |
| DA catch-all exclude pattern | Extended to new collections |
| Sprint 2 baseline Production data | Untouched |
| Sprint 3 pricing v1.1 | Unchanged / tests PASS |
| Sprint 3 COMPLETE lock | Not reopened as pricing work |

---

## 20. Build Result

`npm run build` — **PASS**

---

## 21. Production Write Status

```text
STAGE 12M-R2 VERIFIED COMPLETE (2026-08-19)
One controlled Production preallocation case written and read-back verified.
See Run Board § Stage 12O and §25–27 below.

Prior statement "NONE" superseded for the single verified case only.
No baseline 235 rewrite · No Quarantine 75
```

---

## 22. Deploy Status

```text
Hosting = DEPLOYED ✅ (Stage 12L + 12L-HF)
  canonical source SHA: 70fae5f04b9dbdcbf15876a53cbd01dad49e9f70
Functions (venue pricing callables) = DEPLOYED ✅ (Stage 12N init hotfix)
Rules = unchanged in this track

PRODUCTION_PREALLOCATION E2E = VERIFIED COMPLETE 🔒
HOSTING_MIGRATION = COMPLETE 🔒
```

---

## 23. Remaining Blockers

| Blocker | Notes |
|---------|-------|
| `BASELINE_ALLOCATION_SEMANTIC_RECONCILIATION_REQUIRED` | PM decide 235 = club-final vs priority pool |
| BUG-003 status-filter UX | OPEN — Run Board |
| Field-level public redaction of `allocatedTeamId` | Optional hardening |
| Payment | HOLD |
| Allocation dashboard redesign | HOLD |
| **RA AlimTalk live send** | **NOT VERIFIED — separate track; RA gate OFF** |

**Removed as blockers (closed 2026-08-19):** Local ADMIN_DIRECT verify · Rules deploy GO for Path A+B preallocation · Hosting deploy GO for admin 선배정 UI · Production functional verification.

---

## 24. PM Review Required

```text
Production preallocation + Hosting migration = CLOSED (Stage 12O).
Await PM re-GO only for:
  RA AlimTalk live send / controlled Canary (new case; gate change separate)
  Baseline 235 semantic decision (unchanged)
  BUG-003 UX filter fix (non-blocking)
```

---

## 25. Stage 12O — Verified Production Preallocation Case (FROZEN)

```text
STATUS: VERIFIED COMPLETE / FROZEN / DO NOT REUSE 🔒
EVIDENCE: STAGE_12M_R2_READBACK.json (repo root)
RUN BOARD: docs/operations/YAGO_K3_PARALLEL_OPS_RUN_BOARD_2026-07-16.md § Stage 12O
```

| Field | Value |
|-------|-------|
| Venue | `nowon-suraksan` |
| Date / Time | `2026-09-04` · `10:00–12:00` |
| Team | 상천FC · `hBLnzeMYOU62Rg94ocmG` |
| Request ID | `req_nowon-suraksan_2026-09-04_1000_hBLnzeMYOU62Rg94ocmG` |
| Slot / Reservation ID | `slot_nowon-suraksan_2026-09-04_1000` |
| pricingStatus | `QUOTED` |
| Authoritative total | `55,000` KRW (base `55,000` · lighting `0`) |
| Counts | request / allocation / reservation = **1/1/1** · duplicate = **0** |
| Provider sends | **0** · RA gate **OFF** |

---

## 26. Failed / Aborted Cases (DO NOT REUSE)

| Case | Notes |
|------|-------|
| 2026-08-26 historical Canary | Do not reuse |
| 2026-09-03 10:00–12:00 Stage 12M | `app/no-app` · server writes **0** · retry **NO** · **not** in verified volume |

---

## 27. Notification Contract (Verified Case)

Post-commit only: **+3** `RESERVATION_ASSIGNED` queue docs (chairman / coach / manager).

`status=queued_sms_pending` · `provider=null` · `sentAt=null` · RA gate OFF.

```text
QUEUE CREATED != PROVIDER SENT
RA_ALIMTALK_LIVE_SEND = NOT VERIFIED / SEPARATE TRACK
```

---

## Final status

```text
VENUE ALLOCATION WORKFLOW = LOCAL VERIFIED ✅ (Path A + Path B LOCK)
PRODUCTION PREALLOCATION E2E = VERIFIED COMPLETE ✅ (Stage 12M-R2 / 12O) 🔒
HOSTING MIGRATION = COMPLETE ✅ (Stage 12L + 12L-HF) 🔒
AUTHORITATIVE PRICING (Production) = VERIFIED ✅ (QUOTED 55,000 · v2 BLOCK_2H) 🔒
RA ALIMTALK LIVE SEND = NOT VERIFIED — SEPARATE TRACK 🔒

Deferred (policy/UX — not blockers for verified preallocation):
  application deadline · auto priority recommend · monthly alloc counts
  non-alloc counts · adjustment reason · BUG-003 filter UX

Recommended next (separate PM re-GO):
  RA AlimTalk controlled Canary — new date/slot/case only
```
