/**
 * 🔥 테스트 모드 유틸리티
 * 
 * 운영 데이터와 완전히 분리된 테스트 루트 제공
 */

import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * 테스트 모드 감지 (URL 파라미터)
 */
export function isTestModeFromURL(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("mode") === "test";
}

/**
 * 테스트 모드 컬렉션 경로 가져오기
 */
export function getTestCollectionPath(
  basePath: string,
  testMode: boolean
): string {
  if (!testMode) return basePath;
  
  // basePath에서 컬렉션 이름을 추출하여 test_ 접두사 추가
  // 예: ".../groups" → ".../test_groups"
  return basePath.replace(/\/(groups|matches|drawLogs|opsLogs)(\/|$)/g, "/test_$1$2");
}

/**
 * 테스트 모드 그룹 조회
 */
export async function getTestGroups(
  associationId: string,
  tournamentId: string
): Promise<any | null> {
  const testGroupsRef = collection(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/test_groups`
  );
  const testGroupsSnap = await getDocs(testGroupsRef);
  
  if (testGroupsSnap.empty) return null;
  
  // 최신 항목 반환
  const latest = testGroupsSnap.docs.sort((a, b) => {
    const aTime = a.data().createdAt?.toMillis() || 0;
    const bTime = b.data().createdAt?.toMillis() || 0;
    return bTime - aTime;
  })[0];
  
  return {
    id: latest.id,
    ...latest.data(),
  };
}

/**
 * 테스트 모드 경기 조회
 */
export async function getTestMatches(
  associationId: string,
  tournamentId: string
): Promise<any[]> {
  const testMatchesRef = collection(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/test_matches`
  );
  const testMatchesSnap = await getDocs(testMatchesRef);
  
  return testMatchesSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

