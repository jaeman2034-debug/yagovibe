// functions/src/voiceLearning.ts
// 🔥 Phase 6-3: Intent 학습 데이터 루프 (배치 집계/제안 생성)
// ✅ 주 1회 실행, UNKNOWN 패턴 집계 → 자동 제안 생성

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { getFirestore } from "firebase-admin/firestore";

/**
 * 주 1회 실행: UNKNOWN 패턴 집계 및 제안 생성
 * 
 * Schedule: 매주 월요일 00:00 UTC
 */
export const aggregateUnknownPatterns = onSchedule(
  {
    schedule: "0 0 * * 1", // 매주 월요일 00:00 UTC
    timeZone: "UTC",
  },
  async (event) => {
    try {
      const db = getFirestore();
      
      // 🔥 Step 1: UNKNOWN 패턴 집계
      const snapshot = await db
        .collection("voice_telemetry")
        .where("type", "==", "UNKNOWN")
        .get();

      const hashMap = new Map<string, {
        hash: string;
        pathname: string;
        count: number;
        firstSeen: FirebaseFirestore.Timestamp;
        lastSeen: FirebaseFirestore.Timestamp;
        appVersion: string;
      }>();

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const hash = data.hash;
        const pathname = data.pathname || "/";
        const appVersion = data.v || "unknown";
        const timestamp = data.ts || doc.createTime;

        const key = `${hash}-${pathname}`;
        const existing = hashMap.get(key);

        if (existing) {
          existing.count++;
          if (timestamp < existing.firstSeen) {
            existing.firstSeen = timestamp;
          }
          if (timestamp > existing.lastSeen) {
            existing.lastSeen = timestamp;
          }
        } else {
          hashMap.set(key, {
            hash,
            pathname,
            count: 1,
            firstSeen: timestamp,
            lastSeen: timestamp,
            appVersion,
          });
        }
      });

      // 🔥 Step 2: 최소 count 이상만 필터링 (10회 이상)
      const patterns = Array.from(hashMap.values())
        .filter((p) => p.count >= 10)
        .sort((a, b) => b.count - a.count)
        .slice(0, 50); // 상위 50개만

      // 🔥 Step 3: 자동 제안 생성 (간단한 휴리스틱)
      const suggestions = patterns.map((pattern) => {
        // 실제로는 더 정교한 제안 로직 필요
        // 여기서는 간단히 ALIAS 제안만 생성
        return {
          hash: pattern.hash,
          pathname: pattern.pathname,
          count: pattern.count,
          suggestedIntent: "ALIAS",
          suggestedPayload: {
            keywords: [], // 실제로는 hash → 원문 매핑 필요
          },
          confidence: 0.7,
          createdAt: new Date(),
        };
      });

      // 🔥 Step 4: 제안 저장 (관리자 승인 대기)
      const batch = db.batch();
      for (const suggestion of suggestions) {
        const ref = db.collection("voice_suggestions").doc();
        batch.set(ref, suggestion);
      }
      await batch.commit();

      logger.info(`[voiceLearning] ${suggestions.length}개 제안 생성 완료`);
      
      // onSchedule은 void를 반환해야 함
    } catch (error: any) {
      logger.error("[voiceLearning] 집계 실패:", error);
      throw error;
    }
  }
);

