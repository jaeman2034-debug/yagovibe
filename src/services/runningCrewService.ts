/**
 * 🏃 러닝 크루 서비스
 * 
 * 크루 생성, 참가, 출석 처리 등
 */

import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import type { RunningCrew, RunningCrewSession, RunningCrewMember } from "@/types/runningCrew";
import { inferDestination } from "./movementInference";
import { getCurrentTimeContext } from "./movementInference";

/**
 * 크루 생성
 */
export async function createRunningCrew(
  userId: string,
  data: Omit<RunningCrew, "id" | "members" | "captainId" | "createdAt" | "updatedAt">
): Promise<string> {
  const crewData = {
    ...data,
    captainId: userId,
    members: [
      {
        userId,
        joinedAt: new Date(),
        status: "active" as const,
        stats: {
          totalSessions: 0,
          consecutiveDays: 0,
        },
      },
    ],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "running_crews"), crewData);
  return docRef.id;
}

/**
 * 크루 참가
 */
export async function joinRunningCrew(
  crewId: string,
  userId: string
): Promise<void> {
  const crewRef = doc(db, "running_crews", crewId);
  const crewDoc = await getDoc(crewRef);

  if (!crewDoc.exists()) {
    throw new Error("크루를 찾을 수 없습니다");
  }

  const crew = crewDoc.data() as RunningCrew;
  const isAlreadyMember = crew.members.some((m) => m.userId === userId);

  if (isAlreadyMember) {
    return; // 이미 멤버
  }

  const newMember: RunningCrewMember = {
    userId,
    joinedAt: new Date(),
    status: "active",
    stats: {
      totalSessions: 0,
      consecutiveDays: 0,
    },
  };

  await updateDoc(crewRef, {
    members: [...crew.members, newMember],
    updatedAt: serverTimestamp(),
  });
}

/**
 * 집결지 자동 추론
 */
export async function inferMeetingPoint(
  crewId: string,
  userId: string
): Promise<{ lat: number; lng: number; name: string } | null> {
  try {
    // 크루 정보 로드
    const crewDoc = await getDoc(doc(db, "running_crews", crewId));
    if (!crewDoc.exists()) {
      return null;
    }

    const crew = crewDoc.data() as RunningCrew;

    // 이미 집결지가 설정되어 있으면 그대로 사용
    if (crew.meetingPoint) {
      return crew.meetingPoint;
    }

    // 집결지가 없으면 사용자의 최근 이동 패턴으로 추론
    const timeContext = getCurrentTimeContext();
    const result = await inferDestination(userId, {
      ...timeContext,
      lat: 0, // 실제로는 사용자 위치 필요
      lng: 0,
    });

    return result.destination;
  } catch (error) {
    console.error("❌ [runningCrewService] 집결지 추론 실패:", error);
    return null;
  }
}

/**
 * 오늘 세션 생성 또는 가져오기
 */
export async function getOrCreateTodaySession(crewId: string): Promise<string> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 오늘 세션 찾기
  const sessionsQuery = query(
    collection(db, "running_crews", crewId, "sessions"),
    where("scheduledAt", ">=", today),
    where("scheduledAt", "<", tomorrow)
  );

  const snapshot = await getDocs(sessionsQuery);

  if (!snapshot.empty) {
    return snapshot.docs[0].id;
  }

  // 세션이 없으면 생성
  const crewDoc = await getDoc(doc(db, "running_crews", crewId));
  if (!crewDoc.exists()) {
    throw new Error("크루를 찾을 수 없습니다");
  }

  const crew = crewDoc.data() as RunningCrew;

  // 오늘 날짜 + 첫 번째 정기 모임 시간
  const todaySchedule = crew.regularSchedule.find(
    (s) => s.dayOfWeek === today.getDay()
  );

  if (!todaySchedule) {
    throw new Error("오늘 예정된 모임이 없습니다");
  }

  const [hours, minutes] = todaySchedule.time.split(":").map(Number);
  const scheduledAt = new Date(today);
  scheduledAt.setHours(hours, minutes, 0, 0);

  const sessionData: Omit<RunningCrewSession, "id"> = {
    crewId,
    scheduledAt,
    attendees: [],
    status: "scheduled",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const docRef = await addDoc(
    collection(db, "running_crews", crewId, "sessions"),
    sessionData
  );

  return docRef.id;
}

/**
 * 출석 처리 (도착 시)
 */
export async function checkInToSession(
  crewId: string,
  sessionId: string,
  userId: string,
  movementSessionId?: string
): Promise<void> {
  const sessionRef = doc(db, "running_crews", crewId, "sessions", sessionId);
  const sessionDoc = await getDoc(sessionRef);

  if (!sessionDoc.exists()) {
    throw new Error("세션을 찾을 수 없습니다");
  }

  const session = sessionDoc.data() as RunningCrewSession;

  // 이미 출석 처리되어 있는지 확인
  const existingAttendance = session.attendees.find((a) => a.userId === userId);

  if (existingAttendance) {
    // 이미 출석 처리됨, 상태만 업데이트
    const updatedAttendees = session.attendees.map((a) =>
      a.userId === userId
        ? {
            ...a,
            status: "arrived" as const,
            arrivedAt: new Date(),
            movementSessionId,
          }
        : a
    );

    await updateDoc(sessionRef, {
      attendees: updatedAttendees,
      updatedAt: serverTimestamp(),
    });
  } else {
    // 새 출석 추가
    await updateDoc(sessionRef, {
      attendees: [
        ...session.attendees,
        {
          userId,
          status: "arrived" as const,
          arrivedAt: new Date(),
          movementSessionId,
        },
      ],
      updatedAt: serverTimestamp(),
    });
  }

  // 크루원 통계 업데이트
  const crewRef = doc(db, "running_crews", crewId);
  const crewDoc = await getDoc(crewRef);

  if (crewDoc.exists()) {
    const crew = crewDoc.data() as RunningCrew;
    const member = crew.members.find((m) => m.userId === userId);

    if (member) {
      const updatedMembers = crew.members.map((m) =>
        m.userId === userId
          ? {
              ...m,
              stats: {
                ...m.stats,
                totalSessions: m.stats.totalSessions + 1,
                lastAttendedAt: new Date(),
                consecutiveDays: m.stats.consecutiveDays + 1, // 간단한 로직
              },
            }
          : m
      );

      await updateDoc(crewRef, {
        members: updatedMembers,
        updatedAt: serverTimestamp(),
      });
    }
  }
}

/**
 * 출발 시작 (departing 상태로 변경)
 */
export async function startDeparture(
  crewId: string,
  sessionId: string,
  userId: string
): Promise<void> {
  const sessionRef = doc(db, "running_crews", crewId, "sessions", sessionId);
  const sessionDoc = await getDoc(sessionRef);

  if (!sessionDoc.exists()) {
    throw new Error("세션을 찾을 수 없습니다");
  }

  const session = sessionDoc.data() as RunningCrewSession;

  // 출발 상태로 추가 또는 업데이트
  const existingAttendance = session.attendees.find((a) => a.userId === userId);

  if (existingAttendance) {
    const updatedAttendees = session.attendees.map((a) =>
      a.userId === userId
        ? {
            ...a,
            status: "departing" as const,
            departedAt: new Date(),
          }
        : a
    );

    await updateDoc(sessionRef, {
      attendees: updatedAttendees,
      updatedAt: serverTimestamp(),
    });
  } else {
    await updateDoc(sessionRef, {
      attendees: [
        ...session.attendees,
        {
          userId,
          status: "departing" as const,
          departedAt: new Date(),
        },
      ],
      updatedAt: serverTimestamp(),
    });
  }
}
