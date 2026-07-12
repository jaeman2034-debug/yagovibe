#!/usr/bin/env python3
"""CIE Shadow v0.2 — lab-only LLM rewrite generation.

Requires:
  --lab-only
  OPENAI_API_KEY in environment

Does NOT write Production Firestore / coachInsights / visionAnalysis.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
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
PROMPTS_DIR = ROOT / "scripts/vision/cie_eval_v0/prompts"
PROMPT_FILES = {
    "cip-v0.1.0": PROMPTS_DIR / "cip_v0_1_0.md",
    "cip-v0.2.0": PROMPTS_DIR / "cip_v0_2_0.md",
    "cip-v0.2.1": PROMPTS_DIR / "cip_v0_2_1.md",
    "cip-v0.2.2": PROMPTS_DIR / "cip_v0_2_2.md",
}
DEFAULT_MODEL = os.environ.get("CIE_LAB_MODEL") or os.environ.get("OPENAI_MODEL") or "gpt-4o-mini"


def resolve_samples_dir(dataset_version: str | None = None, samples_dir: str | None = None) -> Path:
    if samples_dir:
        return Path(samples_dir)
    if dataset_version:
        path = SAMPLES_BY_DATASET.get(dataset_version)
        if path is None:
            raise SystemExit(f"Unknown dataset version: {dataset_version}")
        return path
    return DEFAULT_SAMPLES


def resolve_prompt(version: str) -> tuple[str, Path]:
    path = PROMPT_FILES.get(version)
    if path is None or not path.exists():
        raise SystemExit(f"Unknown or missing prompt version: {version}")
    return path.read_text(encoding="utf-8"), path


def _payload_module():
    import importlib.util

    p = Path(__file__).resolve().parent / "rewrite_payload.py"
    spec = importlib.util.spec_from_file_location("cie_rewrite_payload", p)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


def build_user_message(sample: dict) -> str:
    return _payload_module().build_user_message(sample)


def generate_one(client, model: str, sample: dict, prompt_version: str, system: str) -> dict:
    user = build_user_message(sample)
    completion = client.chat.completions.create(
        model=model,
        temperature=0.2,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    text = (completion.choices[0].message.content or "").strip()
    # strip accidental fences
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("text"):
            text = text[4:].lstrip()
    generated_at = datetime.now(timezone.utc).isoformat()
    return {
        "sampleId": sample["sampleId"],
        "promptVersion": prompt_version,
        "modelId": model,
        "generatedAt": generated_at,
        "rewriteText": text,
        "labOnly": True,
        "usage": {
            "prompt_tokens": getattr(completion.usage, "prompt_tokens", None),
            "completion_tokens": getattr(completion.usage, "completion_tokens", None),
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lab-only", action="store_true", required=True)
    parser.add_argument("--run-id", default="CIE-SHADOW-V02-RUN-001")
    parser.add_argument("--dataset-version", default=None, choices=sorted(SAMPLES_BY_DATASET.keys()))
    parser.add_argument("--samples-dir", default=None)
    parser.add_argument("--prompt-version", default="cip-v0.1.0", choices=sorted(PROMPT_FILES.keys()))
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--limit", type=int, default=0, help="optional cap for debug")
    args = parser.parse_args()

    if not args.lab_only:
        raise SystemExit("Refusing to run without --lab-only")

    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key or api_key.startswith("sk-proj-xxxx"):
        print(
            json.dumps(
                {
                    "status": "BLOCKED",
                    "reason": "No approved lab LLM credential/path (OPENAI_API_KEY missing or placeholder)",
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        raise SystemExit(2)

    try:
        from openai import OpenAI
    except ImportError:
        print(
            json.dumps(
                {"status": "BLOCKED", "reason": "openai package not installed"},
                ensure_ascii=False,
            )
        )
        raise SystemExit(2)

    system, prompt_path = resolve_prompt(args.prompt_version)
    client = OpenAI(api_key=api_key)
    samples_dir = resolve_samples_dir(args.dataset_version, args.samples_dir)
    paths = sorted(samples_dir.glob("CIE-SHADOW-V02-*.json"))
    if not paths:
        raise SystemExit(f"No shadow samples in {samples_dir}")
    if args.limit > 0:
        paths = paths[: args.limit]

    out_dir = SHADOW / "generations" / args.run_id
    if out_dir.exists() and any(out_dir.glob("CIE-SHADOW-V02-*.json")):
        raise SystemExit(
            f"Refusing to overwrite existing generations: {out_dir} "
            "(preserve prior RUN artifacts; use a new --run-id)"
        )
    out_dir.mkdir(parents=True, exist_ok=True)

    results = []
    ok = 0
    for path in paths:
        sample = json.loads(path.read_text(encoding="utf-8"))
        try:
            gen = generate_one(client, args.model, sample, args.prompt_version, system)
            (out_dir / f"{sample['sampleId']}.json").write_text(
                json.dumps(gen, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            ok += 1
            results.append({"sampleId": sample["sampleId"], "status": "ok", "chars": len(gen["rewriteText"])})
            print("generated", sample["sampleId"], "chars", len(gen["rewriteText"]))
        except Exception as e:
            results.append({"sampleId": sample["sampleId"], "status": "error", "error": str(e)})
            print("ERROR", sample["sampleId"], e, file=sys.stderr)

    manifest = {
        "runId": args.run_id,
        "labOnly": True,
        "datasetVersion": args.dataset_version or "cie-shadowset-v0.2.0",
        "samplesDir": str(samples_dir.relative_to(ROOT)).replace("\\", "/"),
        "promptVersion": args.prompt_version,
        "promptPath": str(prompt_path.relative_to(ROOT)).replace("\\", "/"),
        "modelId": args.model,
        "requested": len(paths),
        "generated": ok,
        "generationRate": round(ok / len(paths), 4) if paths else 0.0,
        "results": results,
        "productionWrites": False,
    }
    (out_dir / "_manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps({k: manifest[k] for k in manifest if k != "results"}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
