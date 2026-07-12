# Coach Intelligence Shadow Learning v0.2

**Status:** 🔒 **CIE Shadow V022 PASS / COMPLETE / LOCK** — see `CIE_SHADOW_V022_PM_FINAL_LOCK.md`

**Locked dataset:** `cie-shadowset-v0.2.2` (20 UNSEEN · `EVALUATION_SHADOW`)  
**Locked prompt:** `cip-v0.2.2`  
**Locked evaluator:** `cie-eval-v0.1.1` (Hard Gate — do not modify)

CIE v0.1 locked 16-sample set is **not** re-run here. **RUN-003+ on locked set forbidden** without PM GO.

## Locked RUN evidence

- `CIE-SHADOW-V022-RUN-001` — Hard PASS · Quality PASS 1/2
- `CIE-SHADOW-V022-RUN-002` — Hard PASS · Quality PASS 2/2

## Lab generation (new runs require PM GO + version bump)

```bash
python scripts/vision/cie_shadow_v02/run_lab_rewrite.py --lab-only \
  --run-id CIE-SHADOW-V022-RUN-002 \
  --dataset-version cie-shadowset-v0.2.2 \
  --prompt-version cip-v0.2.2 --model gpt-4o-mini
python scripts/vision/cie_shadow_v02/run_shadow_eval.py --run-id <RUN-ID> --dataset-version cie-shadowset-v0.2.2
python scripts/vision/cie_shadow_v02/run_quality_eval.py --lab-only --run-id <RUN-ID> --dataset-version cie-shadowset-v0.2.2
```

Requires `OPENAI_API_KEY`. No Production writes.

**Next (PM GO only):** `INTELLIGENCE_AI_AGENT_LEARNING_LOOP_V1_FACT_REVIEW.md`
