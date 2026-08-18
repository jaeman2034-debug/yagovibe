/**
 * J4-3 — append-only academy league logs (team subcollection)
 */
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AcademyLeagueLogPayload } from "@/lib/ai-growth/academyLeagueView";

export async function appendAcademyLeagueLog(
  teamId: string,
  payload: AcademyLeagueLogPayload
): Promise<string> {
  const tid = teamId.trim();
  if (!tid) throw new Error("teamId required");

  const ref = await addDoc(collection(db, "teams", tid, "academyLeagueLogs"), {
    ...payload,
    createdAt: payload.simulatedAt,
  });
  return ref.id;
}
