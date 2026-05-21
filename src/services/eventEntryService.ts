/**
 * 🔥 Event Entry 서비스
 * 
 * 역할:
 * - Event 참가 신청
 * - 참가 승인/거부
 * - 참가 팀 조회
 */

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { EventEntry } from "@/types/event";

/**
 * Event 참가 신청
 */
export async function applyEventEntry(input: {
  eventId: string;
  divisionId: string;
  teamId: string;
  teamName: string;
  seasonId?: string;
  message?: string;
  appliedBy: string;
}): Promise<string> {
  // 중복 신청 체크
  const existingQuery = query(
    collection(db, "event_entries"),
    where("eventId", "==", input.eventId),
    where("divisionId", "==", input.divisionId),
    where("teamId", "==", input.teamId)
  );

  const existingSnap = await getDocs(existingQuery);
  if (!existingSnap.empty) {
    throw new Error("이미 참가 신청한 이벤트입니다.");
  }

  const entryData: Omit<EventEntry, "id" | "createdAt" | "updatedAt"> = {
    eventId: input.eventId,
    divisionId: input.divisionId,
    teamId: input.teamId,
    teamName: input.teamName,
    seasonId: input.seasonId || null,
    applicationStatus: "pending",
    message: input.message || null,
    appliedBy: input.appliedBy,
    appliedAt: serverTimestamp() as Timestamp,
  };

  const entryRef = await addDoc(collection(db, "event_entries"), entryData);
  return entryRef.id;
}

/**
 * Event Entry 조회
 */
export async function getEventEntry(entryId: string): Promise<EventEntry | null> {
  const entryDoc = await getDoc(doc(db, "event_entries", entryId));
  
  if (!entryDoc.exists()) {
    return null;
  }

  return { id: entryDoc.id, ...entryDoc.data() } as EventEntry;
}

/**
 * Event 참가 팀 목록 조회
 */
export async function getEventEntries(options: {
  eventId: string;
  divisionId?: string;
  applicationStatus?: EventEntry["applicationStatus"];
}): Promise<EventEntry[]> {
  let q: any = query(
    collection(db, "event_entries"),
    where("eventId", "==", options.eventId)
  );

  if (options.divisionId) {
    q = query(q, where("divisionId", "==", options.divisionId));
  }

  if (options.applicationStatus) {
    q = query(q, where("applicationStatus", "==", options.applicationStatus));
  }

  q = query(q, orderBy("appliedAt", "asc"));

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as EventEntry[];
}

/**
 * Event Entry 승인
 */
export async function approveEventEntry(
  entryId: string,
  approvedBy: string
): Promise<void> {
  await updateDoc(doc(db, "event_entries", entryId), {
    applicationStatus: "approved",
    approvedBy,
    approvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Event Entry 거부
 */
export async function rejectEventEntry(
  entryId: string,
  rejectedBy: string,
  reason?: string
): Promise<void> {
  await updateDoc(doc(db, "event_entries", entryId), {
    applicationStatus: "rejected",
    rejectedBy,
    rejectedAt: serverTimestamp(),
    rejectionReason: reason || null,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Event Entry 취소
 */
export async function cancelEventEntry(
  entryId: string,
  cancelledBy: string
): Promise<void> {
  await updateDoc(doc(db, "event_entries", entryId), {
    applicationStatus: "cancelled",
    cancelledBy,
    cancelledAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
