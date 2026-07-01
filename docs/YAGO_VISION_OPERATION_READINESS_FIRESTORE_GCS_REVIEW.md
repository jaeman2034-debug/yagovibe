# YAGO Vision — Operation Readiness: Firestore / GCS Review

**Status:** 📋 **REVIEW IN PROGRESS** — Phase 2 Engineering Design Review complete  
**Date:** 2026-06-29 (Phase 1 실측 · Phase 2 설계 검토: 2026-06-29)  
**Branch:** `vision-v2-i13` @ `60ac61b`  
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
| Firestore/GCS Review | ▶ Phase 1 ✅ · Phase 2 ✅ · Phase 3~5 ⏳ |
| Pre-Pilot Dry Run #2 | ✅ **PASS** (§6) |
| Engineering Design Review | ✅ **complete** (§7) |
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

> **Phase 1 실측 (prod `yago-vibe-spt`, pilot `D7TUZaOtfxdBc4P0lQLx`):**  
> CF SoT는 `teams/{teamId}/aiIngest/{mediaId}` (not `media/`). 아래 표는 **운영 실경로** 기준.

| Collection / Path | Purpose | Review Focus |
|-------------------|---------|--------------|
| `teams/{teamId}/aiIngest/{mediaId}` | Upload meta (Storage path · privacy) | teamId · storagePath 일치 |
| `teams/{teamId}/aiIngest/{mediaId}/visionRuns/{runId}` | Run lifecycle (CF SoT) | status enum · idempotency |
| `teams/{teamId}/visionMatchIndex/{matchId}` | Match ↔ run lookup | index ↔ run 동기화 |
| `teams/{teamId}/matches/{matchId}/visionAnalysis/{analysisId}` | Analysis SoT (GEV/FII output) | completion · immutability |
| `teams/{teamId}/visionUploadQueue/{mediaId}` | Upload queue (RC5-2) | queued → processing |
| `teams/{teamId}/cvGrowthLinks/{linkId}` | CV → Growth bridge | RC5-6/J5 verified |
| `teams/{teamId}/playerGrowthAvatar/{playerId}` | Parent read path | LOCK — no schema change |
| `teams/{teamId}/matches/{matchId}/tacticalV2/jobs/{jobId}` | *(design)* Pass Network job | **NOT DEPLOYED** |

**Legacy / drift note:** RC5-1 schema doc · `useVisionJobMonitor.ts` still reference `teams/…/media/…/visionRuns` — **Phase 2 §7.2:** CF `aiIngest` = SoT.

**Checklist (현행 RC5):**

| # | Check | Method | Verdict | Notes |
|---|-------|--------|:-------:|-------|
| F1-1 | Run doc 생성 시 `teamId` 일치 | Admin SDK prod audit | ✅ PASS | 6/6 `visionRuns` · `teamId=D7TUZaOtfxdBc4P0lQLx` |
| F1-2 | Coach uid → team member 권한 | Firestore members doc | ✅ PASS | `jMLLIxy…` role=`coach` · status=`active` · Dry Run #1 login ✅ |
| F1-3 | Parent uid → read-only (report) | parentLink + members | ⚠ REVIEW | `wSlh4o…` parent active · link `player-ap-63d56190` ✅ · rules 미검증 · Parent Report E2E 미재실행 |
| F1-4 | Analysis completion 전이 | visionRun + visionAnalysis audit | ⚠ REVIEW | 6 runs `status=completed` · analysis docs exist · **top-level `status` 필드 없음** (`trackingStatus` 등) · `visionMatchIndex` stuck `queued` / `runId=null` |
| F1-5 | Failed run recovery | Ops docs | ✅ PASS | `retryVisionAnalysis` · `YAGO_VISION_RC5_OPS_ISSUE_REPORT.md` · RC5-1 schema |
| F1-6 | Index coverage (composite) | `firestore.indexes.json` + prod | ✅ PASS | Primary UI = doc-path by `matchId`/`mediaId` · vision composite index 없음 · collectionGroup+teamId 쿼리 시 index 필요 (미사용 경로) |
| F1-7 | PII / uid exposure in client | `firestore.rules` repo audit | ⚠ REVIEW | Repo rules에 `vision*`/`aiIngest` 명시 규칙 **없음** · deployed rules API 403 · OR-9 |
| F1-8 | Write rate / batch limits | Pilot volume | ✅ PASS | 1 index · 6 runs · 5+ analysis · 5 aiIngest docs — pilot scale OK |

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

| # | Check | Verdict | Notes |
|---|-------|:-------:|-------|
| F2-1 | No new **root** collections | ✅ PASS | All team-scoped under `teams/{teamId}/matches/…/tacticalV2/` |
| F2-2 | `graphHash` idempotency documented | ✅ PASS | `I13_5_PERSIST_SPEC.md` §7.2 |
| F2-3 | Coach read / CF write only | ⚠ REVIEW | Design OK · repo rules 미구현 (OR-14) |
| F2-4 | `rejected.jsonl` coach-hidden | ✅ PASS | GCS path + CF-only write in spec |
| F2-5 | Job trigger: `visionAnalysis.status == completed` | ⚠ REVIEW | Prod `visionAnalysis` has **no top-level `status`** · trigger should use `visionRun.status=completed` or analysis doc existence (Phase 2 §7.5) |
| F2-6 | Backward compat with RC5 runs | ✅ PASS | `tacticalV2/` parallel · no overwrite of `visionAnalysis` |
| F2-7 | Schema version field on all docs | ✅ PASS | `passNetwork/v1` in spec |

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
| `teams/{teamId}/aiIngest/raw/{mediaId}.mp4` | Source MP4 (Privacy Engine) | upload size · retention |
| `teams/{teamId}/aiIngest/anonymized/{mediaId}.mp4` | Whisper input | post-blur immutability |
| `teams/{teamId}/aiIngest/media/{mediaId}.mp4` | Legacy upload path | Privacy Engine OFF 시 |
| `teams/{teamId}/aiIngest/visionGev/{mediaId}/*` | GEV output | worker write-once |
| `teams/{teamId}/aiIngest/visionTracking/{mediaId}/*` | tracks.jsonl / registry | worker write-once |
| Whisper / transcript blobs | Audio pipeline | timeout / chunk (Dry Run #1) |

**Checklist:**

| # | Check | Method | Verdict | Notes |
|---|-------|--------|:-------:|-------|
| G1-1 | Upload completes before queue trigger | Dry Run #1 + CF flow | ✅ PASS | Attempt #1 Upload+Storage ✅ · signed URL → confirm → queue enqueue |
| G1-2 | Object lifecycle (temp vs permanent) | bucket lifecycle | ⚠ REVIEW | `yago-vibe-spt.firebasestorage.app` lifecycle rule **없음** · raw+anonymized+worker artifacts retained |
| G1-3 | Max object size vs Pilot MP4 | GCS object audit | ⚠ REVIEW | max **45.1 MB** (2 objects) · Dry Run #1 Whisper timeout on 45MB/10min · Beta ≤3min 권장 |
| G1-4 | CORS for client upload | bucket CORS config | ✅ PASS | origin `*` · PUT/POST allowed · Dry Run #1 browser upload ✅ |
| G1-5 | SA write / user read separation | CF + worker paths | ✅ PASS | Client: signed URL PUT · Worker: `visionGev/` · `visionTracking/` via SA |
| G1-6 | No public ACL on pilot buckets | IAM policy audit | ✅ PASS | no `allUsers` / `allAuthenticatedUsers` bindings (2 bindings total) |
| G1-7 | Region colocation (Firestore + GCS) | GCP describe | ⚠ REVIEW | Firestore **asia-northeast3** · GCS bucket **US-CENTRAL1** — cross-region |
| G1-8 | Cost budget per pilot match | object count | ⚠ REVIEW | pilot prefix **64 objects** · 19 raw MP4 · budget alarm 미설정 — estimate only |

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
| G2-1 | Prefix mirrors Firestore `gcsPrefix` on job doc | ✅ | §7.5 — aligns with `aiIngest/visionGev/` prod pattern |
| G2-2 | Large artifacts offloaded from Firestore | ✅ | edges → GCS in spec |
| G2-3 | Versioning / overwrite policy | ✅ | graphHash skip in spec |
| G2-4 | Signed URL expiry for coach download | ✅ | design-only; CF signed URL pattern exists |
| G2-5 | Backup includes GCS prefix in manifest | ✅ | Persist §6 manifest |
| G2-6 | Separate bucket vs folder for Vision | ✅ | folder under default bucket (prod) |

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
| OR-11 | Firestore path doc/code drift (`media/` vs `aiIngest/`) | 🟡 Med | Med | **Phase 2:** CF `aiIngest` = SoT · doc/client stale · doc fix + client hook **Pre-Beta backlog** (no change this sprint) | Eng |
| OR-12 | `visionMatchIndex` stale vs completed runs | 🟡 Med | Med | **Phase 2:** overwrite-on-new-upload by design · orphaned upload (0 runs) · ops reconcile · Coach reads `visionAnalysis` OK | Ops |
| OR-13 | Firestore/GCS region mismatch | 🟢 Low | Med | **Phase 2:** historical Firebase default · acceptable Beta · region alignment **Post-Beta** | Ops |
| OR-14 | Vision Firestore rules missing in repo | 🔴 High | Med | **Phase 2:** repo `firestore.rules` has no vision/aiIngest rules · **Pre-Beta deploy gate** (rules only, separate approval) | Eng |

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
| 1 | Complete §1.2 RC5 Firestore checks (Dry Run #2) | Ops + Eng | ✅ 2026-06-29 |
| 2 | Complete §2.1 GCS checks | Ops | ✅ 2026-06-29 |
| 3 | Eng review §1.3 / §2.2 design mapping | Eng | ✅ 2026-06-29 (§7.5) |
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

## 6. Pre-Pilot Dry Run #2 — Phase 1 Report

**Date:** 2026-06-29  
**Operator:** Cursor Ops (gcloud + Admin SDK)  
**Project:** `yago-vibe-spt`  
**Pilot teamId:** `D7TUZaOtfxdBc4P0lQLx`  
**Method:** Production read-only audit (no writes · no code changes)  
**Prior:** Dry Run Attempt #1 (2026-06-30) — 7/10 · Whisper timeout on 45MB MP4

### 6.1 Phase 1 Verdict

| Area | PASS | REVIEW | FAIL | Gate |
|------|------|--------|------|------|
| §1.2 Firestore | 5 | 3 | 0 | ⏳ REVIEW items → Phase 2/PM |
| §2.1 GCS | 4 | 4 | 0 | ⏳ REVIEW items → Phase 2/PM |
| **Total** | **9** | **7** | **0** | **Phase 1 complete** |

**Phase 1 판정:** ✅ **실측 완료** — Critical FAIL 없음 · REVIEW 7건은 Phase 2 Engineering Design Review 및 PM 판정 대상.

### 6.2 Firestore 실측 스냅샷

| Path | Exists (pilot) | Sample |
|------|:--------------:|--------|
| `visionMatchIndex/cgOEK8Q75csiFFdVEE70` | ✅ | status=`queued` · mediaId=`e519af9a…` · runId=null |
| `aiIngest/{mediaId}` | ✅ (5+) | storagePath=`…/aiIngest/raw/{mediaId}.mp4` |
| `aiIngest/{mediaId}/visionRuns/*` | ✅ (6) | all `status=completed` · matchId=`cgOEK8Q75csiFFdVEE70` |
| `matches/…/visionAnalysis/*` | ✅ (5+) | schema v1 · no top-level `status` field |
| `visionUploadQueue/*` | empty | queue docs expired or consumed |
| `teams/…/members/jMLLIxy…` | ✅ | coach · active |
| `teams/…/members/wSlh4o…` | ✅ | parent · active |
| `parentLinks/wSlh4o…_player-ap-63d56190` | ✅ | status=active |

### 6.3 GCS 실측 스냅샷

| Prefix | Objects | Notes |
|--------|---------|-------|
| `aiIngest/raw/` | 19 | max **45.1 MB** |
| `aiIngest/anonymized/` | 14 | Whisper-ready |
| `aiIngest/visionGev/{mediaId}/` | ✅ | `gev_events.jsonl` · `gev_summary.json` |
| `aiIngest/visionTracking/{mediaId}/` | ✅ | `tracks.jsonl` · `tracks_registry.json` |
| `teams/…/vision/` (legacy doc path) | ❌ | not used in prod |
| **Total pilot prefix** | **64** | bucket `yago-vibe-spt.firebasestorage.app` |

**Infra:**

| Item | Value |
|------|-------|
| Firestore region | `asia-northeast3` |
| GCS bucket region | `US-CENTRAL1` |
| PITR | DISABLED (§1.5 Phase 3) |
| Public IAM | none |
| CORS | `*` origin · PUT allowed |

### 6.4 REVIEW items (action owners)

| ID | Item | Owner | Next step |
|----|------|-------|-----------|
| R-D2-1 | Parent Report E2E + rules verification | Ops | Attempt #2 short MP4 + Parent UI smoke |
| R-D2-2 | `visionMatchIndex` vs completed runs sync | Ops | Reconcile index for `cgOEK8Q75csiFFdVEE70` · document ops procedure |
| R-D2-3 | Firestore rules: vision/aiIngest paths not in repo | Eng | Phase 2 — deployed vs repo diff (no deploy) |
| R-D2-4 | Client `media/` vs CF `aiIngest/` visionRuns path | Eng | Phase 2 design review · OR-11 |
| R-D2-5 | GCS lifecycle / retention policy undefined | Ops | Phase 3 backup drill input |
| R-D2-6 | 45MB+ MP4 Whisper timeout | Ops | Beta clip ≤3min · RC5-5 backlog |
| R-D2-7 | Cross-region Firestore/GCS | Ops | OR-13 cost/latency note for Beta plan |

### 6.5 Explicit non-actions (Phase 1 LOCK)

코드 · Schema · Worker · Tracking · GEV · Callable · UI · Parent · Push — **변경 없음**.

---

## 7. Engineering Design Review — Phase 2 Report

**Date:** 2026-06-29  
**Scope:** P0 (OR-11 · OR-12 · R-D2-3) + P1 (OR-13 · Lifecycle · Budget · Parent Read) + I13 §1.3/§2.2 alignment  
**Method:** Code + prod read-only audit + rules repo analysis · **no code/deploy changes**

### 7.1 Phase 2 Verdict

| Priority | Item | Verdict | Beta blocker? |
|----------|------|:-------:|:-------------:|
| **P0** | OR-11 SoT path drift | ✅ **Resolved (design)** | No — doc/client backlog |
| **P0** | OR-12 Index status | ✅ **Explained (by design)** | No — ops reconcile |
| **P0** | R-D2-3 Rules gap | ⚠ **Pre-Beta action** | **Yes** — rules deploy gate (OR-14) |
| P1 | OR-13 Region | ✅ Accept Beta | No |
| P1 | GCS Lifecycle | ⏳ Defer | No |
| P1 | Cost budget alarm | ⏳ Defer | No |
| P1 | Parent Read E2E | ⏳ Defer | No |

**Phase 2 판정:** ✅ **PASS (design review)** — P0 drift items explained; **one Pre-Beta gate** (Firestore rules OR-14).

### 7.2 OR-11 — SoT Path Drift (P0)

**Question:** 문서·코드·운영 경로 차이가 의도된 것인가?

| Layer | `visionRuns` / media meta path | Source |
|-------|-------------------------------|--------|
| **CF (operational SoT)** | `teams/{teamId}/aiIngest/{mediaId}/visionRuns/{runId}` | `mediaDocRef()` in `academyMediaIngestHelpers.ts` |
| **GCS worker output** | `…/aiIngest/visionGev/{mediaId}/` · `…/visionTracking/{mediaId}/` | prod GCS audit §6.3 |
| **Client Job Monitor** | `teams/{teamId}/media/{mediaId}/visionRuns/{runId}` | `useVisionJobMonitor.ts:84` **only stale client ref** |
| **RC5-1 / Kickoff / I13 design docs** | `teams/{teamId}/media/{mediaId}/visionRuns/…` | pre–Privacy Engine schema |

**Conclusion:** **Not intentional dual-path.** Sprint 10B migrated media meta to `aiIngest/`; CF and GCS follow it. RC5-1 schema doc + one client hook + I13 design table were **not updated**.

**Functional impact today:**

- `useMatchVisionPipelineStatus` reads `visionMatchIndex` ✅ (path correct)
- `useVisionJobMonitor` run-doc subscription reads **`media/`** → `hasRunDoc=false` even when runs exist under `aiIngest/`
- Coach/Parent analysis via `visionAnalysis` collection ✅ unaffected

**Disposition:** Document SoT = **`aiIngest`**. Pre-Beta backlog: (1) update RC5-1/Kickoff/I13 path tables, (2) fix `useVisionJobMonitor` path — **out of scope for Review Sprint code change**.

### 7.3 OR-12 — Index Status (P0)

**Observed (matchId `cgOEK8Q75csiFFdVEE70`):**

| Artifact | State |
|----------|-------|
| `visionMatchIndex` | status=`queued` · mediaId=`e519af9a…` · runId=null |
| `aiIngest/e519af9a…/visionRuns` | **empty** (upload confirmed · run never created) |
| `aiIngest/57c66937…/visionRuns` | **6× `completed`** · same matchId |

**Root cause (design, not sync bug):**

1. `confirmAcademyMediaUpload` calls `upsertVisionMatchIndex({ status: "queued", mediaId: new })` **before** run creation (`academyMediaIngestCallables.ts:170`).
2. New upload **overwrites** index even when prior media on same matchId already completed.
3. Media `e519af9a…` never progressed (queue/run not created) — index stuck at pre-run `queued`.

**Functional impact:**

- Job Monitor for this match shows **queued** (index-driven) · run progress detail missing (`media/` path drift amplifies).
- **`visionAnalysis` docs exist** (5+) for this matchId — Coach/Parent intelligence paths can still serve data.
- Pilot JSON matchId `vision-pilot-pass01-clip-002` has **no** `visionMatchIndex` doc (fixture vs prod fixture id mismatch — ops note only).

**Disposition:** **By-design overwrite + orphaned upload.** Ops procedure: delete stale queue/index for failed upload OR retry queue; do not treat as Firestore corruption. **No schema change required.**

### 7.4 R-D2-3 / OR-14 — Rules Gap (P0)

**Repo audit (`firestore.rules`):**

- No matches for `visionMatchIndex`, `visionUploadQueue`, `aiIngest`, `visionAnalysis`, `visionRuns`.
- `teams/{teamId}` block lists explicit subcollections only; **no catch-all** for vision paths.
- Firestore default: **unlisted subcollection → deny** client read/write.

**RC5 Kickoff policy:** `visionMatchIndex` · `visionAnalysis` = staff/coach read (rules LOCK) — **specified but not implemented in repo rules file.**

**Deployed rules:** Firebase Rules API / CLI fetch failed (403 / unsupported). Cannot confirm prod == repo.

**Inference from Dry Run #1:** Upload via Callable (Admin SDK) ✅. Client index subscription status **inconclusive** (Attempt #1 stopped before Job Monitor 10/10).

**Disposition:** **Not design-allowed drift.** Repo rules are **incomplete** for Vision client reads. **Pre-Beta gate:** deploy explicit vision rules (coach/staff read · server write) as **separate PM-approved deploy** — not part of Review Sprint.

### 7.5 I13 Design vs Prod Alignment (§1.3 / §2.2)

| Check | Result |
|-------|--------|
| Team-scoped paths only | ✅ |
| GCS offload for edges/events | ✅ aligns with prod `aiIngest/visionGev/` pattern |
| Trigger `visionAnalysis.status` | ⚠ **Spec drift** — prod uses run-level `status` + analysis doc presence; I13 trigger spec should reference `visionRun.status=completed` |
| `tacticalV2/passNetwork/v1` | ✅ not deployed (expected) |

### 7.6 P1 Dispositions

| Item | Disposition |
|------|-------------|
| **OR-13 Region** | Firestore + CF `asia-northeast3` · GCS `US-CENTRAL1` = Firebase default bucket placement. **Accept for Beta**; document latency in Ops Plan. Multi-region bucket migration = post-Beta. |
| **GCS Lifecycle** | No lifecycle rules. Raw + anonymized + worker artifacts retained. **Defer** to Backup Drill (Phase 3) + Beta Ops Plan retention section. |
| **Cost budget** | 64 objects / pilot prefix; no billing alarm. **Defer** — add estimate to Beta Ops Plan. |
| **Parent Read E2E** | `useParentIntelligence` reads `visionAnalysis` via `getLatestVisionAnalysis` (correct path). parentLink verified Phase 1. Full E2E smoke = **Dry Run Attempt #2** (P1, pre-Beta). |

### 7.7 Phase 2 Explicit non-actions

코드 · Schema · Worker · Tracking · GEV · Callable · UI · Parent · Rules deploy · Push — **변경 없음**.

---

## 8. Review Status (Living)

| Section | Items | Checked | Pass | REVIEW | FAIL | Blocker |
|---------|-------|---------|------|--------|------|---------|
| §1.2 RC5 Firestore | 8 | 8 | 5 | 3 | 0 | — |
| §1.3 I13 Design | 7 | 7 | 5 | 2 | 0 | — |
| §1.4 Security | 5 | 1 | 0 | 1 | 0 | OR-14 Pre-Beta |
| §1.5 Backup | 5 | 0 | 0 | 0 | 0 | Phase 3 |
| §2.1 RC5 GCS | 8 | 8 | 4 | 4 | 0 | — |
| §2.2 I13 GCS Design | 6 | 6 | 6 | 0 | 0 | — |
| §2.3 GCS Backup | 5 | 0 | 0 | 0 | 0 | Phase 3 |

**Phase 1 (§1.2 + §2.1):** 16/16 · **9 PASS · 7 REVIEW · 0 FAIL** ✅  
**Phase 2 (P0 design):** OR-11 ✅ · OR-12 ✅ · R-D2-3 ⚠ Pre-Beta gate  
**Overall Review:** ⏳ **IN PROGRESS** (Phase 3 Backup Drill next)

---

## 9. References

- `docs/YAGO_VISION_OPERATIONS_CHARTER_v1.md`
- `docs/YAGO_VISION_PILOT2_FINAL_REVIEW.md` §9–10
- `docs/YAGO_VISION_CROSS_CLIP_VALIDATION_PLAN.md` §9
- `docs/YAGO_VISION_I13_5_PERSIST_SPEC.md` §7
- `docs/YAGO_VISION_RC5_4_OPERATION_INFO.md`
- `docs/YAGO_VISION_GT_GEV_ANNOTATION_GUIDE_v1.0.md`

---

*Operation Readiness Sprint — Firestore/GCS Review. Docs only. No production deploy.*
