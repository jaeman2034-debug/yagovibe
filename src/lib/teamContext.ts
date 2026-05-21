/**
 * 🔥 팀 컨텍스트 해결 유틸 (K-0, K-3)
 * 
 * 단일 진실: "현재 팀 컨텍스트"
 * URL > localStorage > 서버 순서로 결정
 */

import { doc, getDoc, collectionGroup, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";

const STORAGE_KEY = "lastTeamId_v1";

/**
 * K-0: 현재 팀 컨텍스트 해결 (우선순위)
 * 1. URL에 teamId 있으면 그걸로
 * 2. 없으면 localStorage의 lastTeamId
 * 3. 그것도 없으면 서버에서 가장 최근 팀
 */
export async function resolveTeamContext(
  uid: string,
  urlTeamId?: string | null
): Promise<string | null> {
  // 1️⃣ URL에 teamId 있으면 그걸로
  if (urlTeamId) {
    return urlTeamId;
  }

  // 2️⃣ localStorage의 lastTeamId
  const storedTeamId = localStorage.getItem(STORAGE_KEY);
  if (storedTeamId) {
    return storedTeamId;
  }

  // 3️⃣ 서버에서 가장 최근 팀 (K-3)
  return await resolveInitialTeam(uid);
}

/**
 * K-3: 로그인 직후 "기본 진입 팀" 결정
 */
async function resolveInitialTeam(uid: string): Promise<string | null> {
  try {
    // users/{uid}.lastTeamId 확인
    const userSnap = await getDoc(doc(db, "users", uid));
    if (userSnap.exists()) {
      const userData = userSnap.data();
      if (userData.lastTeamId) {
        return userData.lastTeamId;
      }
    }

    // fallback: 멤버인 팀 중 하나
    const membersQuery = query(
      collectionGroup(db, "members"),
      where("__name__", "==", uid)
    );
    const snap = await getDocs(membersQuery);
    
    if (!snap.empty) {
      // 첫 번째 팀 반환 (또는 가장 최근 팀으로 정렬 가능)
      const firstDoc = snap.docs[0];
      const teamId = firstDoc.ref.parent.parent?.id;
      if (teamId) {
        return teamId;
      }
    }

    return null;
  } catch (error) {
    console.error("❌ [teamContext] 초기 팀 해결 실패:", error);
    return null;
  }
}

/**
 * 팀 컨텍스트 저장 (localStorage)
 */
export function saveTeamContext(teamId: string): void {
  localStorage.setItem(STORAGE_KEY, teamId);
}

/**
 * 팀 컨텍스트 초기화 (로그아웃 시)
 */
export function clearTeamContext(): void {
  localStorage.removeItem(STORAGE_KEY);
}

