import { onCall } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

type Request = {
  teamId: string;
  collection?: "market" | "marketPosts";
  dryRun?: boolean;
  titleIncludes?: string[]; // 예: ["FC", "축구"]
  hasTag?: string; // 예: "recruit"
  limit?: number;
};

export const updateRecruitPosts = onCall(
  { region: "asia-northeast3", invoker: "public", timeoutSeconds: 540 },
  async (request) => {
    if (!request.auth) {
      return { ok: false, error: "UNAUTHENTICATED" as const };
    }

    const {
      teamId,
      collection = "marketPosts",
      dryRun = true,
      titleIncludes = ["FC", "클럽", "팀"],
      hasTag = "recruit",
      limit = 500,
    } = (request.data as Request) || {};

    if (!teamId || typeof teamId !== "string") {
      return { ok: false, error: "INVALID_TEAM_ID" as const };
    }

    const db = getFirestore();
    const col = db.collection(collection);
    const snap = await col.limit(limit).get();

    let updated = 0;
    let skipped = 0;

    for (const docSnap of snap.docs) {
      const data = docSnap.data() as any;
      const title: string = data.title || "";
      const tags: string[] = data.tags || [];
      const isRecruitByTitle = titleIncludes.some((kw) => title.includes(kw));
      const isRecruitByTag = Array.isArray(tags) && tags.includes(hasTag);

      // 🔒 이미 처리된 문서는 건너뜀
      if (data.category === "recruit") {
        skipped++;
        continue;
      }

      if (!isRecruitByTitle && !isRecruitByTag) {
        skipped++;
        continue;
      }

      const update: Record<string, unknown> = {
        category: "recruit",
        teamId,
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (!dryRun) {
        await docSnap.ref.update(update);
      }
      updated++;
    }

    return {
      ok: true,
      collection,
      dryRun,
      updated,
      skipped,
      note:
        "title에 키워드 포함 또는 tags에 'recruit' 포함 문서만 변경되었습니다. 파라미터로 필터 조정 가능.",
    };
  }
);

