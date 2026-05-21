// src/speech/personalization/userProfile.ts
// 🔥 Phase 7: 사용자 음성 프로필 (개인화)
// ✅ alias 가중치, 최근 intent 히스토리, context 힌트

import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";

export interface UserVoiceProfile {
  topIntents: { [intentKey: string]: number }; // "NAVIGATE:/sports-hub?category=basketball": 12
  aliases: { [alias: string]: string }; // "농구보여": "농구"
  lastUsedAt: Timestamp;
}

/**
 * 사용자 음성 프로필 로드
 * 
 * ❗ 원문 transcript 저장 ❌
 * ❗ intent key + count만 저장
 */
export async function loadUserProfile(uid: string): Promise<UserVoiceProfile | null> {
  try {
    const docRef = doc(db, "user_voice_profile", uid);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const data = docSnap.data();
    return {
      topIntents: data.topIntents || {},
      aliases: data.aliases || {},
      lastUsedAt: data.lastUsedAt || serverTimestamp(),
    } as UserVoiceProfile;
  } catch (error) {
    console.warn("[UserProfile] 로드 실패:", error);
    return null;
  }
}

/**
 * 사용자 음성 프로필 저장
 */
export async function saveUserProfile(uid: string, profile: Partial<UserVoiceProfile>): Promise<void> {
  try {
    const docRef = doc(db, "user_voice_profile", uid);
    await setDoc(
      docRef,
      {
        ...profile,
        lastUsedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn("[UserProfile] 저장 실패:", error);
  }
}

/**
 * Intent 사용 기록 (topIntents 업데이트)
 */
export async function recordIntentUsage(
  uid: string,
  intentKey: string // "NAVIGATE:/sports-hub?category=basketball"
): Promise<void> {
  try {
    const profile = await loadUserProfile(uid);
    const topIntents = profile?.topIntents || {};
    
    topIntents[intentKey] = (topIntents[intentKey] || 0) + 1;
    
    // 상위 20개만 유지 (메모리 절약)
    const sorted = Object.entries(topIntents)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
    
    await saveUserProfile(uid, {
      topIntents: Object.fromEntries(sorted),
    });
  } catch (error) {
    console.warn("[UserProfile] Intent 사용 기록 실패:", error);
  }
}

/**
 * Alias 추가 (사용자별)
 */
export async function addUserAlias(
  uid: string,
  alias: string,
  targetKeyword: string
): Promise<void> {
  try {
    const profile = await loadUserProfile(uid);
    const aliases = profile?.aliases || {};
    
    aliases[alias] = targetKeyword;
    
    await saveUserProfile(uid, { aliases });
  } catch (error) {
    console.warn("[UserProfile] Alias 추가 실패:", error);
  }
}

