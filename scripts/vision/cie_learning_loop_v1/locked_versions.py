"""Locked CIE / Shadow version registry — immutable without PM GO."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]

SHADOW = ROOT / "data/vision/report/engineering/coach_intelligence_eval/v0.2_shadow"
LOOP = ROOT / "data/vision/report/engineering/coach_intelligence_eval/learning_loop_v1"

PROMPTS_DIR = ROOT / "scripts/vision/cie_eval_v0/prompts"
EVAL_SCRIPT = ROOT / "scripts/vision/cie_eval_v0/run_deterministic_eval.py"

DATASET_DIRS = {
    "cie-shadowset-v0.2.0": SHADOW / "samples",
    "cie-shadowset-v0.2.1": SHADOW / "samples_v021",
    "cie-shadowset-v0.2.2": SHADOW / "samples_v022",
}

PROMPT_FILES = {
    "cip-v0.1.0": PROMPTS_DIR / "cip_v0_1_0.md",
    "cip-v0.2.0": PROMPTS_DIR / "cip_v0_2_0.md",
    "cip-v0.2.1": PROMPTS_DIR / "cip_v0_2_1.md",
    "cip-v0.2.2": PROMPTS_DIR / "cip_v0_2_2.md",
}

# PM LOCK evidence SHA256 (CIE Shadow V022)
LOCKED_SHA256 = {
    "cip-v0.2.2": "30c5f98b01843c77003282ebb231c453f7d19e2c502fe4ea49e5fbcac69d64dc",
    "rewrite_payload.py": "115e77672fdc3a62181ce777939444b7fcc726039f8001c8a74863499e4b0fee",
    "build_shadowset_v022.py": "092e5cd09e4136ca803fb6076165c74f80e68da2c71face611dce67a1b3d2812",
    "cie-eval-v0.1.1": "7b1742d52d3c7bb36c9380f59d051d292a1dbb64bded9427c44eae52de7c4036",
    "run_quality_eval.py": "e007a809ca91bb145e55114c2c7afe93ab9d83e44c2b993fba1041383e62072b",
    "samples_v022_combined": "3151449033e2ef044bbb7e3bbc0856387c2dcbc7b77b333cab1e1ab8725d1199",
}

LOCKED_ARTIFACT_PATHS = {
    "cip-v0.2.2": PROMPT_FILES["cip-v0.2.2"],
    "rewrite_payload.py": ROOT / "scripts/vision/cie_shadow_v02/rewrite_payload.py",
    "build_shadowset_v022.py": ROOT / "scripts/vision/cie_shadow_v02/build_shadowset_v022.py",
    "cie-eval-v0.1.1": EVAL_SCRIPT,
    "run_quality_eval.py": ROOT / "scripts/vision/cie_shadow_v02/run_quality_eval.py",
}

DEFAULT_EVALUATOR = "cie-eval-v0.1.1"
DEFAULT_LOCKED_DATASET = "cie-shadowset-v0.2.2"
DEFAULT_LOCKED_PROMPT = "cip-v0.2.2"

PM_DECISIONS = frozenset(
    {
        "HOLD",
        "REVIEW_FAILURES",
        "APPROVE_VERSION_CANDIDATE",
        "REJECT_VERSION_CANDIDATE",
        "AUTHORIZE_2_RUN_GATE",
    }
)

HITL_DECISIONS = frozenset({"ACCEPT", "REJECT", "REVISE", "ABSTAIN"})
