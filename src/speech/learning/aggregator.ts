// src/speech/learning/aggregator.ts
// 🔥 Phase 6-3: UNKNOWN 데이터 집계 (주 1회 Batch)
// ✅ hash별 빈도수 집계 → 패턴 클러스터링

import { db } from "@/lib/firebase";
import { collection, query, getDocs, where, Timestamp } from "firebase/firestore";

export interface UnknownPattern {
  hash: string;
  pathname: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  appVersion: string;
}

/**
 * UNKNOWN 패턴 집계 (주 1회 Batch)
 * 
 * 집계 기준:
 * - hash
 * - pathname
 * - count
 * - firstSeen / lastSeen
 * - appVersion
 */
export async function aggregateUnknownPatterns(
  limit = 50,
  minCount = 10
): Promise<UnknownPattern[]> {
  try {
    const snapshot = await getDocs(
      query(collection(db, "voice_telemetry"), where("type", "==", "UNKNOWN"))
    );

    const hashMap = new Map<string, {
      hash: string;
      pathname: string;
      count: number;
      firstSeen: Date;
      lastSeen: Date;
      appVersion: string;
    }>();

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const hash = data.hash;
      const pathname = data.pathname || "/";
      const appVersion = data.v || "unknown";
      const timestamp = data.ts?.toDate() || new Date();

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

    // 최소 count 이상만 필터링 및 정렬
    return Array.from(hashMap.values())
      .filter((p) => p.count >= minCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch (error) {
    console.error("[Aggregator] 집계 실패:", error);
    return [];
  }
}

