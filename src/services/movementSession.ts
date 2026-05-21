/**
 * 🌍 Movement Session 서비스
 * 
 * 이동 세션 저장/로드/분석
 */

import type { MovementSession, MovementIntent } from "@/types/movement";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, where, orderBy, limit, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";

const SESSIONS_COLLECTION = "movement_sessions";

/**
 * 세션 저장
 */
export async function saveMovementSession(
  userId: string,
  session: Omit<MovementSession, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<string> {
  const sessionData = {
    ...session,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, SESSIONS_COLLECTION), sessionData);
  return docRef.id;
}

/**
 * 세션 업데이트 (도착 시)
 */
export async function updateMovementSession(
  sessionId: string,
  updates: Partial<MovementSession>
): Promise<void> {
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
  await updateDoc(sessionRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * 사용자의 최근 세션 로드
 */
export async function getRecentSessions(
  userId: string,
  limitCount: number = 10
): Promise<MovementSession[]> {
  const q = query(
    collection(db, SESSIONS_COLLECTION),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as MovementSession[];
}

/**
 * 특정 의도로 이동한 세션 분석
 */
export async function analyzeSessionsByIntent(
  userId: string,
  intent: MovementIntent
): Promise<{
  count: number;
  averageDuration: number;
  preferredRoutes: Array<{ destination: string; count: number }>;
  routePreferences: {
    quiet: number;
    flat: number;
    crowded: number;
  };
}> {
  const sessions = await getRecentSessions(userId, 100);
  const filtered = sessions.filter((s) => s.intent === intent);

  if (filtered.length === 0) {
    return {
      count: 0,
      averageDuration: 0,
      preferredRoutes: [],
      routePreferences: { quiet: 0, flat: 0, crowded: 0 },
    };
  }

  // 평균 시간 계산 (간단한 파싱)
  const durations = filtered
    .map((s) => {
      const match = s.navigation.duration.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    })
    .filter((d) => d > 0);

  const averageDuration = durations.length > 0
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 0;

  // 선호 경로 분석
  const routeMap = new Map<string, number>();
  filtered.forEach((s) => {
    const dest = s.destination.name;
    routeMap.set(dest, (routeMap.get(dest) || 0) + 1);
  });

  const preferredRoutes = Array.from(routeMap.entries())
    .map(([destination, count]) => ({ destination, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 경로 선호도 분석
  const routePreferences = {
    quiet: filtered.filter((s) => s.routeCharacteristics.quiet).length,
    flat: filtered.filter((s) => s.routeCharacteristics.flat).length,
    crowded: filtered.filter((s) => s.routeCharacteristics.crowded).length,
  };

  return {
    count: filtered.length,
    averageDuration,
    preferredRoutes,
    routePreferences,
  };
}
