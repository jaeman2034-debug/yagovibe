/**
 * 🔥 대회 참가 신청 상태 관리 (STEP: 대회 운영 플로우)
 * 
 * 핵심 원칙:
 * - status 하나로 모든 상태 표현
 * - 관계 문서 상태 변경만으로 끝
 * - 프론트 조건문 난립 없음
 */

import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * 참가 신청 승인
 */
export async function approveApplication(
  associationId: string,
  tournamentId: string,
  applicationId: string
): Promise<void> {
  const applicationRef = doc(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/applications/${applicationId}`
  );

  await updateDoc(applicationRef, {
    status: "APPROVED",
    updatedAt: serverTimestamp(),
  });
}

/**
 * 참가 신청 반려
 */
export async function rejectApplication(
  associationId: string,
  tournamentId: string,
  applicationId: string
): Promise<void> {
  const applicationRef = doc(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/applications/${applicationId}`
  );

  await updateDoc(applicationRef, {
    status: "REJECTED",
    updatedAt: serverTimestamp(),
  });
}
