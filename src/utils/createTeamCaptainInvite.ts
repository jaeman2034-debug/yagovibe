/**
 * 🔥 팀장 초대 링크 생성 유틸 (운영자용)
 * 
 * 기능:
 * - 일회성 초대 토큰 생성
 * - 24시간 만료
 * - 로그인 UID 바인딩 필수
 */

import { collection, doc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface TeamCaptainInvite {
  teamId: string;
  associationId: string;
  tournamentId?: string; // 대회 팀인 경우
  role: "captain";
  expiresAt: Timestamp;
  used: boolean;
  usedByUid?: string;
  revoked?: boolean; // 강제 폐기 (재발급 시)
  createdAt: Timestamp;
}

/**
 * 팀장 초대 링크 생성
 * 
 * @param associationId 협회 ID
 * @param teamId 팀 ID
 * @param tournamentId 대회 ID (선택, 대회 팀인 경우)
 * @returns inviteId (토큰)
 */
export async function createTeamCaptainInvite({
  associationId,
  teamId,
  tournamentId,
}: {
  associationId: string;
  teamId: string;
  tournamentId?: string;
}): Promise<string> {
  try {
    // 1️⃣ 초대 문서 생성
    const invitesRef = collection(
      db,
      "associations",
      associationId,
      "TeamInvites"
    );

    const inviteRef = doc(invitesRef);
    const inviteId = inviteRef.id;

    // 2️⃣ 24시간 만료 시간 설정
    const expiresAt = Timestamp.fromDate(
      new Date(Date.now() + 1000 * 60 * 60 * 24) // 24시간
    );

    // 3️⃣ 초대 문서 저장
    await setDoc(inviteRef, {
      teamId,
      associationId,
      ...(tournamentId && { tournamentId }),
      role: "captain",
      expiresAt,
      used: false,
      revoked: false,
      createdAt: serverTimestamp(),
    });

    console.log(`[팀장 초대] ✅ 초대 링크 생성: ${inviteId}`);

    return inviteId;
  } catch (error: any) {
    console.error("[팀장 초대] 생성 오류:", error);
    throw new Error(`팀장 초대 링크 생성 실패: ${error.message || "알 수 없는 오류"}`);
  }
}

