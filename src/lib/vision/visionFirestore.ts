/**
 * Vision v6-3 — Firestore persistence (append-only)
 *
 * Path: teams/{teamId}/matches/{matchId}/visionAnalysis/{analysisId}
 */

import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  VisionAnalysisFirestoreDoc,
  VisionResult,
} from "@/lib/vision/visionTypes";
import {
  VISION_ANALYSIS_COLLECTION,
  VISION_ANALYSIS_FIRESTORE_SCHEMA_VERSION,
} from "@/lib/vision/visionTypes";

export function visionAnalysisCollectionRef(teamId: string, matchId: string) {
  return collection(db, "teams", teamId, "matches", matchId, VISION_ANALYSIS_COLLECTION);
}

export function visionAnalysisDocRef(teamId: string, matchId: string, analysisId: string) {
  return doc(db, "teams", teamId, "matches", matchId, VISION_ANALYSIS_COLLECTION, analysisId);
}

function toFirestorePayload(
  result: VisionResult,
  createdByUid?: string
): Omit<VisionAnalysisFirestoreDoc, "createdAt"> {
  return {
    schemaVersion: VISION_ANALYSIS_FIRESTORE_SCHEMA_VERSION,
    visionResultSchemaVersion: result.schemaVersion,
    playerFii: result.playerFii,
    playmaker: result.playmaker,
    ballProgression: result.ballProgression,
    pressureZone: result.pressureZone,
    teamCompactness: result.teamCompactness,
    tacticalReport: result.tacticalReport,
    sourcePath: result.meta?.sourcePath,
    ...(createdByUid ? { createdByUid } : {}),
  };
}

/** Append-only write — never overwrites prior analysis docs */
export async function appendVisionAnalysis(input: {
  teamId: string;
  matchId: string;
  result: VisionResult;
  createdByUid?: string;
}): Promise<string> {
  const { teamId, matchId, result, createdByUid } = input;
  if (!teamId.trim() || !matchId.trim()) {
    throw new Error("teamId and matchId are required");
  }

  const col = visionAnalysisCollectionRef(teamId, matchId);
  const docRef = await addDoc(col, {
    ...toFirestorePayload(result, createdByUid),
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export type VisionAnalysisRecord = VisionAnalysisFirestoreDoc & {
  analysisId: string;
  createdAtMs: number | null;
};

function timestampToMs(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "toMillis" in value) {
    return (value as Timestamp).toMillis();
  }
  return null;
}

/** Latest analysis (most recent append) */
export async function getLatestVisionAnalysis(
  teamId: string,
  matchId: string
): Promise<VisionAnalysisRecord | null> {
  const col = visionAnalysisCollectionRef(teamId, matchId);
  const q = query(col, orderBy("createdAt", "desc"), limit(1));
  const snap = await getDocs(q);
  const first = snap.docs[0];
  if (!first) return null;

  const data = first.data() as VisionAnalysisFirestoreDoc;
  return {
    ...data,
    analysisId: first.id,
    createdAtMs: timestampToMs(data.createdAt),
  };
}

/** Map Firestore record → VisionResult for providers */
export function visionAnalysisToResult(record: VisionAnalysisRecord): VisionResult {
  return {
    schemaVersion: record.visionResultSchemaVersion,
    playerFii: record.playerFii ?? [],
    playmaker: record.playmaker,
    ballProgression: record.ballProgression,
    pressureZone: record.pressureZone,
    teamCompactness: record.teamCompactness,
    tacticalReport: record.tacticalReport,
    meta: {
      matchId: undefined,
      teamId: undefined,
      sourcePath: record.sourcePath,
    },
  };
}
