# Coach Intelligence Evaluation v0 (CIE v0)

**Status:** 🔒 **CIE v0.1 PASS / COMPLETE / LOCK** — see `CIE_V0_1_PM_FINAL_LOCK.md`  
**Dataset:** `cie-evalset-v0.1.0`  
**Evaluator:** `cie-eval-v0.1.1` (RUN-001 baseline used `cie-eval-v0.1.0`)  
**Prompt draft:** `cip-v0.1.0`  
**Failure Registry:** `cie-fail-v0.1.0`

## Purpose

Offline loop:

```text
FII / coachInsights Fact → grounded rewrite candidate → deterministic guard → PASS/FAIL → failure registry
```

**NOT** Production Coach replacement · live LLM · weight training · Vision PAI · 4-Agent complete.

## Dataset

- Exactly **16** EVALUATION samples
- 8 known-good · 8 known-bad
- No real PII · no Official Beta Fact auto-ingest as TRAINING

## Locked evidence

| Run | Role |
|---|---|
| CIE-V0-RUN-001 | Baseline |
| CIE-V0-RUN-002 | Gate PASS 1/2 |
| CIE-V0-RUN-003 | Frozen reproducibility Gate PASS 2/2 |

**RUN-004 on this locked set is forbidden** without new PM GO.

## Run (historical)

```bash
python scripts/vision/cie_eval_v0/run_deterministic_eval.py --run-id CIE-V0-RUN-003
```

## Separation

| Class | Role |
|---|---|
| EVALUATION | This folder |
| TRAINING | Deferred |
| PRODUCTION FACT | Ops Gate only — not auto-train |
