/**
 * 🔥 Region Router 유틸 (M-3 LOCK v1)
 * 
 * 글로벌 확장 핵심: 리전별 Firestore Database 선택
 * 
 * 초기 전략:
 * - 코드는 미리 나누고, 실제 DB는 나중에 분리
 * - 팀 단위 리전 분리
 * - Auth는 글로벌, 데이터는 로컬
 */

import { getFirestore, Firestore } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";

// 🔥 Firebase Admin 초기화 (안전하게)
if (getApps().length === 0) {
  initializeApp();
}

// 🔥 M-2: Firestore Database 다중 리전 (logical split)
// 초기엔 모두 default DB 사용, 나중에 분리
let coreDb: Firestore | null = null;
let usDb: Firestore | null = null;
let euDb: Firestore | null = null;
let krDb: Firestore | null = null;

/**
 * Core Database 초기화 (Auth, Billing, Metadata)
 */
export function getCoreDb(): Firestore {
  if (!coreDb) {
    coreDb = getFirestore();
  }
  return coreDb;
}

/**
 * M-3: Region별 Database 선택
 * 
 * 초기: 모든 region이 default DB 사용
 * 확장 시: 각 region별 별도 Firestore Database
 */
export function dbByRegion(region: string): Firestore {
  switch (region) {
    case "eu":
      if (!euDb) {
        // TODO: 나중에 EU Firestore Database 초기화
        // euDb = getFirestore(app, "eu-db");
        euDb = getFirestore(); // 초기엔 default 사용
      }
      return euDb;
    
    case "kr":
      if (!krDb) {
        // TODO: 나중에 KR Firestore Database 초기화
        // krDb = getFirestore(app, "kr-db");
        krDb = getFirestore(); // 초기엔 default 사용
      }
      return krDb;
    
    case "us":
    default:
      if (!usDb) {
        // TODO: 나중에 US Firestore Database 초기화
        // usDb = getFirestore(app, "us-db");
        usDb = getFirestore(); // 초기엔 default 사용
      }
      return usDb;
  }
}

/**
 * 팀의 리전 조회 (Core DB에서)
 */
export async function getTeamRegion(teamId: string): Promise<string> {
  const coreDb = getCoreDb();
  const teamSnap = await coreDb.collection("teams").doc(teamId).get();
  
  if (!teamSnap.exists) {
    throw new Error(`Team ${teamId} not found`);
  }
  
  const region = teamSnap.data()?.region || "us";
  return region;
}

/**
 * 리전별 Database 가져오기 (팀 ID로)
 */
export async function getDbForTeam(teamId: string): Promise<Firestore> {
  const region = await getTeamRegion(teamId);
  return dbByRegion(region);
}

