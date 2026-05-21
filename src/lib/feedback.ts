/**
 * 🔥 피드백 수집 시스템
 * 
 * 역할:
 * - 첫 100명 유저 피드백 수집
 * - Firestore에 저장
 * - 분석 및 개선에 활용
 */

import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "@/lib/firebase";

const auth = getAuth();

export interface Feedback {
  uid?: string; // 유저 UID (선택)
  type: "onboarding" | "feature" | "bug" | "suggestion" | "general";
  question: "why_use" | "where_stuck" | "who_recommend" | "other";
  content: string;
  rating?: number; // 1-5 (선택)
  metadata?: {
    step?: number; // 온보딩 단계
    variant?: "A" | "B"; // A/B 실험군
    [key: string]: any;
  };
  createdAt: any; // serverTimestamp
}

/**
 * 피드백 제출
 */
export async function submitFeedback(
  type: Feedback["type"],
  question: Feedback["question"],
  content: string,
  rating?: number,
  metadata?: Feedback["metadata"]
): Promise<string | null> {
  try {
    const user = auth.currentUser;
    
    const feedbackData: Omit<Feedback, "createdAt"> & { createdAt: any } = {
      uid: user?.uid,
      type,
      question,
      content: content.trim(),
      rating,
      metadata,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "feedback"), feedbackData);
    
    console.log("✅ [feedback] 피드백 제출 완료:", docRef.id);
    
    return docRef.id;
  } catch (error) {
    console.error("❌ [feedback] 피드백 제출 실패:", error);
    return null;
  }
}

/**
 * 첫 100명 핵심 질문 3개
 */
export const first100Questions = {
  // 1. "왜 써봤어요?"
  whyUse: async (content: string) => {
    return submitFeedback("general", "why_use", content);
  },

  // 2. "어디서 막혔어요?"
  whereStuck: async (content: string, metadata?: { step?: number; variant?: "A" | "B" }) => {
    return submitFeedback("bug", "where_stuck", content, undefined, metadata);
  },

  // 3. "이거 누구한테 추천할 것 같아요?"
  whoRecommend: async (content: string) => {
    return submitFeedback("suggestion", "who_recommend", content);
  },
};

/**
 * 피드백 조회 (Admin용)
 */
export async function getFeedbacks(limitCount: number = 100) {
  try {
    const q = query(
      collection(db, "feedback"),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );

    const snap = await getDocs(q);
    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("❌ [feedback] 피드백 조회 실패:", error);
    return [];
  }
}

/**
 * 특정 질문 유형 피드백 조회
 */
export async function getFeedbacksByQuestion(question: Feedback["question"]) {
  try {
    const q = query(
      collection(db, "feedback"),
      where("question", "==", question),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);
    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("❌ [feedback] 피드백 조회 실패:", error);
    return [];
  }
}
