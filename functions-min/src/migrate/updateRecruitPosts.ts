import { onRequest } from "firebase-functions/v2/https";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp();
}

/**
 * HTTP 엔드포인트 (onRequest)
 * - PowerShell/HTTP 클라이언트에서 쉽게 호출
 * - body: { data: { teamId, collection?, dryRun?, titleIncludes?, hasTag?, limit? } }
 */
export const minimalUpdateRecruitPosts = onRequest(
  { region: "asia-northeast3", timeoutSeconds: 540, cors: true },
  async (req, res) => {
    try {
      const body = (req.body || {}) as {
        data?: {
          teamId?: string;
          collection?: "market" | "marketPosts";
          dryRun?: boolean;
          titleIncludes?: string[];
          hasTag?: string;
          limit?: number;
        };
      };

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
        const data = (d.data() || {}) as Record<string, unknown>;
        const title = (data.title as string) || "";
        const tags = (data.tags as string[]) || [];

        // 이미 처리된 문서는 스킵
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

        const update: Record<string, unknown> = {
          category: "recruit",
          teamId,
          updatedAt: FieldValue.serverTimestamp(),
        };

        if (!dryRun) {
          await d.ref.update(update);
        }
        updated++;
      }

      res.json({ ok: true, updated, skipped, collection, dryRun });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  }
);

