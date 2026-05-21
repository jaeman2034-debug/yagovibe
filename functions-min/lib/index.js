"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRecruitPosts = exports.migrateMarketCounters = void 0;
const https_1 = require("firebase-functions/v2/https");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
if (!(0, app_1.getApps)().length) {
    (0, app_1.initializeApp)();
}
exports.migrateMarketCounters = (0, https_1.onCall)({ region: "asia-northeast3", invoker: "public", timeoutSeconds: 540 }, async (request) => {
    if (!request.auth)
        return { ok: false, error: "UNAUTHENTICATED" };
    const db = (0, firestore_1.getFirestore)();
    const { collection = "marketPosts", batchSize = 200, dryRun = true, startAfterId, } = request.data || {};
    const colRef = db.collection(collection);
    let q = colRef.orderBy(firestore_1.FieldPath.documentId()).limit(batchSize);
    if (startAfterId) {
        const startDoc = await colRef.doc(startAfterId).get();
        if (startDoc.exists) {
            q = colRef
                .orderBy(firestore_1.FieldPath.documentId())
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
        const data = d.data();
        const views = data.views ?? data.viewCount ?? 0;
        const likesCount = data.likesCount ?? data.likeCount ?? 0;
        if (!("viewCount" in data) && !("likeCount" in data)) {
            skipped++;
            continue;
        }
        const update = {
            views,
            likesCount,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        };
        if ("viewCount" in data)
            update.viewCount = firestore_1.FieldValue.delete();
        if ("likeCount" in data)
            update.likeCount = firestore_1.FieldValue.delete();
        if (!dryRun)
            batch.update(d.ref, update);
        migrated++;
    }
    if (!dryRun && migrated > 0)
        await batch.commit();
    return { ok: true, migrated, skipped, dryRun, collection };
});
exports.updateRecruitPosts = (0, https_1.onCall)({ region: "asia-northeast3", invoker: "public", timeoutSeconds: 540 }, async (request) => {
    if (!request.auth)
        return { ok: false, error: "UNAUTHENTICATED" };
    const { teamId, collection = "marketPosts", dryRun = true, titleIncludes = ["FC", "클럽", "팀"], hasTag = "recruit", limit = 500, } = request.data || {};
    if (!teamId)
        return { ok: false, error: "INVALID_TEAM_ID" };
    const db = (0, firestore_1.getFirestore)();
    const snap = await db.collection(collection).limit(limit).get();
    let updated = 0;
    let skipped = 0;
    for (const d of snap.docs) {
        const data = d.data();
        const title = data.title || "";
        const tags = data.tags || [];
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
            category: "recruit",
            teamId,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        };
        if (!dryRun)
            await d.ref.update(update);
        updated++;
    }
    return { ok: true, updated, skipped, collection, dryRun };
});
