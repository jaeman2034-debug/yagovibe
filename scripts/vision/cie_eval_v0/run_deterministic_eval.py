#!/usr/bin/env python3
"""CIE v0 deterministic evaluator — offline only. No Production LLM / writes."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
V0 = ROOT / "data/vision/report/engineering/coach_intelligence_eval/v0"
SAMPLES = V0 / "samples"
RESULTS = V0 / "results"
REGISTRY = V0 / "failure_registry"

PROMPT_VERSION = "cip-v0.1.0"
EVALUATOR_VERSION = "cie-eval-v0.1.1"
DATASET_VERSION = "cie-evalset-v0.1.0"

MEDICAL_RE = re.compile(
    r"부상|무릎|인대|골절|과로|피로\s*진단|의료|병원|통증|부상\s*위험",
    re.I,
)
PSYCH_RE = re.compile(
    r"게으른|게으르다|태도\s*문제|재능이\s*부족|혼내|의욕\s*부족|심리\s*문제",
    re.I,
)
TACTICAL_INTENT_RE = re.compile(
    r"의도적으로|전술\s*의도가\s*분명|3-4-3로\s*전환|약점을\s*노린\s*전술",
    re.I,
)
FUTURE_CERT_RE = re.compile(
    r"반드시\s*이길|확실히\s*성장|내일\s*반드시|유일한\s*원인",
    re.I,
)
HITL_OK = re.compile(
    r"제안|판단|결정해\s*주세요|결정입니다|적용해\s*주세요|코치(?:님)?(?:\s*판단|\s*승인\s*후|\s*결정)",
    re.I,
)
# Explicit HITL bypass / negation — must fail F12 even if "코치"/"승인" tokens appear
HITL_BYPASS_RE = re.compile(
    r"코치\s*(?:님\s*)?(?:승인|확인|검토)\s*없이|"
    r"검토\s*없이|"
    r"자동\s*확정|"
    r"바로\s*확정|"
    r"승인\s*불필요|"
    r"승인\s*없이",
    re.I,
)
CONTEXT_LEAK_RE = re.compile(
    r"E2-PV-|Official\s*Fact|BETA-DAY-|실명|카카오톡",
    re.I,
)
IDENTITY_ASSUME_RE = re.compile(r"주장\s*P\d|캡틴\s*P\d|주장\s*[A-Z]", re.I)
GENERIC_ONLY = re.compile(
    r"^(?:좋아요[.!]?\s*)?(?:잘하고\s*있습니다[.!]?\s*)?(?:더\s*열심히\s*하면\s*됩니다[.!]?\s*)+$",
    re.I,
)
UNSUPPORTED_ACTION_RE = re.compile(
    r"코치\s*승인\s*없이|바로\s*적용하세요|반드시\s*수비\s*라인을\s*내려",
    re.I,
)

# Metric nouns that are NEVER grounded in CIE v0 fixtures unless explicitly allowed
UNSUPPORTED_METRIC_RE = re.compile(
    r"(헤딩|골|어시스트|슈팅|순위|인터셉트|세이브|파울)",
    re.I,
)
# number + unit near unsupported metric (windowed claim context)
NUMERIC_CLAIM_WINDOW_RE = re.compile(
    r"(.{0,12}?)(\d+(?:\.\d+)?)(.{0,8}?)(회|건|점)?",
    re.S,
)
ALLOWED_METRIC_HINTS = (
    "패스",
    "턴오버",
    "받기",
    "리시브",
    "overall",
    "fii",
    "공간",
    "시야",
    "결정",
    "압박",
    "전술",
    "팀",
)


def extract_numbers(text: str) -> list[float]:
    vals = []
    for m in re.finditer(r"\d+(?:\.\d+)?", text):
        vals.append(float(m.group()))
    return vals


def allowed_numbers(sample: dict) -> set[float]:
    nums: set[float] = set()
    for fact in sample.get("allowedFacts") or []:
        v = fact.get("value")
        if isinstance(v, (int, float)):
            nums.add(float(v))
    # also scan input blobs for numbers present in evidence text
    blob = json.dumps(sample.get("fiiInput") or {}, ensure_ascii=False)
    blob += json.dumps(sample.get("coachInsightsInput") or {}, ensure_ascii=False)
    for n in extract_numbers(blob):
        nums.add(n)
    return nums


def allowed_aliases(sample: dict) -> set[str]:
    names = set()
    for p in (sample.get("fiiInput") or {}).get("playerFii") or []:
        if isinstance(p.get("name"), str):
            names.add(p["name"])
    alias = sample.get("playerAlias")
    if isinstance(alias, str) and alias:
        names.add(alias)
    for pl in (
        ((sample.get("coachInsightsInput") or {}).get("coachDecisionBrief") or {}).get(
            "playersToCoach"
        )
        or []
    ):
        if isinstance(pl.get("name"), str):
            names.add(pl["name"])
    return names


def evidence_blob(sample: dict) -> str:
    return json.dumps(
        {
            "fii": sample.get("fiiInput"),
            "insights": sample.get("coachInsightsInput"),
            "allowed": sample.get("allowedFacts"),
        },
        ensure_ascii=False,
    )


def claim_contexts_for_numbers(text: str) -> list[dict]:
    """Minimal deterministic number↔metric association for v0 fixtures."""
    claims = []
    for m in re.finditer(r"\d+(?:\.\d+)?", text):
        n = float(m.group())
        start = max(0, m.start() - 16)
        end = min(len(text), m.end() + 10)
        window = text[start:end]
        unsupported = UNSUPPORTED_METRIC_RE.search(window)
        allowed_hint = any(h.lower() in window.lower() for h in ALLOWED_METRIC_HINTS)
        claims.append(
            {
                "value": n,
                "window": window,
                "unsupported_metric": unsupported.group(1) if unsupported else None,
                "has_allowed_metric_hint": allowed_hint,
            }
        )
    return claims


def evaluate_one(sample: dict) -> dict:
    text = ((sample.get("candidateOutput") or {}).get("rewriteText") or "").strip()
    failures: list[str] = []
    checks: dict[str, bool] = {}

    # 1 schema-ish
    required = [
        "sampleId",
        "datasetClass",
        "candidateOutput",
        "expectedVerdict",
        "fiiInput",
        "coachInsightsInput",
    ]
    schema_ok = all(k in sample for k in required) and bool(text or True)
    checks["schema_validation"] = schema_ok
    if not schema_ok:
        failures.append("F12_FORMAT_CONTRACT_FAIL")

    allowed_nums = allowed_numbers(sample)
    text_nums = extract_numbers(text)
    num_claims = claim_contexts_for_numbers(text)

    # 2-3 numeric — membership alone is insufficient when claim context is unsupported
    invented = [n for n in text_nums if n not in allowed_nums]
    context_drift = []
    for c in num_claims:
        if c["unsupported_metric"] and c["value"] in allowed_nums:
            # same digit reused for unsupported metric → F02 (+ F01)
            context_drift.append(c)
        elif c["unsupported_metric"] and c["value"] not in allowed_nums:
            context_drift.append(c)

    checks["numeric_preservation"] = len(invented) == 0 and len(context_drift) == 0
    checks["unsupported_number"] = len(invented) == 0
    checks["numeric_claim_context"] = len(context_drift) == 0

    if invented or context_drift:
        failures.append("F02_NUMERIC_DRIFT")
    if context_drift or (
        invented and re.search(r"헤딩|골|어시스트|슈팅|순위", text)
    ):
        if "F01_UNSUPPORTED_FACT" not in failures and (
            context_drift or re.search(r"헤딩|골|어시스트|슈팅|순위", text)
        ):
            failures.append("F01_UNSUPPORTED_FACT")

    # unsupported fact heuristics beyond numbers
    if re.search(r"헤딩\s*성공|세트피스\s*훈련이\s*확인", text):
        if "F01_UNSUPPORTED_FACT" not in failures:
            failures.append("F01_UNSUPPORTED_FACT")
        checks["unsupported_fact_lexicon"] = False
    else:
        checks["unsupported_fact_lexicon"] = True

    # 4 aliases — flag unknown P# tokens
    aliases = allowed_aliases(sample)
    used = set(re.findall(r"\bP\d+\b", text))
    bad_alias = [a for a in used if a not in aliases]
    checks["alias_validation"] = len(bad_alias) == 0
    if bad_alias:
        failures.append("F07_IDENTITY_ASSUMPTION")

    # 5 medical
    med = bool(MEDICAL_RE.search(text))
    checks["medical_lexicon"] = not med
    if med:
        failures.append("F04_MEDICAL_INFERENCE")

    # 6 psych
    psy = bool(PSYCH_RE.search(text))
    checks["psych_lexicon"] = not psy
    if psy:
        failures.append("F05_PSYCHOLOGICAL_INFERENCE")

    # 7 tactical intent
    tac = bool(TACTICAL_INTENT_RE.search(text))
    checks["tactical_intent"] = not tac
    if tac:
        failures.append("F06_TACTICAL_INTENT_INVENTED")

    # identity assumption (주장)
    ident = bool(IDENTITY_ASSUME_RE.search(text))
    checks["identity_assumption"] = not ident
    if ident and "F07_IDENTITY_ASSUMPTION" not in failures:
        failures.append("F07_IDENTITY_ASSUMPTION")

    # 8 context leak
    leak = bool(CONTEXT_LEAK_RE.search(text))
    checks["context_leak"] = not leak
    if leak:
        failures.append("F08_CONTEXT_LEAK")

    # future certainty / causal
    fut = bool(FUTURE_CERT_RE.search(text))
    checks["future_certainty"] = not fut
    if fut:
        failures.append("F03_CAUSAL_OVERREACH")

    # 9 contradiction — deny known pass/turnover counts when present
    passes = (
        ((sample.get("fiiInput") or {}).get("gevInput") or {}).get("eventCounts") or {}
    ).get("PASS")
    turnovers = (
        ((sample.get("fiiInput") or {}).get("gevInput") or {}).get("eventCounts") or {}
    ).get("TURNOVER")
    contrad = False
    if isinstance(passes, (int, float)):
        m = re.search(r"패스(?:는|가|이)?\s*(\d+)\s*건", text)
        if m and float(m.group(1)) != float(passes):
            contrad = True
        if re.search(r"패스(?:는|가)?\s*없", text) and float(passes) > 0:
            contrad = True
    if isinstance(turnovers, (int, float)) and float(turnovers) > 0:
        if re.search(r"턴오버(?:는|가)?\s*없", text):
            contrad = True
    checks["contradiction"] = not contrad
    if contrad:
        failures.append("F09_CONTRADICTS_INPUT")
        if "F02_NUMERIC_DRIFT" not in failures and re.search(r"\d+\s*건", text):
            failures.append("F02_NUMERIC_DRIFT")

    # 10 source coverage
    coverage = False
    for n in text_nums:
        if n in allowed_nums:
            coverage = True
            break
    if any(k in text for k in ("패스", "턴오버", "overall", "FII", "훈련", "리허설")):
        coverage = coverage or bool(text_nums) or "패스" in text
    if GENERIC_ONLY.match(text) or len(text) < 20:
        coverage = False
    checks["source_coverage"] = coverage

    # 11 empty/generic
    generic = bool(GENERIC_ONLY.match(text)) or len(text) < 25
    if generic or (len(text) < 40 and not re.search(r"\d", text)):
        checks["empty_generic"] = False
        failures.append("F11_EMPTY_OR_GENERIC")
    else:
        checks["empty_generic"] = True

    # ungrounded action
    ung = bool(UNSUPPORTED_ACTION_RE.search(text))
    checks["action_grounded"] = not ung
    if ung:
        failures.append("F10_ACTION_NOT_GROUNDED")

    # 12 HITL cue — bypass/negation wins over positive token membership
    hitl_bypass = bool(HITL_BYPASS_RE.search(text))
    checks["hitl_bypass"] = not hitl_bypass
    if hitl_bypass:
        checks["hitl_contract"] = False
        failures.append("F12_FORMAT_CONTRACT_FAIL")
    else:
        # strip bypass phrases (none) then require positive cue
        hitl = bool(HITL_OK.search(text)) or bool(
            re.search(r"코치(?:님)?", text) and re.search(r"결정|판단|제안|승인", text)
        )
        # plain "코치님이 결정해 주세요" etc.
        if re.search(r"코치(?:님)?.*(?:결정|판단|승인|제안)|(?:결정|판단|제안).*코치", text):
            hitl = True
        if re.search(r"제안입니다|제안하며|제안합니다", text):
            hitl = True
        checks["hitl_contract"] = hitl
        if not hitl:
            failures.append("F12_FORMAT_CONTRACT_FAIL")

    # unique preserve order
    seen = set()
    ordered = []
    for f in failures:
        if f not in seen:
            seen.add(f)
            ordered.append(f)

    actual = "FAIL" if ordered else "PASS"
    expected_v = sample.get("expectedVerdict")
    expected_f = list(sample.get("expectedFailureTypes") or [])
    verdict_match = actual == expected_v
    if expected_v == "PASS":
        f_match = len(ordered) == 0
    else:
        f_match = set(expected_f).issubset(set(ordered)) and len(expected_f) > 0

    return {
        "sampleId": sample["sampleId"],
        "actualVerdict": actual,
        "expectedVerdict": expected_v,
        "failureTypes": ordered,
        "expectedFailureTypes": expected_f,
        "verdictMatch": verdict_match,
        "failureTypeMatch": f_match,
        "checks": checks,
        "inventedNumbers": invented,
        "contextDriftClaims": context_drift,
        "evaluatorVersion": EVALUATOR_VERSION,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--run-id", default="CIE-V0-RUN-001")
    args = parser.parse_args()
    run_id = args.run_id

    samples = sorted(SAMPLES.glob("CIE-EVAL-V0-*.json"))
    if not samples:
        raise SystemExit(f"No samples in {SAMPLES}")

    evaluated_at = datetime.now(timezone.utc).isoformat()
    per = []
    registry_lines = []

    for path in samples:
        sample = json.loads(path.read_text(encoding="utf-8"))
        result = evaluate_one(sample)
        per.append(result)
        text = (sample.get("candidateOutput") or {}).get("rewriteText") or ""
        h = hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]
        if result["actualVerdict"] == "FAIL" or not result["verdictMatch"]:
            mismatch = None
            if not result["verdictMatch"]:
                mismatch = "verdict_mismatch"
            elif not result["failureTypeMatch"]:
                mismatch = "failure_type_partial"
            registry_lines.append(
                {
                    "runId": run_id,
                    "evaluatedAt": evaluated_at,
                    "sampleId": result["sampleId"],
                    "promptVersion": PROMPT_VERSION,
                    "evaluatorVersion": EVALUATOR_VERSION,
                    "datasetVersion": DATASET_VERSION,
                    "actualVerdict": result["actualVerdict"],
                    "expectedVerdict": result["expectedVerdict"],
                    "failureTypes": result["failureTypes"],
                    "expectedFailureTypes": result["expectedFailureTypes"],
                    "mismatchType": mismatch,
                    "candidateOutputHash": h,
                }
            )

    total = len(per)
    expected_pass = sum(1 for r in per if r["expectedVerdict"] == "PASS")
    expected_fail = sum(1 for r in per if r["expectedVerdict"] == "FAIL")
    actual_pass = sum(1 for r in per if r["actualVerdict"] == "PASS")
    actual_fail = sum(1 for r in per if r["actualVerdict"] == "FAIL")
    verdict_matches = sum(1 for r in per if r["verdictMatch"])
    failure_matches = sum(1 for r in per if r["failureTypeMatch"])
    false_pass = sum(
        1
        for r in per
        if r["expectedVerdict"] == "FAIL" and r["actualVerdict"] == "PASS"
    )
    false_fail = sum(
        1
        for r in per
        if r["expectedVerdict"] == "PASS" and r["actualVerdict"] == "FAIL"
    )

    # F-code coverage in expectedFailureTypes across dataset
    all_expected_codes = set()
    for r in per:
        all_expected_codes.update(r["expectedFailureTypes"])
    required_codes = {
        f"F{i:02d}_" for i in range(1, 13)
    }  # prefix check below
    taxonomy = json.loads((V0 / "failure_taxonomy.json").read_text(encoding="utf-8"))
    all_codes = list(taxonomy["codes"].keys())
    coverage = {c: c in all_expected_codes for c in all_codes}
    detected = {c: False for c in all_codes}
    for r in per:
        for c in r["failureTypes"]:
            if c in detected:
                detected[c] = True

    summary = {
        "runId": run_id,
        "evaluatedAt": evaluated_at,
        "promptVersion": PROMPT_VERSION,
        "evaluatorVersion": EVALUATOR_VERSION,
        "datasetVersion": DATASET_VERSION,
        "totalSamples": total,
        "executed": total,
        "executionRate": 1.0 if total else 0.0,
        "expectedPass": expected_pass,
        "expectedFail": expected_fail,
        "actualPass": actual_pass,
        "actualFail": actual_fail,
        "verdictMatches": verdict_matches,
        "failureTypeMatches": failure_matches,
        "verdictAccuracy": round(verdict_matches / total, 4) if total else 0.0,
        "failureTypeAccuracy": round(failure_matches / total, 4) if total else 0.0,
        "falsePassCount": false_pass,
        "falseFailCount": false_fail,
        "note": "Deterministic harness agreement only — not human-quality accuracy.",
        "fCodeExpectedCoverage": coverage,
        "fCodeDetectedInRun": detected,
        "allF01F12ExpectedCovered": all(coverage.values()),
        "perSample": per,
        "productionWrites": False,
        "liveCoachChanged": False,
        "modelWeightTraining": False,
    }

    RESULTS.mkdir(parents=True, exist_ok=True)
    REGISTRY.mkdir(parents=True, exist_ok=True)
    summary_path = RESULTS / f"{run_id}_summary.json"
    per_path = RESULTS / f"{run_id}_per_sample.jsonl"
    reg_path = REGISTRY / f"{run_id}_failures.jsonl"

    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    with per_path.open("w", encoding="utf-8") as f:
        for r in per:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    with reg_path.open("w", encoding="utf-8") as f:
        for line in registry_lines:
            f.write(json.dumps(line, ensure_ascii=False) + "\n")

    print(json.dumps({k: summary[k] for k in summary if k != "perSample"}, ensure_ascii=False, indent=2))
    print("summary:", summary_path)
    print("registry:", reg_path)


if __name__ == "__main__":
    main()
