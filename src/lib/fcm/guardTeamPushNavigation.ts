import { doc, getDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";

/**
 * 팀 푸시 딥링크: 로그인 후 멤버십 확인 → 멤버 아니면 내 팀 목록으로
 */
export async function resolveTeamPushPathWithMembership(
  path: string,
  user: User | null
): Promise<string> {
  if (!path.startsWith("/team/")) return path;
  if (!user) return path;

  const match = path.match(/^\/team\/([^/?#]+)/);
  const teamId = match?.[1];
  if (!teamId) return path;

  try {
    const memberRef = doc(db, "teams", decodeURIComponent(teamId), "members", user.uid);
    const snap = await getDoc(memberRef);
    if (!snap.exists()) {
      return "/my-teams";
    }
  } catch {
    /* 네트워크 실패 시 원 경로 유지 — TeamHome에서 안내 */
  }
  return path;
}
