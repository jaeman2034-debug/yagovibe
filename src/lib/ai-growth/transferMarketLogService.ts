/**
 * J4-4 — append-only transfer market logs (team subcollection)
 */
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TransferMarketLogPayload } from "@/lib/ai-growth/transferMarketView";

export async function appendTransferMarketLog(
  teamId: string,
  payload: TransferMarketLogPayload
): Promise<string> {
  const tid = teamId.trim();
  if (!tid) throw new Error("teamId required");

  const ref = await addDoc(collection(db, "teams", tid, "transferMarketLogs"), {
    ...payload,
    createdAt: payload.simulatedAt,
  });
  return ref.id;
}
