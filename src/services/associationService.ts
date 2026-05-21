import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AssociationMember } from "@/utils/permissions";

export interface AssociationPayload {
  name: string;
  sport: string;
  region: string;
  description?: string;
  logoUrl?: string;
  introMessage?: string;
  bannerImage?: string;
  members?: AssociationMember[];
}

export interface AssociationDoc extends AssociationPayload {
  id: string;
  ownerUid?: string;
  ownerId?: string;
  admins?: string[];
  editors?: string[];
  deleted?: boolean;
  deletedAt?: unknown;
}

export async function getAssociationById(associationId: string): Promise<AssociationDoc | null> {
  const ref = doc(db, "associations", associationId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return {
    id: snap.id,
    ...(snap.data() as Omit<AssociationDoc, "id">),
  };
}

export async function createAssociation(payload: AssociationPayload & { ownerUid: string }): Promise<string> {
  const ref = await addDoc(collection(db, "associations"), {
    ...payload,
    ownerUid: payload.ownerUid,
    ownerId: payload.ownerUid,
    admins: [payload.ownerUid],
    editors: [],
    members: payload.members ?? [{ uid: payload.ownerUid, role: "owner" }],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateAssociation(associationId: string, payload: Partial<AssociationPayload>) {
  const ref = doc(db, "associations", associationId);
  return updateDoc(ref, {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

export async function softDeleteAssociation(associationId: string) {
  const ref = doc(db, "associations", associationId);
  return updateDoc(ref, {
    deleted: true,
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
