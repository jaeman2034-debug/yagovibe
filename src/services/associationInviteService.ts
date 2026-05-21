import { addDoc, collection, deleteDoc, doc, getDocs, limit, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { buildExternalUrl } from "@/lib/growth/teamInviteShare";
import { generateToken } from "@/utils/generateToken";
import type { AssociationMember, AssociationRole } from "@/utils/permissions";

export interface AssociationInviteDoc {
  id: string;
  token: string;
  associationId: string;
  role: Exclude<AssociationRole, "owner">;
  createdBy: string;
  expiresAt: number;
  used: boolean;
  kind: "association";
}

export async function createAssociationInvite(params: {
  associationId: string;
  role: Exclude<AssociationRole, "owner">;
  createdBy: string;
}) {
  const token = generateToken();
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

  const ref = await addDoc(collection(db, "invites"), {
    token,
    associationId: params.associationId,
    role: params.role,
    createdBy: params.createdBy,
    expiresAt,
    used: false,
    kind: "association",
    createdAt: serverTimestamp(),
  });

  return {
    inviteId: ref.id,
    token,
    url: buildExternalUrl(`/invite/association/${token}`),
  };
}

export async function getAssociationInviteByToken(token: string): Promise<AssociationInviteDoc | null> {
  const q = query(
    collection(db, "invites"),
    where("token", "==", token),
    where("kind", "==", "association"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<AssociationInviteDoc, "id">) };
}

export async function listAssociationInvites(associationId: string): Promise<AssociationInviteDoc[]> {
  const q = query(
    collection(db, "invites"),
    where("associationId", "==", associationId),
    where("kind", "==", "association")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AssociationInviteDoc, "id">) }));
}

export async function removeAssociationInvite(inviteId: string) {
  await deleteDoc(doc(db, "invites", inviteId));
}

export async function acceptAssociationInvite(params: {
  invite: AssociationInviteDoc;
  uid: string;
  currentMembers: AssociationMember[];
}) {
  const already = params.currentMembers.some((m) => m.uid === params.uid);
  if (already) return { alreadyMember: true };

  const nextMembers: AssociationMember[] = [
    ...params.currentMembers,
    { uid: params.uid, role: params.invite.role },
  ];

  await updateDoc(doc(db, "associations", params.invite.associationId), {
    members: nextMembers,
    updatedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, "invites", params.invite.id), {
    used: true,
    usedBy: params.uid,
    usedAt: serverTimestamp(),
  });

  return { alreadyMember: false };
}

