/**
 * 🔥 Guest Player Service - 용병 관련 Firestore 작업
 */

import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { GuestPlayer, CreateGuestPlayerInput, GuestPlayerApplication } from "@/types/guest";

/**
 * 용병 모집글 생성
 */
export async function createGuestPlayer(
  input: CreateGuestPlayerInput,
  authorId: string
): Promise<string> {
  const guestData = {
    authorId,
    sport: input.sport, // 🔥 필수 필드: 사용자가 선택
    date: Timestamp.fromDate(input.date),
    time: input.time,
    region: input.region,
    stadium: input.stadium,
    position: input.position,
    slots: input.slots,
    fee: input.fee,
    description: input.description,
    status: "open" as const,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "guest_players"), guestData);
  return docRef.id;
}

/**
 * 용병 모집글 조회 (전체)
 */
export async function getGuestPlayers(options?: {
  status?: "open" | "closed";
  sport?: string; // 🔥 멀티 스포츠 필터 추가
  region?: string; // ✅ 이미 존재
  date?: Date; // 특정 날짜의 용병만 조회
  limit?: number;
}): Promise<GuestPlayer[]> {
  const conditions: any[] = [];
  
  if (options?.status) {
    conditions.push(where("status", "==", options.status));
  }
  
  if (options?.sport) {
    conditions.push(where("sport", "==", options.sport));
  }
  
  if (options?.region) {
    conditions.push(where("region", "==", options.region));
  }
  
  if (options?.date) {
    const startOfDay = Timestamp.fromDate(new Date(options.date.setHours(0, 0, 0, 0)));
    const endOfDay = Timestamp.fromDate(new Date(options.date.setHours(23, 59, 59, 999)));
    conditions.push(where("date", ">=", startOfDay));
    conditions.push(where("date", "<=", endOfDay));
  }
  
  conditions.push(orderBy("date", "asc"));
  conditions.push(orderBy("time", "asc"));
  
  if (options?.limit) {
    conditions.push(limit(options.limit));
  }

  const q = query(collection(db, "guest_players"), ...conditions);
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as GuestPlayer[];
}

/**
 * 특정 용병 모집글 조회
 */
export async function getGuestPlayer(guestId: string): Promise<GuestPlayer | null> {
  const docRef = doc(db, "guest_players", guestId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as GuestPlayer;
}

/**
 * 용병 지원
 */
export async function applyToGuestPlayer(
  guestId: string,
  userId: string,
  userName?: string,
  message?: string
): Promise<string> {
  const applicationData = {
    guestId,
    userId,
    userName,
    message,
    status: "pending" as const,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "guest_applications"), applicationData);
  return docRef.id;
}

/**
 * 용병 지원 목록 조회
 */
export async function getGuestApplications(guestId: string): Promise<GuestPlayerApplication[]> {
  const q = query(
    collection(db, "guest_applications"),
    where("guestId", "==", guestId),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as GuestPlayerApplication[];
}
