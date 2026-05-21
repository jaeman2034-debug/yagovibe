import { onCall } from "firebase-functions/v2/https";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, FieldPath } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp();
}

type CountersReq = {
  collection?: "market" | "marketPosts";
  batchSize?: number;
  dryRun?: boolean;
  startAfterId?: string;
};

export const migrateMarketCounters = onCall(
  { region: "asia-northeast3", invoker: "public", timeoutSeconds: 540 },
  async (request) => {
    if (!request.auth) return { ok: false, error: "UNAUTHENTICATED" as const };
    const db = getFirestore();
    const {
      collection = "marketPosts",
      batchSize = 200,
      dryRun = true,
      startAfterId,
    } = (request.data as CountersReq) || {};

    const colRef = db.collection(collection);
    let q = colRef.orderBy(FieldPath.documentId()).limit(batchSize);
    if (startAfterId) {
      const startDoc = await colRef.doc(startAfterId).get();
      if (startDoc.exists) {
        q = colRef
          .orderBy(FieldPath.documentId())
          .startAfter(startDoc.id)
          .limit(batchSize);
      }
    }
    const snap = await q.get();
    if (snap.empty) {
      return { ok: true, migrated: 0, skipped: 0, dryRun, message: "No docs" };
    }
    let migrated = 0;
    let skipped = 0;
    const batch = db.batch();
    for (const d of snap.docs) {
      const data = d.data() as any;
      const views = data.views ?? data.viewCount ?? 0;
      const likesCount = data.likesCount ?? data.likeCount ?? 0;
      if (!("viewCount" in data) && !("likeCount" in data)) {
        skipped++;
        continue;
      }
      const update: Record<string, any> = {
        views,
        likesCount,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if ("viewCount" in data) update.viewCount = FieldValue.delete();
      if ("likeCount" in data) update.likeCount = FieldValue.delete();
      if (!dryRun) batch.update(d.ref, update);
      migrated++;
    }
    if (!dryRun && migrated > 0) await batch.commit();
    return { ok: true, migrated, skipped, dryRun, collection };
  }
);

type UpdateRecruitReq = {
  teamId: string;
  collection?: "market" | "marketPosts";
  dryRun?: boolean;
  titleIncludes?: string[];
  hasTag?: string;
  limit?: number;
};

export const updateRecruitPosts = onCall(
  { region: "asia-northeast3", invoker: "public", timeoutSeconds: 540 },
  async (request) => {
    if (!request.auth) return { ok: false, error: "UNAUTHENTICATED" as const };
    const {
      teamId,
      collection = "marketPosts",
      dryRun = true,
      titleIncludes = ["FC", "클럽", "팀"],
      hasTag = "recruit",
      limit = 500,
    } = (request.data as UpdateRecruitReq) || {};
    if (!teamId) return { ok: false, error: "INVALID_TEAM_ID" as const };

    const db = getFirestore();
    const snap = await db.collection(collection).limit(limit).get();
    let updated = 0;
    let skipped = 0;
    for (const d of snap.docs) {
      const data = d.data() as any;
      const title: string = data.title || "";
      const tags: string[] = data.tags || [];
      if (data.category === "recruit") {
        skipped++;
        continue;
      }
      const byTitle = titleIncludes.some((kw) => title.includes(kw));
      const byTag = Array.isArray(tags) && tags.includes(hasTag);
      if (!byTitle && !byTag) {
        skipped++;
        continue;
      }
      const update = {
        category: "recruit" as const,
        teamId,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (!dryRun) await d.ref.update(update);
      updated++;
    }
    return { ok: true, updated, skipped, collection, dryRun };
  }
);
