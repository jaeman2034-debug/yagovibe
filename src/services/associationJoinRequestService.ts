import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type JoinRequestStatus = "pending" | "approved" | "rejected";

export interface JoinRequestDoc {
  id: string;
  associationId: string;
  uid: string;
  status: JoinRequestStatus;
  createdAt?: unknown;
}

export async function createJoinRequest(associationId: string, uid: string) {
  const duplicateQ = query(
    collection(db, "joinRequests"),
    where("associationId", "==", associationId),
    where("uid", "==", uid),
    where("status", "==", "pending"),
    limit(1)
  );
  const duplicateSnap = await getDocs(duplicateQ);
  if (!duplicateSnap.empty) {
    return { created: false, reason: "duplicate" as const };
  }

  await addDoc(collection(db, "joinRequests"), {
    associationId,
    uid,
    status: "pending" as JoinRequestStatus,
    createdAt: serverTimestamp(),
  });

  return { created: true as const };
}

export async function getMyJoinRequestStatus(associationId: string, uid: string): Promise<JoinRequestStatus | null> {
  const q = query(
    collection(db, "joinRequests"),
    where("associationId", "==", associationId),
    where("uid", "==", uid),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const status = snap.docs[0].data().status as JoinRequestStatus | undefined;
  return status ?? null;
}

export async function listPendingJoinRequests(associationId: string): Promise<JoinRequestDoc[]> {
  const q = query(
    collection(db, "joinRequests"),
    where("associationId", "==", associationId),
    where("status", "==", "pending")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<JoinRequestDoc, "id">),
  }));
}

export async function updateJoinRequestStatus(requestId: string, status: JoinRequestStatus) {
  await updateDoc(doc(db, "joinRequests", requestId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

