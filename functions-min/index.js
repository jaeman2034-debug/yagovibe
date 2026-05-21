const { onCall, onRequest } = require("firebase-functions/v2/https");
const { getApps, initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue, FieldPath } = require("firebase-admin/firestore");

if (!getApps().length) {
  initializeApp();
}

exports.migrateMarketCounters = onCall(
  { region: "asia-northeast3", invoker: "public", timeoutSeconds: 540 },
  async (request) => {
    if (!request.auth) return { ok: false, error: "UNAUTHENTICATED" };
    const db = getFirestore();
    const {
      collection = "marketPosts",
      batchSize = 200,
      dryRun = true,
      startAfterId,
    } = request.data || {};

    const colRef = db.collection(collection);
    let q = colRef.orderBy(FieldPath.documentId()).limit(batchSize);
    if (startAfterId) {
      const startDoc = await colRef.doc(startAfterId).get();
      if (startDoc.exists) {
        q = colRef.orderBy(FieldPath.documentId()).startAfter(startDoc.id).limit(batchSize);
      }
    }
    const snap = await q.get();
    if (snap.empty) return { ok: true, migrated: 0, skipped: 0, dryRun, message: "No docs" };

    let migrated = 0;
    let skipped = 0;
    const batch = db.batch();
    for (const d of snap.docs) {
      const data = d.data() || {};
      const views = data.views ?? data.viewCount ?? 0;
      const likesCount = data.likesCount ?? data.likeCount ?? 0;
      if (!("viewCount" in data) && !("likeCount" in data)) {
        skipped++;
        continue;
      }
      const update = {
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

// 🔄 updateRecruitPosts를 HTTP(onRequest)로 노출 (callable 아님)
// (주의) 기존 callable(updateRecruitPosts)와 충돌 방지를 위해 동일 이름을 노출하지 않습니다.

// ✅ 고정 이름의 HTTP 엔드포인트 (권장 호출 대상)
exports.minimalUpdateRecruitPosts = onRequest(
  { region: "asia-northeast3", timeoutSeconds: 540, cors: true },
  async (req, res) => {
    try {
      const body = req.body || {};
      const {
        teamId,
        collection = "marketPosts",
        dryRun = true,
        titleIncludes = ["FC", "클럽", "팀"],
        hasTag = "recruit",
        limit = 500,
      } = body.data || {};
      if (!teamId) {
        res.status(400).json({ ok: false, error: "INVALID_TEAM_ID" });
        return;
      }
      const db = getFirestore();
      const snap = await db.collection(collection).limit(limit).get();
      let updated = 0;
      let skipped = 0;
      for (const d of snap.docs) {
        const data = d.data() || {};
        const title = data.title || "";
        const tags = data.tags || [];
        if (data.category === "recruit") {
          skipped++;
          continue;
        }
        const byTitle = titleIncludes.some((kw) => String(title).includes(kw));
        const byTag = Array.isArray(tags) && tags.includes(hasTag);
        if (!byTitle && !byTag) {
          skipped++;
          continue;
        }
        const update = {
          category: "recruit",
          teamId,
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (!dryRun) await d.ref.update(update);
        updated++;
      }
      res.json({ ok: true, updated, skipped, collection, dryRun });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  }
);
// (혼동 방지) minimalUpdateRecruitPosts 별칭은 제거

exports.minimalMigrateMarketCounters = onRequest(
  { region: "asia-northeast3", timeoutSeconds: 540, cors: true },
  async (req, res) => {
    try {
      const body = req.body || {};
      const data = body.data || {};
      const {
        collection = "marketPosts",
        batchSize = 200,
        dryRun = true,
        startAfterId,
      } = data;
      const db = getFirestore();
      const colRef = db.collection(collection);
      let q = colRef.orderBy(FieldPath.documentId()).limit(batchSize);
      if (startAfterId) {
        const startDoc = await colRef.doc(startAfterId).get();
        if (startDoc.exists) {
          q = colRef.orderBy(FieldPath.documentId()).startAfter(startDoc.id).limit(batchSize);
        }
      }
      const snap = await q.get();
      if (snap.empty) {
        res.json({ ok: true, migrated: 0, skipped: 0, dryRun, message: "No docs" });
        return;
      }
      let migrated = 0;
      let skipped = 0;
      const batch = db.batch();
      for (const d of snap.docs) {
        const docData = d.data() || {};
        const views = docData.views ?? docData.viewCount ?? 0;
        const likesCount = docData.likesCount ?? docData.likeCount ?? 0;
        if (!("viewCount" in docData) && !("likeCount" in docData)) {
          skipped++;
          continue;
        }
        const update = {
          views,
          likesCount,
          updatedAt: FieldValue.serverTimestamp(),
        };
        if ("viewCount" in docData) update.viewCount = FieldValue.delete();
        if ("likeCount" in docData) update.likeCount = FieldValue.delete();
        if (!dryRun) batch.update(d.ref, update);
        migrated++;
      }
      if (!dryRun && migrated > 0) await batch.commit();
      res.json({ ok: true, migrated, skipped, dryRun, collection });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  }
);
