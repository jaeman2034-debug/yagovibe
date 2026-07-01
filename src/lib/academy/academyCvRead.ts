/**
 * CV-1 I4/I6 — cvRuns read (I6: Callable · I4 fallback: client Firestore staff-read)
 * Client write forbidden — persist via server callables only.
 */
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { callGetAcademyCvRunsContext } from "@/lib/academy/academyCvCallables";
import type { AcademyCvRunSnapshotDto } from "@/lib/academy/academyCvTypes";
import type { CvReviewStatus, CvRoiV1 } from "@/lib/academy/academyCvTypes";

export type AcademyCvMediaSnapshot = {
  cvRoi?: CvRoiV1;
  cvRoiVersion?: number;
  cvActiveRunId?: string;
  cvStatus?: string;
};

export type AcademyCvRunSnapshot = {
  runId: string;
  roiVersion: number;
  roiSnapshot?: CvRoiV1;
  analysisStatus: string;
  reviewStatus?: CvReviewStatus;
  callableStatus?: string;
  sessionConfidence?: number;
  visibilityRatio?: number;
  reviewedBy?: string;
  reviewedAt?: string;
  processedAt?: string;
};

export type AcademyCvRunsContext = {
  media: AcademyCvMediaSnapshot | null;
  activeRun: AcademyCvRunSnapshot | null;
  runs: AcademyCvRunSnapshot[];
  previousRun: AcademyCvRunSnapshot | null;
};

function parseTimestamp(raw: unknown): string | undefined {
  if (raw && typeof (raw as { toDate?: () => Date }).toDate === "function") {
    return (raw as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof raw === "string") return raw;
  return undefined;
}

function parseCvRoi(raw: unknown): CvRoiV1 | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const x = Number(o.x);
  const y = Number(o.y);
  const w = Number(o.w);
  const h = Number(o.h);
  if (![x, y, w, h].every((n) => Number.isFinite(n))) return undefined;
  return {
    x,
    y,
    w,
    h,
    frameIndex: Number.isFinite(Number(o.frameIndex)) ? Number(o.frameIndex) : 0,
    coordinateSpace: "normalized_0_1",
  };
}

export function parseAcademyCvRunSnapshot(
  runId: string,
  data: Record<string, unknown>
): AcademyCvRunSnapshot {
  const physical = data.metrics as Record<string, unknown> | undefined;
  const physicalInner = physical?.physical as Record<string, unknown> | undefined;
  const breakdown = physicalInner?.confidenceBreakdown as Record<string, unknown> | undefined;

  return {
    runId,
    roiVersion: typeof data.roiVersion === "number" ? data.roiVersion : 1,
    roiSnapshot: parseCvRoi(data.roiSnapshot),
    analysisStatus: String(data.analysisStatus ?? "unknown"),
    reviewStatus:
      data.reviewStatus === "candidate" ||
      data.reviewStatus === "approved" ||
      data.reviewStatus === "rejected"
        ? data.reviewStatus
        : undefined,
    callableStatus: typeof data.callableStatus === "string" ? data.callableStatus : undefined,
    sessionConfidence:
      typeof physicalInner?.sessionConfidence === "number"
        ? physicalInner.sessionConfidence
        : undefined,
    visibilityRatio:
      typeof breakdown?.visibilityRatio === "number" ? breakdown.visibilityRatio : undefined,
    reviewedBy: typeof data.reviewedBy === "string" ? data.reviewedBy : undefined,
    reviewedAt: parseTimestamp(data.reviewedAt),
    processedAt: parseTimestamp(data.processedAt),
  };
}

function parseMediaSnapshot(raw: Record<string, unknown>): AcademyCvMediaSnapshot {
  return {
    cvRoi: parseCvRoi(raw.cvRoi),
    cvRoiVersion: typeof raw.cvRoiVersion === "number" ? raw.cvRoiVersion : undefined,
    cvActiveRunId: typeof raw.cvActiveRunId === "string" ? raw.cvActiveRunId : undefined,
    cvStatus: typeof raw.cvStatus === "string" ? raw.cvStatus : undefined,
  };
}

function resolvePreviousRun(
  runs: AcademyCvRunSnapshot[],
  activeRun: AcademyCvRunSnapshot | null
): AcademyCvRunSnapshot | null {
  if (!activeRun || runs.length < 2) return null;
  const sorted = [...runs].sort((a, b) => b.roiVersion - a.roiVersion);
  const idx = sorted.findIndex((r) => r.runId === activeRun.runId);
  if (idx >= 0 && idx + 1 < sorted.length) {
    return sorted[idx + 1] ?? null;
  }
  return sorted.find((r) => r.roiVersion < activeRun.roiVersion) ?? null;
}

/** I6-1 — all cvRuns for media (read-only · client sort by roiVersion desc). */
export async function listAcademyCvRuns(
  teamId: string,
  mediaId: string
): Promise<AcademyCvRunSnapshot[]> {
  const colRef = collection(db, "teams", teamId, "aiIngest", mediaId, "cvRuns");
  const snap = await getDocs(colRef);
  const runs = snap.docs.map((d) =>
    parseAcademyCvRunSnapshot(d.id, d.data() as Record<string, unknown>)
  );
  return runs.sort((a, b) => b.roiVersion - a.roiVersion);
}

/** I6-2 — active cvRun via media.cvActiveRunId (read-only). */
export async function getActiveCvRun(
  teamId: string,
  mediaId: string
): Promise<{ media: AcademyCvMediaSnapshot | null; activeRun: AcademyCvRunSnapshot | null }> {
  const mediaRef = doc(db, "teams", teamId, "aiIngest", mediaId);
  const mediaSnap = await getDoc(mediaRef);
  if (!mediaSnap.exists()) {
    return { media: null, activeRun: null };
  }

  const media = parseMediaSnapshot(mediaSnap.data() as Record<string, unknown>);
  const activeRunId = media.cvActiveRunId;
  if (!activeRunId) {
    return { media, activeRun: null };
  }

  const runSnap = await getDoc(doc(mediaRef, "cvRuns", activeRunId));
  if (!runSnap.exists()) {
    return { media, activeRun: null };
  }

  return {
    media,
    activeRun: parseAcademyCvRunSnapshot(activeRunId, runSnap.data() as Record<string, unknown>),
  };
}

function dtoToRunSnapshot(dto: AcademyCvRunSnapshotDto): AcademyCvRunSnapshot {
  return { ...dto };
}

async function loadAcademyCvRunsContextFromFirestore(
  teamId: string,
  mediaId: string
): Promise<AcademyCvRunsContext> {
  const [mediaActive, runs] = await Promise.all([
    getActiveCvRun(teamId, mediaId),
    listAcademyCvRuns(teamId, mediaId),
  ]);
  const activeRun =
    mediaActive.activeRun ??
    (mediaActive.media?.cvActiveRunId
      ? runs.find((r) => r.runId === mediaActive.media?.cvActiveRunId) ?? null
      : null);

  return {
    media: mediaActive.media,
    activeRun,
    runs,
    previousRun: resolvePreviousRun(runs, activeRun),
  };
}

/** I6 — media + active run + full history + previous run (Callable · staff/admin). */
export async function loadAcademyCvRunsContext(
  teamId: string,
  mediaId: string
): Promise<AcademyCvRunsContext> {
  try {
    const res = await callGetAcademyCvRunsContext({ teamId, mediaId });
    return {
      media: res.media,
      activeRun: res.activeRun ? dtoToRunSnapshot(res.activeRun) : null,
      runs: res.runs.map(dtoToRunSnapshot),
      previousRun: res.previousRun ? dtoToRunSnapshot(res.previousRun) : null,
    };
  } catch (e) {
    console.warn("[ACADEMY-CV] getAcademyCvRunsContext callable failed — client read fallback", e);
    return loadAcademyCvRunsContextFromFirestore(teamId, mediaId);
  }
}

/** I4 — load media cv fields + active cvRun (alias). */
export async function loadAcademyCvActiveRun(
  teamId: string,
  mediaId: string
): Promise<{ media: AcademyCvMediaSnapshot | null; activeRun: AcademyCvRunSnapshot | null }> {
  return getActiveCvRun(teamId, mediaId);
}
