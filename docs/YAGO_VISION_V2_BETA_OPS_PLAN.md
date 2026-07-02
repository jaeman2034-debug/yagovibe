# YAGO Vision v2 — Beta Operations Plan (Draft v1)

**Status:** 📋 **DRAFT** — PM sign-off pending (required before Step 10 Final PASS)  
**Date:** 2026-07-02 (updated)  
**Branch:** `main` · pilot team `D7TUZaOtfxdBc4P0lQLx`  
**Parent docs:** `YAGO_VISION_OPERATION_READINESS_FIRESTORE_GCS_REVIEW.md` §15 · `YAGO_VISION_OPERATIONS_CHARTER_v1.md`

> **Beta scope:** Pilot team only · RC5 pipeline + local I13 persist verified · **OR-14 CLOSED** (2026-07-02)  
> **No code / deploy in this document** — operational procedures only.

---

## 0. Beta Readiness Summary

| Gate | Status |
|------|--------|
| Review Sprint Phase 1~3 | ✅ PASS |
| PM Final Review | ✅ PASS |
| OR-14 Rules Gate | ✅ **CLOSED** (§13.15.3) |
| Operation Readiness Final PASS | ▶️ Step 10 PM decision pending |

**Conditional Beta:** OR-14 CLOSE + this Ops Plan PM sign-off + Final PASS.

---

## 1. Clip Policy

| Rule | Value | Source |
|------|-------|--------|
| Dry Run / Queue validation | **1~3 min** MP4 | RC5-4 Dry Run |
| Beta upload max (recommended) | **≤50 MB** | RC5-4 |
| Whisper timeout risk | **10 min+ / ~45 MB** | Dry Run Attempt #1 |
| Production preset | **`rc3_1_phase_c` only** | RC5 Kickoff §7.1 |

**SOP:** Upload fails at Whisper → retry with shorter clip · do not change Worker in Beta.

---

## 2. Backup SOP

### 2.1 Firestore

| Item | Current state | Beta target |
|------|---------------|-------------|
| Scheduled export | ❌ Not configured | Weekly export to `gs://{backup-bucket}/firestore/` |
| PITR | ❌ Disabled | Evaluate enable (RPO vs cost) |
| Manual export | Available via Console / gcloud | Before major schema deploy |

**Manual backup (on-demand):**

```bash
gcloud firestore export gs://BACKUP_BUCKET/firestore/$(date +%Y%m%d) \
  --project=yago-vibe-spt
```

**Owner:** Ops · **Frequency:** weekly (post-Beta hardening) · until then: before Live Pilot Run Day.

### 2.2 GCS (Vision artifacts)

| Prefix | Content | Backup approach |
|--------|---------|-----------------|
| `teams/{teamId}/aiIngest/raw/` | Source MP4 | Retain for pilot period |
| `teams/{teamId}/aiIngest/anonymized/` | Whisper input | Retain |
| `teams/{teamId}/aiIngest/visionGev/` | GEV output | Retain (immutable) |
| `teams/{teamId}/aiIngest/visionTracking/` | tracks.jsonl | Retain |

**SOP:** No automated GCS backup today. Before Beta scale:

```bash
gcloud storage cp -r gs://yago-vibe-spt.firebasestorage.app/teams/{teamId}/aiIngest/ \
  gs://BACKUP_BUCKET/vision/{teamId}/{date}/
```

### 2.3 Local I13 Persist (offline)

| Item | Procedure |
|------|-----------|
| Verify SoT | `python scripts/pass_network_persist.py --verify --output-dir {path}` |
| Force backup | `--force` creates `{output_dir}.bak.{timestamp}/` |
| Staging copy | Keep `e2e_pilot2_staging/` parallel dir |

---

## 3. Restore SOP

### 3.1 Firestore

| Scenario | Procedure | Beta ready? |
|----------|-----------|:-----------:|
| PITR restore | Firebase Console → Database → Restore | ⏳ PITR off |
| Import from export | `gcloud firestore import gs://…` | ⏳ No export bucket verified |
| Single doc bad write | Admin SDK / Console delete + CF re-run | ✅ Manual |

**Pilot fallback:** Re-run pipeline from retained GCS MP4 (`retryVisionAnalysis`).

### 3.2 GCS

| Scenario | Procedure |
|----------|-----------|
| Deleted object | Restore from manual backup copy OR re-upload MP4 |
| Corrupt worker output | Re-run Worker from source MP4 + registry |

### 3.3 Local Persist

| Scenario | Procedure |
|----------|-----------|
| Incomplete run (`.incomplete`) | Delete output_dir OR `rollback()` in persist script |
| Bad persist | Restore `{output_dir}.bak.{timestamp}/` → rename to output_dir |
| Verify after restore | `--verify` must PASS |

---

## 4. Rollback SOP

### 4.1 RC5 Pipeline (prod)

| Trigger | Action | Callable / tool |
|---------|--------|-----------------|
| Run `failed` | `retryVisionAnalysis` (1× recommended) | CF |
| Run stuck `queued` | `cancelVisionAnalysis` if still queued | CF |
| Stale `visionMatchIndex` | Ops reconcile (§5) | Manual |
| Bad `visionAnalysis` doc | Do not delete in Beta without PM · re-run with new mediaId | Ops |

### 4.2 Future I13 tacticalV2 (not deployed)

Source: `YAGO_VISION_I13_5_PERSIST_SPEC.md` §6.3

```text
1. Stop queue worker
2. If .incomplete: rm output_dir OR mv output_dir.bak.TS → output_dir
3. Re-enqueue job
4. Verify manifest.json + --verify
```

### 4.3 Firestore I13 Phase rollout HOLD

If offline eval regresses or OR-14 open: **revert to local-only** (Phase 1 in §4.2 rollout).

---

## 5. Reconcile SOP (`visionMatchIndex`)

**When:** Index status ≠ latest completed run (OR-12)

**Symptoms:**

- Index `queued` / `runId=null` but older media has `completed` runs
- New upload overwrote index before run created

**Procedure:**

1. Identify matchId in Firebase Console
2. List `aiIngest/{mediaId}/visionRuns` for all mediaIds on that match
3. Find latest `status=completed` run
4. If index mediaId has **zero runs** → failed upload:
   - Option A: Re-trigger queue (`processVisionUploadQueue`) or re-upload
   - Option B: Manually patch index to latest completed run *(Ops + PM approval)*
5. Log in `YAGO_VISION_RC5_OPS_DAILY_LOG.md`

**Do not** treat as data corruption.

---

## 6. Retention Policy (Draft)

| Data class | Retention | Action |
|------------|-----------|--------|
| Pilot Firestore vision docs | **90 days** post-Beta | Archive export then prune |
| GCS `aiIngest/raw/` | 90 days | Lifecycle rule (post-Beta) |
| GCS `anonymized/` | 90 days | Lifecycle rule |
| GCS worker outputs | 1 year | Keep for re-analysis |
| Local D: persist | Project lifetime | Manual prune `.bak.*` |

**Status:** Draft — formalize at Operation Readiness Final PASS.

---

## 7. Incident SOP

### 7.1 Severity

| Level | Definition | Example |
|-------|------------|---------|
| P0 | Pipeline down · no analysis | Worker CF down |
| P1 | Partial failure | Whisper timeout |
| P2 | UX degraded | Job Monitor stale index |

### 7.2 Response flow

```text
Detect → Log (Daily Log + Issue Report) → Mitigate → PM notify if P0/P1
```

| Step | Action |
|------|--------|
| 1 | Record in `YAGO_VISION_RC5_OPS_ISSUE_REPORT.md` |
| 2 | Check `visionUploadQueue` · `visionMatchIndex` · latest run |
| 3 | P1 Whisper timeout → shorter clip retry |
| 4 | P0 → CTO + check Cloud Run / CF logs |
| 5 | Post-incident → Improvement Backlog |

### 7.3 Escalation

| Role | Contact |
|------|---------|
| Ops PM | _(fill at Run Day)_ |
| CTO / Eng | Worker · CF · Rules |
| PM | Beta hold decision |

---

## 8. Pre-Beta Checklist

| # | Item | Status |
|---|------|:------:|
| 1 | OR-14 Rules Gate CLOSE | ✅ §13.15.3 |
| 2 | Dry Run #2 (rules 5-path post-deploy) | ✅ §13.14 |
| 3 | Backup manual export once | ⏳ |
| 4 | Ops Plan PM sign-off (§9) | ⏳ **required before Final PASS** |
| 5 | Operation Readiness Final PASS (§15.2) | ⏳ |

---

## 9. PM Sign-off (Pending)

> **Required before** Operation Readiness Final PASS (Review doc §15.2).

| Item | Confirmed |
|------|:---------:|
| Clip Policy (§1) | □ |
| Backup SOP (§2) | □ |
| Restore SOP (§3) | □ |
| Rollback SOP (§4) | □ |
| Reconcile SOP (§5) | □ |
| Retention draft (§6) | □ |
| Incident SOP (§7) | □ |
| Pre-Beta checklist (§8) | □ |

**PM Sign-off:** _______________ · **Date:** _______________

**After sign-off:** eligible for §15.2 Final PASS decision.

---

## 10. References

- `docs/YAGO_VISION_OPERATION_READINESS_FIRESTORE_GCS_REVIEW.md` §6~§13
- `docs/YAGO_VISION_RC5_4_PRE_PILOT_DRY_RUN.md`
- `docs/YAGO_VISION_RC5_4_OPERATION_INFO.md`
- `docs/YAGO_VISION_RC5_OPS_ISSUE_REPORT.md`
- `docs/YAGO_VISION_RC5_OPS_DAILY_LOG.md`
- `docs/YAGO_VISION_I13_5_PERSIST_SPEC.md` §6

---

*Vision v2 Beta Ops Plan — docs only. No production deploy.*
