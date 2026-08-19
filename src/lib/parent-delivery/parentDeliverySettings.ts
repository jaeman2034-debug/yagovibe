import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  DEFAULT_PARENT_DELIVERY_SETTINGS,
  PARENT_DELIVERY_SETTINGS_SCHEMA_VERSION,
  type ParentDeliverySendChannel,
  type ParentDeliverySettings,
} from "@/lib/parent-delivery/parentDeliveryTypes";

export {
  describeAutoSendSettings,
  shouldAutoSendParentDelivery,
} from "@/lib/parent-delivery/parentDeliveryLogic";

function settingsRef(teamId: string) {
  return doc(db, "teams", teamId, "settings", "parentDelivery");
}

export async function readParentDeliverySettings(
  teamId: string
): Promise<ParentDeliverySettings> {
  const snap = await getDoc(settingsRef(teamId));
  if (!snap.exists()) return { ...DEFAULT_PARENT_DELIVERY_SETTINGS };
  const data = snap.data() as Partial<ParentDeliverySettings>;
  return {
    schemaVersion: PARENT_DELIVERY_SETTINGS_SCHEMA_VERSION,
    autoSendEnabled: Boolean(data.autoSendEnabled),
    sendChannel: (data.sendChannel as ParentDeliverySendChannel) ?? "manual",
    updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : 0,
    updatedByUid: typeof data.updatedByUid === "string" ? data.updatedByUid : "",
  };
}

export async function writeParentDeliverySettings(
  teamId: string,
  patch: Pick<ParentDeliverySettings, "autoSendEnabled" | "sendChannel">
): Promise<ParentDeliverySettings> {
  const uid = auth.currentUser?.uid ?? "";
  const next: ParentDeliverySettings = {
    schemaVersion: PARENT_DELIVERY_SETTINGS_SCHEMA_VERSION,
    autoSendEnabled: patch.autoSendEnabled,
    sendChannel: patch.sendChannel,
    updatedAt: Date.now(),
    updatedByUid: uid,
  };
  await setDoc(settingsRef(teamId), next, { merge: true });
  return next;
}
