/**
 * 🔥 스포츠 감각 프로필 Hook
 * 
 * 역할:
 * - 스포츠 감각 프로필 로드
 * - 행동 점수 업데이트
 * - 추천 재계산 트리거
 */

import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, serverTimestamp, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import type { SportsSenseProfile } from "@/utils/sportsSenseRecommendation";

export interface SportsSenseData {
  todayIntent: "watch" | "exercise" | "play" | "alone";
  context: "alone" | "friends" | "partner" | "family";
  mood: "quiet" | "excited" | "focused" | "light";
  activatedAt: any; // Timestamp
  behaviorScore: number;
}

export function useSportsSense() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<SportsSenseProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SportsSenseData | null>(null);

  // 🔥 스포츠 감각 프로필 로드
  useEffect(() => {
    if (!user || user.isAnonymous) {
      setProfile(null);
      setData(null);
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          setProfile(null);
          setData(null);
          setLoading(false);
          return;
        }

        const userData = userSnap.data();
        const sportsSense = userData.sportsSense;

        if (sportsSense && sportsSense.activatedAt) {
          const profileData: SportsSenseProfile = {
            todayIntent: sportsSense.todayIntent,
            context: sportsSense.context,
            mood: sportsSense.mood,
            behaviorScore: sportsSense.behaviorScore || 0,
          };

          setProfile(profileData);
          setData(sportsSense as SportsSenseData);
        } else {
          setProfile(null);
          setData(null);
        }
      } catch (error) {
        console.error("❌ [useSportsSense] 프로필 로드 실패:", error);
        setProfile(null);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  /**
   * 🔥 행동 점수 업데이트 (자동 학습)
   * 
   * @param category - 장소 카테고리 (cafe, pub, stadium 등)
   * @param score - 증가할 점수 (기본값: 0.1)
   */
  const updateBehaviorScore = async (category: string, score: number = 0.1) => {
    if (!user || !data) return;

    try {
      const userRef = doc(db, "users", user.uid);
      const behaviorScore = data.behaviorScore || {};
      
      await updateDoc(userRef, {
        [`behaviorScore.${category}`]: (behaviorScore[category] || 0) + score,
        "lastContext.time": serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log(`✅ [useSportsSense] 행동 점수 업데이트: ${category} +${score}`);
    } catch (error) {
      console.warn("⚠️ [useSportsSense] 행동 점수 업데이트 실패:", error);
    }
  };

  /**
   * 🔥 마지막 컨텍스트 업데이트
   * 
   * @param location - 현재 위치
   */
  const updateLastContext = async (location: { lat: number; lng: number } | null) => {
    if (!user || !data) return;

    try {
      const userRef = doc(db, "users", user.uid);
      
      await updateDoc(userRef, {
        "lastContext.time": serverTimestamp(),
        "lastContext.location": location,
        "lastContext.intent": data.todayIntent,
        "lastContext.company": data.context,
        "lastContext.mood": data.mood,
        updatedAt: serverTimestamp(),
      });

      console.log("✅ [useSportsSense] 마지막 컨텍스트 업데이트");
    } catch (error) {
      console.warn("⚠️ [useSportsSense] 마지막 컨텍스트 업데이트 실패:", error);
    }
  };

  return {
    profile,
    data,
    loading,
    isActive: !!profile,
    updateBehaviorScore,
    updateLastContext,
  };
}
