/**
 * 🔥 Recruit Service - 팀원 모집 관련 Firestore 작업
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
import type { Recruit, CreateRecruitInput, RecruitApplication } from "@/types/recruit";

/**
 * 팀원 모집글 생성
 */
export async function createRecruit(
  input: CreateRecruitInput,
  authorId: string
): Promise<string> {
  const recruitData = {
    ...input,
    authorId,
    sport: input.sport, // 🔥 필수 필드: 팀의 sportType에서 복사됨
    status: "open" as const,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "recruits"), recruitData);
  return docRef.id;
}

/**
 * 팀원 모집글 조회 (전체)
 */
export async function getRecruits(options?: {
  status?: "open" | "closed";
  sport?: string; // 🔥 멀티 스포츠 필터 추가
  region?: string; // 🔥 지역 필터 추가
  limit?: number;
}): Promise<Recruit[]> {
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
  
  conditions.push(orderBy("createdAt", "desc"));
  
  if (options?.limit) {
    conditions.push(limit(options.limit));
  }

  const q = query(collection(db, "recruits"), ...conditions);
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Recruit[];
}

/**
 * 특정 팀원 모집글 조회
 */
export async function getRecruit(recruitId: string): Promise<Recruit | null> {
  const docRef = doc(db, "recruits", recruitId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Recruit;
}

/**
 * 팀원 모집 지원
 */
export async function applyToRecruit(
  recruitId: string,
  userId: string,
  userName?: string,
  message?: string
): Promise<string> {
  const applicationData = {
    recruitId,
    userId,
    userName,
    message,
    status: "pending" as const,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "recruit_applications"), applicationData);
  return docRef.id;
}

/**
 * 팀원 모집 지원 목록 조회
 */
export async function getRecruitApplications(recruitId: string): Promise<RecruitApplication[]> {
  const q = query(
    collection(db, "recruit_applications"),
    where("recruitId", "==", recruitId),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as RecruitApplication[];
}
