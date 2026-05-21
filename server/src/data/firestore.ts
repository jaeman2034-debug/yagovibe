/**
 * 🔥 Firestore Admin SDK 초기화
 * 
 * 백엔드에서 Firestore에 접근하기 위한 Admin SDK 설정
 * 실시간 구독을 위한 dual write 구현
 */

import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, Timestamp, type Firestore } from "firebase-admin/firestore";

let firestore: Firestore | null = null;

/**
 * Firestore Admin 인스턴스 초기화
 */
export function getFirestoreAdmin(): Firestore {
  if (firestore) {
    return firestore;
  }

  try {
    // 이미 초기화된 앱이 있으면 재사용
    let app: App;
    const apps = getApps();
    
    if (apps.length > 0) {
      app = apps[0];
    } else {
      // 환경 변수에서 Firebase Admin SDK 인증 정보 읽기
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
      
      if (serviceAccount) {
        // JSON 문자열로 제공된 경우
        try {
          const serviceAccountJson = JSON.parse(serviceAccount);
          app = initializeApp({
            credential: cert(serviceAccountJson),
          });
        } catch {
          // 이미 객체인 경우
          app = initializeApp({
            credential: cert(serviceAccount as any),
          });
        }
      } else if (serviceAccountPath) {
        // 파일 경로로 제공된 경우
        const fs = require("fs");
        const path = require("path");
        const serviceAccountFile = fs.readFileSync(
          path.resolve(process.cwd(), serviceAccountPath),
          "utf8"
        );
        const serviceAccountJson = JSON.parse(serviceAccountFile);
        app = initializeApp({
          credential: cert(serviceAccountJson),
        });
      } else {
        // 기본 인증 (환경 변수 또는 기본 인증 사용)
        // 로컬 개발 환경에서는 GOOGLE_APPLICATION_CREDENTIALS 환경 변수 사용
        // 또는 gcloud auth application-default login으로 설정된 인증 사용
        app = initializeApp({
          projectId: "yago-vibe-spt", // 프로젝트 ID 명시
          // 기본 인증 사용 (gcloud auth application-default login)
        });
      }
    }

    firestore = getFirestore(app);
    console.log("✅ [Firestore Admin] 초기화 완료");
    return firestore;
  } catch (error) {
    console.error("❌ [Firestore Admin] 초기화 실패:", error);
    // Firestore 초기화 실패해도 Prisma는 계속 작동하도록
    throw error;
  }
}

/**
 * ActivityLog를 Firestore에 저장
 */
export async function saveActivityLogToFirestore(data: {
  event: string;
  path?: string | null;
  userId?: string | null;
  sessionId?: string | null;
  meta?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}): Promise<void> {
  try {
    const db = getFirestoreAdmin();
    // 🔥 createdAt를 Firestore Timestamp로 변환
    const createdAtTimestamp = Timestamp.fromDate(data.createdAt);
    await db.collection("activityLogs").add({
      event: data.event,
      path: data.path || null,
      userId: data.userId || null,
      sessionId: data.sessionId || null,
      meta: data.meta || null,
      userAgent: data.userAgent || null,
      createdAt: createdAtTimestamp,
    });
  } catch (error) {
    // Firestore 저장 실패는 로그만 남기고 계속 진행 (Prisma는 성공했으므로)
    console.warn(`⚠️ [Firestore] ActivityLog 저장 실패 (Prisma는 성공):`, error);
  }
}

/**
 * EventLog를 Firestore에 저장
 */
export async function saveEventLogToFirestore(data: {
  eventName: string;
  payload: string;
  sessionId?: string | null;
  userId?: string | null;
  region?: string | null;
  createdAt: Date;
}): Promise<void> {
  try {
    const db = getFirestoreAdmin();
    // 🔥 createdAt를 Firestore Timestamp로 변환
    const createdAtTimestamp = Timestamp.fromDate(data.createdAt);
    await db.collection("eventLogs").add({
      eventName: data.eventName,
      payload: data.payload,
      sessionId: data.sessionId || null,
      userId: data.userId || null,
      region: data.region || null,
      createdAt: createdAtTimestamp,
    });
  } catch (error) {
    // Firestore 저장 실패는 로그만 남기고 계속 진행 (Prisma는 성공했으므로)
    console.warn(`⚠️ [Firestore] EventLog 저장 실패 (Prisma는 성공):`, error);
  }
}
