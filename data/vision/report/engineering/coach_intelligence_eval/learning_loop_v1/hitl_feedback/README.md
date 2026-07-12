# HITL Feedback — Learning Loop V1

**Path:** `hitl_feedback/`  
**Format:** append-only JSONL (one file per review session recommended)  
**Schema:** `SCHEMA.json`

## Rules

- Append only — never delete or overwrite prior feedback rows.
- Use `reviewerAlias` (e.g. `reviewer-a`) — **no real PII**.
- `reviewStatus`: `pending` → `complete` when review finished.
- `decision`: `ACCEPT` | `REJECT` | `REVISE` | `ABSTAIN`

## Validate a row

```bash
python scripts/vision/cie_learning_loop_v1/validate_hitl_feedback.py hitl_feedback/example.jsonl
```

## Example row

```json
{
  "feedbackId": "fb-dry001-001",
  "runId": "CIE-LEARNING-LOOP-V1-DRY-001",
  "sampleId": "CIE-SHADOW-V02-001",
  "datasetVersion": "cie-shadowset-v0.2.2",
  "promptVersion": "cip-v0.2.2",
  "evaluatorVersion": "cie-eval-v0.1.1",
  "reviewerAlias": "reviewer-a",
  "reviewStatus": "complete",
  "decision": "ACCEPT",
  "acceptedClaims": ["decision 축 49점", "턴오버 2건"],
  "rejectedClaims": [],
  "failureTypes": [],
  "usefulnessScore": 2,
  "actionabilityScore": 2,
  "groundingScore": 2,
  "reviewNote": "Dry-run schema validation example.",
  "reviewedAt": "2026-07-13T00:00:00+00:00"
}
```

**PRODUCTION FACT IS NOT TRAINING DATA.** Do not ingest Official Fact / VOC into this folder without PM GO and anonymization.
