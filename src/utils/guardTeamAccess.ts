/**
 * 🔥 guardTeamAccess - 팀 접근 가드 (공통 로직)
 *
 * 핵심 원칙:
 * - members → team 순서로 읽어서 Firestore read 최소화
 * - 플랜 체크는 필요한 페이지에서만
 * - URL의 teamId가 단일 진실
 *
 * SSOT:
 * - 권한: teams/{teamId}/members/{uid}.role (owner | admin | member)
 * - 플랜: teams/{teamId}.plan
 */

import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TeamRole } from "@/lib/team/roleConstants";

export type GuardResult =
  | { type: "ok"; role: TeamRole; plan: "free" | "pro" | "academy_pro" }
  | { type: "needLogin" }
  | { type: "needTeam" }
  | { type: "needUpgrade"; currentPlan: "free" | "pro" | "academy_pro" };

export async function guardTeamAccess({
  uid,
  teamId,
  requiredPlan,
}: {
  uid?: string;
  teamId: string;
  requiredPlan?: "pro" | "academy_pro";
}): Promise<GuardResult> {
  // 1) 인증 체크
  if (!uid) {
    return { type: "needLogin" };
  }

  // 2) member 확인 (가장 먼저) - 권한 SSOT
  const memberRef = doc(db, `teams/${teamId}/members/${uid}`);
  const memberSnap = await getDoc(memberRef);

  if (!memberSnap.exists()) {
    return { type: "needTeam" };
  }

  const memberData = memberSnap.data();
  
  // status 체크
  if (memberData.status !== "active") {
    return { type: "needTeam" };
  }

  // role 추출 - canonical: teams/{teamId}/members/{uid}.role
  // 타입: TeamRole ("owner" | "admin" | "member")
  const rawRole = memberData.role as string | undefined;
  const role: TeamRole =
    rawRole === "owner" || rawRole === "admin" || rawRole === "member"
      ? rawRole
      : "member"; // 기본값: member

  // 3) 플랜 체크 (필요할 때만) - 플랜 SSOT
  if (requiredPlan) {
    const teamRef = doc(db, `teams/${teamId}`);
    const teamSnap = await getDoc(teamRef);

    if (!teamSnap.exists()) {
      return { type: "needTeam" };
    }

    const teamData = teamSnap.data();
    const plan = (teamData.plan as "free" | "pro" | "academy_pro") || "free";

    // 플랜 제한 체크
    if (requiredPlan === "pro" && plan !== "pro" && plan !== "academy_pro") {
      return { type: "needUpgrade", currentPlan: plan };
    }

    if (requiredPlan === "academy_pro" && plan !== "academy_pro") {
      return { type: "needUpgrade", currentPlan: plan };
    }

    return {
      type: "ok",
      role,
      plan,
    };
  }

  // 플랜 체크가 필요 없으면 member만 확인하고 반환
  // (팀 정보는 나중에 필요할 때 읽기)
  return {
    type: "ok",
    role,
    plan: "free", // 기본값 (실제 플랜은 필요시에만 조회)
  };
}
