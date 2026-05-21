/**
 * 🔥 Story Scheduler - 만료 스케줄러
 * 
 * 역할:
 * - 만료된 스토리 자동 처리
 * - 만료 임박 알림
 * - 상태 자동 전이
 */

import { collection, query, where, getDocs, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Story } from "./story.types";
import { isExpired, isExpiringSoon } from "./story.expiration.policy";

/**
 * 만료된 스토리 자동 처리
 * 
 * Cloud Functions에서 주기적으로 실행 (예: 매일 00:00)
 */
export async function processExpiredStories(): Promise<{
  expired: number;
  updated: string[];
}> {
  try {
    const now = Timestamp.now();
    const nowSeconds = now.seconds;

    // 만료된 스토리 조회 (PUBLISHED 상태만)
    const expiredQuery = query(
      collection(db, "stories"),
      where("status", "==", "published"),
      where("expiresAt", "<=", nowSeconds)
    );

    const snapshot = await getDocs(expiredQuery);
    const expiredIds: string[] = [];

    // 상태를 EXPIRED로 변경
    for (const doc of snapshot.docs) {
      await updateDoc(doc.ref, {
        status: "expired",
        updatedAt: nowSeconds,
      });
      expiredIds.push(doc.id);
    }

    return {
      expired: expiredIds.length,
      updated: expiredIds,
    };
  } catch (error) {
    console.error("[StoryScheduler] 만료 처리 실패:", error);
    throw error;
  }
}

/**
 * 만료 임박 스토리 조회 (알림용)
 */
export async function getExpiringSoonStories(
  days: number = 1
): Promise<Story[]> {
  try {
    const now = Timestamp.now().seconds;
    const threshold = now + (days * 24 * 60 * 60);

    const expiringQuery = query(
      collection(db, "stories"),
      where("status", "==", "published"),
      where("expiresAt", ">", now),
      where("expiresAt", "<=", threshold)
    );

    const snapshot = await getDocs(expiringQuery);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Story[];
  } catch (error) {
    console.error("[StoryScheduler] 만료 임박 조회 실패:", error);
    return [];
  }
}

/**
 * 스토리 수동 종료 (관리자)
 */
export async function manuallyExpireStory(
  storyId: string,
  updatedBy: string
): Promise<void> {
  try {
    const now = Timestamp.now().seconds;
    
    await updateDoc(
      { collection: collection(db, "stories"), id: storyId },
      {
        status: "expired",
        expiresAt: now, // 즉시 만료
        updatedAt: now,
        updatedBy,
      }
    );
  } catch (error) {
    console.error("[StoryScheduler] 수동 종료 실패:", error);
    throw error;
  }
}
