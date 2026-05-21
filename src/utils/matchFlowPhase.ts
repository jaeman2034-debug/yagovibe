/**
 * 매칭 플로우 단계 (Firestore status + 신청 수로 파생)
 * OPEN → PENDING → CONFIRMED → DONE
 */

import type { Match } from "@/types/match";
import { getMatchEventDate } from "@/utils/matchDetailFormat";

export type MatchFlowPhase = "OPEN" | "PENDING" | "CONFIRMED" | "DONE";

export function getMatchFlowPhase(
  match: Match,
  pendingRequestCount: number
): MatchFlowPhase {
  if (match.status === "finished") return "DONE";
  if (match.status === "matched") return "CONFIRMED";
  if (match.status === "open" && pendingRequestCount > 0) return "PENDING";
  return "OPEN";
}

export function matchFlowPhaseLabel(phase: MatchFlowPhase): string {
  switch (phase) {
    case "OPEN":
      return "모집중";
    case "PENDING":
      return "신청 검토";
    case "CONFIRMED":
      return "매칭 확정";
    case "DONE":
      return "경기 종료";
    default:
      return "";
  }
}

export function matchFlowPhaseStyle(phase: MatchFlowPhase): string {
  switch (phase) {
    case "OPEN":
      return "bg-slate-100 text-slate-700";
    case "PENDING":
      return "bg-amber-100 text-amber-900";
    case "CONFIRMED":
      return "bg-emerald-100 text-emerald-800";
    case "DONE":
      return "bg-indigo-100 text-indigo-900";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

/** 경기 시작 시각(날짜+time)이 지났는지 — 안내·빠른 종료 UX용 */
export function isMatchKickoffInPast(match: Match): boolean {
  const d = getMatchEventDate(match);
  if (!d) return false;
  const parts = (match.time || "00:00").split(":");
  const hh = parseInt(parts[0] || "0", 10);
  const mm = parseInt(parts[1] || "0", 10);
  const kick = new Date(d);
  kick.setHours(
    Number.isFinite(hh) ? hh : 0,
    Number.isFinite(mm) ? mm : 0,
    0,
    0
  );
  return kick.getTime() < Date.now();
}
