# Intelligence AI Agent Learning Loop V1 — RUNBOOK

**Document ID:** `INTELLIGENCE-AI-AGENT-LEARNING-LOOP-V1-RUNBOOK`  
**Stage:** B — Manual Learning Loop  
**Status:** ACTIVE (PM GO 2026-07-13)  
**Prerequisite:** CIE v0.1 LOCK + CIE Shadow V022 LOCK

---

## Principle

> **PRODUCTION FACT IS NOT TRAINING DATA.**

Official Fact / VOC must **never** be auto-ingested into TRAINING or EVALUATION datasets.

Track A (Official Fact) and Track B (Synthetic Shadow) remain **strictly separated**.

---

## Loop architecture

```text
VALIDATE (freeze + dataset)
    ↓
GENERATE (optional — --lab-only only)
    ↓
HARD GATE (cie-eval-v0.1.1) ── FAIL → STOP → failure registry
    ↓
QUALITY GATE (advisory)
    ↓
GATE ASSERTION (locked thresholds)
    ↓
FAILURE REGISTRY (append-only; empty if all PASS)
    ↓
HITL REVIEW (offline JSONL)
    ↓
PM DECISION (manual — script never chooses)
    ↓
VERSION PROMOTION (PM GO → candidate → RUN-001 → frozen RUN-002 → PM LOCK)
```

All steps remain **offline / lab-only**. No Production writes.

---

## Command sequence

### A. Orchestration dry run (no LLM — reuse locked RUN)

```bash
python scripts/vision/cie_learning_loop_v1/run_learning_loop.py \
  --run-id CIE-LEARNING-LOOP-V1-DRY-001 \
  --dataset-version cie-shadowset-v0.2.2 \
  --prompt-version cip-v0.2.2 \
  --evaluator-version cie-eval-v0.1.1 \
  --reuse-generations CIE-SHADOW-V022-RUN-002 \
  --orchestration-only
```

### B. Full manual loop (new LLM generation)

```bash
python scripts/vision/cie_learning_loop_v1/run_learning_loop.py \
  --run-id CIE-LEARNING-LOOP-V1-RUN-001 \
  --dataset-version cie-shadowset-v0.2.2 \
  --prompt-version cip-v0.2.2 \
  --evaluator-version cie-eval-v0.1.1 \
  --generate --lab-only
```

Requires `OPENAI_API_KEY`. Use a **new** `--run-id` for each generation run.

### C. Gate assertion only

```bash
python scripts/vision/cie_learning_loop_v1/assert_shadow_gates.py \
  --hard-summary data/vision/report/engineering/coach_intelligence_eval/v0.2_shadow/results/CIE-SHADOW-V022-RUN-002_summary.json \
  --quality-summary data/vision/report/engineering/coach_intelligence_eval/v0.2_shadow/quality_results/CIE-SHADOW-V022-RUN-002_QUALITY_summary.json \
  --generations-dir data/vision/report/engineering/coach_intelligence_eval/v0.2_shadow/generations/CIE-SHADOW-V022-RUN-002
```

### D. HITL feedback validate

```bash
python scripts/vision/cie_learning_loop_v1/validate_hitl_feedback.py \
  data/vision/report/engineering/coach_intelligence_eval/learning_loop_v1/hitl_feedback/schema_validation_dry.jsonl
```

---

## STOP conditions

| Condition | Action |
|---|---|
| Freeze SHA mismatch | STOP immediately |
| Dataset validation FAIL | STOP |
| `--generate` without `--lab-only` | STOP (refused) |
| No `--reuse-generations` and no `--generate` | STOP (refused implicit LLM) |
| Hard Gate FAIL (`actualFail > 0`) | STOP — no Quality Gate |
| `--promote` flag | STOP (forbidden) |
| Official Fact in HITL feedback | validate_hitl_feedback FAIL |

---

## Failure handling

1. Hard FAIL → `failure_registry/{runId}_failures.jsonl` (shadow) + `learning_loop_v1/runs/{runId}/failure_registry.jsonl`
2. Review `failure_review/{runId}_FAILURE_REVIEW.json`
3. PM classifies: `PROMPT` | `DATASET` | `EVALUATOR_LIMIT`
4. PM decision: `REVIEW_FAILURES` or `HOLD`
5. **Never** delete historical failure rows

---

## HITL procedure

1. Reviewer reads generations + per-sample quality scores
2. Append row to `hitl_feedback/{session}.jsonl`
3. Run `validate_hitl_feedback.py`
4. PM uses checklist `PM_DECISION_REQUIRED` field

**decision enum:** `ACCEPT` | `REJECT` | `REVISE` | `ABSTAIN`

---

## PM gates

After every completed loop run, review:

`learning_loop_v1/runs/{runId}/PM_REVIEW_CHECKLIST.md`

**Allowed PM decisions (script does NOT choose):**

- `HOLD`
- `REVIEW_FAILURES`
- `APPROVE_VERSION_CANDIDATE`
- `REJECT_VERSION_CANDIDATE`
- `AUTHORIZE_2_RUN_GATE`

---

## Version promotion

```text
PM GO
  → candidate prompt/dataset/evaluator version
  → RUN-001 (Hard + Quality PASS)
  → frozen RUN-002 (no artifact change)
  → PM FINAL LOCK document
```

- No self-declared COMPLETE / LOCK
- Locked sets (`cie-shadowset-v0.2.2`, `cip-v0.2.2`) are **immutable**
- New versions fork (`v0.2.3+`, `cip-v0.2.3+`)

---

## Rollback

- Pin `--prompt-version cip-v0.2.2`
- Pin `--dataset-version cie-shadowset-v0.2.2`
- Reuse prior `generations/{runId}/` or regenerate under new run id
- Live Coach (`fii_engine` rule `e2-v1`) unaffected

---

## Production separation

| Path | Allowed |
|---|---|
| `run_learning_loop.py` | offline only |
| `run_lab_rewrite.py --lab-only` | lab LLM only |
| Firestore `coachInsights` | **unchanged** |
| `aiAgentPreviews` append | **not in V1** |
| Weight training | **forbidden** |
| Hosting / Functions deploy | **forbidden** |

---

## Artifact locations

```text
learning_loop_v1/runs/{runId}/_loop_manifest.json
learning_loop_v1/runs/{runId}/PM_REVIEW_CHECKLIST.md
learning_loop_v1/runs/{runId}/failure_registry.jsonl
learning_loop_v1/hitl_feedback/
v0.2_shadow/generations|results|quality_results|failure_registry/
```

---

## Locked thresholds (assert_shadow_gates.py)

**Hard:** generationRate=1.0 · executionRate=1.0 · hardFailCount=0  

**Quality:** mean Q01–Q04 ≥ 1.50 · unique opening/closing ≥ 0.50 · repeated sentence ≤ 0.20 · low-quality ≤ 5 · generic headline opening = 0 · dominant opening family ≤ 50%

**Threshold changes forbidden without PM GO.**

---

## Next stage (NOT started)

**C — Semi-automated Learning Loop** requires PM GO after Manual Loop V1 is operational.
