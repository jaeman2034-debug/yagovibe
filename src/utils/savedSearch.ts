/**
 * 저장된 검색 조건 관리 (알림용)
 */

import { collection, addDoc, query, where, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { SavedSearch } from "@/types/savedSearch";
import { getDistanceKm } from "./geo";
import type { LatLng } from "./geo";
import type { MarketProduct } from "@/types/market";

/**
 * 💰 프리미엄 플랜 제한
 */
const PREMIUM_LIMITS = {
  free: {
    maxSavedSearches: 2,
    maxRadiusKm: 5,
    maxKeywords: 5,
  },
  premium: {
    maxSavedSearches: 10,
    maxRadiusKm: Infinity,
    maxKeywords: 10,
  },
};

/**
 * 사용자 프리미엄 여부 확인 (users 컬렉션에서)
 */
async function isUserPremium(userId: string): Promise<boolean> {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) return false;
    const userData = userDoc.data();
    return userData.isPremium === true;
  } catch {
    return false;
  }
}

/**
 * 현재 검색 조건을 저장된 검색으로 저장
 * 💰 프리미엄 플랜 제한 적용
 */
export async function saveSearchCondition(
  userId: string,
  parsed: {
    category: string | null;
    keywordTokens: string[];
    radiusKm: number;
  },
  intent: {
    goodCondition: boolean;
    directDeal: boolean;
    cheap: boolean;
  },
  userLocation: LatLng | null
): Promise<{ id: string } | { error: "LIMIT_EXCEEDED"; limit: number }> {
  // 💰 프리미엄 여부 확인
  const isPremium = await isUserPremium(userId);
  const limits = isPremium ? PREMIUM_LIMITS.premium : PREMIUM_LIMITS.free;
  
  // 💰 저장된 검색 개수 확인
  const existingSearches = await getSavedSearches(userId);
  if (existingSearches.length >= limits.maxSavedSearches) {
    return {
      error: "LIMIT_EXCEEDED",
      limit: limits.maxSavedSearches,
    };
  }
  
  // 💰 반경 제한 확인
  if (parsed.radiusKm > limits.maxRadiusKm) {
    parsed.radiusKm = limits.maxRadiusKm;
  }
  
  // 💰 키워드 개수 제한
  const limitedKeywords = parsed.keywordTokens.slice(0, limits.maxKeywords);
  
  const savedSearch: Omit<SavedSearch, "id"> = {
    userId,
    category: parsed.category,
    keywordTokens: limitedKeywords,
    location: userLocation,
    radiusKm: parsed.radiusKm,
    intent,
    enabled: true,
    createdAt: serverTimestamp(),
    notificationCount: 0,
  };

  const docRef = await addDoc(collection(db, "savedSearches"), savedSearch);
  return { id: docRef.id };
}

/**
 * 저장된 검색 조건 목록 가져오기
 */
export async function getSavedSearches(userId: string): Promise<SavedSearch[]> {
  const q = query(
    collection(db, "savedSearches"),
    where("userId", "==", userId),
    where("enabled", "==", true)
  );

  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as SavedSearch[];
}

/**
 * 저장된 검색 조건 삭제
 */
export async function deleteSavedSearch(searchId: string): Promise<void> {
  await deleteDoc(doc(db, "savedSearches", searchId));
}

/**
 * 저장된 검색 조건 비활성화
 */
export async function disableSavedSearch(searchId: string): Promise<void> {
  await updateDoc(doc(db, "savedSearches", searchId), {
    enabled: false,
  });
}

/**
 * 조건 매칭 로직 (A+B+C 재사용)
 * 
 * @param search - 저장된 검색 조건
 * @param product - 새로 등록된 상품
 * @returns 매칭 여부
 */
export function matchSearchCondition(
  search: SavedSearch,
  product: MarketProduct
): boolean {
  // 1. 카테고리 매칭
  if (search.category && product.category !== search.category) {
    return false;
  }

  // 2. 키워드 토큰 매칭
  if (search.keywordTokens.length > 0) {
    const productTokens = (product as any).keywordTokens || [];
    const hasMatch = search.keywordTokens.some((token) =>
      productTokens.includes(token)
    );
    if (!hasMatch) {
      return false;
    }
  }

  // 3. 거리 매칭
  if (search.location && product.latitude && product.longitude) {
    const distance = getDistanceKm(
      search.location,
      { lat: product.latitude, lng: product.longitude }
    );
    if (distance > search.radiusKm) {
      return false;
    }
  }

  return true;
}

/**
 * 스팸 방지 체크 (최근 6시간 내 알림 발송 여부)
 */
export function shouldSendNotification(search: SavedSearch): boolean {
  if (!search.lastNotifiedAt) {
    return true; // 알림 발송 이력 없음
  }

  const lastNotified = search.lastNotifiedAt.toDate
    ? search.lastNotifiedAt.toDate()
    : new Date(search.lastNotifiedAt);
  
  const hoursSinceLastNotification =
    (Date.now() - lastNotified.getTime()) / (1000 * 60 * 60);

  // 최근 6시간 내 알림 발송했으면 스킵
  return hoursSinceLastNotification >= 6;
}

