#!/usr/bin/env python3
"""Explicit rewrite payload builder — evidence-bearing fields only for LLM user message."""

from __future__ import annotations

import copy
import json
import re
from typing import Any

GENERIC_HEADLINE_RE = re.compile(r"^섀도\s*세션\s*요약", re.I)
GENERIC_SUMMARY_RE = re.compile(
    r"^gev[·.]?fii\s*기반\s*코치\s*브리프", re.I
)

PAYLOAD_INCLUSION_RULES = {
    "matchSummary.headline": "OMIT when null or generic non-evidence title (e.g. 섀도 세션 요약)",
    "matchSummary.summary": "OMIT when generic metadata only (e.g. GEV·FII 기반 코치 브리프)",
    "matchSummary.eventHighlights": "INCLUDE — numeric evidence-bearing",
    "teamFii": "INCLUDE",
    "playerFii": "INCLUDE",
    "gevInput": "INCLUDE",
    "timeWindow": "INCLUDE when present",
    "coachInsightsInput": "INCLUDE",
    "allowedFacts": "INCLUDE",
    "coachContext": "INCLUDE",
    "primaryEvidenceType": "INCLUDE at payload root",
    "forbiddenClaims": "OMIT from rewrite payload (evaluator uses full sample)",
    "baitNote": "INCLUDE when present (adversarial guard)",
}


def is_generic_headline(value: Any) -> bool:
    if value is None:
        return True
    if not isinstance(value, str) or not value.strip():
        return True
    return bool(GENERIC_HEADLINE_RE.match(value.strip()))


def is_generic_summary(value: Any) -> bool:
    if value is None:
        return True
    if not isinstance(value, str) or not value.strip():
        return True
    return bool(GENERIC_SUMMARY_RE.match(value.strip()))


def sanitize_fii_for_rewrite_payload(fii_input: dict) -> dict:
    """Return fiiInput for LLM payload — strip non-evidence generic matchSummary leads."""
    fii = copy.deepcopy(fii_input)
    ms = fii.get("matchSummary")
    if isinstance(ms, dict):
        if is_generic_headline(ms.get("headline")):
            ms.pop("headline", None)
        if is_generic_summary(ms.get("summary")):
            ms.pop("summary", None)
        # drop empty matchSummary shell
        if not ms or (set(ms.keys()) <= {"eventHighlights"} and not ms.get("eventHighlights")):
            fii.pop("matchSummary", None)
        else:
            fii["matchSummary"] = ms
    return fii


def build_rewrite_payload(sample: dict) -> dict:
    """Deterministic rewrite payload contract (not raw full-sample serialization)."""
    payload: dict[str, Any] = {
        "sampleId": sample["sampleId"],
        "primaryEvidenceType": sample.get("primaryEvidenceType")
        or (sample.get("coachInsightsInput") or {}).get("primaryEvidenceType"),
        "fiiInput": sanitize_fii_for_rewrite_payload(sample.get("fiiInput") or {}),
        "coachInsightsInput": copy.deepcopy(sample.get("coachInsightsInput") or {}),
        "allowedFacts": copy.deepcopy(sample.get("allowedFacts") or []),
        "coachContext": copy.deepcopy(sample.get("coachContext") or {}),
    }
    if sample.get("baitNote"):
        payload["baitNote"] = sample["baitNote"]
    return payload


def build_user_message(sample: dict, *, use_rewrite_payload_contract: bool | None = None) -> str:
    if use_rewrite_payload_contract is None:
        dv = sample.get("datasetVersion") or ""
        use_rewrite_payload_contract = dv >= "cie-shadowset-v0.2.2"

    if use_rewrite_payload_contract:
        payload = build_rewrite_payload(sample)
    else:
        payload = {
            "sampleId": sample["sampleId"],
            "fiiInput": sample["fiiInput"],
            "coachInsightsInput": sample["coachInsightsInput"],
            "allowedFacts": sample["allowedFacts"],
            "forbiddenClaims": sample["forbiddenClaims"],
            "coachContext": sample["coachContext"],
            "baitNote": sample.get("baitNote"),
        }
    return (
        "Rewrite a coach brief from the JSON evidence only.\n"
        "Follow the system prompt grounding rules.\n"
        "Return plain Korean text only (no markdown fences, no JSON).\n\n"
        + json.dumps(payload, ensure_ascii=False, indent=2)
    )


def payload_contains_generic_headline(user_message: str) -> bool:
    return bool(re.search(r'"headline"\s*:\s*"섀도\s*세션\s*요약', user_message))


def payload_serialization_audit(sample: dict) -> dict:
    payload = build_rewrite_payload(sample)
    user = build_user_message(sample, use_rewrite_payload_contract=True)
    fii = payload.get("fiiInput") or {}
    ms = fii.get("matchSummary") or {}
    return {
        "sampleId": sample["sampleId"],
        "primaryEvidenceType": payload.get("primaryEvidenceType"),
        "headlineInPayload": ms.get("headline"),
        "summaryInPayload": ms.get("summary"),
        "eventHighlightsInPayload": ms.get("eventHighlights"),
        "keyChangeToday": (payload.get("coachInsightsInput") or {})
        .get("coachDecisionBrief", {})
        .get("keyChangeToday"),
        "allowedFactsCount": len(payload.get("allowedFacts") or []),
        "genericHeadlineAbsent": not payload_contains_generic_headline(user),
        "payloadKeyOrder": list(payload.keys()),
    }
