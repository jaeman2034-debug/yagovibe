import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { AiContentFeatureType, AiFeedbackRating } from "@/lib/team/aiContentPromptVersions";

export type SubmitAiFeedbackPayload = {
  teamId: string;
  featureType: AiContentFeatureType;
  rating: AiFeedbackRating;
  edited: boolean;
  regenerateCount: number;
  comment?: string;
  promptVersion: string;
  /** ISO string — AI 초안 생성 시각 */
  generatedAt?: string;
};

export async function submitAiFeedbackCallable(
  payload: SubmitAiFeedbackPayload
): Promise<{ ok?: boolean; feedbackId?: string }> {
  const fn = httpsCallable<
    Record<string, unknown>,
    { ok?: boolean; feedbackId?: string }
  >(functions, "submitAiFeedback");
  const data: Record<string, unknown> = {
    teamId: payload.teamId,
    featureType: payload.featureType,
    rating: payload.rating,
    edited: payload.edited,
    regenerateCount: payload.regenerateCount,
    promptVersion: payload.promptVersion,
  };
  if (payload.comment?.trim()) data.comment = payload.comment.trim();
  if (payload.generatedAt?.trim()) data.generatedAt = payload.generatedAt.trim();
  const res = await fn(data);
  return res.data ?? {};
}
