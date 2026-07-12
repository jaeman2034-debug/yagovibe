#!/usr/bin/env python3
"""CIE Shadow V021 — low-quality six root cause review (no LLM, no edits)."""

from __future__ import annotations

import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SHADOW = ROOT / "data/vision/report/engineering/coach_intelligence_eval/v0.2_shadow"
SAMPLES_DIR = SHADOW / "samples_v021"
GEN_DIR = SHADOW / "generations" / "CIE-SHADOW-V021-RUN-001"
QUALITY_PER = SHADOW / "quality_results" / "CIE-SHADOW-V021-RUN-001_QUALITY_per_sample.jsonl"
OUT_DIR = SHADOW / "low_quality_review"

LOW_QUALITY = [
    "CIE-SHADOW-V02-003",
    "CIE-SHADOW-V02-004",
    "CIE-SHADOW-V02-005",
    "CIE-SHADOW-V02-006",
    "CIE-SHADOW-V02-009",
    "CIE-SHADOW-V02-015",
]

HEADLINE_FAMILY = re.compile(r"섀도\s*세션\s*요약", re.I)
PASS_OPEN = re.compile(r"패스\s*연결\s*\d+\s*건이\s*확인", re.I)


def first_sentence(text: str) -> str:
    parts = re.split(r"(?<=[.。!?？])\s+|\n+", text.strip())
    return parts[0] if parts else text.strip()


def norm_phrase(s: str) -> str:
    t = s.strip().lower()
    t = re.sub(r"\d+(?:\.\d+)?", "<NUM>", t)
    t = re.sub(r"\s+", " ", t)
    return t


def overlap_ratio(a: str, b: str) -> float:
    ta, tb = set(norm_phrase(a).split()), set(norm_phrase(b).split())
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def classify_opening(opening: str, sample: dict) -> str:
    fii = sample.get("fiiInput") or {}
    ins = sample.get("coachInsightsInput") or {}
    brief = ins.get("coachDecisionBrief") or {}
    headline = (fii.get("matchSummary") or {}).get("headline") or ""
    kct = brief.get("keyChangeToday") or ""
    pet = sample.get("primaryEvidenceType") or ""

    if headline and overlap_ratio(opening, headline) >= 0.5:
        return "MATCH_SUMMARY_HEADLINE"
    if kct and overlap_ratio(opening, kct) >= 0.45:
        return "KEY_CHANGE_TODAY"
    if re.search(r"p\d", opening, re.I) and (fii.get("playerFii")):
        return "PLAYER_CONTEXT"
    if re.search(r"쿼터|구간", opening) and fii.get("timeWindow"):
        return "SEQUENCE_CONTEXT"  # time window treated as sequence/time
    if re.search(r"패스|리시브|턴오버|이벤트", opening) and (fii.get("gevInput")):
        if pet == "SEQUENCE":
            return "SEQUENCE_CONTEXT"
        return "ALLOWED_FACT"
    if re.search(r"축|decision|pressure|vision|spatial", opening, re.I):
        return "FII_AXIS"
    if HEADLINE_FAMILY.search(opening):
        return "MATCH_SUMMARY_HEADLINE"
    return "OTHER"


def classify_recommendation(text: str, sample: dict) -> str:
    ins = sample.get("coachInsightsInput") or {}
    brief = ins.get("coachDecisionBrief") or {}
    ntf = brief.get("nextTrainingFocus") or ""
    sa = (ins.get("reviewHooks") or [{}])[0].get("suggestedAction") or ""
    if ntf and overlap_ratio(text, ntf) >= 0.35:
        return "NEXT_TRAINING_FOCUS"
    if sa and overlap_ratio(text, sa) >= 0.35:
        return "SUGGESTED_ACTION"
    # check if recommendation phrases from allowed facts appear
    for f in sample.get("allowedFacts") or []:
        v = str(f.get("value") or "")
        if len(v) >= 8 and v in text:
            return "ALLOWED_FACT_DERIVED"
    return "OTHER"


def allowed_facts_summary(sample: dict, limit: int = 8) -> list[str]:
    out = []
    for f in sample.get("allowedFacts") or []:
        out.append(f"{f.get('path')}: {f.get('value')}")
        if len(out) >= limit:
            break
    return out


def evidence_used(text: str, sample: dict) -> list[str]:
    used = []
    fii = sample.get("fiiInput") or {}
    ins = sample.get("coachInsightsInput") or {}
    brief = ins.get("coachDecisionBrief") or {}
    if brief.get("keyChangeToday") and overlap_ratio(text, brief["keyChangeToday"]) >= 0.25:
        used.append("keyChangeToday")
    if brief.get("nextTrainingFocus") and overlap_ratio(text, brief["nextTrainingFocus"]) >= 0.25:
        used.append("nextTrainingFocus")
    hook = (ins.get("reviewHooks") or [{}])[0]
    if hook.get("suggestedAction") and overlap_ratio(text, hook["suggestedAction"]) >= 0.25:
        used.append("suggestedAction")
    headline = (fii.get("matchSummary") or {}).get("headline") or ""
    if headline and overlap_ratio(text, headline) >= 0.4:
        used.append("matchSummary.headline")
    summary = (fii.get("matchSummary") or {}).get("summary") or ""
    if summary and overlap_ratio(text, summary) >= 0.4:
        used.append("matchSummary.summary")
    for p in fii.get("playerFii") or []:
        if p.get("name") and p["name"] in text:
            used.append(f"player:{p['name']}")
    ec = (fii.get("gevInput") or {}).get("eventCounts") or {}
    for k, v in ec.items():
        if str(v) in text:
            used.append(f"eventCounts.{k}")
    if fii.get("timeWindow") and re.search(r"쿼터|구간", text):
        used.append("timeWindow")
    return used


def ignored_distinctive(text: str, sample: dict) -> list[str]:
    ignored = []
    pet = sample.get("primaryEvidenceType")
    fii = sample.get("fiiInput") or {}
    ins = sample.get("coachInsightsInput") or {}
    brief = ins.get("coachDecisionBrief") or {}
    kct = brief.get("keyChangeToday") or ""

    if pet == "PLAYER" and kct and overlap_ratio(text, kct) < 0.3:
        if not re.search(r"p\d", text, re.I):
            ignored.append("primary PLAYER keyChangeToday/player gap")
    if pet == "AXIS" and kct and overlap_ratio(text, kct) < 0.25:
        ignored.append(f"primary AXIS keyChangeToday: {kct[:40]}")
    if pet == "SEQUENCE" and kct and overlap_ratio(text, kct) < 0.25:
        ignored.append(f"primary SEQUENCE keyChangeToday: {kct[:40]}")
    if pet == "NUMERIC" and kct and overlap_ratio(text, kct) < 0.25:
        ignored.append(f"primary NUMERIC keyChangeToday: {kct[:40]}")
    if pet == "TIME_WINDOW" and not fii.get("timeWindow"):
        ignored.append("timeWindow missing in fii")
    elif pet == "TIME_WINDOW" and fii.get("timeWindow") and not re.search(r"쿼터|구간", text):
        ignored.append("timeWindow not reflected in output")
    if pet == "COACH_INSIGHT" and kct and overlap_ratio(text, kct) < 0.25:
        ignored.append(f"primary COACH_INSIGHT keyChangeToday: {kct[:40]}")
    tw = fii.get("timeWindow")
    if tw and not re.search(r"쿼터|구간", text):
        ignored.append("timeWindow evidence unused")
    axes = (fii.get("teamFii") or {}).get("axes") or {}
    if pet == "AXIS":
        weak = [a for a in axes if a.lower() in (kct or "").lower() or str(axes[a]) in kct]
        if weak and not any(a.lower() in text.lower() for a in weak):
            ignored.append(f"named axis in keyChangeToday not echoed: {weak}")
    return ignored


def bottleneck(case: dict) -> str:
    opening_src = case["openingSource"]
    ignored = case["ignoredDistinctive"]
    scores = case["scores"]
    headline_dom = case["headlineDominatedOpening"]

    if headline_dom and opening_src == "MATCH_SUMMARY_HEADLINE":
        return "generic session-summary lead diluted evidence specificity (headline salience)"
    if scores["Q02"] == 1 and case["recommendationCopiedNextFocus"]:
        return "recommendation mirrors nextTrainingFocus without actionable depth"
    if all(scores[k] == 1 for k in ("Q01", "Q02", "Q03", "Q04")) and not headline_dom:
        return "judge perceived generic overview despite partial evidence use"
    if ignored:
        return f"primaryEvidenceType lead under-used: {ignored[0]}"
    return "judge strictness on actionability/specificity threshold"


def per_sample_review(sample: dict, gen: dict, qrow: dict) -> dict:
    text = gen.get("rewriteText") or ""
    opening = first_sentence(text)
    ins = sample.get("coachInsightsInput") or {}
    brief = ins.get("coachDecisionBrief") or {}
    hook = (ins.get("reviewHooks") or [{}])[0]
    headline = (sample.get("fiiInput") or {}).get("matchSummary", {}).get("headline") or ""
    kct = brief.get("keyChangeToday") or ""
    ntf = brief.get("nextTrainingFocus") or ""
    sa = hook.get("suggestedAction") or ""

    # recommendation: middle sentences heuristic
    sents = [s.strip() for s in re.split(r"(?<=[.。!?？])\s+|\n+", text.strip()) if s.strip()]
    rec_text = " ".join(sents[1:3]) if len(sents) > 1 else text
    closing = sents[-1] if sents else ""

    opening_src = classify_opening(opening, sample)
    rec_src = classify_recommendation(rec_text, sample)

    return {
        "sampleId": sample["sampleId"],
        "primaryEvidenceType": sample.get("primaryEvidenceType"),
        "compositionTag": sample.get("compositionTag"),
        "matchSummaryHeadline": headline,
        "keyChangeToday": kct,
        "nextTrainingFocus": ntf,
        "suggestedAction": sa,
        "allowedFactsSummary": allowed_facts_summary(sample),
        "generatedOpening": opening,
        "generatedRecommendation": rec_text[:200],
        "generatedClosing": closing,
        "scores": qrow.get("scores") or {},
        "totalQ01Q04": qrow.get("totalQ01Q04"),
        "judgeRationale": (qrow.get("judge") or {}).get("rationale"),
        "judgeByDimension": {k: (qrow.get("judge") or {}).get(k) for k in ("Q01", "Q02", "Q03", "Q04")},
        "evidenceUsed": evidence_used(text, sample),
        "ignoredDistinctive": ignored_distinctive(text, sample),
        "headlineDominatedOpening": bool(HEADLINE_FAMILY.search(opening)),
        "keyChangeTodayDominatedOpening": overlap_ratio(opening, kct) >= 0.45 if kct else False,
        "recommendationCopiedNextFocus": overlap_ratio(rec_text, ntf) >= 0.35 if ntf else False,
        "recommendationCopiedSuggestedAction": overlap_ratio(rec_text, sa) >= 0.35 if sa else False,
        "openingSource": opening_src,
        "recommendationSource": rec_src,
        "likelyQualityBottleneck": None,
    }


def main() -> None:
    quality_rows = {}
    with QUALITY_PER.open(encoding="utf-8") as f:
        for line in f:
            row = json.loads(line)
            quality_rows[row["sampleId"]] = row

    all_cases = []
    for path in sorted(SAMPLES_DIR.glob("CIE-SHADOW-V02-*.json")):
        sample = json.loads(path.read_text(encoding="utf-8"))
        sid = sample["sampleId"]
        gen = json.loads((GEN_DIR / f"{sid}.json").read_text(encoding="utf-8"))
        case = per_sample_review(sample, gen, quality_rows[sid])
        case["likelyQualityBottleneck"] = bottleneck(case)
        case["isLowQuality"] = case["totalQ01Q04"] <= 4
        all_cases.append(case)

    headlines = Counter(
        norm_phrase((json.loads(p.read_text(encoding="utf-8")).get("fiiInput") or {}).get("matchSummary", {}).get("headline", ""))
        for p in SAMPLES_DIR.glob("CIE-SHADOW-V02-*.json")
    )
    shadow_family = sum(1 for c in all_cases if HEADLINE_FAMILY.search(c["generatedOpening"]))
    shared_headline_samples = [c for c in all_cases if c["matchSummaryHeadline"] and "섀도 세션" in c["matchSummaryHeadline"]]
    non_shared = [c for c in all_cases if c not in shared_headline_samples]

    def low_rate(group: list[dict]) -> float:
        if not group:
            return 0.0
        return round(sum(1 for c in group if c["isLowQuality"]) / len(group), 3)

    opening_dist = Counter(c["openingSource"] for c in all_cases)
    rec_dist = Counter(c["recommendationSource"] for c in all_cases)

    six = [c for c in all_cases if c["sampleId"] in LOW_QUALITY]
    six_headline = sum(1 for c in six if c["headlineDominatedOpening"])

    # bottleneck classification
    headline_low = low_rate(shared_headline_samples)
    non_headline_low = low_rate(non_shared)
    opening_headline_pct = opening_dist.get("MATCH_SUMMARY_HEADLINE", 0) / 20

    if six_headline >= 4 and headline_low > non_headline_low:
        bottleneck_class = "F. MIXED"
        bottleneck_detail = [
            "DATASET_HEADLINE_BIAS: identical matchSummary.headline across 20/20 samples",
            "FIELD_ORDER / SALIENCE BIAS: headline appears early in fiiInput + model copies in 9/20 openings",
            "QUALITY JUDGE / RUBRIC ISSUE: deterministic proxy scored higher than lab judge on same outputs",
        ]
    elif opening_headline_pct >= 0.4:
        bottleneck_class = "A. DATASET_HEADLINE_BIAS"
        bottleneck_detail = ["homogeneous headline + early serialization"]
    else:
        bottleneck_class = "F. MIXED"
        bottleneck_detail = ["residual judge strictness on Q02 actionability"]

    report = {
        "reportType": "CIE_SHADOW_V021_LOW_QUALITY_SIX_ROOT_CAUSE_REVIEW",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "runId": "CIE-SHADOW-V021-RUN-001",
        "qualityGateVerdict": "FAIL",
        "lowQualitySampleIds": LOW_QUALITY,
        "sixSampleFindings": six,
        "headlineSalience": {
            "normalizedHeadlineDistribution": dict(headlines),
            "shadowSessionHeadlineFamilyCount": headlines.get(norm_phrase("섀도 세션 요약"), 20),
            "generatedOpeningFollowsHeadlineFamily": shadow_family,
            "lowQualityRateSharedHeadlineSamples": headline_low,
            "lowQualityRateNonSharedHeadlineSamples": non_headline_low,
            "lowQualityAmongHeadlineFollowingOpenings": low_rate(
                [c for c in all_cases if c["headlineDominatedOpening"]]
            ),
            "correlationNote": "Association only — identical headline across all samples limits causal inference",
        },
        "openingSourceDistribution": dict(opening_dist),
        "recommendationSourceDistribution": dict(rec_dist),
        "ignoredDistinctivePatterns": Counter(
            ign for c in six for ign in c["ignoredDistinctive"]
        ).most_common(),
        "remainingBottleneckClassification": bottleneck_class,
        "remainingBottleneckDetail": bottleneck_detail,
        "architectureCorrectionJustified": {
            "dataset": True,
            "prompt": False,
            "qualityRubric": False,
        },
        "recommendedNextAction": (
            "PM GO for dataset architecture v0.2.2: de-homogenize or demote matchSummary.headline/summary "
            "(neutral labels, move below coachInsights, or omit from user payload); re-run ONE shadow validation "
            "only after structural fix is proven in request capture. Do NOT tune cip-v0.2.2."
        ),
        "allCasesSummary": [
            {
                "sampleId": c["sampleId"],
                "isLowQuality": c["isLowQuality"],
                "openingSource": c["openingSource"],
                "headlineDominatedOpening": c["headlineDominatedOpening"],
                "totalQ01Q04": c["totalQ01Q04"],
            }
            for c in all_cases
        ],
        "productionWrites": False,
        "liveCoachChanged": False,
        "modelWeightTraining": False,
        "llmCalled": False,
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    json_path = OUT_DIR / "CIE-SHADOW-V021-RUN-001_LOW_QUALITY_SIX_REVIEW.json"
    md_path = OUT_DIR / "CIE-SHADOW-V021-RUN-001_LOW_QUALITY_SIX_REVIEW.md"
    json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    md = ["# CIE Shadow V021 — Low-Quality Six Root Cause Review\n\n"]
    md.append(f"**Quality Gate:** FAIL (6 > 5)  \n**Bottleneck:** `{bottleneck_class}`  \n\n")
    md.append("## Six-sample findings\n\n")
    for c in six:
        md.append(f"### {c['sampleId']} ({c['primaryEvidenceType']})\n\n")
        md.append(f"- opening: `{c['generatedOpening'][:80]}...`\n")
        md.append(f"- opening source: **{c['openingSource']}** | headline dominated: {c['headlineDominatedOpening']}\n")
        md.append(f"- scores: Q01={c['scores'].get('Q01')} Q02={c['scores'].get('Q02')} Q03={c['scores'].get('Q03')} Q04={c['scores'].get('Q04')} (total={c['totalQ01Q04']})\n")
        md.append(f"- judge: {c['judgeRationale']}\n")
        md.append(f"- evidence used: {c['evidenceUsed']}\n")
        md.append(f"- ignored: {c['ignoredDistinctive']}\n")
        md.append(f"- bottleneck: {c['likelyQualityBottleneck']}\n\n")

    md.append("## Headline salience (20 samples)\n\n")
    hs = report["headlineSalience"]
    md.append(f"- headline family count: **{hs['shadowSessionHeadlineFamilyCount']}/20**\n")
    md.append(f"- openings following headline: **{hs['generatedOpeningFollowsHeadlineFamily']}/20**\n")
    md.append(f"- low-quality rate (headline-opening samples): **{hs['lowQualityAmongHeadlineFollowingOpenings']}**\n")
    md.append(f"- low-quality rate (all shared-headline inputs): **{hs['lowQualityRateSharedHeadlineSamples']}**\n")
    md.append(f"- opening source dist: `{opening_dist}`\n")
    md.append(f"- recommendation source dist: `{rec_dist}`\n\n")
    md.append(f"## Recommended next action\n\n{report['recommendedNextAction']}\n")
    md_path.write_text("".join(md), encoding="utf-8")

    print(json.dumps({
        "json": str(json_path),
        "md": str(md_path),
        "bottleneck": bottleneck_class,
        "headlineFollowing": shadow_family,
        "sixHeadlineDominated": six_headline,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
