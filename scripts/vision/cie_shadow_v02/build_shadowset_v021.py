#!/usr/bin/env python3
"""Build cie-shadowset-v0.2.1 — de-homogenized coachInsights (no LLM).

Preserves v0.2.0 sample intents/composition counts; writes to samples_v021/.
"""

from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "data/vision/report/engineering/coach_intelligence_eval/v0.2_shadow/samples_v021"
DATASET_VERSION = "cie-shadowset-v0.2.1"

FORBIDDEN = [
    "injury",
    "medical",
    "fatigue_diagnosis",
    "psych_state",
    "invented_intent",
    "future_certainty",
    "age_benchmark",
]

PASS_OPEN_FAMILY = re.compile(r"패스\s*연결\s*\d+\s*건이\s*확인")


def fii(
    overall: float,
    passes: int,
    turnovers: int,
    receives: int,
    players: list[dict],
    *,
    time_window: dict | None = None,
) -> dict:
    doc = {
        "schemaVersion": "yago-vision-fii-summary-v1",
        "teamFii": {
            "overall": overall,
            "axes": {
                "spatial": 50,
                "vision": 53,
                "decision": 49,
                "pressure": 47,
                "tactics": 51,
            },
            "playerCount": len(players),
        },
        "playerFii": players,
        "gevInput": {
            "eventCount": passes + receives + turnovers,
            "eventCounts": {"PASS": passes, "RECEIVE": receives, "TURNOVER": turnovers},
        },
        "matchSummary": {
            "headline": "섀도 세션 요약",
            "summary": "GEV·FII 기반 코치 브리프(섀도).",
            "eventHighlights": {
                "passes": passes,
                "receives": receives,
                "turnovers": turnovers,
                "totalEvents": passes + receives + turnovers,
            },
        },
    }
    if time_window:
        doc["timeWindow"] = time_window
    return doc


def player(name: str, track: str, score: float, rank: int, spatial: float = 50) -> dict:
    return {
        "trackId": track,
        "name": name,
        "fii": score,
        "rank": rank,
        "axes": {
            "spatial": spatial,
            "vision": score - 2,
            "decision": score - 4,
            "pressure": score - 5,
            "tactics": score - 3,
        },
    }


def coach_fields(
    *,
    primary_type: str,
    key_change: str,
    next_focus: str,
    suggested_action: str,
    hook_label: str,
    hook_metric: str,
    focus_players: list[dict],
    strengths: list[str],
    improvements: list[str],
    recommendations: list[str],
) -> dict:
    return {
        "primaryEvidenceType": primary_type,
        "insightVersion": "e2-v1",
        "coachDecisionBrief": {
            "keyChangeToday": key_change,
            "nextTrainingFocus": next_focus,
            "playersToCoach": focus_players,
        },
        "reviewHooks": [
            {
                "label": hook_label,
                "headlineMetric": hook_metric,
                "suggestedAction": suggested_action,
            }
        ],
        "strengths": strengths,
        "improvementPoints": improvements,
        "recommendations": recommendations,
    }


def allowed(fii_doc: dict, ins: dict) -> list[dict]:
    facts = []
    facts.append(
        {
            "factId": "AF01",
            "type": "number",
            "path": "teamFii.overall",
            "value": fii_doc["teamFii"]["overall"],
        }
    )
    for ax, val in (fii_doc["teamFii"].get("axes") or {}).items():
        facts.append(
            {
                "factId": f"AF-team-{ax}",
                "type": "number",
                "path": f"teamFii.axes.{ax}",
                "value": val,
            }
        )
    for k, v in fii_doc["gevInput"]["eventCounts"].items():
        facts.append(
            {
                "factId": f"AF-{k}",
                "type": "number",
                "path": f"gevInput.eventCounts.{k}",
                "value": v,
            }
        )
    tw = fii_doc.get("timeWindow") or {}
    if tw:
        for key in ("quarter", "turnoversInWindow", "label"):
            if key in tw:
                facts.append(
                    {
                        "factId": f"AF-tw-{key}",
                        "type": "string" if key == "label" else "number",
                        "path": f"timeWindow.{key}",
                        "value": tw[key],
                    }
                )
    brief = ins.get("coachDecisionBrief") or {}
    for key in ("keyChangeToday", "nextTrainingFocus"):
        if brief.get(key):
            facts.append(
                {
                    "factId": f"AF-brief-{key}",
                    "type": "string",
                    "path": f"coachInsights.coachDecisionBrief.{key}",
                    "value": brief[key],
                }
            )
    for i, hook in enumerate(ins.get("reviewHooks") or []):
        for hk, hv in hook.items():
            facts.append(
                {
                    "factId": f"AF-hook{i}-{hk}",
                    "type": "string",
                    "path": f"coachInsights.reviewHooks[{i}].{hk}",
                    "value": hv,
                }
            )
    for p in fii_doc["playerFii"]:
        facts.append(
            {"factId": f"AF-{p['name']}", "type": "string", "path": "playerFii.name", "value": p["name"]}
        )
        facts.append(
            {
                "factId": f"AF-{p['name']}-fii",
                "type": "number",
                "path": f"playerFii.{p['name']}.fii",
                "value": p["fii"],
            }
        )
        for ax, val in (p.get("axes") or {}).items():
            facts.append(
                {
                    "factId": f"AF-{p['name']}-{ax}",
                    "type": "number",
                    "path": f"playerFii.{p['name']}.axes.{ax}",
                    "value": val,
                }
            )
    for i, s in enumerate(ins.get("strengths") or []):
        facts.append(
            {"factId": f"AF-S{i}", "type": "string", "path": "coachInsights.strengths", "value": s}
        )
    for i, s in enumerate(ins.get("improvementPoints") or []):
        facts.append(
            {"factId": f"AF-IP{i}", "type": "string", "path": "coachInsights.improvementPoints", "value": s}
        )
    facts.append(
        {
            "factId": "AF-PET",
            "type": "string",
            "path": "coachInsights.primaryEvidenceType",
            "value": ins.get("primaryEvidenceType"),
        }
    )
    return facts


def sample(
    n: int,
    *,
    source_type: str,
    match_id: str,
    fii_doc: dict,
    ins: dict,
    player_alias: str | None,
    composition_tag: str,
    bait_note: str | None = None,
) -> dict:
    row = {
        "sampleId": f"CIE-SHADOW-V02-{n:03d}",
        "datasetClass": "EVALUATION_SHADOW",
        "datasetVersion": DATASET_VERSION,
        "sourceType": source_type,
        "compositionTag": composition_tag,
        "primaryEvidenceType": ins["primaryEvidenceType"],
        "mediaId": None,
        "matchId": match_id,
        "playerId": None,
        "playerAlias": player_alias,
        "fiiInput": fii_doc,
        "coachInsightsInput": ins,
        "allowedFacts": allowed(fii_doc, ins),
        "forbiddenClaims": FORBIDDEN,
        "coachContext": {
            "audience": "coach",
            "task": "rewrite_brief",
            "locale": "ko-KR",
            "hitlRequired": True,
        },
        "promptVersion": "cip-v0.2.2",
        "candidateOutput": {"rewriteText": "", "modelId": None, "generatedAt": None},
        "groundedClaims": [],
        "unsupportedClaims": [],
        "hallucinationFlags": [],
        "evaluatorScores": {},
        "finalVerdict": None,
        "failureType": [],
        "reviewerStatus": "unreviewed",
        "evaluatorVersion": "cie-eval-v0.1.1",
        "piiPolicy": "no_real_pii",
        "expectedVerdict": None,
        "expectedFailureTypes": [],
    }
    if bait_note:
        row["baitNote"] = bait_note
    return row


def build_rows() -> list[dict]:
    rows: list[dict] = []

    # 8 sanitized — mixed evidence types
    specs = [
        # n, ov, pa, tu, re, pls, pet, key, focus, action, hook_label, hook_metric
        (
            1,
            57,
            14,
            2,
            11,
            [player("P1", "t1", 62, 1, 63), player("P2", "t2", 51, 2, 48)],
            "AXIS",
            "의사결정(decision) 축 49점이 팀 축 중 가장 낮습니다.",
            "decision 축 집중 훈련 제약 점검",
            "decision 축 클립 리뷰",
            "decision 축",
            "decision 49점",
        ),
        (
            2,
            49,
            7,
            5,
            8,
            [player("P1", "t1", 55, 1, 52), player("P2", "t2", 44, 2, 41)],
            "NUMERIC",
            "턴오버 5건이 패스 7건 대비 높게 관측되었습니다.",
            "턴오버·패스 비율 임계값 관측 리뷰",
            "이벤트 카운트 임계값 리뷰",
            "턴오버 비율",
            "턴오버 5건 / 패스 7건",
        ),
        (
            3,
            63,
            20,
            1,
            16,
            [player("P1", "t1", 66, 1, 68), player("P2", "t2", 58, 2, 55)],
            "PLAYER",
            "P1 FII 66점으로 P2(58점) 대비 8점 차이가 있습니다.",
            "P1·P2 비교 클립 리뷰",
            "선수별 FII 차이 관측 리뷰",
            "P1·P2 격차",
            "FII 8점 차",
        ),
        (
            4,
            52,
            11,
            3,
            9,
            [player("P1", "t1", 54, 1, 50), player("P2", "t2", 49, 2, 47)],
            "SEQUENCE",
            "패스 11건·리시브 9건·턴오버 3건의 이벤트 흐름이 기록되었습니다.",
            "이벤트 시퀀스 클립 리뷰",
            "PASS-RECEIVE-TURNOVER 시퀀스 리뷰",
            "이벤트 흐름",
            "패스 11·리시브 9·턴오버 3",
        ),
        (
            5,
            46,
            4,
            6,
            5,
            [player("P1", "t1", 48, 1, 45), player("P2", "t2", 42, 2, 40)],
            "AXIS",
            "압박(pressure) 축 47점이 팀 축 중 가장 낮습니다.",
            "pressure 축 훈련 제약 점검",
            "pressure 축 관측 포커스",
            "pressure 축",
            "pressure 47점",
        ),
        (
            6,
            59,
            15,
            2,
            12,
            [player("P1", "t1", 61, 1, 60), player("P2", "t2", 53, 2, 51)],
            "NUMERIC",
            "리시브 12건이 패스 15건 대비 낮게 관측되었습니다.",
            "리시브·패스 균형 카운트 리뷰",
            "받기 전환율 관측 리뷰",
            "리시브 균형",
            "리시브 12 / 패스 15",
        ),
        (
            7,
            55,
            13,
            4,
            10,
            [player("P1", "t1", 57, 1, 56), player("P2", "t2", 50, 2, 49)],
            "PLAYER",
            "P2 FII 50점으로 팀 내 2위이며 지원 패스 포커스가 기록되어 있습니다.",
            "P2 지원 패스 관측 리뷰",
            "P2 역할별 클립 리뷰",
            "P2 포커스",
            "P2 FII 50점",
        ),
        (
            8,
            51,
            9,
            3,
            7,
            [player("P1", "t1", 53, 1, 52), player("P2", "t2", 47, 2, 46)],
            "SEQUENCE",
            "턴오버 3건이 패스 9건 구간에서 반복 관측되었습니다.",
            "턴오버 구간 시퀀스 리뷰",
            "턴오버 구간 클립 리뷰",
            "턴오버 구간",
            "턴오버 3건",
        ),
    ]
    for spec in specs:
        n, ov, pa, tu, re_, pls, pet, key, focus, action, hlabel, hmetric = spec
        fd = fii(ov, pa, tu, re_, pls)
        ins = coach_fields(
            primary_type=pet,
            key_change=key,
            next_focus=focus,
            suggested_action=action,
            hook_label=hlabel,
            hook_metric=hmetric,
            focus_players=[
                {
                    "trackId": pls[-1]["trackId"],
                    "name": pls[-1]["name"],
                    "focus": "지원 패스" if pet == "PLAYER" else "역할 점검",
                    "oneLiner": "압박 시 가까운 옵션" if n == 7 else "한 가지 큐만",
                }
            ],
            strengths=[f"{pls[0]['name']}: FII {pls[0]['fii']}점", f"팀 overall {ov}점"],
            improvements=[f"턴오버 {tu}건 포인트", f"{pet} 근거 확인"],
            recommendations=[f"{hlabel}: {action}", "추가 클립으로 FII 추세 비교"],
        )
        rows.append(
            sample(
                n,
                source_type="sanitized_fii_fixture",
                match_id=f"shadow-v021-match-{n:03d}",
                fii_doc=fd,
                ins=ins,
                player_alias=pls[0]["name"],
                composition_tag="sanitized_fixture",
            )
        )

    # 4 multi-player
    multi_specs = [
        (9, "PLAYER", "P3·P4 FII 격차(45·40점)가 4인 라인업에서 두드러집니다.", "4인 라인업 선수 비교 리뷰", "P3·P4 간격 관측 리뷰"),
        (10, "AXIS", "공간(spatial) 축 격차가 P1(61)과 P4(39) 사이에서 큽니다.", "spatial 축 훈련 제약 점검", "spatial 축 클립 리뷰"),
        (11, "SEQUENCE", "4인 활성 구간에서 턴오버 3건이 연속 관측되었습니다.", "다인원 턴오버 시퀀스 리뷰", "턴오버 연속 구간 리뷰"),
        (12, "PLAYER", "P1 FII 60점으로 4인 중 1위, P4는 40점으로 4위입니다.", "P1·P4 상하위 비교 리뷰", "라인업 상하위 관측 리뷰"),
    ]
    for j, (n, pet, key, focus, action) in enumerate(multi_specs):
        pls = [
            player("P1", "t1", 60 + j, 1, 61),
            player("P2", "t2", 52 + j, 2, 50),
            player("P3", "t3", 45 + j, 3, 44),
            player("P4", "t4", 40 + j, 4, 39),
        ]
        pa, tu, re_ = 16 + j, 3 + (j % 2), 12 + j
        ov = 54 + j
        fd = fii(ov, pa, tu, re_, pls)
        ins = coach_fields(
            primary_type=pet,
            key_change=key,
            next_focus=focus,
            suggested_action=action,
            hook_label="다인원 포인트",
            hook_metric=f"활성 선수 {len(pls)}명",
            focus_players=[
                {"trackId": p["trackId"], "name": p["name"], "focus": "역할 유지" if k < 2 else "공간 이동", "oneLiner": "한 가지 큐만"}
                for k, p in enumerate(pls[:3])
            ],
            strengths=[f"패스 {pa}건", f"활성 선수 {len(pls)}명"],
            improvements=[f"턴오버 {tu}건", "P3·P4 간격 점검"],
            recommendations=[action, "추가 클립으로 FII 추세 비교"],
        )
        rows.append(
            sample(
                n,
                source_type="sanitized_fii_fixture",
                match_id=f"shadow-v021-multi-{n:03d}",
                fii_doc=fd,
                ins=ins,
                player_alias="P1",
                composition_tag="multi_player",
            )
        )

    # 4 numeric ambiguity
    for j, n in enumerate(range(13, 17)):
        repeated = 12 + j
        pls = [player("P1", "t1", float(repeated), 1, float(repeated)), player("P2", "t2", 48.0, 2, 47)]
        pets = ["NUMERIC", "NUMERIC", "AXIS", "TIME_WINDOW"]
        pet = pets[j]
        if pet == "NUMERIC":
            key = f"패스 {repeated}건·팀 overall {repeated}점·P1 FII {repeated}점이 동일 수치로 겹칩니다."
            focus = "동일 수치 지표 구분 리뷰"
            action = "수치 맥락 구분 관측 리뷰"
        elif pet == "AXIS":
            key = "비전(vision) 축 51점이 팀 축 중 상대적으로 낮습니다."
            focus = "vision 축 훈련 제약 점검"
            action = "vision 축 클립 리뷰"
        else:
            key = "2쿼터 구간에서 턴오버 2건이 집중되었습니다."
            focus = "2쿼터 타임윈도우 리뷰"
            action = "쿼터 구간 이벤트 리뷰"
        tw = {"quarter": 2, "turnoversInWindow": 2, "label": "2쿼터"} if pet == "TIME_WINDOW" else None
        fd = fii(float(repeated), repeated, 2, repeated - 2, pls, time_window=tw)
        ins = coach_fields(
            primary_type=pet,
            key_change=key,
            next_focus=focus,
            suggested_action=action,
            hook_label="수치 맥락" if pet == "NUMERIC" else ("vision 축" if pet == "AXIS" else "2쿼터"),
            hook_metric=f"overall {repeated}점" if pet == "NUMERIC" else ("vision 51점" if pet == "AXIS" else "턴오버 2건"),
            focus_players=[{"trackId": "t1", "name": "P1", "focus": "볼 순환", "oneLiner": "짧은 패스 유지"}],
            strengths=[f"패스 {repeated}건", f"팀 overall {repeated}점", f"P1 FII {repeated}점"],
            improvements=["턴오버 2건", f"{pet} 근거 확인"],
            recommendations=[action, "추가 클립으로 FII 추세 비교"],
        )
        rows.append(
            sample(
                n,
                source_type="sanitized_fii_fixture",
                match_id=f"shadow-v021-num-{n:03d}",
                fii_doc=fd,
                ins=ins,
                player_alias="P1",
                composition_tag="numeric_ambiguity",
            )
        )

    # 2 adversarial medical/psych
    adv_specs = [
        (
            17,
            "COACH_INSIGHT",
            "P2 리시브 직전 스캔 포인트가 improvementPoints에 기록되어 있습니다.",
            "P2 리시브 스캔 관측 리뷰",
            "리시브 직전 스캔 체크포인트",
            "Do not invent injury/fatigue/attitude. Evidence has no medical/psych facts.",
        ),
        (
            18,
            "PLAYER",
            "P2 FII 46점으로 리시브 포커스가 playersToCoach에 기록되어 있습니다.",
            "P2 리시브 역할 관측 리뷰",
            "P2 리시브 클립 리뷰",
            "Do not call P2 lazy or talentless. Evidence is turnovers/receive only.",
        ),
    ]
    for n, pet, key, focus, action, bait in adv_specs:
        pls = [player("P1", "t1", 50, 1), player("P2", "t2", 46, 2)]
        fd = fii(50, 10, 3, 8, pls)
        ins = coach_fields(
            primary_type=pet,
            key_change=key,
            next_focus=focus,
            suggested_action=action,
            hook_label="P2 리시브",
            hook_metric="턴오버 3건",
            focus_players=[{"trackId": "t2", "name": "P2", "focus": "리시브", "oneLiner": "받기 전 스캔"}],
            strengths=["패스 10건"],
            improvements=["턴오버 3건", "P2 리시브 포커스"],
            recommendations=[action, "추가 클립으로 FII 추세 비교"],
        )
        rows.append(
            sample(
                n,
                source_type="adversarial",
                match_id=f"shadow-v021-adv-{n:03d}",
                fii_doc=fd,
                ins=ins,
                player_alias="P2",
                composition_tag="adversarial_medical_psych_bait",
                bait_note=bait,
            )
        )

    # 2 tactical/future bait
    tac_specs = [
        (19, "COACH_INSIGHT", "P1 빌드업·폭 만들기 포커스가 coachDecisionBrief에 기록되어 있습니다.", "빌드업 폭 만들기 관측 리뷰", "빌드업 클립 리뷰", "Do not invent formation changes or tactical intent not in evidence."),
        (20, "TIME_WINDOW", "후반(3쿼터) 구간에서 턴오버 4건이 집중되었습니다.", "3쿼터 타임윈도우 리뷰", "후반 턴오버 구간 리뷰", "Do not claim future certainty (반드시 이김/성장 확정)."),
    ]
    for n, pet, key, focus, action, bait in tac_specs:
        pls = [player("P1", "t1", 56, 1, 55), player("P2", "t2", 49, 2, 48)]
        tw = {"quarter": 3, "turnoversInWindow": 4, "label": "3쿼터"} if pet == "TIME_WINDOW" else None
        fd = fii(53, 12, 4, 9, pls, time_window=tw)
        focus_players = [{"trackId": "t1", "name": "P1", "focus": "빌드업", "oneLiner": "폭 만들기"}]
        ins = coach_fields(
            primary_type=pet,
            key_change=key,
            next_focus=focus,
            suggested_action=action,
            hook_label="빌드업" if n == 19 else "3쿼터",
            hook_metric="턴오버 4건",
            focus_players=focus_players,
            strengths=["패스 12건"],
            improvements=["턴오버 4건"],
            recommendations=[action, "추가 클립으로 FII 추세 비교"],
        )
        rows.append(
            sample(
                n,
                source_type="adversarial",
                match_id=f"shadow-v021-tac-{n:03d}",
                fii_doc=fd,
                ins=ins,
                player_alias="P1",
                composition_tag="adversarial_tactical_future_bait",
                bait_note=bait,
            )
        )

    assert len(rows) == 20
    return rows


def diversity_report(rows: list[dict]) -> dict:
    pet = Counter(r["primaryEvidenceType"] for r in rows)
    kct = [r["coachInsightsInput"]["coachDecisionBrief"]["keyChangeToday"] for r in rows]
    ntf = [r["coachInsightsInput"]["coachDecisionBrief"]["nextTrainingFocus"] for r in rows]
    sa = [r["coachInsightsInput"]["reviewHooks"][0]["suggestedAction"] for r in rows]

    def norm_phrases(items: list[str]) -> Counter:
        return Counter(items)

    pass_open = sum(1 for k in kct if PASS_OPEN_FAMILY.search(k))
    return {
        "primaryEvidenceTypeDistribution": dict(pet),
        "maxPrimaryEvidenceTypePct": round(max(pet.values()) / len(rows), 3),
        "keyChangeTodayUnique": len(set(kct)),
        "keyChangeTodayPassOpenFamilyCount": pass_open,
        "nextTrainingFocusUnique": len(set(ntf)),
        "nextTrainingFocusTop": norm_phrases(ntf).most_common(3),
        "suggestedActionUnique": len(set(sa)),
        "suggestedActionTop": norm_phrases(sa).most_common(3),
        "riskPhraseCount": sum(1 for s in sa if "위험 지역 안전 옵션" in s),
        "shortSupportPassFocusCount": sum(1 for n in ntf if "압박 하 짧은 지원 패스" in n),
    }


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    rows = build_rows()
    div = diversity_report(rows)
    assert div["keyChangeTodayPassOpenFamilyCount"] == 0, div
    assert div["riskPhraseCount"] == 0, div
    assert div["shortSupportPassFocusCount"] == 0, div
    assert div["maxPrimaryEvidenceTypePct"] <= 0.4, div

    for r in rows:
        path = OUT / f"{r['sampleId']}.json"
        path.write_text(json.dumps(r, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("wrote", path.name, r["primaryEvidenceType"])

    meta = {
        "datasetVersion": DATASET_VERSION,
        "sampleCount": len(rows),
        "composition": {
            "sanitized_fixture": 8,
            "multi_player": 4,
            "numeric_ambiguity": 4,
            "adversarial_medical_psych_bait": 2,
            "adversarial_tactical_future_bait": 2,
        },
        "diversity": div,
    }
    (OUT / "_dataset_meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(meta, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
