# YAGO Vision — Operation Readiness: Firestore / GCS Review

**Status:** 📋 **PRE-BETA GATES** — Review Sprint COMPLETE · OR-14 OPEN (Rules Drift) · Final PASS HOLD  
**Date:** 2026-07-02  
**Branch:** `vision-v2-i13` @ `b382ac2`  
**Charter:** `docs/YAGO_VISION_OPERATIONS_CHARTER_v1.md`  
**Persist design (read-only):** `docs/YAGO_VISION_I13_5_PERSIST_SPEC.md` §7

> **착수 승인 ≠ 운영 반영 승인.**  
> 본 Review 완료 + PM Sign-off 후에만 Firestore/GCS **점진적** 반영을 시작합니다.  
> **코드 · Schema · Callable · UI 변경 금지** (Review Sprint).

---

## 0. Executive Summary

| Gate | Status | 구분 |
|------|--------|------|
| Vision v2 I13-5 개발 | 🔒 COMPLETE | PASS |
| Cross-Clip Primary Gate | ✅ PASS (3/3) | PASS |
| GT Dataset Improvement | ✅ FINAL PASS | PASS |
| **Review Sprint** (Phase 1~3) | ✅ **COMPLETE** | PASS |
| PM Final Review | ✅ **COMPLETE** | PASS |
| Pre-Pilot Dry Run #2 | ✅ PASS (§6) | PASS |
| Engineering Design Review | ✅ PASS (§7) | PASS |
| Backup Drill | ✅ PASS (§9) | PASS |
| **OR-14 Rules Gate** | ⚠ **OPEN** | Pre-Beta Blocker · **Rules Drift confirmed** (§13.7.1) |
| **Vision v2 Beta Ops Plan** | 📋 **DRAFT** | Sign-off pending |
| **Operation Readiness Final PASS** | ⏳ **HOLD** | OR-14 + Ops Plan 후 |

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

| # | Check | Expected | Verdict | Notes |
|---|-------|----------|:-------:|-------|
| F3-1 | Client cannot write `tacticalV2/*` directly | CF / Admin SDK only | ✅ PASS | Path not deployed · implicit deny |
| F3-2 | Cross-team read blocked | rules `teamId` match | ⚠ REVIEW | Vision paths **unlisted** → deny (§13) |
| F3-3 | Service account least privilege | CF SA roles documented | ✅ PASS | CF-only writes via Admin SDK |
| F3-4 | Callable auth matches Firestore rules | smoke `getVisionPipelineStatus` | ✅ PASS | Callable auth in CF · client direct read gap remains |
| F3-5 | Audit trail for promotion/apply | `avatarPromotionAudits` LOCK | ⏳ | Out of Vision scope |

---

### 1.5 Firestore Backup / Recovery

| # | Check | Procedure | Verdict | Notes |
|---|-------|-----------|:-------:|-------|
| F4-1 | Daily export enabled (prod) | GCP backup schedules | ⚠ REVIEW | `gcloud firestore backups schedules list` → **0 schedules** · no Export operations in ops history |
| F4-2 | PITR enabled (prod) | Firebase console / describe | ⚠ REVIEW | `pointInTimeRecoveryEnablement: DISABLED` · `versionRetentionPeriod: 3600s` |
| F4-3 | Restore drill documented | Ops runbook § | ✅ PASS | RC5-1 `retryVisionAnalysis`/`cancelVisionAnalysis` · I13 Persist §6 · Phase 3 §9.3 |
| F4-4 | Pilot data retention policy | 90d / archive | ⚠ REVIEW | No formal 90d policy doc · GCS lifecycle absent (G3-5) |
| F4-5 | Rollback: delete bad job doc | Operator steps §6 Persist | ✅ PASS | I13 §6.3 operator steps · RC5 cancel queued run · **tacticalV2 not deployed** |

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

| # | Check | Procedure | Verdict | Notes |
|---|-------|-----------|:-------:|-------|
| G3-1 | Object versioning OR manifest replay | bucket + worker | ⚠ REVIEW | GCS **versioning off** · replay = re-run worker from `aiIngest` source MP4 + registry paths |
| G3-2 | Delete protection on completed runs | hold flag | ⚠ REVIEW | No object hold / retention lock on pilot prefix |
| G3-3 | Cross-region replication (prod) | optional Beta | ✅ PASS | Not required for Beta (OR-13 accepted) |
| G3-4 | Restore from local D: backup | `output_dir.bak.*` | ✅ PASS | `pass_network_persist.py --verify` PASS clip_002 · `rollback()` + `.bak.*` in code · `e2e_pilot2_staging/` copies exist |
| G3-5 | Orphan object cleanup policy | lifecycle rule | ⚠ REVIEW | No lifecycle rules (Phase 1 G1-2) · manual prune for Beta |

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
| OR-10 | Backup not tested | 🔴 High | Med | **Phase 3:** local persist verify ✅ · prod auto-backup gap (F4-1/F4-2) → **Beta Ops Plan** | Ops |
| OR-11 | Firestore path doc/code drift (`media/` vs `aiIngest/`) | 🟡 Med | Med | **Phase 2:** CF `aiIngest` = SoT · doc/client stale · doc fix + client hook **Pre-Beta backlog** (no change this sprint) | Eng |
| OR-12 | `visionMatchIndex` stale vs completed runs | 🟡 Med | Med | **Phase 2:** overwrite-on-new-upload by design · orphaned upload (0 runs) · ops reconcile · Coach reads `visionAnalysis` OK | Ops |
| OR-13 | Firestore/GCS region mismatch | 🟢 Low | Med | **Phase 2:** historical Firebase default · acceptable Beta · region alignment **Post-Beta** | Ops |
| OR-14 | Vision Firestore rules missing in repo | 🔴 High | Med | **§13 OPEN** — rules draft spec ready · deploy = separate PM approval | Eng |

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
| 4 | Backup drill §1.5 / §2.3 | Ops | ✅ 2026-06-29 (§9) |
| 5 | Risk register sign-off | PM | ▶ §11 |
| 6 | PM Sign-off §4 | PM | ▶ §11 |
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

## 9. Backup Drill — Phase 3 Report

**Date:** 2026-06-29  
**Operator:** Cursor Ops (gcloud read-only + local `--verify`)  
**Scope:** §1.5 Firestore · §2.3 GCS · I13 local Persist §6  
**Constraint:** **No prod data mutation** · no export/import executed

### 9.1 Phase 3 Verdict

| Layer | Backup | Restore | Rollback | Gate |
|-------|--------|---------|----------|------|
| **Firestore (prod)** | ⚠ REVIEW | ⚠ REVIEW | ✅ PASS | Automated backup **not configured** |
| **GCS (prod)** | ⚠ REVIEW | ⚠ REVIEW | ✅ PASS | Re-run worker / manifest replay |
| **Local I13 Persist** | ✅ PASS | ✅ PASS | ✅ PASS | `--verify` + `rollback()` in code |
| **Overall Phase 3** | — | — | — | ✅ **PASS** (0 FAIL · prod gaps documented) |

**Phase 3 판정:** ✅ **PASS** — 절차 검증 완료 · prod 자동 Backup/PITR 미구성은 **Beta Ops Plan** 항목 (OR-10).

### 9.2 Backup — 생성 가능 여부

| Target | Can backup today? | Evidence |
|--------|:-----------------:|----------|
| Firestore scheduled export | ❌ Not configured | Backup schedules **0** · export ops **0** in history |
| Firestore PITR | ❌ Disabled | `POINT_IN_TIME_RECOVERY_DISABLED` |
| GCS object versioning | ❌ Off | Bucket describe: no versioning field |
| GCS cross-region copy | ⏳ Manual only | No replication rule |
| Local persist manifest | ✅ Yes | `manifest.json` + sha256 inputs on D: · `--verify` PASS |

**Dry-run conclusion:** **Manual/on-demand backup possible** (gcloud export, gsutil cp) but **no automated prod schedule**. Acceptable for Pilot; **Beta Ops Plan must define schedule**.

### 9.3 Restore — 절차 검증 (Dry Run)

| Scenario | Documented procedure | Drill result |
|----------|---------------------|--------------|
| Firestore PITR restore | Firebase console / `gcloud firestore databases restore` | ⏳ **Not executable** — PITR off · documented for Beta enablement |
| Firestore import from export | `gcloud firestore import gs://…` | ⏳ **Not executed** — no export bucket verified |
| GCS object restore | Re-upload from export OR worker re-run from `aiIngest/raw` | ✅ **Procedure valid** — source MP4 + worker artifacts retained (64 objects pilot) |
| RC5 failed pipeline | `retryVisionAnalysis` callable | ✅ Documented `RC5-1_FIRESTORE_SCHEMA.md` §5 |
| RC5 queued cancel | `cancelVisionAnalysis` | ✅ Documented |
| I13 local incomplete run | `pass_network_persist.py` `rollback()` — delete `.incomplete` or restore `.bak.*` | ✅ **Code verified** (`scripts/pass_network_persist.py:290`) |
| I13 local verify SoT | `pass_network_persist.py --verify --output-dir …` | ✅ **Executed** clip_002: `verify=PASS graphHash=ee8087a833ebe088` |

### 9.4 Rollback — 절차 검증 (Dry Run)

| Scenario | Procedure | Verdict |
|----------|-----------|:-------:|
| Bad `tacticalV2/jobs/{jobId}` (future) | Delete job doc + re-enqueue · Persist §6.3 | ✅ Design only — path not deployed |
| Stale `visionMatchIndex` | Ops reconcile · Phase 2 §7.3 | ✅ Documented |
| Local `--force` persist | Rename → `{output_dir}.bak.{timestamp}` then rebuild | ✅ In code §5.2 P2 |
| Partial persist (degraded) | **Keep** artifacts · flag manifest | ✅ I13 §6.1 — no rollback |

### 9.5 OR-10 / Beta Ops Plan inputs

| Gap | Recommended Beta action | Owner |
|-----|-------------------------|-------|
| F4-1 No scheduled Firestore export | Enable weekly export to dedicated GCS bucket | Ops |
| F4-2 PITR off | Evaluate PITR enable for prod (cost vs RPO) | Ops |
| G3-1/G3-2 No GCS versioning/hold | Pilot: rely on worker re-run; Beta: lifecycle + optional versioning on `visionGev/` | Ops |
| F4-4 Retention policy | Document 90d pilot retention in Beta Ops Plan | Ops PM |

### 9.6 Phase 3 Explicit non-actions

Prod export/import · PITR enable · lifecycle deploy · data delete · code change · Push — **없음**.

---

## 10. Review Status (Living)

| Section | Items | Checked | Pass | REVIEW | FAIL | Blocker |
|---------|-------|---------|------|--------|------|---------|
| §1.2 RC5 Firestore | 8 | 8 | 5 | 3 | 0 | — |
| §1.3 I13 Design | 7 | 7 | 5 | 2 | 0 | — |
| §1.4 Security | 5 | 5 | 3 | 2 | 0 | OR-14 |
| §1.5 Backup | 5 | 5 | 2 | 3 | 0 | Beta Ops Plan |
| §2.1 RC5 GCS | 8 | 8 | 4 | 4 | 0 | — |
| §2.2 I13 GCS Design | 6 | 6 | 6 | 0 | 0 | — |
| §2.3 GCS Backup | 5 | 5 | 2 | 3 | 0 | Beta Ops Plan |

**Phase 1 (§1.2 + §2.1):** 16/16 · **9 PASS · 7 REVIEW · 0 FAIL** ✅  
**Phase 2 (P0 design):** OR-11 ✅ · OR-12 ✅ · R-D2-3 ⚠ Pre-Beta gate (OR-14)  
**Phase 3 (Backup):** §1.5 + §2.3 · **6 PASS · 6 REVIEW · 0 FAIL** ✅  
**Review Sprint (Phase 1~3):** **Critical FAIL 0** · ✅ **COMPLETE**  
**Overall:** ▶ **PM Final Review** (§11) → OR-14 → Beta Ops Plan → Final PASS

---

## 11. PM Final Review — Gate Summary

**Date:** 2026-06-29  
**Branch:** `vision-v2-i13` @ `bfd9e05`  
**Commits (local, no push):** `fed54ac` → `bfd9e05` (4 docs commits)  
**Audience:** PM · Ops · Eng  
**Constraint:** Review Sprint only — **no prod deploy · no code change**

### 11.1 Sprint Verdict

| Phase | Name | Verdict | Critical FAIL |
|-------|------|:-------:|:-------------:|
| 1 | Pre-Pilot Dry Run #2 (§1.2 · §2.1) | ✅ PASS | 0 |
| 2 | Engineering Design Review (§7) | ✅ PASS | 0 |
| 3 | Backup Drill (§9) | ✅ PASS | 0 |
| **Review Sprint** | **Phase 1~3** | **✅ PASS** | **0** |

**PM Final Review recommendation:** Review Sprint **PASS** — proceed to **OR-14 Rules Gate** and **Vision v2 Beta Ops Plan**. Operation Readiness **Final PASS** is contingent on OR-14 disposition + Beta Ops Plan PM sign-off.

---

### 11.2 Phase Summaries

#### Phase 1 — Pre-Pilot Dry Run #2

| Metric | Value |
|--------|-------|
| Items checked | 16 (§1.2 × 8 + §2.1 × 8) |
| PASS / REVIEW / FAIL | **9 / 7 / 0** |
| Method | prod read-only (gcloud + Admin SDK) |
| Key finding | Operational SoT = `aiIngest/` (not legacy `media/` · `vision/{runId}/`) |

#### Phase 2 — Engineering Design Review

| P0 Item | Verdict | Notes |
|---------|:-------:|-------|
| OR-11 SoT path drift | ✅ PASS | CF `aiIngest` = SoT · doc/client stale · Pre-Beta backlog |
| OR-12 Index status | ✅ PASS | Overwrite-on-upload by design · ops reconcile |
| R-D2-3 / OR-14 Rules gap | ⚠ Pre-Beta Gate | Repo rules incomplete · **only Beta blocker** |

#### Phase 3 — Backup Drill

| Layer | Backup | Restore | Rollback |
|-------|--------|---------|----------|
| Firestore prod | ⚠ | ⚠ | ✅ |
| GCS prod | ⚠ | ⚠ | ✅ |
| Local I13 Persist | ✅ | ✅ | ✅ |

| Metric | Value |
|--------|-------|
| §1.5 + §2.3 items | 10 |
| PASS / REVIEW / FAIL | **6 / 6 / 0** |
| Local verify | `pass_network_persist.py --verify` clip_002 **PASS** |

---

### 11.3 Open Gaps (non-blockers unless noted)

| ID | Gap | Severity | Sprint phase | Disposition |
|----|-----|----------|--------------|-------------|
| OR-14 | Firestore rules: vision/aiIngest missing in repo | 🔴 | P2 | **Pre-Beta Gate** — rules verify + deploy (separate approval) |
| OR-11 | Doc/client `media/` vs CF `aiIngest/` | 🟡 | P1/P2 | Pre-Beta backlog (doc + `useVisionJobMonitor`) |
| OR-12 | Index overwrite on new upload | 🟡 | P1/P2 | Ops reconcile procedure |
| OR-13 | Firestore `asia-northeast3` vs GCS `US-CENTRAL1` | 🟢 | P1 | Accept Beta · Post-Beta review |
| F1-3 | Parent Report E2E not re-run | 🟡 | P1 | Dry Run Attempt #2 |
| F1-4 | `visionAnalysis` no top-level `status` field | 🟡 | P1 | I13 trigger spec uses run-level status |
| F4-1 | No scheduled Firestore export | 🟡 | P3 | Beta Ops improvement |
| F4-2 | PITR disabled | 🟡 | P3 | Beta Ops improvement |
| G1-2/G3-5 | No GCS lifecycle | 🟡 | P1/P3 | Beta Ops Plan |
| G1-3 | 45MB+ MP4 Whisper timeout | 🟡 | P1 | Beta clips ≤3min |
| F4-4 | No formal 90d retention policy | 🟡 | P3 | Beta Ops Plan |

**Aggregate checklist (all sections checked):**

| | Checked | PASS | REVIEW | FAIL |
|---|---------|------|--------|------|
| Total | 44 | 22 | 22 | **0** |

§4.2 A2/A3 (≥90% PASS): **50% PASS rate on checked items** — mitigated because **0 FAIL** and all REVIEW items have documented dispositions; **A2/A3 formal PASS** deferred to **Operation Readiness Final PASS** after OR-14 + Ops Plan close REVIEW items or PM accepts risk.

---

### 11.4 Beta Blocker Matrix

| Blocker | Status | Required before Beta |
|---------|:------:|---------------------|
| OR-14 Firestore Rules | ⏳ **OPEN** | **Yes** — verify deployed rules + deploy if repo=prod |
| Cross-Clip Primary Gate | ✅ CLOSED | Already PASS |
| GT Dataset | ✅ CLOSED | Already PASS |
| I13-5 dev complete | ✅ CLOSED | Already PASS |
| Scheduled Firestore export | ⏳ Open | **No** — Ops improvement |
| PITR | ⏳ Open | **No** — Ops improvement |
| GCS versioning/lifecycle | ⏳ Open | **No** — Ops improvement |
| OR-11 client path fix | ⏳ Open | **No** — Pre-Beta backlog |

**Beta Blocker count: 1** (OR-14 only)

---

### 11.5 Beta 권장 작업 (Ops Improvement — not hard blockers)

| Priority | Task | Owner | When |
|----------|------|-------|------|
| P0 | OR-14: Rules audit (repo vs deployed) + vision/aiIngest rules deploy | Eng + Ops | Pre-Beta Gate |
| P1 | Dry Run Attempt #2 (≤3min MP4 · Parent UI · Job Monitor 10/10) | Ops | Pre-Live Pilot |
| P1 | Beta Ops Plan: retention · backup schedule · clip policy · reconcile SOP | Ops PM | Before Beta |
| P2 | Update RC5-1/Kickoff/I13 path tables → `aiIngest` SoT | Eng | Pre-Beta backlog |
| P2 | Fix `useVisionJobMonitor.ts` path → `aiIngest` | Eng | Pre-Beta backlog |
| P3 | Firestore weekly export + PITR evaluation | Ops | Beta hardening |
| P3 | GCS lifecycle on `aiIngest/raw/` + optional versioning | Ops | Beta hardening |

---

### 11.6 Phased Rollout Readiness (§4.2)

| Phase | Description | Ready? |
|-------|-------------|:------:|
| Phase 0 | Review PASS | ▶ **PM Final Review** (this §11) |
| Phase 1 | Read-only summary from local | ✅ Ready (local persist verified) |
| Phase 2 | Firestore summary doc (pilot team) | ⏳ After Final PASS + OR-14 |
| Phase 3 | GCS edges + events upload | ⏳ After Phase 2 stable |
| Phase 4 | Callable trigger automation | ⏳ After Phase 3 stable |
| Phase 5 | Vision v2 Beta multi-user | ⏳ Ops Plan + OR-14 |

**HOLD triggers (§4.3):** No F1/G1 critical FAIL observed. OR-14 open → **HOLD Phase 2+ Firestore writes** until Rules Gate PASS.

---

### 11.7 Final PM Recommendation

```text
Review Sprint Phase 1~3     ✅ PASS (Critical FAIL 0)
Operation Readiness Sprint  ▶ PM Final Review — RECOMMEND ACCEPT

Conditional for Beta:
  1. OR-14 Rules Gate PASS (Pre-Beta, separate deploy approval)
  2. Vision v2 Beta Ops Plan PM sign-off
  3. Operation Readiness Final PASS (§4.1 criteria + PM signature)

Do NOT:
  - Push Review docs until Ops Plan draft ready (single PR preferred)
  - Deploy Firestore/GCS I13 paths before Final PASS
  - Treat REVIEW items as Beta blockers except OR-14

Next sequence:
  OR-14 Rules Gate → Vision v2 Beta Ops Plan → Operation Readiness Final PASS
```

**PM Sign-off (§4):** □ Pending — signature line for Run Day packet

| Criterion | Met? | Evidence |
|-----------|:----:|----------|
| A1 Cross-Clip PASS | ✅ | Pilot2 eval 3/3 |
| A2 Firestore §1.2 ≥90% PASS | ⚠ | 5/8 PASS · 0 FAIL · REVIEW documented |
| A3 GCS §1.2 ≥90% PASS | ⚠ | 4/8 PASS · 0 FAIL · REVIEW documented |
| A4 I13 design reviewed | ✅ | §1.3 · §7.5 |
| A5 OR-1, OR-10 mitigated | ✅ | Review gate + Phase 3 drill |
| A6 Rollback agreed | ✅ | §9 · RC5 retry/cancel · I13 §6 |
| A7 Beta scope pilot team only | ✅ | `D7TUZaOtfxdBc4P0lQLx` |
| A8 Change Freeze acknowledged | ✅ | Charter §①-b |

---

---

## 13. OR-14 Rules Gate Report

**Date:** 2026-07-02 (Evidence update) · 2026-06-29 (initial report)  
**Gate:** Pre-Beta · **only Beta blocker**  
**Deploy:** ❌ **NOT performed** (separate PM approval required)  
**Method:** Repo static audit · Production Rules API + Client SDK reads (§13.7.1)

### 13.1 Gate Verdict

| Item | Result |
|------|--------|
| Repo rules include Vision paths | ❌ **NO** |
| Deployed rules fetched | ✅ **YES** — Rules API · ruleset `d3429b67-52dc-47d6-bb88-73945fe56b0c` |
| Repo vs Deployed diff | ⚠ **DIFF** — deployed includes Vision paths · repo does not (§13.7.1) |
| Production read probe (5 paths) | ✅ **Observed** — §13.7.1 |
| Beta Blocker | ⚠ **YES — OPEN** — drift unresolved · SoT decision pending · partial path gaps |
| Rules deploy in this sprint | ❌ **Forbidden** (PM not approved) |

**OR-14 판정:** ⚠ **OPEN** — primary issue is **Rules Drift** (Repository ≠ Deployed ≠ Draft), not a single DENY hypothesis.

**PM decision pending:** Which rules set is canonical SoT before any deploy — **Option A** sync repo to current production · **Option B** align repo + production to §13.5 draft.

### 13.2 Client Read Paths (must be allowed for Beta)

| Path | Client consumer | Required role |
|------|-----------------|---------------|
| `teams/{teamId}/visionMatchIndex/{matchId}` | `useMatchVisionPipelineStatus` | active member (coach/staff) |
| `teams/{teamId}/visionUploadQueue/{mediaId}` | `useVisionUploadQueueStatus` | uploader / staff |
| `teams/{teamId}/aiIngest/{mediaId}/visionRuns/{runId}` | `useVisionJobMonitor` *(path fix pending)* | active member |
| `teams/{teamId}/matches/{matchId}/visionAnalysis/{id}` | `useCoachVisionAnalysis` · Parent Report | member / parent link |
| `teams/{teamId}/aiIngest/{mediaId}` | upload confirm read | uploader / staff |

**Write policy:** All Vision writes = **CF / Admin SDK only** (client create/update/delete = deny).

### 13.3 Repo Rules Analysis (`firestore.rules`)

| Finding | Detail |
|---------|--------|
| Vision keyword matches | **0** |
| `teams/{teamId}` subcollections listed | members, fees, scheduled_matches, … — **no** `aiIngest`, `visionMatchIndex`, `matches/visionAnalysis` |
| Default for unlisted subcollections | **DENY** |
| `firebase.json` deploy target | `firestore.rules` (canonical) |
| Git history | No commit ever added `visionMatchIndex` to rules |

**Inference (repo-only):** Unlisted Vision subcollections in **repository** rules → client reads would DENY **if** production matched repo. **Invalidated for production** — deployed rules differ (§13.7.1).

### 13.4 Deployed Rules Verification

| Channel | Status | Notes |
|---------|:------:|-------|
| Observed Production Result | ✅ **Recorded** | §13.7.1 · Rules API + prod Client SDK |
| Console Cross-check | ⏳ **PENDING** | Human Console record optional audit layer |

Prior API 403 (user OAuth) resolved via service-account Rules API for **read-only** ruleset fetch. No deploy performed.

### 13.5 Draft Rules Spec (design only — NOT applied)

```text
teams/{teamId}/visionMatchIndex/{matchId}
  read:  isSignedIn() && isActiveMember(teamId)
  write: false

teams/{teamId}/visionUploadQueue/{mediaId}
  read:  isSignedIn() && isActiveMember(teamId)
  write: false

teams/{teamId}/aiIngest/{mediaId}
  read:  isSignedIn() && isActiveMember(teamId)
  write: false

teams/{teamId}/aiIngest/{mediaId}/visionRuns/{runId}
  read:  isSignedIn() && isActiveMember(teamId)
  write: false

teams/{teamId}/matches/{matchId}/visionAnalysis/{analysisId}
  read:  isSignedIn() && (isActiveMember(teamId) || parentLinkReadAllowed(teamId, matchId))
  write: false
```

Parent read helper must align with existing `parentLinks` pattern (CF-only writes unchanged).

### 13.6 OR-14 Close Criteria (Pre-Beta)

| # | Criterion | Owner |
|---|-----------|-------|
| 1 | Console Rules Playground: coach read PASS on 4 paths | Ops |
| 2 | Rules draft reviewed by Eng | Eng |
| 3 | **PM approves deploy** | PM |
| 4 | `firebase deploy --only firestore:rules` | Eng |
| 5 | Dry Run Attempt #2: Job Monitor + Coach UI without fixture | Ops |

**Until OR-14 CLOSE:** HOLD Phase 2+ Firestore I13 writes (§4.2).

### 13.7 OR-14 Close Checklist (Living)

| # | Step | Status | Owner | Evidence |
|---|------|:------:|-------|----------|
| 1 | Repository rules analysis | ✅ DONE | Eng | §13.3 |
| 2 | Gate Report document | ✅ DONE | Eng | §13 · `f4d7dd3` |
| 3 | Draft rules spec | ✅ DONE | Eng | §13.5 |
| 4 | Engineering Review (repo static) | ✅ DONE | Eng | §13.3 |
| 5 | Production Rules read probe (5 paths) | ✅ DONE | Eng | §13.7.1 |
| 5b | Console Cross-check | ⏳ PENDING | Ops | §13.7.1 |
| 6 | Deployed vs repo diff | ✅ DONE (**DIFF**) | Eng | §13.7.1 |
| 7 | PM Rules SoT decision (A or B) | ⏳ PENDING | PM | §13.8 |
| 8 | PM Deploy Approval | ⏳ PENDING | PM | After step 7 |
| 9 | `firebase deploy --only firestore:rules` | ⏳ PENDING | Eng | After step 8 only |
| 10 | Dry Run Attempt #2 (10/10) | ⏳ PENDING | Ops | ≤3min MP4 |

**OR-14 = OPEN** until SoT decision · deploy gate · Dry Run #2 complete. Steps 1~6 = observation recorded · **not** gate close.

### 13.7.1 Observed Production Evidence (2026-07-02)

> **Audit note:** Production Rules Engine observation. Console Cross-check **PENDING** (optional human confirmation).

**Operator / method:** Eng · Firebase Rules API (service account, read-only) + prod Firestore Client SDK reads with coach/parent custom tokens · pilot team `D7TUZaOtfxdBc4P0lQLx`

#### A. Deployed vs Repository

| Field | Value |
|-------|-------|
| Verdict | ⚠ **DIFF** |
| Deployed ruleset | `projects/yago-vibe-spt/rulesets/d3429b67-52dc-47d6-bb88-73945fe56b0c` |
| Deployed size (norm) | ~104 KB |
| Repository size (norm) | ~85 KB |
| `visionMatchIndex` in rules | Deployed ✅ · Repository ❌ |
| `aiIngest` / `visionRuns` in rules | Deployed ✅ · Repository ❌ |
| `matches/…/visionAnalysis` in rules | Deployed ✅ · Repository ❌ |
| `visionUploadQueue` in rules | Deployed ❌ · Repository ❌ |

**Drift summary:** Production already contains Vision v6-7 rules blocks (`isTeamVisionStaffReader`) under `teams/{teamId}`; repository `firestore.rules` does **not** include them. Repository is **behind** production.

#### B. Production Rules read probe (get · authenticated)

Coach uid: `jMLLIxyOVkN1HERAd2gz88uKj9e2` · Parent uid: `wSlh4oDIqIP4GnV3Di1IeAQnFy13`

| # | Path (pilot IDs) | Production result |
|---|------------------|:-----------------:|
| 1 | `…/visionMatchIndex/cgOEK8Q75csiFFdVEE70` | **ALLOW** |
| 2 | `…/visionUploadQueue/e519af9a2245422d83c5de61` | **DENY** |
| 3 | `…/aiIngest/57c66937ec334ad081c39b92/visionRuns/1f15c9b58cb84d0988529e14` | **ALLOW** |
| 4 | `…/matches/cgOEK8Q75csiFFdVEE70/visionAnalysis/0fpknTxqBvlQ76LNPGJT` (coach) | **ALLOW** |
| 5 | Same as #4 (parent) | **DENY** |

#### C. Console Cross-check

| Item | Status |
|------|:------:|
| Console Deployed vs Repository visual compare | ⏳ PENDING |
| Console Playground 5-path confirmation | ⏳ PENDING |

### 13.8 OR-14 Root Cause (2026-07-02)

**Primary cause:** **Rules Drift** — three states do not align:

| State | Vision rules posture |
|-------|---------------------|
| **Production (deployed)** | Partial — staff reader on index · runs · analysis; **no** `visionUploadQueue`; parent analysis **DENY** |
| **Repository (`firestore.rules`)** | None — Vision paths absent |
| **Draft (§13.5)** | Target Beta spec — includes `visionUploadQueue` + parent read helper |

**Secondary gaps (production, post-drift):**

| Gap | Impact |
|-----|--------|
| `visionUploadQueue` absent in production | RC5-2 queue UI read → **DENY** |
| Parent `visionAnalysis` read | Parent Report path → **DENY** (staff-only in production) |
| Repository behind production | Next `firebase deploy --only firestore:rules` from repo would **regress** production Vision rules |

**Next PM decision (before deploy):** Adopt canonical SoT — **Option A** pull production rules into repo · **Option B** implement §13.5 draft in repo then deploy to production.

**OR-14 remains OPEN** until SoT locked · deploy approved · Dry Run #2 PASS.

### 13.9 §13.5 Draft — Pre-Approval Review Pack (2026-07-02)

> **Status:** 📋 **REVIEW MATERIAL ONLY** — not §13.5 final policy approval · not Repository change · not Deploy.  
> **Purpose:** PM decision input — adopt §13.5 as Vision v2 Beta Firestore Rules SoT?  
> **Option B:** 우선 검토안 (PM · not approved).

#### 13.9.1 Path-level comparison (Production · Repository · §13.5 · Client)

| 항목 | Production (deployed) | Repository | §13.5 Draft | Client 요구 | Prod 실측 (2026-07-02) | 차이 요약 | PM 판단 |
|------|----------------------|------------|-------------|-------------|:----------------------:|-----------|---------|
| **visionMatchIndex** read | `isTeamVisionStaffReader(teamId)` | ❌ 규칙 없음 → implicit **DENY** | `isSignedIn() && isActiveMember(teamId)` | `useMatchVisionPipelineStatus` — coach/staff pipeline UI · onSnapshot | Coach **ALLOW** | Prod ⊂ Draft (Draft 더 넓음: 전 active member) · Repo = 없음 | ⏳ |
| **visionUploadQueue** read | ❌ 규칙 없음 → **DENY** | ❌ 규칙 없음 | `isSignedIn() && isActiveMember(teamId)` | `useVisionUploadQueueStatus` — RC5-2 upload queue UI · onSnapshot | Coach **DENY** | Prod/Repo 모두 없음 · **Beta Client 필수** | ⏳ |
| **aiIngest/…/visionRuns** read | `isTeamVisionStaffReader(teamId)` | ❌ 규칙 없음 | `isSignedIn() && isActiveMember(teamId)` | `useVisionJobMonitor` — run progress · **⚠ client path still `media/` (OR-11 stale)** | Coach **ALLOW** | Prod ⊂ Draft · Client path drift 별도(OR-11) | ⏳ |
| **aiIngest/{mediaId}** read | `isTeamStaffElevated(teamId)` | ❌ 규칙 없음 | `isSignedIn() && isActiveMember(teamId)` | Upload confirm / ingest meta read (staff) | *(미 probe)* | Draft = member 허용 · Prod = staff만 | ⏳ |
| **visionAnalysis** read (coach) | `isTeamVisionStaffReader(teamId)` | ❌ 규칙 없음 | `isSignedIn() && isActiveMember(teamId)` | `useCoachVisionAnalysis` — collection **list** query · coach dashboard | Coach **ALLOW** | Prod ⊂ Draft · list query = subcollection read rule 적용 | ⏳ |
| **visionAnalysis** read (parent) | `isTeamVisionStaffReader(teamId)` only → parent **DENY** | ❌ 규칙 없음 | `isActiveMember(teamId) \|\| parentLinkReadAllowed(teamId, matchId)` | `useParentIntelligence` → `getLatestVisionAnalysis` · Parent Report | Parent **DENY** | **Beta Parent UX gap** · Draft는 parentLink 패턴 명시 | ⏳ |
| **All Vision writes** | `false` (CF only) | implicit DENY | `false` (CF only) | CF/Admin SDK only | — | ✅ 정합 | ⏳ |

**Production helper reference (deployed):** `isTeamVisionStaffReader` = owner/captain/team staff role (active status 불필요).  
**§13.5 gap:** `parentLinkReadAllowed()` helper **미구현** — must align with `teams/{teamId}/parentLinks` read pattern (§ deployed L1216–1228).

#### 13.9.2 PM review questions (Eng pre-read)

| # | Question | Eng pre-read | PM decision |
|---|----------|--------------|:-----------:|
| 1 | §13.5 Draft 권한이 Beta 의도와 일치하는가? | Draft = **active member** read on pipeline paths; Production = **staff-only** on index/runs/analysis. Draft is **broader** than current prod — aligns with “팀 멤버가 파이프라인 상태 조회” if Beta scope = registered members, not staff-only. | ⏳ |
| 2 | `visionUploadQueue` read가 Beta 운영에 필요한가? | **Yes** — RC5-2 hook exists · prod **DENY** observed · queue status UI blocked without rule. §13.5 includes path; Production/Repository do not. | ⏳ |
| 3 | Parent `visionAnalysis` read가 개인정보·운영 정책에 부합하는가? | Parent Report reads **match-scoped analysis doc** (not raw video). Pilot parent uid + `parentLinks` verified Phase 1 (`RC5_4_OPERATION_INFO`). Draft proposes **parentLink-gated** read — narrower than `isActiveMember` alone. **Requires** `parentLinkReadAllowed` spec + rules implementation before deploy. Prod currently **DENY** — fixture fallback may mask in pilot. | ⏳ |
| 4 | 변경 범위·영향이 문서화되었는가? | See §13.9.3. Client path fix (`useVisionJobMonitor` → `aiIngest`) = **OR-11** separate from rules deploy gate but affects Dry Run #2. | ⏳ |

#### 13.9.3 Change scope & impact (if §13.5 adopted as SoT — Option B)

| Change class | Scope | Risk | Mitigation |
|--------------|-------|------|------------|
| **Repository sync** | Merge production Vision blocks + §13.5 deltas into `firestore.rules` | Repo-only deploy would **regress** prod today | Never deploy from current repo; full merge review first |
| **New prod rule** | `visionUploadQueue` read block | Low — read-only · CF writes unchanged | Playground + Dry Run #2 probe |
| **Policy change** | Parent `visionAnalysis` read via `parentLinkReadAllowed` | Med — privacy / consent boundary | Align with `parentLinks` SoT · pilot parent E2E in Dry Run #2 |
| **Policy widen** | `isActiveMember` vs `isTeamVisionStaffReader` on index/runs/analysis | Med — any active member reads pipeline/analysis | Confirm Beta persona scope with PM |
| **Helper implementation** | `parentLinkReadAllowed(teamId, matchId)` in rules | Med — must match CF parentLink schema | Eng rules PR + emulator tests |
| **Non-rules dependency** | `useVisionJobMonitor.ts:84` stale `media/` path | High for Job Monitor 10/10 | OR-11 path fix before/along Dry Run #2 |
| **Deploy** | `firebase deploy --only firestore:rules` | Med | PM approval · post-deploy 5-path probe · Dry Run #2 |

#### 13.9.4 Decision record (PM — pending)

| Decision | Status |
|----------|:------:|
| Adopt §13.5 as Vision v2 Beta Firestore Rules SoT | ⏳ **PENDING** |
| Option A vs Option B | ⏳ Option B = **우선 검토안** (not approved) |
| §13.5 final policy sign-off | ⏳ **PENDING** |
| Rules Deploy approval | ⏳ **PENDING** (after SoT + §13.5 sign-off) |

**If §13.5 approved → locked sequence:** Repository update → PM Deploy approval → Rules Deploy → Dry Run #2 → OR-14 CLOSE review.

### 13.10 PM Policy Review — Decision Record (Template)

> **Status:** 📋 **TEMPLATE ONLY** — Decision Hold · no policy approved in this document.  
> **Inputs:** Evidence `31ff85b` · Review Pack `78ebd12` (§13.9).  
> **Authority:** Project PM / product owner only — not AI or Eng unilateral sign-off.

**Meeting date:** _______________  
**Attendees:** _______________  
**Phase:** Policy Approval (post technical + ops validation)

| # | Agenda | Decision (승인 / 보류 / 수정) | Notes |
|---|--------|:----------------------------:|-------|
| 1 | §13.5 Draft = Vision v2 Beta **official** Firestore read policy? | ⏳ | |
| 2 | `visionUploadQueue` read = **Beta required** policy? | ⏳ | |
| 3 | Parent `visionAnalysis` read = privacy + ops **compliant**? | ⏳ | |
| 4 | Firestore Rules **SoT** — Production / approved Draft / other | ⏳ | |

**SoT options (agenda 4 reference only — not pre-selected):**

| Option | Meaning | PM note |
|--------|---------|---------|
| A | Repository ← Production | Drift fix · Beta draft gaps may remain |
| B | Repository + Production ← **approved** §13.5 | Option B = **검토 후보** only until row 1–3 approved |
| Other | _______________ | |

**Post-decision gate (only if policy approved):**

```text
PM Policy Decision → §13.5 Final Approval → Repository → PM Deploy Approval
→ Rules Deploy → Dry Run #2 → OR-14 CLOSE → Final PASS → Beta Start
```

**Until rows 1–4 decided:** Decision Hold — no Repository change · no Deploy · no OR-14 CLOSE · no Push.

#### 13.10.1 Review status (pre-meeting vs post-meeting)

> Use **status**, not progress % (e.g. avoid "3/10 complete").

| Phase | Status | Meaning |
|-------|:------:|---------|
| Pre-meeting preparation | ✅ **Complete** | Evidence `31ff85b` · Review Pack `78ebd12` · this template `df99d28` |
| Meeting decisions | ⏳ **Pending** | Project owner PM Policy Review not yet held |
| Post-meeting execution review | ⏳ **Pending** | Repository · Deploy · Dry Run #2 · OR-14 CLOSE — after official §13.10 record |

**Terminology (Decision Hold):**

| Avoid | Prefer |
|-------|--------|
| "Incomplete meeting result" | **회의 결과 미생성 (회의 미실시)** |
| "Needs supplement" (pre-meeting) | **미기록 (회의 전)** |
| Progress % on checklist | **Status by phase** (above) |

**Post-meeting review:** See §13.10.2 — **criteria only** until official §13.10 record exists. Do not execute pre-meeting.

#### 13.10.2 Post-meeting review procedure (Step 4–8 · criteria only)

> **Status:** 📋 **REVIEW CRITERIA ONLY** — not executed until PM Policy Review official record in §13.10.  
> **No auto-execution:** meeting results do not trigger Repository change · Deploy · Dry Run #2 · OR-14 CLOSE.

**Step 4 — Meeting record validity**

| Check | Pass criterion |
|-------|----------------|
| Meeting date | Recorded in §13.10 |
| Attendees | Recorded |
| §13.10 official record | Complete |
| All 4 agenda rows | Decision recorded |

**Verdict:** All present → Step 5 · Any missing → **record supplement required** (do not proceed).

**Step 5 — Policy decisions (4 agenda items)**

Per agenda: Decision (승인 / 보류 / 수정) · Notes · Action Items.

Verify: decision is explicit · Actions align with decision.

**Step 6 — Cross-policy consistency**

| Check | Block if fail |
|-------|---------------|
| §13.5 vs SoT | Conflict → **no** Repository / Deploy review |
| `visionUploadQueue` vs Beta ops goal | Misalign → hold Deploy |
| Parent read vs privacy / ops policy | Conflict → hold Deploy |

**Step 7 — Gate impact (eligibility only — no auto Gate change)**

| Gate | Question |
|------|----------|
| OR-14 | Remain OPEN or CLOSE **eligible**? |
| §13.5 Final Approval | HOLD **lift eligible**? |
| Final PASS | Review **eligible**? |

**Step 8 — Execution eligibility (review only — no auto-run)**

1. Repository change **needed**?
2. PM Deploy approval **conditions met**?
3. Dry Run #2 **required**?
4. OR-14 CLOSE **reviewable**?

**Post-meeting checklist (apply when official record shared):**

| ☐ | Item |
|---|------|
| ☐ | Meeting date |
| ☐ | Attendees |
| ☐ | 4 agenda decisions |
| ☐ | Notes |
| ☐ | Action Items |
| ☐ | No cross-policy contradiction |
| ☐ | Gate impact reviewed |
| ☐ | Repository change need judged |
| ☐ | Deploy review eligibility judged |
| ☐ | Dry Run #2 need judged |
| ☐ | OR-14 CLOSE eligibility judged |

---

## 15. Operation Readiness Final PASS — Preparation (HOLD)

> **⏳ NOT DECLARED** — submit only after OR-14 CLOSE + Beta Ops Plan PM Sign-off.

### 15.1 Declaration conditions

| # | Condition | Status |
|---|-----------|:------:|
| 1 | OR-14 Rules Gate **CLOSE** | ⏳ |
| 2 | `YAGO_VISION_V2_BETA_OPS_PLAN.md` **PM Sign-off** | ⏳ |
| 3 | §4.1 criteria reviewed | ⏳ |

### 15.2 Sequence (locked)

```text
OR-14 CLOSE  →  Beta Ops Plan Sign-off  →  Final PASS  →  Beta Start Approval
```

### 15.3 PM Sign-off packet (draft — do not sign until HOLD lifted)

| Criterion | Met? | Evidence |
|-----------|:----:|----------|
| A1 Cross-Clip PASS | ✅ | Pilot2 eval 3/3 |
| A2 Firestore §1.2 ≥90% PASS | ⚠ | 5/8 · 0 FAIL |
| A3 GCS §2.1 ≥90% PASS | ⚠ | 4/8 · 0 FAIL |
| A4 I13 design reviewed | ✅ | §1.3 · §7.5 |
| A5 OR-1, OR-10 mitigated | ✅ | Review gate + §9 |
| A6 Rollback agreed | ✅ | §9 · RC5 · I13 §6 |
| A7 Beta scope pilot team | ✅ | `D7TUZaOtfxdBc4P0lQLx` |
| A8 Change Freeze | ✅ | Charter |
| OR-14 CLOSE | ⏳ | §13.7 |
| Beta Ops Plan signed | ⏳ | Ops Plan §10 |

**PM Signature:** _______________ · **Date:** _______________ · **Status:** ⏳ HOLD

---

## 14. References

- `docs/YAGO_VISION_OPERATIONS_CHARTER_v1.md`
- `docs/YAGO_VISION_PILOT2_FINAL_REVIEW.md` §9–10
- `docs/YAGO_VISION_CROSS_CLIP_VALIDATION_PLAN.md` §9
- `docs/YAGO_VISION_I13_5_PERSIST_SPEC.md` §7
- `docs/YAGO_VISION_RC5_4_OPERATION_INFO.md`
- `docs/YAGO_VISION_V2_BETA_OPS_PLAN.md`

---

*Operation Readiness Sprint — Firestore/GCS Review. Docs only. No production deploy.*
