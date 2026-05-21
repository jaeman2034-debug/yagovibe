/**
 * 공지 통계 집계 유틸리티
 * 
 * 원칙:
 * - 조회수는 1사용자 1공지 1일 1회만 증가
 * - 중복 조회 방지 (noticeViews 서브컬렉션 사용)
 * - 트랜잭션으로 원자성 보장
 */

import {
  doc,
  runTransaction,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * 조회수 집계 (1사용자 1공지 1일 1회)
 * 
 * @param noticeId 공지 ID
 * @param userId 사용자 UID
 * @returns 조회수 증가 여부 (true: 증가함, false: 이미 조회함)
 */
export async function incrementNoticeView(
  noticeId: string,
  userId: string
): Promise<boolean> {
  try {
    // 🔥 오늘 날짜 키 생성 (yyyyMMdd)
    const today = new Date();
    const dateKey = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const viewKey = `${noticeId}_${userId}_${dateKey}`;

    const viewRef = doc(db, "noticeViews", viewKey);
    const noticeRef = doc(db, "notices", noticeId);

    // 🔥 트랜잭션으로 중복 조회 방지 + 조회수 증가
    const result = await runTransaction(db, async (transaction) => {
      const viewSnap = await transaction.get(viewRef);
      
      // 이미 오늘 조회했으면 증가하지 않음
      if (viewSnap.exists()) {
        return false;
      }

      // 조회 기록 생성 + 조회수 증가
      transaction.set(viewRef, {
        noticeId,
        uid: userId,
        date: dateKey,
        createdAt: serverTimestamp(),
      });

      transaction.update(noticeRef, {
        viewCount: increment(1),
        lastViewedAt: serverTimestamp(),
      });

      return true;
    });

    return result;
  } catch (error) {
    console.error("공지 조회수 집계 오류:", error);
    // 에러 발생해도 사용자 경험에 영향 없도록 false 반환
    return false;
  }
}

/**
 * 클릭수 집계 (중복 허용)
 * 
 * @param noticeId 공지 ID
 */
export async function incrementNoticeClick(noticeId: string): Promise<void> {
  try {
    const noticeRef = doc(db, "notices", noticeId);
    
    await runTransaction(db, async (transaction) => {
      const noticeSnap = await transaction.get(noticeRef);
      
      if (!noticeSnap.exists()) {
        throw new Error("공지를 찾을 수 없습니다.");
      }

      transaction.update(noticeRef, {
        clickCount: increment(1),
      });
    });
  } catch (error) {
    console.error("공지 클릭수 집계 오류:", error);
    // 에러 발생해도 사용자 경험에 영향 없도록 무시
  }
}

