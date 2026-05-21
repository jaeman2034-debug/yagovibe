/**
 * Tournament 상태 배지 컴포넌트
 * 
 * 원칙:
 * - 텍스트로만 명확히 (색으로 유혹 ❌)
 * - 상태 명확 표시: 접수중 / 접수마감 / 진행중 / 종료 / 예정
 * 
 * 로직:
 * - status === 'upcoming' && registrationOpen → '접수중'
 * - status === 'upcoming' && !registrationOpen → '접수마감'
 * - status === 'ongoing' → '진행중'
 * - status === 'ended' → '종료'
 * - status === 'upcoming' (기본) → '예정'
 */

import type { Tournament } from "@/types/tournament";

interface TournamentStatusBadgeProps {
  tournament: Tournament;
}

const statusMap: Record<string, string> = {
  open: "접수중",
  closed: "접수마감",
  ongoing: "진행중",
  ended: "종료",
  upcoming: "예정",
};

export function TournamentStatusBadge({ tournament }: TournamentStatusBadgeProps) {
  let statusKey = "";

  if (tournament.status === "upcoming" && tournament.registrationOpen) {
    statusKey = "open";
  } else if (tournament.status === "upcoming" && !tournament.registrationOpen) {
    statusKey = "closed";
  } else if (tournament.status === "ongoing") {
    statusKey = "ongoing";
  } else if (tournament.status === "ended") {
    statusKey = "ended";
  } else {
    statusKey = "upcoming";
  }

  const label = statusMap[statusKey] || tournament.status;

  return (
    <span className="text-xs border border-gray-300 px-2 py-1 rounded text-gray-700">
      {label}
    </span>
  );
}

