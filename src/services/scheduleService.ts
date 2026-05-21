/**
 * 🔥 일정 서비스
 * 
 * 역할:
 * - 일정 생성/수정/삭제
 * - Firestore 저장
 * - 일정 조회
 */

import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type ScheduleType = "training" | "match";

export interface CreateScheduleParams {
  teamId: string;
  creatorUid: string;
  type: ScheduleType;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  locationName: string;
  locationLat?: number;
  locationLng?: number;
  memo?: string;
}

export interface ScheduleDocument {
  id: string;
  teamId: string;
  creatorUid: string;
  type: ScheduleType;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  startDateTime: Timestamp;
  endDateTime: Timestamp;
  locationName: string;
  locationLat?: number | null;
  locationLng?: number | null;
  memo?: string | null;
  createdAt: Timestamp;
}

/**
 * 🔥 일정 생성
 */
export async function createSchedule(params: CreateScheduleParams): Promise<string> {
  if (!params.teamId || !params.creatorUid || !params.title || !params.locationName) {
    throw new Error("필수 정보가 누락되었습니다");
  }

  // 날짜/시간 결합
  const startDateTime = new Date(`${params.date}T${params.startTime}:00`);
  const endDateTime = new Date(`${params.date}T${params.endTime}:00`);
  
  // Firestore Timestamp로 변환
  const startTimestamp = Timestamp.fromDate(startDateTime);
  const endTimestamp = Timestamp.fromDate(endDateTime);

  // 🔥 teamId 검증 (teams 컬렉션 문서 ID여야 함)
  console.log("🔍 [createSchedule] 일정 생성:", {
    teamId: params.teamId,
    teamIdType: typeof params.teamId,
    creatorUid: params.creatorUid
  });

  // 🔥 teamSchedules 컬렉션에 저장 (새 구조)
  const scheduleRef = await addDoc(collection(db, "teamSchedules"), {
    teamId: params.teamId, // 🔥 teams 컬렉션의 문서 ID
    creatorUid: params.creatorUid,
    type: params.type,
    title: params.title.trim(),
    date: params.date,
    startTime: params.startTime,
    endTime: params.endTime,
    startDateTime: startTimestamp,
    endDateTime: endTimestamp,
    locationName: params.locationName.trim(),
    locationLat: params.locationLat || null,
    locationLng: params.locationLng || null,
    memo: params.memo?.trim() || null,
    createdAt: serverTimestamp(),
  });

  console.log("✅ [createSchedule] teamSchedules 저장 완료:", {
    scheduleId: scheduleRef.id,
    teamId: params.teamId
  });

  // 🔥 기존 schedules 컬렉션에도 저장 (호환성)
  await addDoc(collection(db, "schedules"), {
    teamId: params.teamId,
    type: params.type === "training" ? "훈련" : "경기",
    title: params.title.trim(),
    dateTime: startTimestamp,
    place: params.locationName.trim(),
    placeCoordinates: params.locationLat && params.locationLng
      ? { lat: params.locationLat, lng: params.locationLng }
      : undefined,
    isPublic: false,
    needsSubstitute: false,
    creatorId: params.creatorUid,
    createdBy: params.creatorUid, // 🔥 Firestore Rules에서 체크하는 필드
    createdAt: serverTimestamp(),
  });

  return scheduleRef.id;
}

/**
 * 🔥 일정 수정
 */
export async function updateSchedule(
  scheduleId: string,
  updates: Partial<CreateScheduleParams>
): Promise<void> {
  const ref = doc(db, "teamSchedules", scheduleId);
  
  const updateData: any = {
    updatedAt: serverTimestamp(),
  };

  if (updates.title) updateData.title = updates.title.trim();
  if (updates.date) updateData.date = updates.date;
  if (updates.startTime) updateData.startTime = updates.startTime;
  if (updates.endTime) updateData.endTime = updates.endTime;
  if (updates.locationName) updateData.locationName = updates.locationName.trim();
  if (updates.locationLat !== undefined) updateData.locationLat = updates.locationLat;
  if (updates.locationLng !== undefined) updateData.locationLng = updates.locationLng;
  if (updates.memo !== undefined) updateData.memo = updates.memo?.trim() || null;

  // 날짜/시간이 변경되면 Timestamp도 업데이트
  if (updates.date || updates.startTime || updates.endTime) {
    const currentData = (await import("firebase/firestore")).getDoc(ref);
    // 실제 구현 시 현재 데이터를 가져와서 결합
  }

  await updateDoc(ref, updateData);
}

/**
 * 🔥 일정 삭제
 */
export async function deleteSchedule(scheduleId: string): Promise<void> {
  await deleteDoc(doc(db, "teamSchedules", scheduleId));
}

/**
 * 🔥 팀 일정 조회 (일회성)
 * 
 * 실시간 구독이 필요 없을 때 사용
 */
export async function fetchTeamSchedules(teamIds: string[]): Promise<ScheduleDocument[]> {
  if (!teamIds.length) return [];

  // 🔥 Firestore 'in' 쿼리 제한: 최대 10개
  const teamIdsBatch = teamIds.slice(0, 10);

  const q = query(
    collection(db, "teamSchedules"),
    where("teamId", "in", teamIdsBatch),
    orderBy("startDateTime", "asc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ScheduleDocument[];
}
