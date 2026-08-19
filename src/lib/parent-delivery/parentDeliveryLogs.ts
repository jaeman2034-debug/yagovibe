import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  PARENT_DELIVERY_LOG_SCHEMA_VERSION,
  type ParentDeliveryLog,
  type ParentDeliveryLogStatus,
  type ParentDeliverySendChannel,
} from "@/lib/parent-delivery/parentDeliveryTypes";

function logsCol(teamId: string) {
  return collection(db, "teams", teamId, "deliveryLogs");
}

export async function createParentDeliveryLog(input: {
  teamId: string;
  playerId: string;
  sessionId: string;
  channel: ParentDeliverySendChannel;
  shareUrl: string;
  triggeredByUid: string;
  status?: ParentDeliveryLogStatus;
}): Promise<ParentDeliveryLog> {
  const createdAt = Date.now();
  const payload = {
    schemaVersion: PARENT_DELIVERY_LOG_SCHEMA_VERSION,
    teamId: input.teamId,
    playerId: input.playerId,
    sessionId: input.sessionId,
    channel: input.channel,
    status: input.status ?? "queued",
    shareUrl: input.shareUrl,
    sentAt: null as number | null,
    error: null as string | null,
    triggeredByUid: input.triggeredByUid,
    createdAt,
    provider: "mock" as const,
  };
  const ref = await addDoc(logsCol(input.teamId), payload);
  return { ...payload, deliveryId: ref.id };
}

export async function updateParentDeliveryLogStatus(
  teamId: string,
  deliveryId: string,
  status: ParentDeliveryLogStatus,
  extra?: { error?: string | null; sentAt?: number | null }
): Promise<void> {
  const ref = doc(db, "teams", teamId, "deliveryLogs", deliveryId);
  await updateDoc(ref, {
    status,
    ...(extra?.error !== undefined ? { error: extra.error } : {}),
    ...(extra?.sentAt !== undefined ? { sentAt: extra.sentAt } : {}),
  });
}

export async function listParentDeliveryLogsForSession(
  teamId: string,
  sessionId: string,
  max = 5
): Promise<ParentDeliveryLog[]> {
  const q = query(
    logsCol(teamId),
    where("sessionId", "==", sessionId),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as Omit<ParentDeliveryLog, "deliveryId">;
    return { ...data, deliveryId: d.id };
  });
}
