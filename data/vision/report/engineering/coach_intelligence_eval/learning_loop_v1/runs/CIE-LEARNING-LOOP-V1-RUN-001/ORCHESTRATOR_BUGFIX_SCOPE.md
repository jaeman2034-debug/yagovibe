# Orchestrator bugfix scope — Learning Loop V1

**Status:** infrastructure bug fix candidate — accepted for RUN-001 completion  

## Change

- `load_hard_summary()` / `load_quality_summary()` separated
- Hard Gate path no longer requires Quality artifact before Quality execution
- HITL queue preparation helpers added (`prepare_hitl_review`)

## Verified not changed

- Hard Gate thresholds / `cie-eval-v0.1.1` behavior
- Quality rubric thresholds / `assert_shadow_gates.py` rules
- Generation behavior (`run_lab_rewrite.py`, temperature, prompt, payload)
- Locked dataset / prompt content

**Scope:** orchestration flow only.
