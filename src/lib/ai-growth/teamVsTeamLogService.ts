/**
 * J4-2 — append-only team vs team logs (team subcollection)
 */
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TeamVsTeamLogPayload } from "@/lib/ai-growth/teamVsTeamView";

export async function appendTeamVsTeamLog(
  teamId: string,
  payload: TeamVsTeamLogPayload
): Promise<string> {
  const tid = teamId.trim();
  if (!tid) throw new Error("teamId required");

  const ref = await addDoc(collection(db, "teams", tid, "teamVsTeamLogs"), {
    ...payload,
    createdAt: payload.simulatedAt,
  });
  return ref.id;
}
