/**
 * J4-1 — append-only match simulation logs (team subcollection)
 */
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MatchSimulationLogPayload } from "@/lib/ai-growth/matchSimulationView";

export async function appendMatchSimulationLog(
  teamId: string,
  payload: MatchSimulationLogPayload
): Promise<string> {
  const tid = teamId.trim();
  if (!tid) throw new Error("teamId required");

  const ref = await addDoc(collection(db, "teams", tid, "matchSimulationLogs"), {
    ...payload,
    createdAt: payload.simulatedAt,
  });
  return ref.id;
}
