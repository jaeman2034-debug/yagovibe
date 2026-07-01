/**
 * CV-1 I8-2 — generateInterpretationCandidates (accepted cvGrowthLink → interpretationCandidates)
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
import { generateInterpretationCandidatesFromAcceptedLink } from "./academyCvInterpretationClassification";

const onCallOpts = { region: ACADEMY_CF_REGION, maxInstances: 10, timeoutSeconds: 60 };

function parsePayload(raw: unknown): { teamId: string; mediaId: string; linkId: string } {
  const obj = assertPlainObject(raw);
  rejectUnknownKeys(obj, ["teamId", "mediaId", "linkId"]);
  return {
    teamId: requireNonEmptyString(obj.teamId, "teamId"),
    mediaId: requireNonEmptyString(obj.mediaId, "mediaId"),
    linkId: requireNonEmptyString(obj.linkId, "linkId"),
  };
}

export type GenerateInterpretationCandidatesResult = {
  ok: true;
  teamId: string;
  mediaId: string;
  linkId: string;
  drafts: number;
  appended: number;
  skipped: number;
};

/** I8-2 — Signal classification → interpretationCandidates (Internal · no Growth SoT) */
export const generateInterpretationCandidates = onCall(onCallOpts, async (request) => {
  const uid = requireAuthUid(request);
  const payload = parsePayload(request.data);
  await assertCanReadAcademyCvRuns(
    payload.teamId,
    uid,
    request.auth?.token as Record<string, unknown> | undefined
  );

  logger.info("[academy-cv] generateInterpretationCandidates start", {
    ...payload,
    actorUid: uid,
  });

  try {
    const result = await generateInterpretationCandidatesFromAcceptedLink({
      teamId: payload.teamId,
      mediaId: payload.mediaId,
      linkId: payload.linkId,
      actorUid: uid,
    });

    return {
      ok: true as const,
      teamId: payload.teamId,
      mediaId: payload.mediaId,
      linkId: result.linkId,
      drafts: result.drafts,
      appended: result.appended,
      skipped: result.skipped,
    } satisfies GenerateInterpretationCandidatesResult;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("not found")) {
      throw new HttpsError("not-found", message);
    }
    if (message.includes("not accepted") || message.includes("no cvSignals")) {
      throw new HttpsError("failed-precondition", message);
    }
    if (message.includes("no classification drafts")) {
      throw new HttpsError("failed-precondition", message);
    }
    logger.error("[academy-cv] generateInterpretationCandidates failed", {
      error: message,
      ...payload,
    });
    throw new HttpsError("internal", "Interpretation classification에 실패했습니다.");
  }
});
