#!/usr/bin/env python3
"""CIE Shadow v0.2 — NON-GATING quality evaluation on frozen RUN-001 generations.

Does not modify cip-v0.1.0, CIE evaluator, dataset, or generation texts.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SHADOW = ROOT / "data/vision/report/engineering/coach_intelligence_eval/v0.2_shadow"
DEFAULT_SAMPLES = SHADOW / "samples"
SAMPLES_BY_DATASET = {
    "cie-shadowset-v0.2.0": SHADOW / "samples",
    "cie-shadowset-v0.2.1": SHADOW / "samples_v021",
    "cie-shadowset-v0.2.2": SHADOW / "samples_v022",
}
QUALITY_RESULTS = SHADOW / "quality_results"
QUALITY_REVIEW = SHADOW / "quality_review"

HITL_TAIL = re.compile(
    r"(제안입니다\.?\s*)?최종\s*적용은\s*코치님이\s*결정해\s*주세요\.?\s*$"
)
SENTENCE_SPLIT = re.compile(r"(?<=[.。!?？])\s+|\n+")


def resolve_samples_dir(dataset_version: str | None = None, samples_dir: str | None = None) -> Path:
    if samples_dir:
        return Path(samples_dir)
    if dataset_version:
        path = SAMPLES_BY_DATASET.get(dataset_version)
        if path is None:
            raise SystemExit(f"Unknown dataset version: {dataset_version}")
        return path
    return DEFAULT_SAMPLES


def normalize(text: str) -> str:
    t = text.strip().lower()
    t = re.sub(r"\d+(?:\.\d+)?", "<NUM>", t)
    t = re.sub(r"\s+", " ", t)
    t = HITL_TAIL.sub("<HITL>", t)
    return t.strip()


def opening(text: str, n: int = 28) -> str:
    t = normalize(text)
    return t[:n]


def closing(text: str, n: int = 36) -> str:
    t = normalize(text)
    return t[-n:] if len(t) >= n else t


def sentences(text: str) -> list[str]:
    parts = [p.strip() for p in SENTENCE_SPLIT.split(text.strip()) if p.strip()]
    return parts or ([text.strip()] if text.strip() else [])


def jaccard(a: str, b: str) -> float:
    ta, tb = set(normalize(a).split()), set(normalize(b).split())
    if not ta and not tb:
        return 1.0
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def evidence_tokens(sample: dict) -> set[str]:
    toks: set[str] = set()
    fii = sample.get("fiiInput") or {}
    ins = sample.get("coachInsightsInput") or {}
    for p in fii.get("playerFii") or []:
        if p.get("name"):
            toks.add(str(p["name"]).lower())
    ec = (fii.get("gevInput") or {}).get("eventCounts") or {}
    for k, v in ec.items():
        toks.add(str(v))
        toks.add(k.lower())
    overall = (fii.get("teamFii") or {}).get("overall")
    if overall is not None:
        toks.add(str(overall))
    for s in ins.get("strengths") or []:
        for w in re.findall(r"[A-Za-z가-힣]+|\d+", s):
            if len(w) >= 2:
                toks.add(w.lower())
    for s in ins.get("improvementPoints") or []:
        for w in re.findall(r"[A-Za-z가-힣]+|\d+", s):
            if len(w) >= 2:
                toks.add(w.lower())
    brief = (ins.get("coachDecisionBrief") or {})
    for key in ("keyChangeToday", "nextTrainingFocus"):
        val = brief.get(key)
        if isinstance(val, str):
            for w in re.findall(r"[A-Za-z가-힣]+|\d+", val):
                if len(w) >= 2:
                    toks.add(w.lower())
    for pl in brief.get("playersToCoach") or []:
        if pl.get("name"):
            toks.add(str(pl["name"]).lower())
        if pl.get("focus"):
            for w in re.findall(r"[가-힣A-Za-z]+", str(pl["focus"])):
                if len(w) >= 2:
                    toks.add(w.lower())
    return toks


def score_q01_deterministic(text: str, sample: dict) -> int:
    toks = evidence_tokens(sample)
    hit = sum(1 for t in toks if t in text.lower() or t in normalize(text))
    # numbers from evidence
    nums = re.findall(r"\d+(?:\.\d+)?", text)
    allowed_nums = {str(int(float(x))) if float(x).is_integer() else str(x) for x in
                    re.findall(r"\d+(?:\.\d+)?", json.dumps(sample.get("allowedFacts") or [], ensure_ascii=False))}
    num_hit = sum(1 for n in nums if n in allowed_nums)
    if num_hit >= 2 and hit >= 3:
        return 2
    if num_hit >= 1 or hit >= 2:
        return 1
    return 0


def score_q02_deterministic(text: str, sample: dict) -> int:
    action_re = re.compile(
        r"리허설|훈련|포커스|집중|점검|연습|제안|옵션|드릴|미션|리뷰",
        re.I,
    )
    specific = re.compile(
        r"압박|턴오버|패스|리시브|빌드업|폭\s*만들|지원\s*패스|볼\s*순환",
        re.I,
    )
    if action_re.search(text) and specific.search(text) and re.search(r"\d+", text):
        return 2
    if action_re.search(text):
        return 1
    return 0


def score_q04_deterministic(text: str) -> int:
    # boilerplate ratio vs length
    boiler = 0
    if re.search(r"패스\s*연결\s*<NUM>건이\s*확인", normalize(text)):
        boiler += 1
    if re.search(r"다음\s*훈련에서는\s*압박\s*하\s*짧은\s*지원\s*패스", normalize(text)):
        boiler += 1
    if re.search(r"위험\s*지역\s*안전\s*옵션\s*리허설", normalize(text)):
        boiler += 1
    if boiler >= 2 and len(text) < 200:
        return 0
    if boiler >= 1:
        return 1
    return 2


def lab_judge_scores(client, model: str, sample: dict, text: str) -> dict:
    evidence = {
        "fiiInput": sample.get("fiiInput"),
        "coachInsightsInput": sample.get("coachInsightsInput"),
        "allowedFacts": sample.get("allowedFacts"),
    }
    rubric = (
        "Score ONLY this one coach rewrite. Rubric 0-2 integers.\n"
        "Q01_EVIDENCE_SPECIFICITY: 0=no evidence, 1=general theme, 2=specific FII/coachInsights evidence.\n"
        "Q02_COACH_ACTIONABILITY: 0=no action, 1=generic training, 2=specific grounded action/focus.\n"
        "Q03_INPUT_DIFFERENTIATION: 0=reusable for unrelated sample, 1=partial, 2=clearly shaped by this input.\n"
        "Q04_NON_GENERICITY: 0=mostly boilerplate, 1=mixed, 2=substantive sample-specific.\n"
        "Required HITL safety closing must NOT reduce scores by itself.\n"
        "Return JSON only: {\"Q01\":0-2,\"Q02\":0-2,\"Q03\":0-2,\"Q04\":0-2,\"rationale\":\"short\"}"
    )
    completion = client.chat.completions.create(
        model=model,
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": rubric},
            {
                "role": "user",
                "content": json.dumps(
                    {"evidence": evidence, "rewriteText": text},
                    ensure_ascii=False,
                ),
            },
        ],
    )
    raw = completion.choices[0].message.content or "{}"
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        data = {"Q01": 1, "Q02": 1, "Q03": 1, "Q04": 1, "rationale": "parse_fail", "raw": raw}
    for k in ("Q01", "Q02", "Q03", "Q04"):
        try:
            data[k] = max(0, min(2, int(data.get(k, 0))))
        except Exception:
            data[k] = 0
    data["_raw"] = raw
    return data


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lab-only", action="store_true", help="enable advisory LLM judge for Q01-Q04")
    parser.add_argument("--judge-model", default=os.environ.get("CIE_LAB_MODEL") or "gpt-4o-mini")
    parser.add_argument("--run-id", default="CIE-SHADOW-V02-RUN-001")
    parser.add_argument("--dataset-version", default=None)
    parser.add_argument("--samples-dir", default=None)
    args = parser.parse_args()

    gen_dir = SHADOW / "generations" / args.run_id
    if not gen_dir.exists():
        raise SystemExit(f"Missing frozen generations: {gen_dir}")

    samples_dir = resolve_samples_dir(args.dataset_version, args.samples_dir)
    manifest_path = gen_dir / "_manifest.json"
    if manifest_path.exists() and not args.dataset_version:
        dv = json.loads(manifest_path.read_text(encoding="utf-8")).get("datasetVersion")
        if dv:
            samples_dir = resolve_samples_dir(dv, None)

    judge_client = None
    if args.lab_only:
        key = os.environ.get("OPENAI_API_KEY", "").strip()
        if not key:
            raise SystemExit("BLOCKED: --lab-only requires OPENAI_API_KEY")
        from openai import OpenAI

        judge_client = OpenAI(api_key=key)

    rows = []
    openings = []
    closings = []
    all_sents = []
    texts = []
    samples_meta = []

    paths = sorted(samples_dir.glob("CIE-SHADOW-V02-*.json"))
    for sp in paths:
        sample = json.loads(sp.read_text(encoding="utf-8"))
        gp = gen_dir / f"{sample['sampleId']}.json"
        if not gp.exists():
            continue
        gen = json.loads(gp.read_text(encoding="utf-8"))
        text = (gen.get("rewriteText") or "").strip()
        texts.append(text)
        samples_meta.append(sample)
        openings.append(opening(text))
        closings.append(closing(text))
        all_sents.extend(normalize(s) for s in sentences(text))

        det = {
            "Q01": score_q01_deterministic(text, sample),
            "Q02": score_q02_deterministic(text, sample),
            "Q04": score_q04_deterministic(text),
        }
        # Q03 temporary from det; refined after pairwise / judge
        det["Q03"] = 1 if det["Q01"] >= 1 and det["Q04"] >= 1 else 0
        if det["Q01"] == 2 and det["Q04"] >= 1:
            det["Q03"] = 2

        judge = None
        if judge_client is not None:
            judge = lab_judge_scores(judge_client, args.judge_model, sample, text)
            q = {
                "Q01": judge["Q01"],
                "Q02": judge["Q02"],
                "Q03": judge["Q03"],
                "Q04": judge["Q04"],
            }
            method = "lab_judge"
        else:
            q = det
            method = "deterministic_proxy"

        rows.append(
            {
                "sampleId": sample["sampleId"],
                "compositionTag": sample.get("compositionTag"),
                "method": method,
                "scores": q,
                "totalQ01Q04": sum(q[k] for k in ("Q01", "Q02", "Q03", "Q04")),
                "deterministicProxy": det,
                "judge": {k: judge[k] for k in judge if not k.startswith("_")} if judge else None,
                "judgeRawHash": hashlib.sha256((judge.get("_raw") or "").encode()).hexdigest()[:12]
                if judge
                else None,
                "openingNorm": opening(text),
                "closingNorm": closing(text),
                "rewriteHash": hashlib.sha256(text.encode()).hexdigest()[:16],
            }
        )
        print("scored", sample["sampleId"], q)

    # corpus diversity Q05
    unique_open = len(set(openings)) / len(openings) if openings else 0.0
    unique_close = len(set(closings)) / len(closings) if closings else 0.0
    sent_counts = Counter(all_sents)
    repeated_sent = sum(1 for s, c in sent_counts.items() if c >= 2 and len(s) > 12)
    repeated_sent_ratio = repeated_sent / max(1, len(sent_counts))

    # pairwise similarity
    pairs = []
    for i in range(len(texts)):
        for j in range(i + 1, len(texts)):
            sim = jaccard(texts[i], texts[j])
            pairs.append(
                {
                    "a": rows[i]["sampleId"],
                    "b": rows[j]["sampleId"],
                    "jaccard": round(sim, 4),
                }
            )
    pairs.sort(key=lambda x: x["jaccard"], reverse=True)
    top_pairs = pairs[:5]
    mean_pair = round(sum(p["jaccard"] for p in pairs) / len(pairs), 4) if pairs else 0.0

    # refine Q03 for deterministic-only mode using corpus similarity
    if judge_client is None:
        for i, row in enumerate(rows):
            max_sim = max((p["jaccard"] for p in pairs if row["sampleId"] in (p["a"], p["b"])), default=0)
            if max_sim >= 0.85:
                row["scores"]["Q03"] = min(row["scores"]["Q03"], 0)
            elif max_sim >= 0.7:
                row["scores"]["Q03"] = min(row["scores"]["Q03"], 1)
            row["totalQ01Q04"] = sum(row["scores"][k] for k in ("Q01", "Q02", "Q03", "Q04"))

    open_counts = Counter(openings)
    close_counts = Counter(closings)
    # recommendation phrase patterns
    rec_pat = Counter()
    for t in texts:
        for m in re.findall(
            r"(압박\s*하\s*짧은\s*지원\s*패스|위험\s*지역\s*안전\s*옵션\s*리허설|볼\s*순환|받기\s*전\s*스캔|폭\s*만들)",
            t,
        ):
            rec_pat[re.sub(r"\s+", " ", m)] += 1

    n = len(rows) or 1
    means = {
        "Q01": round(sum(r["scores"]["Q01"] for r in rows) / n, 3),
        "Q02": round(sum(r["scores"]["Q02"] for r in rows) / n, 3),
        "Q03": round(sum(r["scores"]["Q03"] for r in rows) / n, 3),
        "Q04": round(sum(r["scores"]["Q04"] for r in rows) / n, 3),
    }
    zero_any = [r["sampleId"] for r in rows if any(r["scores"][k] == 0 for k in ("Q01", "Q02", "Q03", "Q04"))]
    low_total = [r["sampleId"] for r in rows if r["totalQ01Q04"] <= 4]

    # derive top 3 weaknesses from metrics
    weaknesses = []
    if unique_open < 0.35 or open_counts.most_common(1)[0][1] >= max(3, n // 3):
        weaknesses.append(
            {
                "id": "W1",
                "weakness": "excessive_fixed_opening",
                "evidence": {
                    "uniqueOpeningRatio": round(unique_open, 3),
                    "topOpening": open_counts.most_common(1)[0],
                },
            }
        )
    if unique_close < 0.25 or close_counts.most_common(1)[0][1] >= max(5, n // 2):
        weaknesses.append(
            {
                "id": "W2",
                "weakness": "excessive_fixed_closing_skeleton",
                "evidence": {
                    "uniqueClosingRatio": round(unique_close, 3),
                    "note": "HITL required closing excluded from quality failure but skeleton still highly repeated",
                    "topClosing": close_counts.most_common(1)[0],
                },
            }
        )
    if means["Q04"] < 1.2 or (rec_pat and rec_pat.most_common(1)[0][1] >= max(8, n // 2)):
        weaknesses.append(
            {
                "id": "W3",
                "weakness": "generic_or_repeated_recommendation_phrase",
                "evidence": {
                    "meanQ04": means["Q04"],
                    "topRecommendation": rec_pat.most_common(3),
                },
            }
        )
    if means["Q03"] < 1.2 or mean_pair >= 0.55:
        weaknesses.append(
            {
                "id": "W4",
                "weakness": "low_input_differentiation_high_pairwise_similarity",
                "evidence": {"meanQ03": means["Q03"], "meanPairwiseJaccard": mean_pair},
            }
        )
    if means["Q01"] < 1.3:
        weaknesses.append(
            {
                "id": "W5",
                "weakness": "weak_use_of_numeric_or_player_evidence",
                "evidence": {"meanQ01": means["Q01"]},
            }
        )
    # pick top 3 measurable
    top3 = weaknesses[:3]
    if len(top3) < 3:
        # fill from remaining
        for w in weaknesses[3:]:
            if len(top3) >= 3:
                break
            top3.append(w)

    summary = {
        "runId": args.run_id,
        "layer": "SHADOW_QUALITY_ADVISORY_NON_GATING",
        "evaluatedAt": datetime.now(timezone.utc).isoformat(),
        "outputsEvaluated": len(rows),
        "judgeUsed": bool(judge_client),
        "judgeModel": args.judge_model if judge_client else None,
        "scoringMethod": "lab_judge_Q01_Q04+deterministic_Q05" if judge_client else "deterministic_proxy",
        "meanScores": means,
        "diversity": {
            "uniqueOpeningRatio": round(unique_open, 4),
            "uniqueClosingRatio": round(unique_close, 4),
            "repeatedSentenceRatio": round(repeated_sent_ratio, 4),
            "meanPairwiseJaccard": mean_pair,
            "topOpeningPatterns": open_counts.most_common(3),
            "topClosingPatterns": close_counts.most_common(3),
            "topRecommendationPatterns": rec_pat.most_common(5),
            "highestSimilarityPairs": top_pairs,
        },
        "zeroOnAnyQ01Q04": zero_any,
        "lowTotalQ01Q04_le4": low_total,
        "lowQualitySampleCount": len(set(zero_any) | set(low_total)),
        "top3MeasurablePromptWeaknesses": top3,
        "cieHardGateStatus": "RUN-001 hard FAIL incidence 0 — safety gate unchanged / not replaced",
        "productionWrites": False,
        "liveCoachChanged": False,
        "promptChanged": False,
        "note": "Advisory quality only. Not accuracy. Not Shadow PASS/COMPLETE/LOCK.",
    }

    QUALITY_RESULTS.mkdir(parents=True, exist_ok=True)
    QUALITY_REVIEW.mkdir(parents=True, exist_ok=True)
    (QUALITY_RESULTS / f"{args.run_id}_QUALITY_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    with (QUALITY_RESULTS / f"{args.run_id}_QUALITY_per_sample.jsonl").open("w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    # markdown review
    md = []
    md.append(f"# CIE Shadow Quality Review — {args.run_id}\n")
    md.append("**Layer:** advisory / NON-GATING  \n")
    md.append(f"**Judge used:** {'Y — ' + args.judge_model if judge_client else 'N (deterministic proxy)'}  \n")
    md.append("**Prompt changed:** N · **CIE hard gate:** unchanged  \n\n")
    md.append("## Means\n\n")
    for k, v in means.items():
        md.append(f"- {k}: **{v}**\n")
    md.append("\n## Diversity\n\n")
    md.append(f"- unique opening ratio: **{unique_open:.3f}**\n")
    md.append(f"- unique closing ratio: **{unique_close:.3f}**\n")
    md.append(f"- repeated sentence ratio: **{repeated_sent_ratio:.3f}**\n")
    md.append(f"- mean pairwise Jaccard: **{mean_pair}**\n")
    md.append(f"- top opening: `{open_counts.most_common(1)[0] if open_counts else None}`\n")
    md.append(f"- top recommendation: `{rec_pat.most_common(3)}`\n")
    md.append("\n## Low quality\n\n")
    md.append(f"- zero on any Q01–Q04: {zero_any}\n")
    md.append(f"- total Q01–Q04 ≤ 4: {low_total}\n")
    md.append("\n## Top 3 measurable prompt weaknesses\n\n")
    for i, w in enumerate(top3, 1):
        md.append(f"{i}. **{w['weakness']}** — `{json.dumps(w.get('evidence', {}), ensure_ascii=False)}`\n")
    md.append("\n## Note\n\nDo not create cip-v0.2.0 until PM authorizes evidence-based correction.\n")
    (QUALITY_REVIEW / f"{args.run_id}_QUALITY_REVIEW.md").write_text("".join(md), encoding="utf-8")

    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
