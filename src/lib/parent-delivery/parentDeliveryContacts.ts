import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  normalizeKoreanMobilePhone,
  resolveParentDeliveryContactDocId,
  type ParentDeliveryContactInput,
  validateParentDeliveryContactInput,
} from "@/lib/parent-delivery/parentDeliveryContactLogic";
import {
  PARENT_DELIVERY_CONTACT_SCHEMA_VERSION,
  type ParentDeliveryConsentMethod,
  type ParentDeliveryContact,
} from "@/lib/parent-delivery/parentDeliveryTypes";

/** @deprecated import from parentDeliveryContactLogic */
export { resolveParentDeliveryContactDocId } from "@/lib/parent-delivery/parentDeliveryContactLogic";

function contactRef(teamId: string, playerId: string, displayName: string) {
  const docId = resolveParentDeliveryContactDocId(playerId, displayName);
  return doc(db, "teams", teamId, "parentDeliveryContacts", docId);
}

export async function readParentDeliveryContact(
  teamId: string,
  playerId: string,
  displayName = ""
): Promise<ParentDeliveryContact | null> {
  const docId = resolveParentDeliveryContactDocId(playerId, displayName);
  const snap = await getDoc(contactRef(teamId, playerId, displayName));
  if (!snap.exists()) return null;
  const data = snap.data() as ParentDeliveryContact;
  return { ...data, playerId: data.playerId ?? docId };
}

/** Firestore rejects `undefined` field values — omit optional empties. */
function toFirestoreContactPayload(contact: ParentDeliveryContact): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(contact).filter(([, value]) => value !== undefined)
  );
}

export async function writeParentDeliveryContact(
  teamId: string,
  playerId: string,
  input: ParentDeliveryContactInput,
  options?: {
    displayName?: string;
    consentMethod?: ParentDeliveryConsentMethod;
    /** 기존 동의 유지 시 true — parentConsentAt 보존 */
    preserveConsentAt?: boolean;
    existing?: ParentDeliveryContact | null;
  }
): Promise<ParentDeliveryContact> {
  const validation = validateParentDeliveryContactInput(input);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const displayName = options?.displayName ?? "";
  const docId = resolveParentDeliveryContactDocId(playerId, displayName);
  const uid = auth.currentUser?.uid ?? "";
  const normalizedPhone = normalizeKoreanMobilePhone(input.parentPhone)!;
  const existing =
    options?.existing ??
    (await readParentDeliveryContact(teamId, playerId, displayName));
  const now = Date.now();
  const consentNewlyGranted = input.parentConsent && !existing?.parentConsent;

  const next: ParentDeliveryContact = {
    schemaVersion: PARENT_DELIVERY_CONTACT_SCHEMA_VERSION,
    playerId: docId,
    parentName: input.parentName?.trim() || undefined,
    parentPhone: normalizedPhone,
    parentKakaoId: input.parentKakaoId?.trim() || undefined,
    parentConsent: input.parentConsent,
    parentConsentAt: input.parentConsent
      ? consentNewlyGranted
        ? now
        : (existing?.parentConsentAt ?? now)
      : null,
    consentMethod:
      input.parentConsent && (consentNewlyGranted || !existing?.consentMethod)
        ? (options?.consentMethod ?? "verbal_coach")
        : existing?.consentMethod ?? (input.parentConsent ? "verbal_coach" : undefined),
    consentRecordedByUid:
      input.parentConsent && (consentNewlyGranted || !existing?.consentRecordedByUid)
        ? uid
        : existing?.consentRecordedByUid,
    updatedAt: now,
    updatedByUid: uid,
  };

  await setDoc(
    contactRef(teamId, playerId, displayName),
    toFirestoreContactPayload(next),
    { merge: true }
  );
  return next;
}
