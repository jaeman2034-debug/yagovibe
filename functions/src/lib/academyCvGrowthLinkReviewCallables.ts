/**
 * CV-1 I7 J6 — cvGrowthLinks Manual Review callable (server only)
 */
import { getApps, initializeApp } from "firebase-admin/app";
import { onCall, HttpsError } from "firebase-functions/v2/https";

if (getApps().length === 0) {
  initializeApp();
}

import { logger } from "firebase-functions";
import { assertCanReadAcademyCvRuns } from "./academyMediaIngestHelpers";
import {
  ACADEMY_CF_REGION,
  assertPlainObject,
  rejectUnknownKeys,
  requireAuthUid,
  requireNonEmptyString,
} from "./academySessionHelpers";
import type { CvGrowthLinkReviewDecision } from "./cvSignalTypes";
import { applyCvGrowthLinkReview } from "./academyCvGrowthLinksFirestore";
import { generateInterpretationCandidatesFromAcceptedLink } from "./academyCvInterpretationClassification";

const onCallOpts = { region: ACADEMY_CF_REGION, maxInstances: 10, timeoutSeconds: 60 };

function parsePayload(raw: unknown): {
  teamId: string;
  mediaId: string;
  linkId: string;
  decision: CvGrowthLinkReviewDecision;
} {
  const obj = assertPlainObject(raw);
  rejectUnknownKeys(obj, ["teamId", "mediaId", "linkId", "decision"]);
  const teamId = requireNonEmptyString(obj.teamId, "teamId");
  const mediaId = requireNonEmptyString(obj.mediaId, "mediaId");
  const linkId = requireNonEmptyString(obj.linkId, "linkId");
  const decisionRaw = requireNonEmptyString(obj.decision, "decision");
  if (decisionRaw !== "accepted" && decisionRaw !== "rejected") {
    throw new HttpsError("invalid-argument", "decision은 accepted 또는 rejected여야 합니다.");
  }
  return { teamId, mediaId, linkId, decision: decisionRaw };
}

export type ReviewCvGrowthLinkResult = {
  ok: true;
  teamId: string;
  mediaId: string;
  linkId: string;
  reviewStatus: "accepted" | "rejected";
  reviewedBy: string;
  reviewedAt: string;
};

/** I7 J6 — candidate → accepted | rejected (cvGrowthLinks · Growth SoT 0) */
export const reviewCvGrowthLink = onCall(onCallOpts, async (request) => {
  const uid = requireAuthUid(request);
  const payload = parsePayload(request.data);
  await assertCanReadAcademyCvRuns(
    payload.teamId,
    uid,
    request.auth?.token as Record<string, unknown> | undefined
  );

  logger.info("[academy-cv] reviewCvGrowthLink start", {
    ...payload,
    actorUid: uid,
  });

  try {
    const result = await applyCvGrowthLinkReview({
      teamId: payload.teamId,
      mediaId: payload.mediaId,
      linkId: payload.linkId,
      actorUid: uid,
      decision: payload.decision,
    });

    if (payload.decision === "accepted") {
      try {
        const i8 = await generateInterpretationCandidatesFromAcceptedLink({
          teamId: payload.teamId,
          mediaId: payload.mediaId,
          linkId: payload.linkId,
          actorUid: uid,
        });
        logger.info("[academy-cv] I8-2 auto after J6 accept", {
          linkId: payload.linkId,
          appended: i8.appended,
          skipped: i8.skipped,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn("[academy-cv] I8-2 auto after J6 accept skipped", {
          linkId: payload.linkId,
          message,
        });
      }
    }

    return {
      ok: true as const,
      teamId: payload.teamId,
      mediaId: payload.mediaId,
      linkId: payload.linkId,
      reviewStatus: result.reviewStatus as "accepted" | "rejected",
      reviewedBy: result.reviewedBy,
      reviewedAt: result.reviewedAtIso,
    } satisfies ReviewCvGrowthLinkResult;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("already-reviewed")) {
      throw new HttpsError("failed-precondition", "already-reviewed");
    }
    if (message.includes("not found")) {
      throw new HttpsError("not-found", message);
    }
    logger.error("[academy-cv] reviewCvGrowthLink failed", { error: message, ...payload });
    throw new HttpsError("internal", "CV growth link 검토 저장에 실패했습니다.");
  }
});
