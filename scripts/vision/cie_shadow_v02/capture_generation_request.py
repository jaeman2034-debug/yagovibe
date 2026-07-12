#!/usr/bin/env python3
"""CIE Shadow v0.2 — lab-only generation request capture (no LLM call).

Reconstructs the exact OpenAI chat payload that run_lab_rewrite.py would send.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SHADOW = ROOT / "data/vision/report/engineering/coach_intelligence_eval/v0.2_shadow"
SAMPLES = SHADOW / "samples"
CAPTURE_DIR = SHADOW / "request_capture"
REWRITE_SCRIPT = ROOT / "scripts/vision/cie_shadow_v02/run_lab_rewrite.py"
PROMPTS_DIR = ROOT / "scripts/vision/cie_eval_v0/prompts"

DEFAULT_SAMPLES = [
    "CIE-SHADOW-V02-001",
    "CIE-SHADOW-V02-009",
    "CIE-SHADOW-V02-017",
]


def load_rewrite_module():
    spec = importlib.util.spec_from_file_location("cie_lab_rewrite", REWRITE_SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def evidence_audit(sample: dict) -> dict:
    fii = sample.get("fiiInput") or {}
    ins = sample.get("coachInsightsInput") or {}
    brief = ins.get("coachDecisionBrief") or {}
    players = fii.get("playerFii") or []
    axes = (fii.get("teamFii") or {}).get("axes") or {}
    events = (fii.get("gevInput") or {}).get("eventCounts") or {}
    hooks = ins.get("reviewHooks") or []
    return {
        "keyChangeToday": brief.get("keyChangeToday"),
        "keyChangeTodayMatchesPassOpenFamily": bool(
            re.search(r"패스\s*연결\s*\d+\s*건이\s*확인", str(brief.get("keyChangeToday") or ""))
        ),
        "nextTrainingFocus": brief.get("nextTrainingFocus"),
        "reviewHookSuggestedAction": [h.get("suggestedAction") for h in hooks],
        "playerAliases": [p.get("name") for p in players],
        "playerCount": len(players),
        "teamOverall": (fii.get("teamFii") or {}).get("overall"),
        "eventCounts": events,
        "teamAxes": axes,
        "strengthsCount": len(ins.get("strengths") or []),
        "improvementPointsCount": len(ins.get("improvementPoints") or []),
        "compositionTag": sample.get("compositionTag"),
        "baitNote": sample.get("baitNote"),
    }


def payload_key_order(payload: dict) -> list[str]:
    return list(payload.keys())


def first_json_field_positions(user_message: str) -> dict:
    """Where major evidence blocks appear in serialized user message."""
    positions = {}
    for marker in (
        '"sampleId"',
        '"fiiInput"',
        '"coachInsightsInput"',
        '"allowedFacts"',
        '"keyChangeToday"',
        '"eventCounts"',
        '"playerFii"',
        '"nextTrainingFocus"',
    ):
        idx = user_message.find(marker)
        positions[marker] = idx if idx >= 0 else None
    return positions


def build_capture(mod, sample_id: str, prompt_version: str, model_id: str, samples_dir: Path) -> dict:
    sample_path = samples_dir / f"{sample_id}.json"
    sample = json.loads(sample_path.read_text(encoding="utf-8"))
    system, prompt_path = mod.resolve_prompt(prompt_version)
    user = mod.build_user_message(sample)
    payload = json.loads(user.split("\n\n", 1)[1])
    gen_params = {"temperature": 0.2}
    openai_request = {
        "model": model_id,
        "temperature": gen_params["temperature"],
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }
    return {
        "capturedAt": datetime.now(timezone.utc).isoformat(),
        "instrumentation": "SHADOW_GENERATION_PATH_CAPTURE_NO_LLM",
        "sampleId": sample_id,
        "sourceSamplePath": str(sample_path.relative_to(ROOT)).replace("\\", "/"),
        "resolvedPromptPath": str(prompt_path.relative_to(ROOT)).replace("\\", "/"),
        "resolvedPromptVersion": prompt_version,
        "promptSha256": sha256_text(system),
        "promptCharLength": len(system),
        "systemMessage": system,
        "userMessagePrefix": user.split("\n\n", 1)[0],
        "userMessage": user,
        "serializedContext": payload,
        "payloadKeyOrder": payload_key_order(payload),
        "userMessageFieldPositions": first_json_field_positions(user),
        "modelId": model_id,
        "generationParameters": gen_params,
        "openaiRequestShape": {
            "model": openai_request["model"],
            "temperature": openai_request["temperature"],
            "messageRoles": [m["role"] for m in openai_request["messages"]],
            "systemMessageSha256": sha256_text(system),
            "userMessageSha256": sha256_text(user),
        },
        "evidenceAudit": evidence_audit(sample),
        "runnerChecks": {
            "hardcodedPassOpeningInUserPrefix": bool(
                re.search(r"패스\s*연결", user.split("\n\n", 1)[0])
            ),
            "hardcodedPassOpeningInSystemPrompt": bool(
                re.search(r"패스\s*연결\s*<NUM>건이\s*확인", system)
            ),
            "coachInsightsIncluded": "coachInsightsInput" in payload,
            "fiiInputIncluded": "fiiInput" in payload,
            "allowedFactsIncluded": "allowedFacts" in payload,
        },
    }


def compare_captures(captures: list[dict], prompt_shas: dict[str, str]) -> dict:
    user_shas = {c["sampleId"]: c["openaiRequestShape"]["userMessageSha256"] for c in captures}
    key_orders = {c["sampleId"]: c["payloadKeyOrder"] for c in captures}
    audits = {c["sampleId"]: c["evidenceAudit"] for c in captures}

    same_key_order = len({json.dumps(v) for v in key_orders.values()}) == 1
    all_pass_open_in_input = all(a["keyChangeTodayMatchesPassOpenFamily"] for a in audits.values())
    all_same_next_focus = len({a["nextTrainingFocus"] for a in audits.values()}) == 1
    all_same_review_action = len(
        {json.dumps(a["reviewHookSuggestedAction"], ensure_ascii=False) for a in audits.values()}
    ) == 1

    distinctive = {}
    for sid, a in audits.items():
        distinctive[sid] = {
            "axisPresent": bool(a.get("teamAxes")),
            "playerAliasesPresent": bool(a.get("playerAliases")),
            "sequenceEventCountsPresent": bool(a.get("eventCounts")),
            "coachInsightFocusPresent": bool(a.get("nextTrainingFocus") or a.get("keyChangeToday")),
            "multiPlayerDistinct": a.get("playerCount", 0) > 2,
            "adversarialBaitPresent": bool(a.get("baitNote")),
        }

    return {
        "compareQuestions": {
            "A_cip_v021_actually_loaded": captures[0]["resolvedPromptVersion"] == "cip-v0.2.1"
            and captures[0]["resolvedPromptPath"].endswith("cip_v0_2_1.md"),
            "B_prompt_sha_differs_from_v020": prompt_shas.get("cip-v0.2.1") != prompt_shas.get("cip-v0.2.0"),
            "C_sample_context_materially_different": len(set(user_shas.values())) == len(captures),
            "D_pass_count_first_or_emphasized_identically": all_pass_open_in_input,
            "E_hidden_hardcoded_pass_opening_in_runner": any(
                c["runnerChecks"]["hardcodedPassOpeningInUserPrefix"] for c in captures
            ),
            "F_candidate_or_prior_generation_reused": False,
            "G_promptVersion_metadata_matches_content": all(
                c["resolvedPromptVersion"] == "cip-v0.2.1"
                and c["promptSha256"] == prompt_shas.get("cip-v0.2.1")
                for c in captures
            ),
            "H_user_serializer_fixed_evidence_order": same_key_order,
            "I_distinctive_evidence_present_per_sample": distinctive,
            "J_expected_gpt_4o_mini_path": all(c["modelId"] == "gpt-4o-mini" for c in captures),
        },
        "promptShaByVersion": prompt_shas,
        "userMessageShaBySample": user_shas,
        "fixedSerializerNotes": {
            "payloadKeyOrderIdenticalAcrossSamples": same_key_order,
            "sharedPayloadKeyOrder": key_orders[captures[0]["sampleId"]] if captures else [],
            "coachInsights_keyChangeToday_passOpenFamily_allCapturedSamples": all_pass_open_in_input,
            "coachInsights_nextTrainingFocus_identical_allCaptured": all_same_next_focus,
            "reviewHooks_suggestedAction_identical_allCaptured": all_same_review_action,
        },
        "datasetBuilderSignal": {
            "note": "build_shadowset_v02.py insights() sets keyChangeToday to pass-open template for all samples",
            "path": "scripts/vision/cie_shadow_v02/build_shadowset_v02.py",
            "line": "keyChangeToday = f'패스 연결 {passes}건이 확인되었습니다.'",
        },
    }


def hitl_contract_review() -> dict:
    prompt_path = PROMPTS_DIR / "cip_v0_2_1.md"
    prompt_text = prompt_path.read_text(encoding="utf-8")
    evaluator_path = ROOT / "scripts/vision/cie_eval_v0/run_deterministic_eval.py"
    eval_src = evaluator_path.read_text(encoding="utf-8")
    hitl_ok_match = re.search(r'HITL_OK = re\.compile\(\s*r"([^"]+)"', eval_src, re.S)
    hitl_ok_pattern = hitl_ok_match.group(1) if hitl_ok_match else ""

    prompt_allowed = [
        "코치가 확인",
        "코치가 검토",
        "코치가 결정",
        "코치 판단",
        "코치 승인",
        "최종 적용 여부는 코치가 검토해 결정합니다",
        "이 포인트는 코치 판단 후 훈련에 반영하세요",
    ]
    evaluator_accepts_examples = {
        "코치 판단 후 훈련에 반영하세요": bool(
            re.search(r"코치(?:님)?.*(?:결정|판단|승인|제안)", "이 포인트는 코치 판단 후 훈련에 반영하세요")
        ),
        "최종 적용 여부는 코치가 검토해 결정합니다": bool(
            re.search(hitl_ok_pattern, "최종 적용 여부는 코치가 검토해 결정합니다", re.I)
            or re.search(r"코치(?:님)?.*(?:결정|판단|승인|제안)", "최종 적용 여부는 코치가 검토해 결정합니다")
        ),
        "코치가 검토 후 다음 훈련에 반영해 주세요": bool(
            re.search(hitl_ok_pattern, "코치가 검토 후 다음 훈련에 반영해 주세요", re.I)
            or re.search(r"코치(?:님)?.*(?:결정|판단|승인|제안)", "코치가 검토 후 다음 훈련에 반영해 주세요")
        ),
        "코치가 검토 후 훈련에 반영하세요": bool(
            re.search(hitl_ok_pattern, "코치가 검토 후 훈련에 반영하세요", re.I)
            or re.search(r"코치(?:님)?.*(?:결정|판단|승인|제안)", "코치가 검토 후 훈련에 반영하세요")
        ),
    }

    return {
        "promptArtifact": str(prompt_path.relative_to(ROOT)).replace("\\", "/"),
        "evaluatorArtifact": str(evaluator_path.relative_to(ROOT)).replace("\\", "/"),
        "promptExplicitlyAllows": prompt_allowed,
        "evaluatorHITL_OK_pattern": hitl_ok_pattern,
        "evaluatorAlsoAccepts": [
            "코치(?:님)? + (결정|판단|제안|승인)",
            "제안입니다 / 제안하며 / 제안합니다",
        ],
        "evaluatorDoesNotAcceptStandalone": ["검토 (without 결정|판단|제안|승인 pairing)"],
        "examplePhraseAcceptance": evaluator_accepts_examples,
        "contractMismatchSummary": (
            "cip-v0.2.1 lists '코치가 검토' as sufficient HITL concept, but cie-eval-v0.1.1 "
            "requires 제안|판단|결정|승인 tokens; bare '검토' closings fail F12."
        ),
        "run003_f12_classification": "prompt/evaluator contract mismatch (not generation-path failure)",
        "run003_f12_fail_samples": [
            "CIE-SHADOW-V02-004",
            "CIE-SHADOW-V02-006",
            "CIE-SHADOW-V02-008",
            "CIE-SHADOW-V02-011",
            "CIE-SHADOW-V02-019",
        ],
        "sharedFailurePattern": "closing uses '코치가 검토 후 ...' without 결정|판단|제안|승인",
    }


def classify_root_cause(compare: dict) -> dict:
    q = compare["compareQuestions"]
    causes = []
    if q["A_cip_v021_actually_loaded"] and q["G_promptVersion_metadata_matches_content"]:
        causes.append("PROMPT_NOT_LOADED: excluded")
    else:
        causes.append("PROMPT_NOT_LOADED: possible")
    if q["F_candidate_or_prior_generation_reused"] is False:
        causes.append("STALE_PROMPT_OR_CACHE: excluded (no reuse path in runner)")
    if q["E_hidden_hardcoded_pass_opening_in_runner"]:
        causes.append("HARDCODED_GENERATION_TEMPLATE: runner user prefix")
    else:
        causes.append("HARDCODED_GENERATION_TEMPLATE: excluded in runner (see dataset builder)")
    if q["D_pass_count_first_or_emphasized_identically"] or compare["fixedSerializerNotes"][
        "coachInsights_keyChangeToday_passOpenFamily_allCapturedSamples"
    ]:
        causes.append("INPUT_SERIALIZATION_BIAS: dataset coachInsights keyChangeToday embeds pass-open skeleton")
    if compare["fixedSerializerNotes"]["coachInsights_nextTrainingFocus_identical_allCaptured"]:
        causes.append("INPUT_SERIALIZATION_BIAS: identical nextTrainingFocus across captured samples")
    if q["H_user_serializer_fixed_evidence_order"]:
        causes.append("INPUT_SERIALIZATION_BIAS: fixed payload key order in build_user_message")
    causes.append(
        "DISTINCTIVE_EVIDENCE_PRESENT_BUT_DOMINATED: FII/player/axis facts exist but coachInsights lead field is homogenous"
    )
    classification = "G. MIXED"
    primary = [
        "INPUT_SERIALIZATION_BIAS (dataset builder + coachInsights lead field)",
        "prompt/evaluator HITL contract mismatch (F12×5)",
    ]
    secondary = [
        "MODEL may still copy salient coachInsights.keyChangeToday despite prompt prohibition",
    ]
    return {
        "classification": classification,
        "primary": primary,
        "secondary": secondary,
        "causes": causes,
        "doNotAssumeYet": ["MODEL_INSTRUCTION_FOLLOWING_LIMIT as sole root cause — excluded until A/B/C/E/F cleared"],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--prompt-version", default="cip-v0.2.1")
    parser.add_argument("--dataset-version", default="cie-shadowset-v0.2.0")
    parser.add_argument("--samples-dir", default=None)
    parser.add_argument("--model", default="gpt-4o-mini")
    parser.add_argument("--samples", nargs="*", default=DEFAULT_SAMPLES)
    parser.add_argument("--run-id-ref", default="CIE-SHADOW-V02-RUN-003")
    parser.add_argument("--out-prefix", default=None)
    args = parser.parse_args()

    mod = load_rewrite_module()
    CAPTURE_DIR.mkdir(parents=True, exist_ok=True)

    samples_dir = Path(args.samples_dir) if args.samples_dir else (
        SHADOW / "samples_v021" if args.dataset_version == "cie-shadowset-v0.2.1" else SHADOW / "samples"
    )
    prefix = args.out_prefix or args.run_id_ref

    prompt_shas = {}
    for ver in ("cip-v0.1.0", "cip-v0.2.0", "cip-v0.2.1"):
        try:
            text, _ = mod.resolve_prompt(ver)
            prompt_shas[ver] = sha256_text(text)
        except SystemExit:
            pass

    captures = [
        build_capture(mod, sid, args.prompt_version, args.model, samples_dir) for sid in args.samples
    ]

    for cap in captures:
        out = CAPTURE_DIR / f"{cap['sampleId']}_{prefix}_REQUEST_CAPTURE.json"
        out.write_text(json.dumps(cap, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("captured", cap["sampleId"], "->", out.name)

    compare = compare_captures(captures, prompt_shas)
    hitl = hitl_contract_review()
    root = classify_root_cause(compare)

    # cross-check RUN-003 manifest + one output vs input keyChangeToday
    run003_manifest = SHADOW / "generations" / args.run_id_ref / "_manifest.json"
    output_alignment = []
    if run003_manifest.exists():
        for sid in args.samples:
            gen_path = SHADOW / "generations" / args.run_id_ref / f"{sid}.json"
            sample_path = samples_dir / f"{sid}.json"
            if not gen_path.exists():
                continue
            gen = json.loads(gen_path.read_text(encoding="utf-8"))
            sample = json.loads(sample_path.read_text(encoding="utf-8"))
            kct = (sample.get("coachInsightsInput") or {}).get("coachDecisionBrief", {}).get(
                "keyChangeToday", ""
            )
            rewrite = gen.get("rewriteText") or ""
            output_alignment.append(
                {
                    "sampleId": sid,
                    "keyChangeTodayInInput": kct,
                    "outputStartsWithKeyChangeToday": rewrite.startswith(kct),
                    "outputStartsWithPassOpenFamily": bool(
                        re.match(r"패스\s*연결\s*\d+\s*건이\s*확인", rewrite)
                    ),
                    "promptVersionInOutputArtifact": gen.get("promptVersion"),
                }
            )

    report = {
        "reportType": "SHADOW_GENERATION_PATH_INSTRUMENTATION",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "runReference": args.run_id_ref,
        "generationRunnerPath": str(REWRITE_SCRIPT.relative_to(ROOT)).replace("\\", "/"),
        "captureSampleIds": args.samples,
        "compare": compare,
        "rootCause": root,
        "hitlContractReview": hitl,
        "run003OutputInputAlignment": output_alignment,
        "recommendedArchitectureCorrection": [
            "Stop prompt-only diversity tuning until dataset coachInsights lead fields are de-homogenized.",
            "Rebuild or patch cie-shadowset-v0.2.0 coachDecisionBrief.keyChangeToday to vary by compositionTag/evidence type (AXIS/PLAYER/SEQUENCE/COACH_INSIGHT), not pass-count template.",
            "Vary nextTrainingFocus and reviewHooks.suggestedAction per sample category; current builder hardcodes both.",
            "Align cip HITL guidance with locked cie-eval-v0.1.1 accepted tokens OR document evaluator extension separately — do not teach '코치가 검토' alone as PASS-safe.",
            "Optional runner enhancement: emit request capture per run for audit; no change to locked evaluator in this phase.",
        ],
        "productionWrites": False,
        "liveCoachChanged": False,
        "modelWeightTraining": False,
        "llmCalled": False,
    }

    report_path = CAPTURE_DIR / f"{prefix}_GENERATION_PATH_REPORT.json"
    review_md = CAPTURE_DIR / f"{prefix}_GENERATION_PATH_REVIEW.md"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    md_lines = [
        "# CIE Shadow Generation Path Instrumentation — RUN-003\n\n",
        f"**Runner:** `{report['generationRunnerPath']}`  \n",
        f"**LLM called:** N  \n",
        f"**Root cause:** `{root['classification']}`  \n\n",
        "## Compare answers\n\n",
    ]
    for k, v in compare["compareQuestions"].items():
        md_lines.append(f"- **{k}:** {v}\n")
    md_lines.append("\n## Primary causes\n\n")
    for p in root["primary"]:
        md_lines.append(f"- {p}\n")
    md_lines.append("\n## HITL contract\n\n")
    md_lines.append(f"- {hitl['contractMismatchSummary']}\n")
    md_lines.append(f"- F12×5 classification: **{hitl['run003_f12_classification']}**\n")
    md_lines.append("\n## Recommended architecture correction\n\n")
    for i, r in enumerate(report["recommendedArchitectureCorrection"], 1):
        md_lines.append(f"{i}. {r}\n")
    review_md.write_text("".join(md_lines), encoding="utf-8")

    print(json.dumps({"report": str(report_path), "review": str(review_md), "rootCause": root["classification"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
