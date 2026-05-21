/**
 * 🔥 메시지/사용자 신고 함수
 * 
 * 역할:
 * - 메시지 신고 접수
 * - 증거 로그 보존
 * - Trade/Recruit 공통
 */

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type ReportType = "spam" | "abuse" | "fraud" | "harassment" | "inappropriate" | "etc";

export interface ReportMessageParams {
  reporter: string;
  targetUid: string;
  roomId: string;
  messageId?: string;
  type: ReportType;
  text?: string;
}

/**
 * 메시지/사용자 신고
 */
export async function reportMessage(params: ReportMessageParams): Promise<string> {
  const { reporter, targetUid, roomId, messageId, type, text } = params;

  if (!reporter || !targetUid || !roomId || !type) {
    throw new Error("필수 정보가 누락되었습니다.");
  }

  if (reporter === targetUid) {
    throw new Error("자기 자신을 신고할 수 없습니다.");
  }

  try {
    const reportRef = await addDoc(collection(db, "reports"), {
      reporter,
      targetUid,
      roomId,
      messageId: messageId || null,
      type,
      text: text || null,
      status: "pending",
      createdAt: serverTimestamp(),
    });

    return reportRef.id;
  } catch (error) {
    console.error("❌ [reportMessage] 신고 실패:", error);
    throw error;
  }
}
