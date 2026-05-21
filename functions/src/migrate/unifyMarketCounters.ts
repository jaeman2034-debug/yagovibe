/**
 * 🔧 market / marketPosts 카운터 필드 통일 마이그레이션
 *
 * 목표:
 * - views ← viewCount(존재 시)로 합치고 기본값 0
 * - likesCount ← likeCount(존재 시)로 합치고 기본값 0
 * - 레거시 필드(viewCount/likeCount)는 삭제
 *
 * 실행:
 * - index.ts에서 onCall로 래핑하여 호출
 */
import { getFirestore, FieldValue } from "firebase-admin/firestore";

type MigrateRequest = {
  collection?: "market" | "marketPosts";
  batchSize?: number;
  dryRun?: boolean;
  startAfterId?: string;
};

export async function handleMigrateMarketCounters(request: { data?: MigrateRequest; auth?: { uid: string } }) {
  if (!request.auth) {
    return { ok: false, error: "UNAUTHENTICATED" as const };
  }

  const db = getFirestore();
  const {
    collection = "marketPosts",
    batchSize = 200,
    dryRun = true,
    startAfterId,
  } = (request.data as MigrateRequest) || {};

  const colRef = db.collection(collection);
  // FieldPath는 동적 import 없이 사용
  const { FieldPath } = await import("firebase-admin/firestore");
  let q = colRef.orderBy(FieldPath.documentId()).limit(batchSize);
  if (startAfterId) {
    const startDoc = await colRef.doc(startAfterId).get();
    if (startDoc.exists) {
      q = colRef.orderBy(FieldPath.documentId()).startAfter(startDoc.id).limit(batchSize);
    }
  }

  const snap = await q.get();
  if (snap.empty) {
    return { ok: true, migrated: 0, skipped: 0, dryRun, message: "No documents to migrate" };
  }

  let migrated = 0;
  let skipped = 0;
  const batch = db.batch();

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    const hasLegacy = "viewCount" in data || "likeCount" in data;
    const views = (data.views as number | undefined) ?? (data.viewCount as number | undefined) ?? 0;
    const likesCount =
      (data.likesCount as number | undefined) ?? (data.likeCount as number | undefined) ?? 0;

    if (!hasLegacy && (data.views != null && data.likesCount != null)) {
      skipped++;
      continue;
    }

    const update: Record<string, unknown> = {
      views,
      likesCount,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if ("viewCount" in data) update.viewCount = FieldValue.delete();
    if ("likeCount" in data) update.likeCount = FieldValue.delete();

    if (!dryRun) {
      batch.update(docSnap.ref, update);
    }
    migrated++;
  }

  if (!dryRun && migrated > 0) {
    await batch.commit();
  }

  return { ok: true, migrated, skipped, dryRun, collection };
}

