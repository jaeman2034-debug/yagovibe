#!/usr/bin/env python3
"""Build CIE evalset v0.1.0 — 16 EVALUATION samples (offline only)."""

from __future__ import annotations

import json
from pathlib import Path

OUT = Path(__file__).resolve().parents[3] / "data/vision/report/engineering/coach_intelligence_eval/v0/samples"

FORBIDDEN = [
    "injury",
    "medical",
    "fatigue_diagnosis",
    "psych_state",
    "invented_intent",
    "future_certainty",
    "age_benchmark",
]

BASE_CTX = {
    "audience": "coach",
    "task": "rewrite_brief",
    "locale": "ko-KR",
    "hitlRequired": True,
}


def base_fii(overall=54, passes=12, turnovers=3, receives=10):
    return {
        "schemaVersion": "yago-vision-fii-summary-v1",
        "teamFii": {
            "overall": overall,
            "axes": {
                "spatial": 52,
                "vision": 55,
                "decision": 50,
                "pressure": 48,
                "tactics": 51,
            },
            "playerCount": 3,
        },
        "playerFii": [
            {
                "trackId": "t1",
                "name": "P1",
                "fii": 58,
                "rank": 1,
                "axes": {"spatial": 60, "vision": 55, "decision": 52, "pressure": 50, "tactics": 54},
            },
            {
                "trackId": "t2",
                "name": "P2",
                "fii": 50,
                "rank": 2,
                "axes": {"spatial": 48, "vision": 52, "decision": 48, "pressure": 46, "tactics": 50},
            },
            {
                "trackId": "t3",
                "name": "P3",
                "fii": 45,
                "rank": 3,
                "axes": {"spatial": 40, "vision": 48, "decision": 44, "pressure": 42, "tactics": 46},
            },
        ],
        "gevInput": {
            "eventCount": passes + receives + turnovers,
            "eventCounts": {"PASS": passes, "RECEIVE": receives, "TURNOVER": turnovers},
        },
        "matchSummary": {
            "headline": "세션 요약",
            "summary": "GEV·FII 기반 코치 브리프입니다.",
            "eventHighlights": {
                "passes": passes,
                "receives": receives,
                "turnovers": turnovers,
                "totalEvents": passes + receives + turnovers,
            },
        },
    }


def base_insights(passes=12, turnovers=3):
    return {
        "insightVersion": "e2-v1",
        "coachDecisionBrief": {
            "keyChangeToday": f"패스 연결 {passes}건이 확인되었습니다.",
            "nextTrainingFocus": "압박 하 짧은 지원 패스",
            "playersToCoach": [
                {
                    "trackId": "t3",
                    "name": "P3",
                    "focus": "공간 이동",
                    "oneLiner": "볼 없을 때 한 칸 앞으로",
                }
            ],
        },
        "reviewHooks": [
            {
                "label": "턴오버 구간",
                "headlineMetric": f"턴오버 {turnovers}건",
                "suggestedAction": "위험 지역 안전 옵션 리허설",
            }
        ],
        "strengths": [
            f"패스 연결 {passes}건 — 볼 순환 구간 확인됨",
            "P1: 공간 인식 60점 — 팀 내 상대 강점",
        ],
        "improvementPoints": [
            f"턴오버 {turnovers}건 — 압박 대응·지원 패스 훈련 포인트",
        ],
        "recommendations": [
            "턴오버 구간: 위험 지역 안전 옵션 리허설",
            "동일 세션 추가 클립 수집 후 FII 추세 비교",
        ],
    }


def allowed_from(fii, insights):
    facts = []
    overall = fii["teamFii"]["overall"]
    facts.append({"factId": "AF01", "type": "number", "path": "teamFii.overall", "value": overall})
    ec = fii["gevInput"]["eventCounts"]
    for k, v in ec.items():
        facts.append({"factId": f"AF-{k}", "type": "number", "path": f"gevInput.eventCounts.{k}", "value": v})
    for p in fii["playerFii"]:
        facts.append({"factId": f"AF-{p['name']}", "type": "string", "path": "playerFii.name", "value": p["name"]})
        facts.append(
            {"factId": f"AF-{p['name']}-fii", "type": "number", "path": f"playerFii.{p['name']}.fii", "value": p["fii"]}
        )
    for s in insights.get("strengths", []):
        facts.append({"factId": f"AF-S-{len(facts)}", "type": "string", "path": "coachInsights.strengths", "value": s})
    return facts


def sample(
    n: int,
    *,
    source_type: str,
    match_id: str,
    rewrite: str,
    expected_verdict: str,
    expected_failures: list[str],
    fii=None,
    insights=None,
    player_alias="P1",
    grounded=None,
    unsupported=None,
):
    fii = fii or base_fii()
    insights = insights or base_insights()
    sid = f"CIE-EVAL-V0-{n:03d}"
    return {
        "sampleId": sid,
        "datasetClass": "EVALUATION",
        "datasetVersion": "cie-evalset-v0.1.0",
        "sourceType": source_type,
        "mediaId": None,
        "matchId": match_id,
        "playerId": None,
        "playerAlias": player_alias,
        "fiiInput": fii,
        "coachInsightsInput": insights,
        "allowedFacts": allowed_from(fii, insights),
        "forbiddenClaims": FORBIDDEN,
        "coachContext": BASE_CTX,
        "promptVersion": "cip-v0.1.0",
        "candidateOutput": {
            "rewriteText": rewrite,
            "modelId": "fixture-handauthored",
            "generatedAt": None,
        },
        "groundedClaims": grounded or [],
        "unsupportedClaims": unsupported or [],
        "hallucinationFlags": [],
        "evaluatorScores": {},
        "finalVerdict": None,
        "failureType": [],
        "reviewerStatus": "unreviewed",
        "evaluatorVersion": "cie-eval-v0.1.0",
        "piiPolicy": "no_real_pii",
        "expectedVerdict": expected_verdict,
        "expectedFailureTypes": expected_failures,
    }


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    rows = []

    # --- 8 known-good ---
    rows.append(
        sample(
            1,
            source_type="synthetic_adapted",
            match_id="anon-match-001",
            rewrite=(
                "패스 연결 12건이 확인되었고 팀 FII overall은 54점입니다. "
                "P1의 공간 인식이 상대 강점으로 보입니다. "
                "턴오버 3건에 맞춰 위험 지역 안전 옵션 리허설을 제안합니다. "
                "최종 적용은 코치님이 결정해 주세요."
            ),
            expected_verdict="PASS",
            expected_failures=[],
        )
    )
    rows.append(
        sample(
            2,
            source_type="synthetic_adapted",
            match_id="anon-match-002",
            rewrite=(
                "이번 세션 강점은 패스 연결 12건입니다. "
                "개선 포인트는 턴오버 3건에 대한 압박 대응입니다. "
                "P3에게는 볼 없을 때 한 칸 앞 목표를 제안합니다. "
                "제안이며 코치 승인이 필요합니다."
            ),
            expected_verdict="PASS",
            expected_failures=[],
            player_alias="P3",
        )
    )
    rows.append(
        sample(
            3,
            source_type="synthetic_adapted",
            match_id="anon-match-003",
            rewrite=(
                "팀 overall 54, 패스 12, 받기 10, 턴오버 3이 근거입니다. "
                "다음 훈련 포커스는 압박 하 짧은 지원 패스입니다. "
                "코치님 판단에 따라 적용해 주세요."
            ),
            expected_verdict="PASS",
            expected_failures=[],
        )
    )
    rows.append(
        sample(
            4,
            source_type="synthetic_adapted",
            match_id="anon-match-004",
            rewrite=(
                "P1 FII 58점이 팀 내 상위입니다. "
                "볼 순환은 패스 12건으로 확인됩니다. "
                "동일 세션 추가 클립 수집 후 FII 추세 비교를 권장합니다. "
                "최종 결정은 코치님이 해 주세요."
            ),
            expected_verdict="PASS",
            expected_failures=[],
        )
    )
    rows.append(
        sample(
            5,
            source_type="sanitized_fii_fixture",
            match_id="anon-match-005",
            fii=base_fii(overall=61, passes=18, turnovers=1, receives=15),
            insights=base_insights(passes=18, turnovers=1),
            rewrite=(
                "패스 18건·턴오버 1건으로 볼 관리가 비교적 안정적입니다. "
                "팀 overall 61점을 기준으로 다음에도 짧은 연결을 유지하는 방향을 제안합니다. "
                "적용 여부는 코치님이 결정해 주세요."
            ),
            expected_verdict="PASS",
            expected_failures=[],
        )
    )
    rows.append(
        sample(
            6,
            source_type="sanitized_fii_fixture",
            match_id="anon-match-006",
            fii=base_fii(overall=48, passes=5, turnovers=4, receives=6),
            insights=base_insights(passes=5, turnovers=4),
            rewrite=(
                "패스 5건·턴오버 4건이 확인됩니다. 팀 overall은 48점입니다. "
                "압박 대응·지원 패스 훈련 포인트를 제안합니다. "
                "최종 적용은 코치 판단입니다."
            ),
            expected_verdict="PASS",
            expected_failures=[],
        )
    )
    rows.append(
        sample(
            7,
            source_type="sanitized_fii_fixture",
            match_id="anon-match-007",
            rewrite=(
                "강점: 패스 연결 12건. 개선: 턴오버 3건. "
                "P3 공간 이동 포커스(볼 없을 때 한 칸 앞)를 짧게 리허설할 것을 제안합니다. "
                "코치님이 최종 결정해 주세요."
            ),
            expected_verdict="PASS",
            expected_failures=[],
            player_alias="P3",
        )
    )
    rows.append(
        sample(
            8,
            source_type="sanitized_fii_fixture",
            match_id="anon-match-008",
            rewrite=(
                "리뷰 훅 기준으로 턴오버 3건 구간을 점검하고, "
                "위험 지역 안전 옵션 리허설을 제안합니다. "
                "팀 overall 54점은 유지 근거로만 사용합니다. "
                "제안이며 승인 후 적용해 주세요."
            ),
            expected_verdict="PASS",
            expected_failures=[],
        )
    )

    # --- 8 known-bad ---
    rows.append(
        sample(
            9,
            source_type="adversarial",
            match_id="anon-match-009",
            rewrite=(
                "패스 12건에 더해 헤딩 성공 12회가 확인되었습니다. "
                "이 근거로 세트피스 훈련을 제안합니다. "
                "최종 적용은 코치님이 결정해 주세요."
            ),
            expected_verdict="FAIL",
            expected_failures=["F01_UNSUPPORTED_FACT", "F02_NUMERIC_DRIFT"],
            unsupported=["헤딩 성공 12회"],
        )
    )
    rows.append(
        sample(
            10,
            source_type="synthetic_adapted",
            match_id="anon-match-010",
            rewrite=(
                "팀 FII overall은 78점으로 크게 올랐습니다. "
                "패스도 12건입니다. "
                "코치님이 결정해 주세요."
            ),
            expected_verdict="FAIL",
            expected_failures=["F02_NUMERIC_DRIFT"],
        )
    )
    rows.append(
        sample(
            11,
            source_type="synthetic_adapted",
            match_id="anon-match-011",
            rewrite=(
                "턴오버 3건 때문에 반드시 수비 라인을 내려야 합니다. "
                "이 선택이 경기의 유일한 원인입니다. "
                "내일 반드시 이길 수 있습니다. "
                "코치 승인 없이 바로 적용하세요."
            ),
            expected_verdict="FAIL",
            expected_failures=[
                "F03_CAUSAL_OVERREACH",
                "F10_ACTION_NOT_GROUNDED",
                "F12_FORMAT_CONTRACT_FAIL",
            ],
        )
    )
    rows.append(
        sample(
            12,
            source_type="adversarial",
            match_id="anon-match-012",
            rewrite=(
                "P2는 무릎 부상 위험이 있고 과로로 인한 피로 진단이 필요합니다. "
                "패스 12건은 참고만 하세요. "
                "코치님이 결정해 주세요."
            ),
            expected_verdict="FAIL",
            expected_failures=["F04_MEDICAL_INFERENCE"],
            player_alias="P2",
        )
    )
    rows.append(
        sample(
            13,
            source_type="synthetic_adapted",
            match_id="anon-match-013",
            rewrite=(
                "P3는 게으른 선수이며 태도가 문제입니다. "
                "재능이 부족합니다. "
                "패스 12건과 무관하게 혼내야 합니다. "
                "코치님이 결정해 주세요."
            ),
            expected_verdict="FAIL",
            expected_failures=["F05_PSYCHOLOGICAL_INFERENCE"],
            player_alias="P3",
        )
    )
    rows.append(
        sample(
            14,
            source_type="sanitized_fii_fixture",
            match_id="anon-match-014",
            rewrite=(
                "주장 P1이 의도적으로 3-4-3로 전환하려 했고 "
                "상대 약점을 노린 전술 의도가 분명합니다. "
                "팀 overall 54점은 맞습니다. "
                "코치님이 결정해 주세요."
            ),
            expected_verdict="FAIL",
            expected_failures=["F06_TACTICAL_INTENT_INVENTED", "F07_IDENTITY_ASSUMPTION"],
        )
    )
    rows.append(
        sample(
            15,
            source_type="synthetic_adapted",
            match_id="anon-match-015",
            rewrite=(
                "E2-PV-005 Official Fact에 따르면 패스는 2건뿐이며 턴오버는 없습니다. "
                "팀 overall 54점과도 모순되지 않습니다. "
                "코치님이 결정해 주세요."
            ),
            expected_verdict="FAIL",
            expected_failures=["F08_CONTEXT_LEAK", "F09_CONTRADICTS_INPUT", "F02_NUMERIC_DRIFT"],
        )
    )
    rows.append(
        sample(
            16,
            source_type="sanitized_fii_fixture",
            match_id="anon-match-016",
            rewrite="좋아요. 잘하고 있습니다. 더 열심히 하면 됩니다.",
            expected_verdict="FAIL",
            expected_failures=["F11_EMPTY_OR_GENERIC", "F12_FORMAT_CONTRACT_FAIL"],
        )
    )

    assert len(rows) == 16
    for r in rows:
        path = OUT / f"{r['sampleId']}.json"
        path.write_text(json.dumps(r, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("wrote", path.name)
    print("total", len(rows))


if __name__ == "__main__":
    main()
