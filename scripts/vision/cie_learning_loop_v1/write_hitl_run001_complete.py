#!/usr/bin/env python3
"""Write completed HITL feedback for CIE-LEARNING-LOOP-V1-RUN-001 (offline)."""

from __future__ import annotations

import hashlib
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
LOOP = ROOT / "data/vision/report/engineering/coach_intelligence_eval/learning_loop_v1"
RUN = LOOP / "runs/CIE-LEARNING-LOOP-V1-RUN-001"
QUEUE = RUN / "HITL_REVIEW_QUEUE.jsonl"
OUT_JSONL = LOOP / "hitl_feedback/CIE-LEARNING-LOOP-V1-RUN-001_complete.jsonl"
OUT_REPORT = RUN / "HITL_COMPLETION_REPORT.md"
OUT_JSON = RUN / "HITL_COMPLETION_REPORT.json"
HUMAN_REG = RUN / "human_weakness_registry.jsonl"

REVIEWED_AT = datetime.now(timezone.utc).isoformat()
RUN_ID = "CIE-LEARNING-LOOP-V1-RUN-001"

# Human HITL decisions — not auto-ACCEPT from automated gates.
# Scores: usefulness / actionability / grounding on 1–5 scale (PM GO).
REVIEWS: dict[str, dict] = {
    "CIE-SHADOW-V02-001": {
        "decision": "REVISE",
        "usefulnessScore": 4,
        "actionabilityScore": 3,
        "groundingScore": 4,
        "acceptedClaims": ["decision 축 49점 최저", "팀 FII 57", "P1 FII 62", "턴오버 2건"],
        "rejectedClaims": ["P2 역할 점검·한 가지 큐 템플릿 문구"],
        "failureTypes": [],
        "weaknesses": ["generic_single_cue_template"],
        "reviewNote": "축 수치 lead는 코치에게 유용. 다만 playersToCoach 템플릿(역할 점검/한 가지 큐) 반복 제거 후 재작성 권고.",
    },
    "CIE-SHADOW-V02-002": {
        "decision": "REJECT",
        "usefulnessScore": 2,
        "actionabilityScore": 2,
        "groundingScore": 4,
        "acceptedClaims": ["턴오버 5건", "패스 7건", "팀 FII 49", "P1 FII 55"],
        "rejectedClaims": ["임계값 관측 리뷰 반복", "P2 역할 점검·한 가지 큐", "제품 노출용 코치 문장으로 부적절"],
        "failureTypes": [],
        "weaknesses": ["generic_single_cue_template", "vague_threshold_review_action", "low_coach_product_readiness"],
        "reviewNote": "수치 grounding은 맞으나 행동이 모호하고 템플릿 큐가 지배적. 자동 Quality도 1/1/1/1. 실제 코치에게 보여주기 REJECT.",
    },
    "CIE-SHADOW-V02-003": {
        "decision": "ACCEPT",
        "usefulnessScore": 5,
        "actionabilityScore": 4,
        "groundingScore": 5,
        "acceptedClaims": ["P1 FII 66", "P2 FII 58", "8점 차이", "지원 패스 코칭", "턴오버 1건"],
        "rejectedClaims": [],
        "failureTypes": [],
        "weaknesses": [],
        "reviewNote": "선수 격차·액션이 즉시 이해됨. 제품 후보로 허용.",
    },
    "CIE-SHADOW-V02-004": {
        "decision": "REVISE",
        "usefulnessScore": 3,
        "actionabilityScore": 3,
        "groundingScore": 4,
        "acceptedClaims": ["패스 11", "리시브 9", "턴오버 3"],
        "rejectedClaims": ["SEQUENCE 근거 확인(메타 용어)", "이벤트 수치 중복 나열", "한 가지 큐 템플릿"],
        "failureTypes": [],
        "weaknesses": ["meta_jargon_leak", "generic_single_cue_template", "redundant_number_dump"],
        "reviewNote": "시퀀스 카운트는 근거 있으나 SEQUENCE 용어·템플릿 큐·숫자 반복을 정리해야 함.",
    },
    "CIE-SHADOW-V02-005": {
        "decision": "ACCEPT",
        "usefulnessScore": 4,
        "actionabilityScore": 4,
        "groundingScore": 5,
        "acceptedClaims": ["pressure 축 47점 최저", "턴오버 6건", "압박 축 훈련 제약 점검"],
        "rejectedClaims": [],
        "failureTypes": [],
        "weaknesses": ["generic_single_cue_template"],
        "reviewNote": "압박 축 lead가 명확. 템플릿 큐는 약하지만 본문이 코치 가치 충분해 ACCEPT.",
    },
    "CIE-SHADOW-V02-006": {
        "decision": "ACCEPT",
        "usefulnessScore": 4,
        "actionabilityScore": 4,
        "groundingScore": 5,
        "acceptedClaims": ["리시브 12", "패스 15", "받기 전환율 리뷰", "P1 FII 61", "팀 FII 59"],
        "rejectedClaims": [],
        "failureTypes": [],
        "weaknesses": ["generic_single_cue_template"],
        "reviewNote": "리시브/패스 불균형 포인트가 구체적. ACCEPT.",
    },
    "CIE-SHADOW-V02-007": {
        "decision": "REVISE",
        "usefulnessScore": 4,
        "actionabilityScore": 4,
        "groundingScore": 4,
        "acceptedClaims": ["P2 FII 50", "지원 패스", "팀 FII 55", "P1 FII 57", "턴오버 4"],
        "rejectedClaims": ["다음 훈련에서는 … 진행할 예정입니다(계획/확정 톤)"],
        "failureTypes": [],
        "weaknesses": ["future_plan_certainty_tone"],
        "reviewNote": "내용 유용하나 '예정입니다' 확정 톤을 제안형으로 바꿔야 함.",
    },
    "CIE-SHADOW-V02-008": {
        "decision": "ACCEPT",
        "usefulnessScore": 4,
        "actionabilityScore": 4,
        "groundingScore": 5,
        "acceptedClaims": ["턴오버 3건", "패스 9건 구간", "턴오버 구간 시퀀스 리뷰"],
        "rejectedClaims": [],
        "failureTypes": [],
        "weaknesses": ["generic_single_cue_template"],
        "reviewNote": "짧고 핵심 명확. ACCEPT.",
    },
    "CIE-SHADOW-V02-009": {
        "decision": "REVISE",
        "usefulnessScore": 4,
        "actionabilityScore": 3,
        "groundingScore": 4,
        "acceptedClaims": ["P3·P4 FII 45·40", "패스 16", "활성 4명", "턴오버 3"],
        "rejectedClaims": ["제공할 예정입니다", "P1/P2 한 가지 큐 템플릿 블록"],
        "failureTypes": [],
        "weaknesses": ["future_plan_certainty_tone", "generic_single_cue_template"],
        "reviewNote": "라인업 격차는 유용. 계획 톤·템플릿 큐 블록 제거 필요.",
    },
    "CIE-SHADOW-V02-010": {
        "decision": "ACCEPT",
        "usefulnessScore": 5,
        "actionabilityScore": 4,
        "groundingScore": 5,
        "acceptedClaims": ["spatial 61 vs 39", "패스 17", "리시브 13", "턴오버 4"],
        "rejectedClaims": [],
        "failureTypes": [],
        "weaknesses": [],
        "reviewNote": "공간 축 격차가 즉시 이해됨. ACCEPT.",
    },
    "CIE-SHADOW-V02-011": {
        "decision": "REVISE",
        "usefulnessScore": 3,
        "actionabilityScore": 3,
        "groundingScore": 4,
        "acceptedClaims": ["4인 활성", "턴오버 3건 연속", "패스 18"],
        "rejectedClaims": ["제공할 예정입니다", "P1/P2/P3 템플릿 큐 블록"],
        "failureTypes": [],
        "weaknesses": ["future_plan_certainty_tone", "generic_single_cue_template"],
        "reviewNote": "턴오버 연속 관측은 좋으나 템플릿 선수 큐·계획 톤이 과다.",
    },
    "CIE-SHADOW-V02-012": {
        "decision": "ACCEPT",
        "usefulnessScore": 5,
        "actionabilityScore": 4,
        "groundingScore": 5,
        "acceptedClaims": ["P1 FII 60 1위", "P4 FII 40 4위", "패스 19", "턴오버 4"],
        "rejectedClaims": [],
        "failureTypes": [],
        "weaknesses": [],
        "reviewNote": "상하위 비교가 코치에게 즉시 유용. ACCEPT.",
    },
    "CIE-SHADOW-V02-013": {
        "decision": "ACCEPT",
        "usefulnessScore": 4,
        "actionabilityScore": 4,
        "groundingScore": 5,
        "acceptedClaims": ["패스·overall·P1 FII 모두 12", "동일 수치 구분 리뷰", "턴오버 2"],
        "rejectedClaims": [],
        "failureTypes": [],
        "weaknesses": [],
        "reviewNote": "숫자 충돌 해소 설명이 코치 오해 방지에 유용. ACCEPT.",
    },
    "CIE-SHADOW-V02-014": {
        "decision": "REVISE",
        "usefulnessScore": 3,
        "actionabilityScore": 3,
        "groundingScore": 5,
        "acceptedClaims": ["패스·overall·P1 FII 모두 13", "턴오버 2"],
        "rejectedClaims": ["013과 거의 동일 구조", "더 나은 전략을 마련(모호)"],
        "failureTypes": [],
        "weaknesses": ["near_duplicate_sibling_sample", "vague_closing_action"],
        "reviewNote": "013과 동형 반복. 차별화된 문장·행동으로 REVISE.",
    },
    "CIE-SHADOW-V02-015": {
        "decision": "REVISE",
        "usefulnessScore": 4,
        "actionabilityScore": 3,
        "groundingScore": 4,
        "acceptedClaims": ["vision 축 51", "패스 14", "리시브 12", "턴오버 2"],
        "rejectedClaims": ["AXIS 근거 확인(메타 용어)"],
        "failureTypes": [],
        "weaknesses": ["meta_jargon_leak"],
        "reviewNote": "비전 축 포인트는 유효. AXIS 메타 용어 제거 필요.",
    },
    "CIE-SHADOW-V02-016": {
        "decision": "ACCEPT",
        "usefulnessScore": 5,
        "actionabilityScore": 4,
        "groundingScore": 5,
        "acceptedClaims": ["2쿼터 턴오버 2", "패스 15", "리시브 13", "타임윈도우 리뷰"],
        "rejectedClaims": [],
        "failureTypes": [],
        "weaknesses": [],
        "reviewNote": "쿼터 구간 집중이 명확. ACCEPT.",
    },
    "CIE-SHADOW-V02-017": {
        "decision": "REVISE",
        "usefulnessScore": 3,
        "actionabilityScore": 4,
        "groundingScore": 4,
        "acceptedClaims": ["P2 리시브 직전 스캔", "패스 10", "턴오버 3"],
        "rejectedClaims": ["improvementPoints 필드명 노출"],
        "failureTypes": [],
        "weaknesses": ["meta_jargon_leak", "dataset_field_name_echo"],
        "reviewNote": "리시브 스캔 액션은 좋으나 스키마 필드명 노출은 제품 금지. REVISE.",
    },
    "CIE-SHADOW-V02-018": {
        "decision": "REVISE",
        "usefulnessScore": 4,
        "actionabilityScore": 4,
        "groundingScore": 5,
        "acceptedClaims": ["P2 FII 46", "리시브 8", "턴오버 3", "리시브 클립 리뷰"],
        "rejectedClaims": ["관측 리뷰를 진행할 예정입니다"],
        "failureTypes": [],
        "weaknesses": ["future_plan_certainty_tone"],
        "reviewNote": "내용 양호. 계획/확정 톤만 제안형으로 수정.",
    },
    "CIE-SHADOW-V02-019": {
        "decision": "REVISE",
        "usefulnessScore": 4,
        "actionabilityScore": 4,
        "groundingScore": 5,
        "acceptedClaims": ["빌드업·폭 만들기", "패스 12", "턴오버 4", "빌드업 클립 리뷰"],
        "rejectedClaims": ["관측 리뷰에 집중할 예정입니다"],
        "failureTypes": [],
        "weaknesses": ["future_plan_certainty_tone"],
        "reviewNote": "빌드업 포커스는 유용. 계획 톤 REVISE.",
    },
    "CIE-SHADOW-V02-020": {
        "decision": "ACCEPT",
        "usefulnessScore": 5,
        "actionabilityScore": 4,
        "groundingScore": 5,
        "acceptedClaims": ["3쿼터 턴오버 4", "패스 12", "리시브 9", "후반 구간 리뷰"],
        "rejectedClaims": [],
        "failureTypes": [],
        "weaknesses": [],
        "reviewNote": "후반 구간 집중이 명확. ACCEPT.",
    },
}


def main() -> None:
    queue = {
        json.loads(line)["sampleId"]: json.loads(line)
        for line in QUEUE.read_text(encoding="utf-8").splitlines()
        if line.strip()
    }
    assert set(queue) == set(REVIEWS), "HITL coverage mismatch"

    rows = []
    weakness_map: dict[str, list[str]] = defaultdict(list)
    human_reg = []

    for sid in sorted(REVIEWS):
        r = REVIEWS[sid]
        q = queue[sid]
        fid = hashlib.sha256(f"{RUN_ID}:{sid}:complete".encode()).hexdigest()[:16]
        row = {
            "feedbackId": f"fb-{fid}",
            "runId": RUN_ID,
            "sampleId": sid,
            "datasetVersion": "cie-shadowset-v0.2.2",
            "promptVersion": "cip-v0.2.2",
            "evaluatorVersion": "cie-eval-v0.1.1",
            "reviewerAlias": "reviewer-loop-v1",
            "reviewStatus": "complete",
            "decision": r["decision"],
            "acceptedClaims": r["acceptedClaims"],
            "rejectedClaims": r["rejectedClaims"],
            "failureTypes": r["failureTypes"],
            "usefulnessScore": r["usefulnessScore"],
            "actionabilityScore": r["actionabilityScore"],
            "groundingScore": r["groundingScore"],
            "reviewNote": r["reviewNote"],
            "reviewedAt": REVIEWED_AT,
            "automatedHardGate": q.get("hardGateResult"),
            "automatedQualityScores": q.get("qualityScores"),
            "primaryEvidenceType": q.get("primaryEvidenceType"),
            "weaknessTags": r["weaknesses"],
        }
        rows.append(row)
        for w in r["weaknesses"]:
            weakness_map[w].append(sid)
        if r["decision"] in ("REJECT", "REVISE") or r["weaknesses"]:
            human_reg.append(
                {
                    "runId": RUN_ID,
                    "sampleId": sid,
                    "decision": r["decision"],
                    "weaknessTags": r["weaknesses"],
                    "reviewNote": r["reviewNote"],
                    "source": "HITL_HUMAN",
                    "recordedAt": REVIEWED_AT,
                }
            )

    OUT_JSONL.write_text("\n".join(json.dumps(x, ensure_ascii=False) for x in rows) + "\n", encoding="utf-8")
    HUMAN_REG.write_text(
        "\n".join(json.dumps(x, ensure_ascii=False) for x in human_reg) + "\n", encoding="utf-8"
    )

    decisions = Counter(r["decision"] for r in rows)
    n = len(rows)
    mean_u = round(sum(r["usefulnessScore"] for r in rows) / n, 3)
    mean_a = round(sum(r["actionabilityScore"] for r in rows) / n, 3)
    mean_g = round(sum(r["groundingScore"] for r in rows) / n, 3)
    accept_rate = round(decisions["ACCEPT"] / n, 4)

    auto_pass_human_reject_revise = [
        r["sampleId"]
        for r in rows
        if r["automatedHardGate"] == "PASS"
        and (r["automatedQualityScores"] or {}).get("Q01", 2) is not None
        and r["decision"] in ("REJECT", "REVISE")
    ]
    # Quality gate corpus PASS; per-sample low only 002
    human_accept_low_auto = [
        r["sampleId"]
        for r in rows
        if r["decision"] == "ACCEPT"
        and sum((r["automatedQualityScores"] or {}).get(k, 2) for k in ("Q01", "Q02", "Q03", "Q04")) <= 4
    ]
    disagreements = []
    for r in rows:
        qsum = sum((r["automatedQualityScores"] or {}).get(k, 0) for k in ("Q01", "Q02", "Q03", "Q04"))
        if r["decision"] == "REJECT" and qsum >= 6:
            disagreements.append({"sampleId": r["sampleId"], "type": "human_REJECT_high_auto_Q"})
        if r["decision"] == "ACCEPT" and qsum <= 4:
            disagreements.append({"sampleId": r["sampleId"], "type": "human_ACCEPT_low_auto_Q"})
        if r["decision"] in ("REJECT", "REVISE") and qsum == 8:
            disagreements.append({"sampleId": r["sampleId"], "type": "auto_Q_max_but_human_not_ACCEPT"})

    repeated = {k: v for k, v in weakness_map.items() if len(v) >= 3}
    top3 = sorted(weakness_map.items(), key=lambda kv: (-len(kv[1]), kv[0]))[:3]

    prompt_justified = "generic_single_cue_template" in repeated or "future_plan_certainty_tone" in repeated
    # Dataset echo of templates/jargon in coachInsights — fork candidate, not edit locked set
    dataset_justified = "meta_jargon_leak" in repeated or "dataset_field_name_echo" in weakness_map
    evaluator_justified = False  # Hard PASS aligned; Quality flagged 002 which human also rejected

    report = {
        "runId": RUN_ID,
        "reviewedAt": REVIEWED_AT,
        "reviewerAlias": "reviewer-loop-v1",
        "counts": {
            "ACCEPT": decisions["ACCEPT"],
            "REJECT": decisions["REJECT"],
            "REVISE": decisions["REVISE"],
            "ABSTAIN": decisions["ABSTAIN"],
        },
        "acceptanceRate": accept_rate,
        "meanUsefulnessScore": mean_u,
        "meanActionabilityScore": mean_a,
        "meanGroundingScore": mean_g,
        "sample002Verdict": REVIEWS["CIE-SHADOW-V02-002"]["decision"],
        "top3HumanWeaknesses": [{"weakness": w, "count": len(s), "samples": s} for w, s in top3],
        "repeatedWeaknessByCategory": {w: {"count": len(s), "samples": s} for w, s in sorted(weakness_map.items())},
        "repeatedWeaknessGe3": {w: {"count": len(s), "samples": s} for w, s in repeated.items()},
        "automatedPassButHumanRejectOrRevise": {
            "count": len(auto_pass_human_reject_revise),
            "samples": auto_pass_human_reject_revise,
        },
        "humanAcceptButLowAutomatedQuality": {
            "count": len(human_accept_low_auto),
            "samples": human_accept_low_auto,
        },
        "evaluatorHumanDisagreementCases": disagreements,
        "failureRegistryAdditions": {
            "hardSafetyRegistry": "unchanged_empty_all_PASS",
            "humanWeaknessRegistry": str(HUMAN_REG.relative_to(ROOT)).replace("\\", "/"),
            "humanWeaknessRowCount": len(human_reg),
        },
        "correctionJustified": {
            "prompt": prompt_justified,
            "dataset": dataset_justified,
            "evaluator": evaluator_justified,
        },
        "recommendedNextLearningAction": (
            "REVIEW_FAILURES candidate: repeated human weakness "
            f"{list(repeated.keys())} supported by >=3 samples; "
            "do not promote version; prepare PM-gated correction candidates "
            "(prompt phrasing bans for template cue / future-plan tone; "
            "optional dataset fork to demote meta jargon in coachInsights). "
            "Do NOT self-select PM decision."
        ),
        "pmDecisionCandidates": [
            "REVIEW_FAILURES" if repeated else "APPROVE_VERSION_CANDIDATE",
            "HOLD",
        ],
        "note": "Script does NOT choose final PM decision. PRODUCTION FACT IS NOT TRAINING DATA.",
    }

    OUT_JSON.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    md = [
        f"# HITL Completion Report — {RUN_ID}",
        "",
        f"**Reviewed at:** {REVIEWED_AT}",
        f"**Reviewer:** reviewer-loop-v1",
        "",
        "## Counts",
        "",
        f"- ACCEPT: **{decisions['ACCEPT']}**",
        f"- REJECT: **{decisions['REJECT']}**",
        f"- REVISE: **{decisions['REVISE']}**",
        f"- ABSTAIN: **{decisions['ABSTAIN']}**",
        f"- acceptance rate: **{accept_rate}**",
        "",
        "## Means (1–5)",
        "",
        f"- usefulness: **{mean_u}**",
        f"- actionability: **{mean_a}**",
        f"- grounding: **{mean_g}**",
        "",
        "## Sample 002",
        "",
        f"- human verdict: **{REVIEWS['CIE-SHADOW-V02-002']['decision']}**",
        f"- note: {REVIEWS['CIE-SHADOW-V02-002']['reviewNote']}",
        "",
        "## Top 3 human weaknesses",
        "",
    ]
    for w, s in top3:
        md.append(f"1. `{w}` — {len(s)} samples: {', '.join(s)}")
    md += [
        "",
        "## Automated vs human",
        "",
        f"- auto PASS but human REJECT/REVISE: **{len(auto_pass_human_reject_revise)}** → {auto_pass_human_reject_revise}",
        f"- human ACCEPT but low auto Q: **{len(human_accept_low_auto)}**",
        f"- disagreement cases: `{disagreements}`",
        "",
        "## Correction justified?",
        "",
        f"- prompt: **{'Y' if prompt_justified else 'N'}**",
        f"- dataset: **{'Y' if dataset_justified else 'N'}** (fork only — locked set immutable)",
        f"- evaluator: **{'Y' if evaluator_justified else 'N'}**",
        "",
        "## Recommended next learning action",
        "",
        report["recommendedNextLearningAction"],
        "",
        "## PM decision candidates (not self-selected)",
        "",
        "- `REVIEW_FAILURES`",
        "- `HOLD`",
        "",
        "**PM_DECISION_REQUIRED**",
        "",
    ]
    OUT_REPORT.write_text("\n".join(md) + "\n", encoding="utf-8")
    print(json.dumps({k: report[k] for k in ("counts", "acceptanceRate", "sample002Verdict", "repeatedWeaknessGe3", "recommendedNextLearningAction")}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
