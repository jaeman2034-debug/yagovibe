import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { buildExternalUrl } from "@/lib/growth/teamInviteShare";

export type FederationInviteRole = "admin" | "editor" | "viewer";

export async function createFederationInviteLink(
  federationSlug: string,
  role: FederationInviteRole
): Promise<string> {
  const token = crypto.randomUUID();

  await addDoc(collection(db, "invites"), {
    kind: "federation_role",
    federationSlug,
    role,
    token,
    status: "pending",
    createdAt: serverTimestamp(),
  });

  return buildExternalUrl(`/invite?token=${encodeURIComponent(token)}`);
}

export async function acceptFederationInvite(token: string, uid: string): Promise<{ slug: string; role: FederationInviteRole }> {
  const q = query(
    collection(db, "invites"),
    where("kind", "==", "federation_role"),
    where("token", "==", token),
    where("status", "==", "pending")
  );
  const snap = await getDocs(q);
  if (snap.empty) {
    throw new Error("초대가 만료되었거나 이미 사용되었습니다.");
  }

  const inviteDoc = snap.docs[0];
  const invite = inviteDoc.data() as {
    federationSlug?: string;
    role?: FederationInviteRole;
  };

  const slug = String(invite.federationSlug || "").trim();
  const role = (invite.role || "viewer") as FederationInviteRole;

  if (!slug) {
    throw new Error("잘못된 초대 정보입니다.");
  }

  const roleKey =
    role === "admin" ? "roles.admins" : role === "editor" ? "roles.editors" : "roles.viewers";

  await updateDoc(doc(db, "federations", slug), {
    [roleKey]: arrayUnion(uid),
    updatedAt: serverTimestamp(),
  });

  await updateDoc(inviteDoc.ref, {
    status: "accepted",
    acceptedBy: uid,
    acceptedAt: serverTimestamp(),
  });

  return { slug, role };
}
