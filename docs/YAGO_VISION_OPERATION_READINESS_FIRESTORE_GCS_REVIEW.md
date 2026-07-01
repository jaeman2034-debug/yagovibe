# YAGO Vision — Operation Readiness: Firestore / GCS Review

**Status:** 📋 **REVIEW IN PROGRESS** — Operation Readiness Sprint P0  
**Date:** 2026-06-29  
**Branch:** `vision-v2-i13` @ `e9e0f8a`  
**Charter:** `docs/YAGO_VISION_OPERATIONS_CHARTER_v1.md`  
**Persist design (read-only):** `docs/YAGO_VISION_I13_5_PERSIST_SPEC.md` §7

> **착수 승인 ≠ 운영 반영 승인.**  
> 본 Review 완료 + PM Sign-off 후에만 Firestore/GCS **점진적** 반영을 시작합니다.  
> **코드 · Schema · Callable · UI 변경 금지** (Review Sprint).

---

## 0. Executive Summary

| Gate | Status |
|------|--------|
| Vision v2 I13-5 개발 | 🔒 COMPLETE |
| Cross-Clip Primary Gate | ✅ PASS (3/3) |
| GT Dataset Improvement | ✅ FINAL PASS |
| Firestore/GCS Review | ▶ **본 Sprint** |
| Vision v2 Beta 운영 | ⏳ Review 완료 후 |

**Review 목적:** 기존 RC5 인프라 + I13-5 로컬 Persist 설계를 기준으로, **운영 반영 전** Firestore/GCS 구조·정책·권한·복구를 점검하고 PM 승인 기준을 확정한다.

---

## 1. Firestore Review Checklist

### 1.1 Pre-requisites (Gate — 모두 충족 시 Review 진행)

| # | Item | Criterion | Status | Evidence |
|---|------|-----------|--------|----------|
| F0-1 | Offline Pipeline | Coverage ≥ 0.60, 3/3 clips | ✅ | Cross-Clip §5.6 |
| F0-2 | Alignment | Coverage ≥ 0.80 per clip | ✅ | clip_002/003/004 = 1.00 |
| F0-3 | Cohort A Primary | Per-clip PASS | ✅ | Pilot2 policy + eval |
| F0-4 | Cross-Clip Aggregate | 3/3 PASS | ✅ | PM Sign-off 2026-06-29 |
| F0-5 | I13 Persist Local | `pass_network_persist.py` validate PASS | ✅ | e2e_pilot2 verify.json |
| F0-6 | v1.0 Baseline LOCK | Worker/Tracking/GEV unchanged | ✅ | `vision-v1.0-final` |

---

### 1.2 Existing Firestore Collections (RC5 — 현행 운영)

Review 대상은 **이미 배포된 RC5 Vision 경로**. I13 Pass Network **신규 경로는 §1.4 (design-only)**.

| Collection / Path | Purpose | Review Focus |
|-------------------|---------|--------------|
| `teams/{teamId}/visionRuns/{runId}` | Upload / run lifecycle | status enum · TTL · idempotency |
| `teams/{teamId}/visionMatchIndex/{matchId}` | Match ↔ run lookup | uniqueness · orphan runs |
| `teams/{teamId}/visionAnalysis/{analysisId}` | Analysis SoT (GEV/FII output) | completion trigger · immutability |
| `teams/{teamId}/cvGrowthLinks/{linkId}` | CV → Growth bridge | RC5-6/J5 verified |
| `teams/{teamId}/playerGrowthAvatar/{playerId}` | Parent read path | LOCK — no schema change |
| `teams/{teamId}/matches/{matchId}/tacticalV2/jobs/{jobId}` | *(design)* Pass Network job | **NOT DEPLOYED** |

**Checklist (현행 RC5):**

| # | Check | Method | Pass? | Notes |
|---|-------|--------|:-----:|-------|
| F1-1 | Run doc 생성 시 `teamId` 일치 | Dry Run / rules test | □ | |
| F1-2 | Coach uid → team member 권한 | Auth + rules | □ | `jMLLIxy…` pilot |
| F1-3 | Parent uid → read-only (report) | Parent path smoke | □ | `/home/parent/vision/report` |
| F1-4 | `visionAnalysis.status` 전이 | completed only after worker | □ | |
| F1-5 | Failed run recovery | Ops procedure documented | □ | Issue Report template |
| F1-6 | Index coverage (composite) | Firebase console / `firestore.indexes.json` | □ | |
| F1-7 | PII / uid exposure in client | Security rules audit | □ | |
| F1-8 | Write rate / batch limits | Pilot volume estimate | □ | 1 match ≈ N docs |

---

### 1.3 I13 Pass Network — Future Firestore Mapping (Design Review Only)

Source: `YAGO_VISION_I13_5_PERSIST_SPEC.md` §7. **구현·배포 금지** until Review PASS + PM sign-off.

| Local Artifact | Proposed Firestore Path | Review Question |
|----------------|------------------------|-----------------|
| `summary.json` | `teams/{teamId}/matches/{matchId}/tacticalV2/passNetwork/v1/summary` | Doc size · read pattern |
| `metrics.json` | embed in summary | Field cap 1MB |
| `windows/{id}.json` | subdoc or GCS offload | Firestore vs GCS split |
| Job status | `tacticalV2/jobs/{jobId}` | Idempotency via `graphHash` |

**Design Review Checklist:**

| # | Check | Pass? | Action if FAIL |
|---|-------|:-----:|----------------|
| F2-1 | No new **root** collections | □ | Revise mapping to team-scoped |
| F2-2 | `graphHash` idempotency documented | □ | Spec §7.2 |
| F2-3 | Coach read / CF write only | □ | Rules draft (no deploy) |
| F2-4 | `rejected.jsonl` coach-hidden | □ | GCS path + rules |
| F2-5 | Job trigger: `visionAnalysis.status == completed` | □ | Sequence diagram |
| F2-6 | Backward compat with RC5 runs | □ | No overwrite of cvRuns |
| F2-7 | Schema version field on all docs | □ | `passNetwork/v1` |

---

### 1.4 Firestore Security & Permissions

| # | Check | Expected | Pass? |
|---|-------|----------|:-----:|
| F3-1 | Client cannot write `tacticalV2/*` directly | CF / Admin SDK only | □ |
| F3-2 | Cross-team read blocked | rules `teamId` match | □ |
| F3-3 | Service account least privilege | CF SA roles documented | □ |
| F3-4 | Callable auth matches Firestore rules | smoke `getCvGrowthLinksContext` | □ |
| F3-5 | Audit trail for promotion/apply | `avatarPromotionAudits` LOCK | □ |

---

### 1.5 Firestore Backup / Recovery

| # | Check | Procedure | Pass? |
|---|-------|-----------|:-----:|
| F4-1 | Daily export enabled (prod) | GCP scheduled export | □ |
| F4-2 | PITR enabled (prod) | Firebase console | □ |
| F4-3 | Restore drill documented | Ops runbook § | □ |
| F4-4 | Pilot data retention policy | 90d / archive | □ |
| F4-5 | Rollback: delete bad job doc | Operator steps §6 Persist | □ |

---

## 2. GCS Review Checklist

### 2.1 Existing Vision Storage (RC5)

| Path Pattern | Content | Review Focus |
|--------------|---------|--------------|
| `teams/{teamId}/vision/{runId}/video/*` | Source MP4 | upload size · CORS |
| `teams/{teamId}/vision/{runId}/gev/*` | GEV output | immutability post-complete |
| `teams/{teamId}/vision/{runId}/tracks/*` | tracks.jsonl / registry | worker write-once |
| Whisper / transcript blobs | Audio pipeline | timeout / chunk (Dry Run #1) |

**Checklist:**

| # | Check | Method | Pass? | Notes |
|---|-------|--------|:-----:|-------|
| G1-1 | Upload completes before queue trigger | Dry Run 5/7 | □ | |
| G1-2 | Object lifecycle (temp vs permanent) | bucket rules | □ | |
| G1-3 | Max object size vs Pilot MP4 | 45MB timeout case | □ | Use ≤3min clips Beta |
| G1-4 | CORS for client upload | browser smoke | □ | |
| G1-5 | SA write / user read separation | rules | □ | |
| G1-6 | No public ACL on pilot buckets | `allUsers` deny | □ | |
| G1-7 | Region colocation (Firestore + GCS) | same region | □ | |
| G1-8 | Cost budget per pilot match | estimate | □ | |

---

### 2.2 I13 Pass Network — Future GCS Mapping (Design Review Only)

Source: `YAGO_VISION_I13_5_PERSIST_SPEC.md` §7.1

| Local File | Proposed GCS Path | Size Budget |
|------------|-------------------|-------------|
| `graph.json` / `edges.json` | `teams/{teamId}/tacticalV2/passNetwork/{analysisId}/edges.json` | < 2 MB |
| `events_canonical.jsonl` | `.../events_canonical.jsonl` | < 500 KB typical |
| `rejected.jsonl` | `.../rejected.jsonl` (ops-only) | small |

**Design Review Checklist:**

| # | Check | Pass? | Notes |
|---|-------|:-----:|-------|
| G2-1 | Prefix mirrors Firestore `gcsPrefix` on job doc | □ | §7.2 |
| G2-2 | Large artifacts offloaded from Firestore | □ | edges → GCS |
| G2-3 | Versioning / overwrite policy | □ | graphHash skip |
| G2-4 | Signed URL expiry for coach download | □ | if needed |
| G2-5 | Backup includes GCS prefix in manifest | □ | local manifest |
| G2-6 | Separate bucket vs folder for Vision | □ | ops convention |

---

### 2.3 GCS Backup / Recovery

| # | Check | Procedure | Pass? |
|---|-------|-----------|:-----:|
| G3-1 | Object versioning OR manifest replay | Persist §6 | □ |
| G3-2 | Delete protection on completed runs | hold flag | □ |
| G3-3 | Cross-region replication (prod) | optional Beta | □ |
| G3-4 | Restore from local D: backup | `output_dir.bak.*` | □ |
| G3-5 | Orphan object cleanup policy | lifecycle rule | □ |

---

## 3. 운영 위험 항목 (Risk Register)

| ID | Risk | Severity | Likelihood | Mitigation | Owner |
|----|------|----------|------------|------------|-------|
| OR-1 | Firestore/GCS deploy before Review complete | 🔴 High | Low | **This Review Gate** | PM |
| OR-2 | Schema drift vs I13 Persist spec | 🟡 Med | Med | Design-only until R-P1~P6 PASS | Eng |
| OR-3 | Whisper timeout on long MP4 | 🟡 Med | Med | Beta clip ≤3min; chunk policy | Ops |
| OR-4 | Cross-run track ID mismatch (strict=0) | 🟢 Low | High | **Aligned mode** primary; documented | Eng |
| OR-5 | GT sparse / incomplete labels | 🟢 Low | Low | GT Sprint complete; video verify | Ops |
| OR-6 | Concurrent write to same matchId | 🟡 Med | Low | graphHash idempotency + queue | Eng |
| OR-7 | Coach sees rejected events | 🟡 Med | Low | GCS path + rules coach-hidden | Eng |
| OR-8 | v1.0 Worker drift | 🟢 Low | Low | `vision-v1.0-final` LOCK | PM |
| OR-9 | Pilot PII in logs | 🟡 Med | Med | Ops log redaction policy | Ops |
| OR-10 | Backup not tested | 🔴 High | Med | F4/G3 drill before Beta | Ops |

---

## 4. 운영 승인 기준 (PM Sign-off Criteria)

Review Sprint 종료 시 PM이 아래 **전부** 확인 후 **운영 반영 착수**를 승인한다.

### 4.1 Mandatory (ALL required)

| # | Criterion | Evidence |
|---|-----------|----------|
| A1 | Cross-Clip Primary Gate PASS | Eval summaries 3/3 |
| A2 | Firestore Checklist §1.2 **≥ 90%** checked PASS | This doc |
| A3 | GCS Checklist §2.1 **≥ 90%** checked PASS | This doc |
| A4 | I13 design mapping §1.3 + §2.2 reviewed (no blockers) | Eng sign-off |
| A5 | Risk OR-1, OR-10 mitigations documented | §3 |
| A6 | Rollback procedure agreed | Persist §6 + Ops runbook |
| A7 | Beta scope = **Pilot team only** (`D7TUZaOtfxdBc4P0lQLx`) | RC5-4 Operation Info |
| A8 | Change Freeze acknowledged | Operations Charter §①-b |

### 4.2 Phased Rollout (after PM sign-off)

```text
Phase 0  Review PASS (this doc)           ← current
Phase 1  Read-only: summary from local   ← no Firestore write
Phase 2  Firestore summary doc only      ← single doc, pilot team
Phase 3  GCS edges + events upload       ← after Phase 2 stable
Phase 4  Callable trigger automation     ← after Phase 3 stable
Phase 5  Vision v2 Beta (multi-user)     ← Beta Review gate
```

**금지:** Phase 0 → Phase 4 skip. 각 Phase **≥ 1 pilot match** 검증 후 다음 Phase.

### 4.3 Explicit HOLD triggers

| Condition | Action |
|-----------|--------|
| Any F1/G1 critical check FAIL | HOLD Phase 2+ |
| New schema required without PM | HOLD — Backlog |
| Offline eval regression | HOLD — revert to local only |
| Critical bug in RC5 upload path | HOLD Beta — fix minimal only |

---

## 5. Review Execution Plan

| Step | Task | Owner | Due |
|------|------|-------|-----|
| 1 | Complete §1.2 RC5 Firestore checks (Dry Run #2) | Ops + Eng | |
| 2 | Complete §2.1 GCS checks | Ops | |
| 3 | Eng review §1.3 / §2.2 design mapping | Eng | |
| 4 | Backup drill §1.5 / §2.3 | Ops | |
| 5 | Risk register sign-off | PM | |
| 6 | PM Sign-off §4 | PM | |
| 7 | Vision v2 Beta Ops Plan draft | Ops PM | After step 6 |

**SoT documents (no code):**

| Doc | Role |
|-----|------|
| `YAGO_VISION_RC5_4_PRE_PILOT_DRY_RUN.md` | F1/G1 smoke |
| `YAGO_VISION_RC5_4_LIVE_PILOT_RUN_SHEET.md` | Run Day |
| `YAGO_VISION_I13_5_PERSIST_SPEC.md` | Future mapping |
| `YAGO_VISION_GT_GEV_ANNOTATION_GUIDE_v1.0.md` | Eval baseline |

---

## 6. Review Status (Living)

| Section | Items | Checked | Pass | Blocker |
|---------|-------|---------|------|---------|
| §1.2 RC5 Firestore | 8 | 0 | 0 | — |
| §1.3 I13 Design | 7 | 0 | 0 | design-only OK |
| §1.4 Security | 5 | 0 | 0 | — |
| §1.5 Backup | 5 | 0 | 0 | — |
| §2.1 RC5 GCS | 8 | 0 | 0 | — |
| §2.2 I13 GCS Design | 6 | 0 | 0 | — |
| §2.3 GCS Backup | 5 | 0 | 0 | — |

**Overall Review:** ⏳ **IN PROGRESS**

---

## 7. References

- `docs/YAGO_VISION_OPERATIONS_CHARTER_v1.md`
- `docs/YAGO_VISION_PILOT2_FINAL_REVIEW.md` §9–10
- `docs/YAGO_VISION_CROSS_CLIP_VALIDATION_PLAN.md` §9
- `docs/YAGO_VISION_I13_5_PERSIST_SPEC.md` §7
- `docs/YAGO_VISION_RC5_4_OPERATION_INFO.md`
- `docs/YAGO_VISION_GT_GEV_ANNOTATION_GUIDE_v1.0.md`

---

*Operation Readiness Sprint — Firestore/GCS Review. Docs only. No production deploy.*
