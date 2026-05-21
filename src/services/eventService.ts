/**
 * 🔥 Event 서비스
 * 
 * 역할:
 * - Event 생성/조회
 * - Event Teams 관리
 * - Event Matches 관리
 * - Event Schedule 관리
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
  limit as firestoreLimit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createActivity } from "@/services/activity/activityFactory";
import type { Event, EventTeam, EventMatch, EventSchedule, EventDivision, EventAward } from "@/types/event";

/**
 * Event 생성
 */
export async function createEvent(input: {
  name: string;
  type: Event["type"];
  sportType: string;
  regionCode: string;
  seasonId: string;
  organizationId?: string;  // Organization ID (선택적, 있으면 자동 설정)
  organizer: string;
  organizerId?: string;
  sponsor?: string | null;
  startDate: Date;
  endDate: Date;
  description?: string;
  createdBy: string;
}): Promise<string> {
  const eventData: Omit<Event, "id"> = {
    name: input.name,
    type: input.type,
    sportType: input.sportType,
    regionCode: input.regionCode,
    seasonId: input.seasonId,
    organizationId: input.organizationId || undefined,  // Organization 연결
    organizer: input.organizer,
    organizerId: input.organizerId,
    sponsor: input.sponsor || null,
    startDate: Timestamp.fromDate(input.startDate),
    endDate: Timestamp.fromDate(input.endDate),
    status: "scheduled",
    description: input.description,
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
  };

  const eventRef = await addDoc(collection(db, "events"), eventData);
  const eventId = eventRef.id;

  try {
    await createActivity({
      type: "team_event",
      refId: eventId,
      authorId: input.createdBy,
      title: input.name.trim(),
      summary: input.description?.trim() || undefined,
      sport: (input.sportType || "soccer").toLowerCase().trim(),
      refType: "events",
      refCollection: "events",
      visibility: "public",
    });
  } catch (e) {
    console.warn("⚠️ [createEvent] activities 기록 실패 (이벤트는 저장됨):", e);
  }

  return eventId;
}

/**
 * Event 조회
 */
export async function getEvent(eventId: string): Promise<Event | null> {
  const eventDoc = await getDoc(doc(db, "events", eventId));
  
  if (!eventDoc.exists()) {
    return null;
  }

  return { id: eventDoc.id, ...eventDoc.data() } as Event;
}

/**
 * Event 목록 조회
 */
export async function getEvents(options?: {
  seasonId?: string;
  regionCode?: string;
  organizationId?: string;  // Organization별 필터
  type?: Event["type"];
  status?: Event["status"];
  limit?: number;
}): Promise<Event[]> {
  let q: any = collection(db, "events");

  if (options?.seasonId) {
    q = query(q, where("seasonId", "==", options.seasonId));
  }

  if (options?.regionCode) {
    q = query(q, where("regionCode", "==", options.regionCode));
  }

  if (options?.organizationId) {
    q = query(q, where("organizationId", "==", options.organizationId));
  }

  if (options?.type) {
    q = query(q, where("type", "==", options.type));
  }

  if (options?.status) {
    q = query(q, where("status", "==", options.status));
  }

  q = query(q, orderBy("startDate", "asc"));

  if (options?.limit) {
    q = query(q, firestoreLimit(options.limit));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Event[];
}

/**
 * Event Team 등록
 */
export async function registerEventTeam(input: {
  eventId: string;
  teamId: string;
  teamName: string;
  division?: string;
  category?: string;
}): Promise<string> {
  const eventTeamData: Omit<EventTeam, "id" | "createdAt"> = {
    eventId: input.eventId,
    teamId: input.teamId,
    teamName: input.teamName,
    division: input.division,
    category: input.category,
    joinedAt: serverTimestamp(),
    status: "registered",
  };

  const eventTeamRef = await addDoc(collection(db, "event_teams"), eventTeamData);
  return eventTeamRef.id;
}

/**
 * Event Teams 조회
 */
export async function getEventTeams(eventId: string): Promise<EventTeam[]> {
  const q = query(
    collection(db, "event_teams"),
    where("eventId", "==", eventId),
    orderBy("joinedAt", "asc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as EventTeam[];
}

/**
 * Event Match 생성
 */
export async function createEventMatch(input: {
  eventId: string;
  round: string;
  division?: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  scheduledAt: Date;
  location?: string;
  address?: string;
}): Promise<string> {
  const eventMatchData: Omit<EventMatch, "id" | "createdAt"> = {
    eventId: input.eventId,
    round: input.round,
    division: input.division,
    homeTeamId: input.homeTeamId,
    homeTeamName: input.homeTeamName,
    awayTeamId: input.awayTeamId,
    awayTeamName: input.awayTeamName,
    scheduledAt: Timestamp.fromDate(input.scheduledAt),
    location: input.location,
    address: input.address,
    status: "scheduled",
  };

  const eventMatchRef = await addDoc(collection(db, "event_matches"), eventMatchData);
  return eventMatchRef.id;
}

/**
 * Event Matches 조회
 */
export async function getEventMatches(eventId: string, options?: {
  round?: string;
  division?: string;
  status?: EventMatch["status"];
}): Promise<EventMatch[]> {
  let q: any = query(
    collection(db, "event_matches"),
    where("eventId", "==", eventId)
  );

  if (options?.round) {
    q = query(q, where("round", "==", options.round));
  }

  if (options?.division) {
    q = query(q, where("division", "==", options.division));
  }

  if (options?.status) {
    q = query(q, where("status", "==", options.status));
  }

  q = query(q, orderBy("scheduledAt", "asc"));

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as EventMatch[];
}

/**
 * Event Match 결과 입력
 */
export async function updateEventMatchResult(
  matchId: string,
  result: {
    homeScore: number;
    awayScore: number;
    winnerTeamId: string | null;
  }
): Promise<void> {
  await updateDoc(doc(db, "event_matches", matchId), {
    homeScore: result.homeScore,
    awayScore: result.awayScore,
    winnerTeamId: result.winnerTeamId,
    status: "completed",
    updatedAt: serverTimestamp(),
  });
}

/**
 * Event Schedule 생성
 */
export async function createEventSchedule(input: {
  eventId: string;
  date: Date;
  location: string;
  address?: string;
  matchIds: string[];
}): Promise<string> {
  const eventScheduleData: Omit<EventSchedule, "id" | "createdAt"> = {
    eventId: input.eventId,
    date: Timestamp.fromDate(input.date),
    location: input.location,
    address: input.address,
    matchIds: input.matchIds,
  };

  const eventScheduleRef = await addDoc(collection(db, "event_schedule"), eventScheduleData);
  return eventScheduleRef.id;
}

/**
 * Event Schedule 조회
 */
export async function getEventSchedule(eventId: string): Promise<EventSchedule[]> {
  const q = query(
    collection(db, "event_schedule"),
    where("eventId", "==", eventId),
    orderBy("date", "asc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as EventSchedule[];
}

/**
 * Event Awards 조회 (Champion/Runner-up)
 */
export async function getEventAwards(eventId: string, divisionId?: string): Promise<EventAward[]> {
  const constraints = [where("eventId", "==", eventId)];
  
  if (divisionId) {
    constraints.push(where("divisionId", "==", divisionId));
  }

  const q = query(
    collection(db, "event_awards"),
    ...constraints,
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as EventAward[];
}
