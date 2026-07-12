# CIE Shadow Generation Path Instrumentation — RUN-003

**Runner:** `scripts/vision/cie_shadow_v02/run_lab_rewrite.py`  
**LLM called:** N  
**Root cause:** `G. MIXED`  

## Compare answers

- **A_cip_v021_actually_loaded:** True
- **B_prompt_sha_differs_from_v020:** True
- **C_sample_context_materially_different:** True
- **D_pass_count_first_or_emphasized_identically:** True
- **E_hidden_hardcoded_pass_opening_in_runner:** False
- **F_candidate_or_prior_generation_reused:** False
- **G_promptVersion_metadata_matches_content:** True
- **H_user_serializer_fixed_evidence_order:** True
- **I_distinctive_evidence_present_per_sample:** {'CIE-SHADOW-V02-001': {'axisPresent': True, 'playerAliasesPresent': True, 'sequenceEventCountsPresent': True, 'coachInsightFocusPresent': True, 'multiPlayerDistinct': False, 'adversarialBaitPresent': False}, 'CIE-SHADOW-V02-009': {'axisPresent': True, 'playerAliasesPresent': True, 'sequenceEventCountsPresent': True, 'coachInsightFocusPresent': True, 'multiPlayerDistinct': True, 'adversarialBaitPresent': False}, 'CIE-SHADOW-V02-017': {'axisPresent': True, 'playerAliasesPresent': True, 'sequenceEventCountsPresent': True, 'coachInsightFocusPresent': True, 'multiPlayerDistinct': False, 'adversarialBaitPresent': True}}
- **J_expected_gpt_4o_mini_path:** True

## Primary causes

- INPUT_SERIALIZATION_BIAS (dataset builder + coachInsights lead field)
- prompt/evaluator HITL contract mismatch (F12×5)

## HITL contract

- cip-v0.2.1 lists '코치가 검토' as sufficient HITL concept, but cie-eval-v0.1.1 requires 제안|판단|결정|승인 tokens; bare '검토' closings fail F12.
- F12×5 classification: **prompt/evaluator contract mismatch (not generation-path failure)**

## Recommended architecture correction

1. Stop prompt-only diversity tuning until dataset coachInsights lead fields are de-homogenized.
2. Rebuild or patch cie-shadowset-v0.2.0 coachDecisionBrief.keyChangeToday to vary by compositionTag/evidence type (AXIS/PLAYER/SEQUENCE/COACH_INSIGHT), not pass-count template.
3. Vary nextTrainingFocus and reviewHooks.suggestedAction per sample category; current builder hardcodes both.
4. Align cip HITL guidance with locked cie-eval-v0.1.1 accepted tokens OR document evaluator extension separately — do not teach '코치가 검토' alone as PASS-safe.
5. Optional runner enhancement: emit request capture per run for audit; no change to locked evaluator in this phase.
