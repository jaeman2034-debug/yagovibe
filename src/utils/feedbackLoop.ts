/**
 * 🔥 대화 루프 (천재 모드 2.1)
 * 
 * 역할:
 * - 사용자 피드백 수집
 * - 피드백 기반 재조정
 * - 대화형 응답 문장
 */

import { doc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MapPlace } from "@/types/map";
import type { LongMemory } from "./longMemory";

export type FeedbackType = "like" | "meh" | "hate";

/**
 * 🔥 피드백 점수 가중치
 */
const FEEDBACK_WEIGHTS: Record<FeedbackType, number> = {
  like: 5,
  meh: -2,
  hate: -5,
};

/**
 * 🔥 피드백 저장
 */
export async function saveFeedback(
  uid: string,
  placeId: string,
  feedbackType: FeedbackType,
  placeName?: string
): Promise<void> {
  try {
    const userRef = doc(db, "users", uid);
    const weight = FEEDBACK_WEIGHTS[feedbackType];

    // 🔥 v2.1: 피드백 점수 저장
    await updateDoc(userRef, {
      [`courseScore.${placeId}`]: increment(weight),
      [`feedbackLog.${placeId}`]: {
        type: feedbackType,
        weight,
        placeName,
        timestamp: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    });

    console.log(`✅ [feedbackLoop] 피드백 저장 완료:`, {
      placeId,
      feedbackType,
      weight,
    });
  } catch (error) {
    console.warn("⚠️ [feedbackLoop] 피드백 저장 실패:", error);
  }
}

/**
 * 🔥 피드백 기반 재조정
 */
export function adjustByFeedback(
  baseScore: number,
  place: MapPlace,
  memory: LongMemory | null
): number {
  if (!memory) {
    return baseScore;
  }

  let score = baseScore;

  // 🔥 v2.1: 싫어요한 장소 페널티
  if (memory.hated && memory.hated.includes(place.id)) {
    score -= 1.0;
  }

  // 🔥 v2.1: 좋아요한 장소 보너스
  if (memory.liked && memory.liked.includes(place.id)) {
    score += 0.5;
  }

  return score;
}

/**
 * 🔥 피드백 응답 문장
 */
export function feedbackSentence(feedbackType: FeedbackType): string {
  const sentences: Record<FeedbackType, string> = {
    like: "좋아해 주셔서 반영할게요 👌",
    meh: "다음엔 더 잘 맞춰볼게요",
    hate: "이 스타일은 피할게요",
  };

  return sentences[feedbackType] || "피드백 감사해요";
}

/**
 * 🔥 피드백 기반 메모리 업데이트
 */
export function updateMemoryFromFeedback(
  memory: LongMemory,
  placeId: string,
  feedbackType: FeedbackType
): LongMemory {
  const updatedMemory = { ...memory };

  if (feedbackType === "hate") {
    // 🔥 싫어요 → hated 리스트에 추가
    if (!updatedMemory.hated) {
      updatedMemory.hated = [];
    }
    if (!updatedMemory.hated.includes(placeId)) {
      updatedMemory.hated = [...updatedMemory.hated, placeId];
    }
    // 🔥 liked에서 제거 (있는 경우)
    if (updatedMemory.liked) {
      updatedMemory.liked = updatedMemory.liked.filter(id => id !== placeId);
    }
  } else if (feedbackType === "like") {
    // 🔥 좋아요 → liked 리스트에 추가
    if (!updatedMemory.liked) {
      updatedMemory.liked = [];
    }
    if (!updatedMemory.liked.includes(placeId)) {
      updatedMemory.liked = [...updatedMemory.liked, placeId];
    }
    // 🔥 hated에서 제거 (있는 경우)
    if (updatedMemory.hated) {
      updatedMemory.hated = updatedMemory.hated.filter(id => id !== placeId);
    }
  }

  return updatedMemory;
}
