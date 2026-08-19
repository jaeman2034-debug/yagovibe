import {
  addDoc,
  collection,
  limit,
  orderBy,
  query,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { classifyVocFromText } from "@/lib/voc/classifyVocSignals";
import type { VocFeedbackDoc } from "@/lib/voc/vocFeedbackTypes";

export type SaveVocFeedbackInput = Omit<
  VocFeedbackDoc,
  "schemaVersion" | "source" | "capturedAt" | "capturedByUid" | "painPoints" | "featureRequests" | "positiveSignals" | "signals"
> & {
  teamId: string;
  capturedByUid: string;
};

export async function saveVocFeedback(input: SaveVocFeedbackInput): Promise<string> {
  const classified = classifyVocFromText(
    input.positiveText,
    input.painText,
    input.requestText
  );

  const transcript = input.transcript?.trim() ?? "";

  const doc = {
    schemaVersion: 1 as const,
    source: "interview" as const,
    captureMode: input.captureMode,
    persona: input.persona,
    orgLabel: input.orgLabel.trim(),
    feature: input.feature,
    ratingUnderstanding: input.ratingUnderstanding,
    ratingUsage: input.ratingUsage,
    transcript,
    positiveText: input.positiveText.trim(),
    painText: input.painText.trim(),
    requestText: input.requestText.trim(),
    painPoints: classified.painPoints,
    featureRequests: classified.featureRequests,
    positiveSignals: classified.positiveSignals,
    signals: classified.signals,
    capturedAt: serverTimestamp(),
    capturedByUid: input.capturedByUid,
    ...(input.interviewMethod ? { interviewMethod: input.interviewMethod } : {}),
    ...(input.ratingRecommend != null ? { ratingRecommend: input.ratingRecommend } : {}),
    ...(input.memorableScreen ? { memorableScreen: input.memorableScreen } : {}),
    ...(input.stt ? { stt: input.stt } : {}),
  } satisfies VocFeedbackDoc;

  const ref = await addDoc(collection(db, "teams", input.teamId, "vocFeedback"), doc);
  return ref.id;
}

export type VocFeedbackListItem = VocFeedbackDoc & { id: string; teamId: string };

export async function listRecentVocFeedback(
  teamId: string,
  max = 20
): Promise<VocFeedbackListItem[]> {
  const { getDocs } = await import("firebase/firestore");
  const q = query(
    collection(db, "teams", teamId, "vocFeedback"),
    orderBy("capturedAt", "desc"),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    teamId,
    ...(d.data() as VocFeedbackDoc),
  }));
}

export function formatVocCapturedAt(capturedAt: unknown): string {
  if (!capturedAt) return "—";
  const ts = capturedAt as Timestamp;
  if (typeof ts.toDate === "function") {
    return ts.toDate().toLocaleDateString("ko-KR");
  }
  return "—";
}
