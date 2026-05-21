// src/utils/assemblyRules.ts
// 🔥 전자 총회·의결 엔진: 정족수·투표 결과 자동 판정

export interface Assembly {
  id?: string;
  title: string;
  type: "정기총회" | "임시총회";
  heldAt: Date | string;
  quorumRule: {
    ratio: number; // 0.5 = 과반, 0.67 = 2/3
  };
  createdBy: string;
  status: "draft" | "open" | "closed";
  createdAt?: Date;
}

export interface Agenda {
  id?: string;
  assemblyId: string;
  title: string;
  description?: string;
  voteRule: "majority" | "two_thirds"; // 과반 / 2/3
  status: "open" | "closed";
  result?: "passed" | "rejected" | "pending";
  createdAt?: Date;
}

export interface Vote {
  id?: string;
  agendaId: string;
  memberId: string;
  memberName?: string;
  choice: "agree" | "disagree" | "abstain";
  votedAt: Date;
}

export interface AttendanceSummary {
  total: number; // 전체 회원 수
  presentCount: number; // 출석 인원
  absentCount: number;
  excusedCount: number;
}

// 🔥 1. 정족수 자동 판정 (출석 데이터 재사용)
export function hasQuorum(
  attendance: AttendanceSummary,
  quorumRule: Assembly["quorumRule"]
): boolean {
  if (attendance.total === 0) return false;
  return attendance.presentCount >= attendance.total * quorumRule.ratio;
}

// 🔥 2. 투표 결과 자동 확정 (불변 결과)
export function resolveVote(
  votes: Vote[],
  rule: Agenda["voteRule"]
): "passed" | "rejected" | "pending" {
  if (votes.length === 0) return "pending";

  const agreeCount = votes.filter((v) => v.choice === "agree").length;
  const disagreeCount = votes.filter((v) => v.choice === "disagree").length;
  const totalVotes = agreeCount + disagreeCount; // 기권 제외

  if (totalVotes === 0) return "pending";

  if (rule === "majority") {
    // 과반: 찬성 > 반대
    return agreeCount > disagreeCount ? "passed" : "rejected";
  } else if (rule === "two_thirds") {
    // 2/3: 찬성 >= 전체 투표의 2/3
    return agreeCount >= totalVotes * (2 / 3) ? "passed" : "rejected";
  }

  return "pending";
}

// 🔥 3. 투표 통계
export function getVoteStats(votes: Vote[]): {
  agree: number;
  disagree: number;
  abstain: number;
  total: number;
} {
  return {
    agree: votes.filter((v) => v.choice === "agree").length,
    disagree: votes.filter((v) => v.choice === "disagree").length,
    abstain: votes.filter((v) => v.choice === "abstain").length,
    total: votes.length,
  };
}

