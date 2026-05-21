/**
 * 🔥 매칭 참여 로깅 시스템 (운영 안정화)
 * 
 * 역할:
 * - 모든 상태 변경 기록
 * - 에러 추적
 * - 모니터링 대시보드 연동
 */

import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type JoinActionType =
  | "JOIN_CREATED"
  | "JOIN_APPROVED"
  | "JOIN_REJECTED"
  | "JOIN_CANCELLED"
  | "JOIN_AUTO_REJECTED"
  | "JOIN_INTEGRITY_FIXED";

export interface JoinLog {
  id?: string;
  postId: string;
  joinId: string;
  userId: string;
  action: JoinActionType;
  status: "pending" | "approved" | "rejected" | "cancelled";
  actorId?: string; // 승인/거절한 사람
  reason?: string; // 거절/취소 사유
  metadata?: {
    currentPeople?: number;
    maxPeople?: number;
    error?: string;
    [key: string]: any;
  };
  createdAt: any;
}

/**
 * 참여 신청 로그 기록
 * 
 * @param logData - 로그 데이터
 */
export async function logJoinAction(
  logData: Omit<JoinLog, "id" | "createdAt">
): Promise<void> {
  try {
    await addDoc(collection(db, "marketJoinLogs"), {
      ...logData,
      createdAt: serverTimestamp(),
    });

    console.log("📝 [logJoinAction] 로그 기록:", logData.action, {
      postId: logData.postId,
      joinId: logData.joinId,
      userId: logData.userId,
    });
  } catch (error: any) {
    console.error("❌ [logJoinAction] 로그 기록 실패:", error);
    // 로그 실패해도 메인 로직은 계속 진행
  }
}

/**
 * 게시글의 참여 신청 로그 조회
 * 
 * @param postId - 게시글 ID
 * @param limitCount - 최대 조회 개수 (기본값: 50)
 * @returns 로그 목록
 */
export async function getJoinLogs(
  postId: string,
  limitCount: number = 50
): Promise<JoinLog[]> {
  const logsQuery = query(
    collection(db, "marketJoinLogs"),
    where("postId", "==", postId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );

  const logsSnap = await getDocs(logsQuery);

  return logsSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as JoinLog[];
}

/**
 * 사용자의 참여 신청 로그 조회
 * 
 * @param userId - 사용자 ID
 * @param limitCount - 최대 조회 개수 (기본값: 50)
 * @returns 로그 목록
 */
export async function getUserJoinLogs(
  userId: string,
  limitCount: number = 50
): Promise<JoinLog[]> {
  const logsQuery = query(
    collection(db, "marketJoinLogs"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );

  const logsSnap = await getDocs(logsQuery);

  return logsSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as JoinLog[];
}

/**
 * 에러 로그 기록
 * 
 * @param errorData - 에러 데이터
 */
export async function logJoinError(errorData: {
  postId?: string;
  joinId?: string;
  userId?: string;
  action: string;
  error: string;
  code?: string;
  metadata?: any;
}): Promise<void> {
  try {
    await addDoc(collection(db, "marketJoinErrors"), {
      ...errorData,
      createdAt: serverTimestamp(),
    });

    console.error("❌ [logJoinError] 에러 로그 기록:", errorData);
  } catch (error: any) {
    console.error("❌ [logJoinError] 에러 로그 기록 실패:", error);
  }
}
