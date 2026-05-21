/**
 * 🔥 ActivitySession 서비스
 * 
 * 역할:
 * - ActivitySession 생성/조회/업데이트
 * - Firestore 저장 (sessions, activityFeed, users)
 * - 주변 활동 조회
 * 
 * 핵심 함수:
 * - createActivitySession: 세션 생성 (버튼 클릭 시)
 * - endActivitySession: 세션 종료
 * - getCurrentSession: 현재 활성 세션 조회
 * - getNearbySessions: 주변 활동 조회
 */

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs,
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ActivitySession, ActivityFeedEntry, ActivitySessionStatus } from "@/types/activitySession";
import type { SportId } from "@/constants/sports";
import { getAddressFromLatLngDetailed, type AddressResult } from "@/utils/getAddressFromLatLng";
import { cleanFirestoreData, emptyStringToNull } from "@/utils/firestoreHelpers";

/**
 * 🔥 History 컬렉션 이름
 */
const HISTORY_COLLECTION = "activityHistory";

// 🔥 Firestore 컬렉션 이름
const SESSIONS_COLLECTION = "sessions";
const ACTIVITY_FEED_COLLECTION = "activityFeed";
const USERS_COLLECTION = "users";

/**
 * 🔥 ActivitySession 생성
 * 
 * 버튼 클릭 시 호출되는 핵심 함수
 * 
 * @param userId 사용자 ID
 * @param sport 스포츠 종목
 * @param location 위치 정보 (lat, lng)
 * @returns 생성된 세션 ID
 */
export async function createActivitySession(
  userId: string,
  sport: SportId,
  location: { lat: number; lng: number }
): Promise<string> {
  console.log("🔥 [ActivitySession] 세션 생성 시작:", { userId, sport, location });

  try {
    // 🔥 1. 위치 → 행정동 변환
    console.log("🔍 [ActivitySession] 행정동 변환 중...");
    const addressInfo = await getAddressFromLatLngDetailed(location.lat, location.lng);
    
    if (!addressInfo) {
      throw new Error("주소 변환에 실패했습니다.");
    }

    console.log("✅ [ActivitySession] 행정동 변환 성공:", addressInfo);

    // 🔥 2. 세션 데이터 생성
    const sessionData: Omit<ActivitySession, "id"> = {
      uid: userId, // 🔥 Firebase 표준: uid 필드 사용
      sport,
      location: {
        lat: location.lat,
        lng: location.lng,
        dong: addressInfo.dong || addressInfo.short || "알 수 없음",
        gu: emptyStringToNull(addressInfo.gu), // undefined/빈 문자열 → null
        si: emptyStringToNull(addressInfo.si), // undefined/빈 문자열 → null
      },
      status: "active",
      startedAt: serverTimestamp() as Timestamp,
      visibilityRadius: 1500, // 기본 1.5km
      participants: [userId], // 자기 자신 포함 (uid 배열)
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };

    // 🔥 3. Firestore에 세션 저장
    console.log("💾 [ActivitySession] Firestore 저장 중...");
    // 🔥 undefined 필드 제거 (Firestore는 undefined 허용 안 함)
    const cleanedSessionData = cleanFirestoreData(sessionData);
    const sessionRef = await addDoc(collection(db, SESSIONS_COLLECTION), cleanedSessionData);
    const sessionId = sessionRef.id;
    
    console.log("✅ [ActivitySession] 세션 저장 완료:", sessionId);

    // 🔥 4. ActivityFeed 엔트리 생성 (검색용 캐시)
    const feedEntry: Omit<ActivityFeedEntry, "id"> = {
      sessionId,
      uid: userId, // 🔥 Firebase 표준: uid 필드 사용
      type: "sport_start",
      sport,
      dong: cleanedSessionData.location.dong,
      gu: cleanedSessionData.location.gu ?? null, // null로 명시적 변환
      si: cleanedSessionData.location.si ?? null, // null로 명시적 변환
      location: {
        lat: location.lat,
        lng: location.lng,
      },
      createdAt: serverTimestamp() as Timestamp,
      status: "active",
    };

    // 🔥 undefined 필드 제거
    const cleanedFeedEntry = cleanFirestoreData({
      ...feedEntry,
      id: sessionId, // sessionId를 id로도 저장 (검색 최적화)
    });
    
    await addDoc(collection(db, ACTIVITY_FEED_COLLECTION), cleanedFeedEntry);

    console.log("✅ [ActivitySession] ActivityFeed 엔트리 생성 완료");

    // 🔥 5. users 컬렉션 업데이트 (currentSessionId)
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      currentSessionId: sessionId,
      lastDong: sessionData.location.dong,
      updatedAt: serverTimestamp(),
    });

    console.log("✅ [ActivitySession] 사용자 정보 업데이트 완료");

    return sessionId;
  } catch (error: any) {
    console.error("❌ [ActivitySession] 세션 생성 실패:", error);
    throw new Error(`세션 생성 실패: ${error.message}`);
  }
}

/**
 * 🔥 ActivitySession 종료 반환 타입
 */
export interface EndActivitySessionResult {
  id: string;
  sessionId: string;
  sport: string;
  durationMs: number;
  location: {
    lat: number;
    lng: number;
    dong: string;
    gu?: string | null;
    si?: string | null;
  };
}

/**
 * 🔥 ActivitySession 종료
 * 
 * 설계 원칙:
 * - 핵심 상태 변경은 반드시 실행 (sessions, users)
 * - 보조 작업은 실패해도 무시 (feed, history)
 * - 상태 엔진 > 로그 저장 (우선순위)
 * 
 * @param sessionId 세션 ID
 * @returns 종료된 세션 정보 (Toast 표시용) 또는 null
 */
export async function endActivitySession(sessionId: string): Promise<EndActivitySessionResult | null> {
  console.log("🛑 [ActivitySession] 세션 종료 시작:", sessionId);

  // 🔥 세션 데이터 조회
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
  const sessionSnap = await getDoc(sessionRef);

  if (!sessionSnap.exists()) {
    throw new Error("세션을 찾을 수 없습니다.");
  }

  const sessionData = sessionSnap.data() as ActivitySession;

  // ============================================
  // 🔥 핵심 상태 변경 (반드시 실행, 실패 시 throw)
  // ============================================
  
  try {
    // 🔥 1. 세션 상태 업데이트 (핵심)
    console.log("✅ [ActivitySession] 세션 상태 업데이트 중...");
    await updateDoc(sessionRef, {
      status: "ended",
      endedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log("✅ [ActivitySession] 세션 상태 업데이트 완료");

    // 🔥 2. users 컬렉션 업데이트 (핵심)
    console.log("✅ [ActivitySession] 사용자 상태 업데이트 중...");
    const userRef = doc(db, USERS_COLLECTION, sessionData.uid);
    await updateDoc(userRef, {
      currentSessionId: null,
      status: "idle", // 사용자 상태도 idle로 변경
      updatedAt: serverTimestamp(),
    });
    console.log("✅ [ActivitySession] 사용자 상태 업데이트 완료");
  } catch (coreError: any) {
    // 🔥 핵심 작업 실패는 치명적이므로 에러 throw
    console.error("❌ [ActivitySession] 핵심 상태 변경 실패:", {
      code: coreError.code,
      message: coreError.message,
    });
    throw new Error(`세션 종료 실패: ${coreError.message || "알 수 없는 오류"}`);
  }

  // ============================================
  // 🔥 보조 작업 (실패해도 무시)
  // ============================================

  // 🔥 3. ActivityFeed 엔트리 업데이트 (보조)
  try {
    console.log("📝 [ActivitySession] ActivityFeed 업데이트 시도...");
    const feedQuery = query(
      collection(db, ACTIVITY_FEED_COLLECTION),
      where("sessionId", "==", sessionId),
      limit(1)
    );
    const feedSnap = await getDocs(feedQuery);
    
    if (!feedSnap.empty) {
      const feedDoc = feedSnap.docs[0];
      await updateDoc(feedDoc.ref, {
        status: "ended",
        updatedAt: serverTimestamp(),
      });
      console.log("✅ [ActivitySession] ActivityFeed 업데이트 완료");
    } else {
      console.log("ℹ️ [ActivitySession] ActivityFeed 엔트리 없음 (건너뜀)");
    }
  } catch (feedError: any) {
    // ActivityFeed 실패는 치명적이지 않으므로 경고만
    console.warn("⚠️ [ActivitySession] ActivityFeed 업데이트 실패 (무시):", {
      code: feedError.code,
      message: feedError.message,
    });
  }

  // 🔥 4. History 저장 (보조)
  let completedResult: EndActivitySessionResult | null = null;
  
  try {
    console.log("💾 [ActivitySession] History 저장 시도...");
    
    // 참고: duration 계산을 위해 클라이언트 시간 사용
    const now = new Date();
    const endedAt = serverTimestamp() as Timestamp;
    const startedAt = sessionData.startedAt as Timestamp;
    
    // 🔥 duration 계산 (밀리초 단위)
    let durationMs: number | null = null;
    
    if (startedAt) {
      let startDate: Date;
      
      // startedAt을 Date로 변환
      if (startedAt instanceof Date) {
        startDate = startedAt;
      } else if ((startedAt as any).toDate && typeof (startedAt as any).toDate === "function") {
        // Firestore Timestamp
        startDate = (startedAt as any).toDate();
      } else if ((startedAt as any).toMillis && typeof (startedAt as any).toMillis === "function") {
        // Firestore Timestamp (toMillis 사용)
        startDate = new Date((startedAt as any).toMillis());
      } else if ((startedAt as any).seconds) {
        // Firestore Timestamp (seconds 사용)
        startDate = new Date((startedAt as any).seconds * 1000);
      } else {
        // fallback: 현재 시간 사용
        console.warn("⚠️ [ActivitySession] startedAt 변환 실패, 현재 시간 사용");
        startDate = now;
      }
      
      durationMs = Math.max(0, now.getTime() - startDate.getTime());
      console.log("⏱️ [ActivitySession] 운동 시간 계산:", {
        durationMs,
        durationMin: Math.floor(durationMs / 60000),
        durationSec: Math.floor((durationMs % 60000) / 1000),
      });
    }

    // 🔥 History 데이터 구성
    const historyData = {
      sessionId: sessionId,
      uid: sessionData.uid,
      sport: sessionData.sport,
      location: sessionData.location,
      startedAt: sessionData.startedAt, // 원본 Timestamp 유지
      endedAt: endedAt, // serverTimestamp() 사용
      durationMs: durationMs, // 밀리초 단위 운동 시간
      participants: sessionData.participants || [],
      visibilityRadius: sessionData.visibilityRadius || 1500,
      createdAt: serverTimestamp(),
    };

    // 🔥 undefined 필드 제거
    const cleanedHistoryData = cleanFirestoreData(historyData);
    
    const historyRef = await addDoc(collection(db, HISTORY_COLLECTION), cleanedHistoryData);
    console.log("✅ [ActivitySession] History 저장 완료:", historyRef.id);
    
    // 🔥 저장된 history 데이터 저장 (Toast 표시용)
    completedResult = {
      id: historyRef.id,
      sessionId: sessionId,
      sport: sessionData.sport,
      durationMs: durationMs || 0,
      location: sessionData.location,
    };
  } catch (historyError: any) {
    // History 저장 실패는 치명적이지 않으므로 경고만
    console.warn("⚠️ [ActivitySession] History 저장 실패 (무시):", {
      code: historyError.code,
      message: historyError.message,
    });
  }

  // 🔥 세션 종료 완료 (핵심 작업은 모두 성공)
  console.log("🎉 [ActivitySession] 세션 종료 완료 (핵심 작업 성공)");
  
  // 🔥 History 저장 성공 시 결과 반환, 실패 시 null
  return completedResult;
}

/**
 * 🔥 현재 활성 세션 조회
 * 
 * @param userId 사용자 ID
 * @returns 활성 세션 또는 null
 */
export async function getCurrentSession(userId: string): Promise<ActivitySession | null> {
  try {
    // 🔥 users 컬렉션에서 currentSessionId 확인
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return null;
    }

    const userData = userSnap.data();
    const currentSessionId = userData.currentSessionId;

    if (!currentSessionId) {
      return null;
    }

    // 🔥 세션 조회
    const sessionRef = doc(db, SESSIONS_COLLECTION, currentSessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
      return null;
    }

    const sessionData = sessionSnap.data() as ActivitySession;
    
    // 🔥 종료된 세션이면 null 반환
    if (sessionData.status === "ended") {
      return null;
    }

    return {
      id: sessionSnap.id,
      ...sessionData,
    } as ActivitySession;
  } catch (error: any) {
    console.error("❌ [ActivitySession] 현재 세션 조회 실패:", error);
    return null;
  }
}

/**
 * 🔥 주변 활동 조회
 * 
 * @param location 사용자 위치
 * @param radiusKm 반경 (km 단위, 기본: 1.5km)
 * @param sport 필터링할 스포츠 (선택)
 * @returns 주변 활성 세션 목록
 */
export async function getNearbySessions(
  location: { lat: number; lng: number },
  radiusKm: number = 1.5,
  sport?: SportId
): Promise<ActivityFeedEntry[]> {
  try {
    // 🔥 ActivityFeed에서 활성 세션만 조회
    let feedQuery = query(
      collection(db, ACTIVITY_FEED_COLLECTION),
      where("status", "==", "active"),
      orderBy("createdAt", "desc"),
      limit(50) // 최대 50개
    );

    // 🔥 스포츠 필터 적용
    if (sport) {
      feedQuery = query(
        collection(db, ACTIVITY_FEED_COLLECTION),
        where("status", "==", "active"),
        where("sport", "==", sport),
        orderBy("createdAt", "desc"),
        limit(50)
      );
    }

    const feedSnap = await getDocs(feedQuery);
    const nearbySessions: ActivityFeedEntry[] = [];

    // 🔥 거리 계산 및 필터링
    feedSnap.docs.forEach((doc) => {
      const data = doc.data() as ActivityFeedEntry;
      
      // 🔥 거리 계산 (간단한 하버사인 공식)
      const distance = calculateDistance(
        location.lat,
        location.lng,
        data.location.lat,
        data.location.lng
      );

      // 🔥 반경 내 세션만 추가
      if (distance <= radiusKm) {
        nearbySessions.push({
          id: doc.id,
          ...data,
        });
      }
    });

    // 🔥 거리순 정렬
    nearbySessions.sort((a, b) => {
      const distA = calculateDistance(
        location.lat,
        location.lng,
        a.location.lat,
        a.location.lng
      );
      const distB = calculateDistance(
        location.lat,
        location.lng,
        b.location.lat,
        b.location.lng
      );
      return distA - distB;
    });

    return nearbySessions;
  } catch (error: any) {
    console.error("❌ [ActivitySession] 주변 활동 조회 실패:", error);
    return [];
  }
}

/**
 * 🔥 거리 계산 (하버사인 공식)
 * 
 * @param lat1 위도 1
 * @param lng1 경도 1
 * @param lat2 위도 2
 * @param lng2 경도 2
 * @returns 거리 (km)
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // 지구 반지름 (km)
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
