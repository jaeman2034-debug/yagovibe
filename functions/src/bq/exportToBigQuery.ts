/**
 * ✅ COMMIT 22: BigQuery Export
 * Firestore → BigQuery 배치 Export
 */

import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

const db = admin.firestore();

// BigQuery 클라이언트 (동적 import)
let bqClient: any = null;

async function getBigQueryClient() {
  if (!bqClient) {
    try {
      const { BigQuery } = await import("@google-cloud/bigquery");
      bqClient = new BigQuery();
    } catch (error: any) {
      logger.warn("[exportToBigQuery] BigQuery 클라이언트 초기화 실패 (패키지 미설치 가능):", error?.message);
      return null;
    }
  }
  return bqClient;
}

/**
 * ✅ COMMIT 22: 컬렉션 → BigQuery 테이블 Export
 */
export async function exportCollection(
  collection: string,
  table: string,
  since: Date
): Promise<{ exported: number; skipped: boolean }> {
  const bq = await getBigQueryClient();
  if (!bq) {
    return { exported: 0, skipped: true };
  }

  try {
    const sinceTs = admin.firestore.Timestamp.fromDate(since);

    const snap = await db
      .collection(collection)
      .where("createdAt", ">=", sinceTs)
      .limit(1000)
      .get();

    if (snap.empty) {
      logger.info(`[exportToBigQuery] ${collection} → ${table}: 데이터 없음`);
      return { exported: 0, skipped: false };
    }

    // Firestore Timestamp를 ISO 문자열로 변환
    const rows = snap.docs.map((d) => {
      const data = d.data();
      const converted: any = { id: d.id };

      for (const [key, value] of Object.entries(data)) {
        if (value && typeof value === "object" && "toDate" in value) {
          // Firestore Timestamp
          converted[key] = (value as any).toDate().toISOString();
        } else {
          converted[key] = value;
        }
      }

      return converted;
    });

    await bq.dataset("ops_analytics").table(table).insert(rows);

    logger.info(`[exportToBigQuery] ${collection} → ${table}: ${rows.length}개 행 export 완료`);

    return { exported: rows.length, skipped: false };
  } catch (error: any) {
    logger.error(`[exportToBigQuery] ${collection} → ${table} 실패:`, error);
    throw error;
  }
}

