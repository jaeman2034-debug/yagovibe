# HITL Completion Report — CIE-LEARNING-LOOP-V1-RUN-001

**Reviewed at:** 2026-07-13T00:13:11.222820+00:00
**Reviewer:** reviewer-loop-v1

## Counts

- ACCEPT: **9**
- REJECT: **1**
- REVISE: **10**
- ABSTAIN: **0**
- acceptance rate: **0.45**

## Means (1–5)

- usefulness: **3.95**
- actionability: **3.6**
- grounding: **4.6**

## Sample 002

- human verdict: **REJECT**
- note: 수치 grounding은 맞으나 행동이 모호하고 템플릿 큐가 지배적. 자동 Quality도 1/1/1/1. 실제 코치에게 보여주기 REJECT.

## Top 3 human weaknesses

1. `generic_single_cue_template` — 8 samples: CIE-SHADOW-V02-001, CIE-SHADOW-V02-002, CIE-SHADOW-V02-004, CIE-SHADOW-V02-005, CIE-SHADOW-V02-006, CIE-SHADOW-V02-008, CIE-SHADOW-V02-009, CIE-SHADOW-V02-011
1. `future_plan_certainty_tone` — 5 samples: CIE-SHADOW-V02-007, CIE-SHADOW-V02-009, CIE-SHADOW-V02-011, CIE-SHADOW-V02-018, CIE-SHADOW-V02-019
1. `meta_jargon_leak` — 3 samples: CIE-SHADOW-V02-004, CIE-SHADOW-V02-015, CIE-SHADOW-V02-017

## Automated vs human

- auto PASS but human REJECT/REVISE: **11** → ['CIE-SHADOW-V02-001', 'CIE-SHADOW-V02-002', 'CIE-SHADOW-V02-004', 'CIE-SHADOW-V02-007', 'CIE-SHADOW-V02-009', 'CIE-SHADOW-V02-011', 'CIE-SHADOW-V02-014', 'CIE-SHADOW-V02-015', 'CIE-SHADOW-V02-017', 'CIE-SHADOW-V02-018', 'CIE-SHADOW-V02-019']
- human ACCEPT but low auto Q: **0**
- disagreement cases: `[{'sampleId': 'CIE-SHADOW-V02-001', 'type': 'auto_Q_max_but_human_not_ACCEPT'}, {'sampleId': 'CIE-SHADOW-V02-004', 'type': 'auto_Q_max_but_human_not_ACCEPT'}, {'sampleId': 'CIE-SHADOW-V02-007', 'type': 'auto_Q_max_but_human_not_ACCEPT'}, {'sampleId': 'CIE-SHADOW-V02-009', 'type': 'auto_Q_max_but_human_not_ACCEPT'}, {'sampleId': 'CIE-SHADOW-V02-011', 'type': 'auto_Q_max_but_human_not_ACCEPT'}, {'sampleId': 'CIE-SHADOW-V02-014', 'type': 'auto_Q_max_but_human_not_ACCEPT'}, {'sampleId': 'CIE-SHADOW-V02-015', 'type': 'auto_Q_max_but_human_not_ACCEPT'}, {'sampleId': 'CIE-SHADOW-V02-017', 'type': 'auto_Q_max_but_human_not_ACCEPT'}, {'sampleId': 'CIE-SHADOW-V02-018', 'type': 'auto_Q_max_but_human_not_ACCEPT'}, {'sampleId': 'CIE-SHADOW-V02-019', 'type': 'auto_Q_max_but_human_not_ACCEPT'}]`

## Correction justified?

- prompt: **Y**
- dataset: **Y** (fork only — locked set immutable)
- evaluator: **N**

## Recommended next learning action

REVIEW_FAILURES candidate: repeated human weakness ['generic_single_cue_template', 'meta_jargon_leak', 'future_plan_certainty_tone'] supported by >=3 samples; do not promote version; prepare PM-gated correction candidates (prompt phrasing bans for template cue / future-plan tone; optional dataset fork to demote meta jargon in coachInsights). Do NOT self-select PM decision.

## PM decision candidates (not self-selected)

- `REVIEW_FAILURES`
- `HOLD`

**PM_DECISION_REQUIRED**

