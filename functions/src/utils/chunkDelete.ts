/**
 * 🔥 대량 삭제 헬퍼 (500+ 안전 처리)
 * 
 * Firestore 배치 제한(500개)을 고려한 chunk 분할 삭제
 */

import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";

const db = admin.firestore();

const BATCH_SIZE = 450; // 안전 마진 (500 제한 대비)

/**
 * 문서 참조 배열을 chunk 단위로 나누어 삭제
 * 
 * @param refs - 삭제할 문서 참조 배열
 * @returns 삭제된 문서 수
 */
export async function chunkDelete(
  refs: admin.firestore.DocumentReference[]
): Promise<number> {
  if (refs.length === 0) {
    return 0;
  }

  let totalDeleted = 0;

  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const chunk = refs.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    chunk.forEach((ref) => {
      batch.delete(ref);
    });

    await batch.commit();
    totalDeleted += chunk.length;

    logger.info(`[chunkDelete] 배치 삭제 완료: ${totalDeleted}/${refs.length}`, {
      batchSize: chunk.length,
      totalDeleted,
      total: refs.length,
    });
  }

  logger.info("[chunkDelete] 전체 삭제 완료:", {
    totalDeleted,
    total: refs.length,
  });

  return totalDeleted;
}

/**
 * 쿼리 결과를 chunk 단위로 나누어 삭제
 * 
 * @param query - Firestore 쿼리
 * @returns 삭제된 문서 수
 */
export async function chunkDeleteByQuery(
  query: admin.firestore.Query
): Promise<number> {
  let totalDeleted = 0;
  let lastDoc: admin.firestore.QueryDocumentSnapshot | null = null;

  while (true) {
    // 🔥 배치 단위로 쿼리 (450개씩)
    let batchQuery = query.limit(BATCH_SIZE);

    if (lastDoc) {
      batchQuery = batchQuery.startAfter(lastDoc);
    }

    const snapshot = await batchQuery.get();

    if (snapshot.empty) {
      break; // 더 이상 삭제할 문서 없음
    }

    // 🔥 배치 삭제
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    totalDeleted += snapshot.size;

    logger.info(`[chunkDeleteByQuery] 배치 삭제 완료: ${totalDeleted}개`, {
      batchSize: snapshot.size,
      totalDeleted,
    });

    // 🔥 마지막 문서 저장 (다음 배치를 위해)
    lastDoc = snapshot.docs[snapshot.docs.length - 1];

    // 🔥 배치 크기가 BATCH_SIZE보다 작으면 마지막 배치
    if (snapshot.size < BATCH_SIZE) {
      break;
    }
  }

  logger.info("[chunkDeleteByQuery] 전체 삭제 완료:", {
    totalDeleted,
  });

  return totalDeleted;
}
