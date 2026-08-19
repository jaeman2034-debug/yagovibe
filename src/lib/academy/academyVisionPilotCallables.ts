import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export type SubmitVisionPilotFeedbackPayload = {
  teamId: string;
  matchId: string;
  persona: "coach" | "parent";
  rating: number;
  comment: string;
  playerId?: string;
};

export async function callSubmitVisionPilotFeedback(
  payload: SubmitVisionPilotFeedbackPayload
): Promise<{ ok: true; vocId: string }> {
  const fn = httpsCallable(functions, "submitVisionPilotFeedback");
  const res = await fn(payload);
  return res.data as { ok: true; vocId: string };
}
