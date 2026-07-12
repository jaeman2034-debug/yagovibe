# Intelligence AI Agent Learning Loop V1 — FACT REVIEW

**Document ID:** `INTELLIGENCE-AI-AGENT-LEARNING-LOOP-V1-FACT-REVIEW`  
**Date:** 2026-07-13  
**Type:** Read-only architecture fact review — **no implementation**  
**Prerequisite:** CIE v0.1 LOCK + CIE Shadow V022 LOCK

---

## Executive summary

**Current maturity: A — Evaluation foundation only** (with Shadow LLM lab path proven offline).

**Recommended next stage: B — Manual learning loop.**

The smallest defensible next step is a **documented, repeatable offline loop** that connects: candidate generation → Hard + Quality eval → failure registry append → PM-gated prompt/dataset promotion — **without** Production writes, live Coach LLM, or weight training.

---

## 1. Locked intelligence assets now available

| Layer | Asset | Status | Path |
|---|---|---|---|
| Deterministic Hard Gate | CIE v0.1 evaluator F01–F12 | 🔒 LOCK | `scripts/vision/cie_eval_v0/run_deterministic_eval.py` (`cie-eval-v0.1.1`) |
| Gold eval set (16) | `cie-evalset-v0.1.0` | 🔒 LOCK | `coach_intelligence_eval/v0/samples/` |
| Shadow unseen set (20) | `cie-shadowset-v0.2.2` | 🔒 LOCK | `v0.2_shadow/samples_v022/` |
| Shadow prompt | `cip-v0.2.2` | 🔒 LOCK | `prompts/cip_v0_2_2.md` |
| Evidence payload contract | `rewrite_payload.py` | 🔒 LOCK | omits generic headline/summary |
| Lab generation | `run_lab_rewrite.py` | operational | `--lab-only`, `gpt-4o-mini`, `temperature=0.2` |
| Shadow Hard eval | `run_shadow_eval.py` | operational | imports locked evaluator only |
| Shadow Quality eval | `run_quality_eval.py` | operational | advisory Q01–Q04 + diversity metrics |
| Failure taxonomy | F01–F12 + registry schema | defined | `v0/failure_registry/`, shadow `failure_registry/` |
| RUN evidence | V022-RUN-001/002 | 🔒 LOCK | generations + results + quality_results |
| Root cause record | `DATASET_HEADLINE_BIAS` | confirmed | `low_quality_review/`, lock doc |

**Not locked / not present:**

- Automated loop orchestrator (single command for gen→eval→registry→report)
- Human feedback capture schema for Coach Intelligence
- Prompt version promotion pipeline (`cip-v0.2.3` automation)
- Shadow → `aiAgentPreviews` bridge for Coach agent type
- Live LLM rewrite in worker or Functions

---

## 2. What is still missing for a repeatable learning loop

1. **Loop manifest** — run metadata tying `runId`, dataset, prompt, evaluator, model, SHA, gate verdicts in one immutable record (partially exists per-run; no cross-run index).
2. **Failure → action workflow** — when Hard FAIL > 0, registry entries exist but no standard PM review template or promotion checklist beyond ad-hoc failure_review JSON.
3. **Quality regression gate automation** — quality thresholds are documented in PM runs but not encoded as a single `assert_quality_gate.py` exit-code gate.
4. **Dataset growth protocol** — no rule for adding shadow samples without breaking v0.2.2 immutability (needs `v0.2.3+` fork).
5. **Feedback sink** — no offline store for coach HITL accept/reject/edit on shadow rewrites (North Star `aiAgentPreviews` is Production Firestore append-only, currently HOLD for K3).
6. **Live path divergence tracking** — `fii_engine.build_coach_insights()` still rule-based; no diff between rule output and shadow LLM rewrite for same session.
7. **Official Fact separation enforcement in loop** — prompt text bans Official Fact IDs; no automated scan in loop runner beyond evaluator F08.

---

## 3. Where candidate outputs should be generated

**Now (correct):** lab-only path only.

```text
samples_v022/*.json
  → rewrite_payload.build_user_message()  [evidence only]
  → run_lab_rewrite.py + cip-v0.2.2 + gpt-4o-mini
  → generations/{runId}/CIE-SHADOW-V02-*.json
```

**Not yet:**

- `yago-worker` / `fii_engine.py` post-`build_coach_insights()` LLM rewrite
- Firestore `visionAnalysis` / `coachInsights` overwrite
- `teams/{teamId}/aiAgentPreviews` (`agentType: coach`)

**Future shadow observation (if PM GO):** parallel write of `aiAgentPreviews` with `source: shadow`, `status: preview` — append-only, deduped — **without** replacing rule `coachInsights`.

---

## 4. Where feedback should be recorded

| Feedback type | Recommended sink (V1 manual) | Exists today |
|---|---|---|
| Hard FAIL instances | `failure_registry/{runId}_failures.jsonl` | ✅ (empty when all PASS) |
| Quality advisory | `quality_results/{runId}_QUALITY_*` | ✅ |
| PM promotion decision | lock markdown + tracker row | ✅ pattern (CIE v0.1, V022) |
| Coach HITL accept/reject | **missing** — propose `learning_loop/feedback/{runId}_hitl.jsonl` offline | ❌ |
| Production coach usage | Official Fact / Beta ops logs | ✅ (separate track) |
| Agent preview acceptance | `aiAgentPreviews` status `candidate` | schema exists; **not wired to CIE** |

**Rule:** Track A (Official Fact) and Track B (Synthetic/Shadow) remain **separate** — feedback from shadow runs must not enter Engineering Gate or Ops SoT without PM relabel.

---

## 5. How PASS/FAIL should feed the next iteration

```text
[Generation] run_lab_rewrite --run-id RUN-NNN
     ↓
[Hard Gate] run_shadow_eval
     ├─ FAIL (any F01–F12) → STOP → append failure_registry → PM reviews failure_review
     │                        → classify: PROMPT | DATASET | EVALUATOR_LIMIT
     │                        → PM GO for cip-v0.2.x+ or cie-shadowset-v0.2.x+
     └─ PASS → continue
     ↓
[Quality Gate] run_quality_eval (advisory)
     ├─ FAIL thresholds → STOP → low_quality_review / PM dataset or prompt GO
     └─ PASS → record 1/2 or 2/2 consecutive
     ↓
[Promotion] PM LOCK artifact → immutable version bump
```

**V022 precedent:** two consecutive PASS runs required before LOCK; zero tuning between runs.

---

## 6. Whether prompt optimization can be automated

**Partially — not fully.**

- **Automatable now:** failure code aggregation, diversity metrics, request capture preflight (`capture_v022_preflight.py`), dataset validation (`validate_shadowset_v022.py`).
- **Not automatable safely now:** prompt text edits from failure patterns (PM stopped iterative prompt-only tuning at V02-RUN-003; root cause was dataset).
- **Recommendation:** automation = **gate assertion + report generation** only; prompt/dataset changes remain **PM GO + human-authored version bump**.

---

## 7. Model weight training justified now?

**N**

- N=20 shadow samples; no human-gold rewrite labels for SFT.
- Hard gate is deterministic rules, not differentiable reward.
- Quality judge is another LLM (gpt-4o-mini) — not training signal.
- Live Coach still rule-based — no production distribution match.

---

## 8. Live Coach LLM wiring justified now?

**N**

- V022 proves **offline** safety + quality on synthetic shadow fixtures only.
- Live `build_coach_insights()` produces structured rule output consumed by UI (`fiiSummaryCoachProvider` → `VisionCoachInsightCards`).
- Wiring LLM into Production path requires: shadow 2/2 LOCK ✅, loop discipline, rollback, and PM GO — **loop structure comes first**.

---

## 9. Shadow-only production observation justified now?

**N (hold)**

- North Star R4 `aiAgentPreviews` append path exists (`appendAiAgentPreview.ts`, `source: shadow`).
- K3 execution order lock forbids new telemetry/production expansion until K3 PASS.
- Justified **after** manual learning loop is documented and PM explicitly GOs shadow observation — not concurrent with loop V1 build.

---

## 10. Minimum loop architecture (V1 manual)

```text
┌─────────────────────────────────────────────────────────────┐
│ OFFLINE ONLY — Intelligence Agent Learning Loop V1 (Manual) │
├─────────────────────────────────────────────────────────────┤
│ Inputs:  locked shadow sample OR new versioned sample set   │
│ Gen:     run_lab_rewrite.py (lab-only)                      │
│ Hard:    run_shadow_eval.py → cie-eval-v0.1.1               │
│ Quality: run_quality_eval.py (advisory)                     │
│ Registry:failure_registry/ on FAIL only                     │
│ Review:  PM checklist → PROMPT|DATASET|EVAL decision        │
│ Promote: new cip-v0.2.x / cie-shadowset-v0.2.x + 2-run gate │
│ Lock:    PM_FINAL_LOCK.md                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. Dataset growth rule

- **Locked sets immutable:** `cie-evalset-v0.1.0`, `cie-shadowset-v0.2.2` — no in-place edits.
- **New samples:** fork `cie-shadowset-v0.2.3+` via new `build_shadowset_v023.py`; run `validate_shadowset_v023.py` + request capture preflight before any LLM.
- **Composition tags** must stay diverse (AXIS / PLAYER / SEQUENCE / COACH_INSIGHT) — avoid homogeneous field injection (lesson from v0.2.0 pass-open and v0.2.1 headline bias).
- **Official Fact clips** must not enter shadow set without anonymization and PM approval (Track A/B separation).

---

## 12. Failure registry update rule

- Append per run: `{runId}_failures.jsonl` — one line per failing sample only.
- Include: `failureTypes`, `candidateOutputHash`, `promptVersion`, `datasetVersion`, `evaluatorVersion`.
- On all-PASS run: empty file still written (proves eval executed).
- Cross-run analysis: aggregate by `failureTypes` + `likelyPromptWeakness` from `failure_review/{runId}_FAILURE_REVIEW.json`.
- **Do not** delete prior registry entries after LOCK.

---

## 13. Version promotion rule

| Change type | Requires | Consecutive gate |
|---|---|---|
| Prompt patch | new `cip-v0.2.x`, PM GO | Hard 2/2 on same locked dataset |
| Dataset fix | new `cie-shadowset-v0.2.x` | validate + capture preflight + Hard 2/2 + Quality 2/2 |
| Evaluator change | new `cie-eval-v0.1.x` | re-validate CIE v0.1 gold set first (separate track) |
| LOCK | PM FINAL LOCK md | Hard 2/2 + Quality 2/2 |

---

## 14. Rollback rule

- **Prompt rollback:** pin `run_lab_rewrite --prompt-version` to last LOCKED `cip-v0.2.2`.
- **Dataset rollback:** pin `--dataset-version cie-shadowset-v0.2.2`.
- **Generation rollback:** never reuse prior `generations/` — regenerate under new `runId`.
- **Production:** live Coach unaffected (rule `e2-v1`); no Firestore rollback needed for shadow experiments.

---

## 15. Top 3 next implementation candidates

| Rank | Candidate | Scope | Why first |
|---|---|---|---|
| **1** | `run_learning_loop.py` orchestrator | offline script | Single entry: validate → gen → hard → quality → gate report + exit code; no new AI |
| **2** | `learning_loop/CIE_LEARNING_LOOP_V1_RUNBOOK.md` + HITL feedback JSONL schema | docs + schema | Makes manual loop repeatable for PM/Eng without Production touch |
| **3** | `assert_shadow_gates.py` | deterministic checker | Encodes Hard + Quality thresholds as CI-friendly PASS/FAIL (no LLM) |

**Explicitly deferred:** live Coach LLM, weight training, `aiAgentPreviews` Production append, automated prompt rewriting.

---

## Live path facts (inspected)

### `fii_engine.build_coach_insights()`

- Rule-based: `_build_key_change_today`, `_build_next_training_focus`, strengths/improvements from GEV counts.
- Returns `insightVersion: e2-v1` — **no LLM**.
- Same structural fields shadow payload uses (`coachDecisionBrief`, `reviewHooks`).

### `visionAnalysisCoachBridge.ts` / `fiiSummaryCoachProvider.ts`

- UI reads Firestore `coachInsights` / `fii_summary` → dashboard view.
- `normalizeMatchSummary` defaults headline to `"Vision 분석 요약"` if missing — **live UI still has headline slot**; shadow fix was payload omission only.
- `VisionCoachInsightCards` renders `coachDecisionBrief`, strengths, recommendations — **rule content today**.

### `aiAgentPreviews`

- `teams/{teamId}/aiAgentPreviews/{previewId}` — append-only, dedupeKey, `agentType: coach|growth|parent|revenue`, `source: shadow|auto|manual`.
- **Not connected** to CIE shadow generations.

### Official Fact / VOC separation

- Engineering tracker: Track A = Official Fact (Gate); Track B = Synthetic → AI Coach (Gate 금지).
- CIP prompts ban Official Fact ID leak; evaluator F08 checks context leak.
- Shadow dataset is synthetic `EVALUATION_SHADOW` — correct track.

### Hallucination policy

- Hard gate: F01 unsupported fact, F02 numeric drift, F04/F05 medical/psych, F06 tactical intent, F03 causal overreach, F12 HITL contract.
- Quality layer: Q01–Q04 advisory via lab judge.
- No separate "hallucination score" beyond F-codes.

---

## Maturity classification

| Stage | Description | Match |
|---|---|---|
| **A** | Evaluation foundation only | **✅ current** |
| B | Manual learning loop | **→ recommended next** |
| C | Semi-automated learning loop | after B runbook + orchestrator |
| D | Production shadow learning | after K3 + PM GO |
| E | Live Coach Intelligence | after D + safety proof at scale |
| F | Weight-trained model | not justified |

---

## Recommendation

**Exactly ONE next stage: B — Manual learning loop**

Document and execute the offline gen → hard → quality → registry → PM promotion cycle as a **repeatable runbook** with versioned artifacts, before any semi-automation, Production shadow writes, or live LLM.

---

**STOP — awaiting PM Review. No implementation authorized by this document.**
