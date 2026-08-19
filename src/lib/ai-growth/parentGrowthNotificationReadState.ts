import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ParentGrowthNotificationType } from "@/lib/ai-growth/parentGrowthNotificationTypes";

export type ParentGrowthNotificationReadDoc = {
  notificationId: string;
  teamId: string;
  playerId: string;
  type: ParentGrowthNotificationType;
  readAt: number;
};

function readsCollection(parentUid: string) {
  return collection(db, "users", parentUid, "parentGrowthNotificationReads");
}

export async function loadParentGrowthNotificationReads(
  parentUid: string
): Promise<Map<string, ParentGrowthNotificationReadDoc>> {
  try {
    const snap = await getDocs(readsCollection(parentUid));
    const map = new Map<string, ParentGrowthNotificationReadDoc>();
    for (const d of snap.docs) {
      const data = d.data() as Partial<ParentGrowthNotificationReadDoc>;
      if (typeof data.notificationId === "string") {
        map.set(data.notificationId, {
          notificationId: data.notificationId,
          teamId: String(data.teamId ?? ""),
          playerId: String(data.playerId ?? ""),
          type: data.type as ParentGrowthNotificationType,
          readAt: typeof data.readAt === "number" ? data.readAt : Date.now(),
        });
      }
    }
    return map;
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code ?? "")
        : "";
    if (code.includes("permission-denied")) {
      console.warn(
        "[parentGrowthNotificationReadState] reads unavailable — showing all as unread",
        error
      );
      return new Map();
    }
    throw error;
  }
}

export async function markParentGrowthNotificationRead(
  parentUid: string,
  input: {
    notificationId: string;
    teamId: string;
    playerId: string;
    type: ParentGrowthNotificationType;
  }
): Promise<void> {
  const readAt = Date.now();
  const payload: ParentGrowthNotificationReadDoc = {
    notificationId: input.notificationId,
    teamId: input.teamId,
    playerId: input.playerId,
    type: input.type,
    readAt,
  };
  await setDoc(doc(readsCollection(parentUid), input.notificationId), payload, { merge: true });
}

export async function markAllParentGrowthNotificationsRead(
  parentUid: string,
  items: Array<{
    notificationId: string;
    teamId: string;
    playerId: string;
    type: ParentGrowthNotificationType;
  }>
): Promise<void> {
  await Promise.all(items.map((item) => markParentGrowthNotificationRead(parentUid, item)));
}
