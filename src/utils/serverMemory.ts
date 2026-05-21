/**
 * 🔥 Server Memory - 서버 기억 저장/조회 (Phase 12)
 * 
 * 책임 범위:
 * ✅ Firestore 기반 기억 저장
 * ✅ 서버 기억 조회
 * ✅ 추천 점수 계산
 * 
 * ❌ 하지 않는 것:
 * - 로컬 저장 (memoryStorage.ts 책임)
 * - 자동 추론
 */

import { db } from "@/lib/firebase";
import { collection, doc, setDoc, getDocs, query, where, increment, serverTimestamp, updateDoc, arrayUnion, arrayRemove, deleteDoc, type Timestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export type MapPreference = {
  placeId: string;
  category: string;        // "축구장"
  preferred: boolean;      // true
  usedCount: number;       // 몇 번 갔는지
  lastUsedAt: Timestamp;
};

/**
 * 🔥 Phase 12: 서버에 기억 저장
 */
export async function savePreferenceToServer(place: { id: string; name?: string }, category: string): Promise<void> {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.warn('[ServerMemory] 로그인 사용자 없음, 서버 저장 건너뜀');
      return;
    }

    const ref = doc(db, `users/${user.uid}/mapPreferences/${place.id}`);

    await setDoc(ref, {
      placeId: place.id,
      category: category,
      preferred: true,
      usedCount: increment(1),
      lastUsedAt: serverTimestamp(),
    }, { merge: true });

    console.log('[ServerMemory] 서버 기억 저장 완료:', {
      placeId: place.id,
      category,
      uid: user.uid,
    });
  } catch (error) {
    console.warn('[ServerMemory] 서버 기억 저장 실패:', error);
    // 🔥 실패해도 앱은 계속 동작 (로컬 저장은 유지)
  }
}

/**
 * 🔥 Phase 12: 서버 기억 조회
 */
export async function loadPreferencesFromServer(): Promise<MapPreference[]> {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.log('[ServerMemory] 로그인 사용자 없음, 서버 조회 건너뜀');
      return [];
    }

    const q = query(collection(db, `users/${user.uid}/mapPreferences`));
    const snap = await getDocs(q);

    const preferences = snap.docs.map(d => ({
      ...d.data(),
      lastUsedAt: d.data().lastUsedAt,
    })) as MapPreference[];

    console.log('[ServerMemory] 서버 기억 조회 완료:', preferences.length, '개');
    return preferences;
  } catch (error) {
    console.warn('[ServerMemory] 서버 기억 조회 실패:', error);
    return [];
  }
}

/**
 * 🔥 Phase 12: 특정 장소의 서버 기억 조회
 */
export async function getPreferenceForPlace(placeId: string): Promise<MapPreference | null> {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      return null;
    }

    const preferences = await loadPreferencesFromServer();
    return preferences.find(p => p.placeId === placeId) || null;
  } catch (error) {
    console.warn('[ServerMemory] 장소별 기억 조회 실패:', error);
    return null;
  }
}

/**
 * 🔥 Phase 16: 추천 점수 계산 (실사용 튜닝 - 가중치 기반)
 * 
 * 가중치:
 * - 거리: 40%
 * - 과거 선택: 35%
 * - 최근성: 15%
 * - 평점: 10% (향후 확장)
 */
export function scorePlace(
  place: { id: string; lat: number; lng: number },
  memory: MapPreference | null,
  distance: number
): number {
  let score = 0;
  
  // 🔥 Phase 16: 거리 기반 점수 (40% 가중치)
  const distanceScore = (() => {
    if (distance < 0.5) return 40; // 500m 이내
    if (distance < 1) return 30; // 1km 이내
    if (distance < 2) return 20; // 2km 이내
    if (distance < 5) return 10; // 5km 이내
    return 0;
  })();
  score += distanceScore;
  
  // 🔥 Phase 16: 과거 선택 기반 점수 (35% 가중치)
  if (memory?.preferred) {
    score += 20; // 기본 선호도
    score += Math.min(memory.usedCount * 3, 15); // 사용 횟수 (최대 15점)
  }
  
  // 🔥 Phase 16: 최근성 기반 점수 (15% 가중치)
  if (memory?.lastUsedAt) {
    const daysSince = (Date.now() - (memory.lastUsedAt as any).toMillis?.() || memory.lastUsedAt) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) score += 15; // 7일 이내
    else if (daysSince < 30) score += 10; // 30일 이내
    else if (daysSince < 90) score += 5; // 90일 이내
  }
  
  // 🔥 Phase 16: 평점 기반 점수 (10% 가중치) - 향후 확장
  // if (place.rating && place.rating > 4.5) score += 10;
  // else if (place.rating && place.rating > 4.0) score += 5;
  
  return Math.round(score);
}

/**
 * 🔥 Phase 14: 카테고리 추천 끄기
 */
export async function disableCategoryRecommendation(category: string): Promise<void> {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.warn('[ServerMemory] 로그인 사용자 없음, 카테고리 비활성화 건너뜀');
      return;
    }

    const ref = doc(db, `users/${user.uid}/settings/map`);
    
    await setDoc(ref, {
      disabledCategories: arrayUnion(category),
    }, { merge: true });

    console.log('[ServerMemory] 카테고리 추천 비활성화:', category);
  } catch (error) {
    console.warn('[ServerMemory] 카테고리 비활성화 실패:', error);
  }
}

/**
 * 🔥 Phase 14: 특정 장소 기억 삭제
 */
export async function deletePlaceMemory(placeId: string): Promise<void> {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.warn('[ServerMemory] 로그인 사용자 없음, 기억 삭제 건너뜀');
      return;
    }

    const ref = doc(db, `users/${user.uid}/mapPreferences/${placeId}`);
    await deleteDoc(ref);

    console.log('[ServerMemory] 장소 기억 삭제 완료:', placeId);
  } catch (error) {
    console.warn('[ServerMemory] 장소 기억 삭제 실패:', error);
  }
}

/**
 * 🔥 Phase 14: 비활성화된 카테고리 목록 조회
 */
export async function getDisabledCategories(): Promise<string[]> {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      return [];
    }

    const { getDoc } = await import('firebase/firestore');
    const ref = doc(db, `users/${user.uid}/settings/map`);
    const snap = await getDoc(ref);
    
    if (snap.exists()) {
      const data = snap.data();
      return data.disabledCategories || [];
    }
    
    return [];
  } catch (error) {
    console.warn('[ServerMemory] 비활성화 카테고리 조회 실패:', error);
    return [];
  }
}

/**
 * 🔥 Phase 15: 모든 지도 기억 삭제
 */
export async function clearAllMapPreferences(): Promise<void> {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.warn('[ServerMemory] 로그인 사용자 없음, 기억 삭제 건너뜀');
      return;
    }

    const q = query(collection(db, `users/${user.uid}/mapPreferences`));
    const snap = await getDocs(q);
    
    const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);

    console.log('[ServerMemory] 모든 지도 기억 삭제 완료');
  } catch (error) {
    console.warn('[ServerMemory] 모든 지도 기억 삭제 실패:', error);
  }
}
