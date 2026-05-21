/**
 * 🔥 Activity Log Service - Activity 로그 생성 서비스
 * 
 * 역할:
 * - 모든 게시글을 Activity 로그로 수집
 * - 종목 허브는 Activity 로그만 조회
 * 
 * 스키마:
 * {
 *   sport: "soccer" | "basketball" | ...
 *   type: "market" | "team" | "event"
 *   refId: string        // 원본 문서 ID
 *   title: string
 *   thumbnail?: string
 *   authorId: string
 *   createdAt: timestamp
 * }
 */

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface ActivityLogData {
  sport: string;
  type: "market" | "team" | "event";
  refId: string; // 원본 문서 ID (호환성 유지)
  sourceId: string; // 원본 문서 ID (sourceId로 통일)
  sourceType: string; // 원본 컬렉션 타입 (marketPosts, teams, events)
  title: string;
  summary?: string; // 요약 정보 (가격, 상태 등)
  thumbnail?: string;
  authorId: string;
  category?: string; // market의 경우 category (equipment/recruit/match)
}

/**
 * ⚠️ [DEPRECATED] Activity 로그 생성 - v1 아키텍처 전환 중
 * 🔥 activityLogs는 더 이상 사용하지 않음 (activities로 통합)
 * 
 * @param data Activity 로그 데이터
 * @returns 생성된 Activity 로그 ID (항상 빈 문자열 반환)
 */
export async function createActivityLog(data: ActivityLogData): Promise<string> {
  console.warn("⚠️ [createActivityLog] activityLogs는 더 이상 사용하지 않습니다. activities를 사용하세요.");
  // ⚠️ activityLogs 생성 비활성화
  // try {
  //   const sourceType = 
  //     data.type === "market" ? "marketPosts" :
  //     data.type === "team" ? "teams" :
  //     data.type === "event" ? "events" :
  //     "unknown";

  //   const activityData = {
  //     sport: data.sport,
  //     type: data.type,
  //     refId: data.refId || data.sourceId,
  //     sourceId: data.sourceId || data.refId,
  //     sourceType: data.sourceType || sourceType,
  //     title: data.title,
  //     summary: data.summary || null,
  //     thumbnail: data.thumbnail || null,
  //     authorId: data.authorId,
  //     category: data.category || null,
  //     createdAt: serverTimestamp(),
  //   };

  //   const docRef = await addDoc(collection(db, "activityLogs"), activityData);
  //   console.log("✅ [createActivityLog] Activity 로그 생성 완료:", {
  //     activityId: docRef.id,
  //     refId: data.refId,
  //     type: data.type,
  //     sport: data.sport,
  //   });
  //   return docRef.id;
  // } catch (error: any) {
  //   console.error("❌ [createActivityLog] Activity 로그 생성 실패:", error);
  //   return "";
  // }
  return ""; // 빈 문자열 반환 (비활성화)
}
