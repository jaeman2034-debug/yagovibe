/**
 * 🔥 경기장·시간 자동 배정 (일정표 자동 생성)
 * 
 * 이미 생성된 경기(match)를 기준으로 규칙에 따라 '경기장/날짜/시간'을 1회 자동 배정합니다.
 * (생성 ≠ 배정, 책임 분리)
 */

import { collection, doc, getDocs, updateDoc, query, where, writeBatch, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MatchOps } from "@/types/tournament";

export interface AutoAssignScheduleOptions {
  associationId: string;
  tournamentId: string;
  adminId: string;
  dateRange: {
    start: string;  // ISO date (YYYY-MM-DD)
    end: string;    // ISO date (YYYY-MM-DD)
  };
  timeSlots: string[];  // ["09:00", "10:30", "12:00", "13:30", "15:00"]
  facilities: string[];  // ["FAC_A", "FAC_B"]
  restRule?: {
    minRestMinutes: number;  // 동일 팀 최소 휴식 시간 (분, 기본 90분)
  };
  priority?: {
    groupFirst: boolean;  // 조별 우선 배정 여부 (기본 true)
  };
}

export interface AutoAssignScheduleResult {
  success: boolean;
  totalMatches: number;
  scheduledMatches: number;
  failedMatches: number;
  warnings: string[];
  schedule: {
    dateRange: { start: string; end: string };
    facilities: string[];
    timeSlots: string[];
  };
}

interface ScheduleSlot {
  date: string;
  facility: string;
  timeSlot: string;
  available: boolean;
}

interface MatchWithPriority extends MatchOps {
  priority: number;
}

/**
 * 날짜 범위 생성
 */
function generateDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split("T")[0]);
  }
  
  return dates;
}

/**
 * 시간 차이 계산 (분)
 */
function getTimeDifferenceInMinutes(
  date1: string,
  time1: string,
  date2: string,
  time2: string
): number {
  const datetime1 = new Date(`${date1}T${time1}`);
  const datetime2 = new Date(`${date2}T${time2}`);
  return (datetime2.getTime() - datetime1.getTime()) / (1000 * 60);
}

/**
 * 경기 우선순위 정렬
 */
function sortMatchesByPriority(
  matches: MatchOps[],
  priority: { groupFirst: boolean }
): MatchWithPriority[] {
  return matches
    .map((match) => {
      let priorityScore = 0;
      
      // 조별 우선
      if (priority.groupFirst) {
        if (match.phase === "GROUP") priorityScore += 1000;
        if (match.phase === "KNOCKOUT") priorityScore += 500;
      }
      
      // 같은 조 내에서 round 순서
      if (match.round) {
        priorityScore += (10 - match.round) * 10;
      }
      
      return { ...match, priority: priorityScore };
    })
    .sort((a, b) => b.priority - a.priority);
}

/**
 * 휴식 규칙 검증
 */
function canAssignMatch(
  match: MatchOps,
  slot: ScheduleSlot,
  teamAssignments: Map<string, ScheduleSlot[]>,
  minRestMinutes: number
): boolean {
  const homeTeamId = match.homeTeamId;
  const awayTeamId = match.awayTeamId;
  
  // 홈팀 이전 배정 확인
  const homePrevious = teamAssignments.get(homeTeamId) || [];
  if (homePrevious.length > 0) {
    const lastSlot = homePrevious[homePrevious.length - 1];
    const timeDiff = getTimeDifferenceInMinutes(
      lastSlot.date,
      lastSlot.timeSlot,
      slot.date,
      slot.timeSlot
    );
    if (timeDiff < minRestMinutes) return false;
  }
  
  // 원정팀 이전 배정 확인
  const awayPrevious = teamAssignments.get(awayTeamId) || [];
  if (awayPrevious.length > 0) {
    const lastSlot = awayPrevious[awayPrevious.length - 1];
    const timeDiff = getTimeDifferenceInMinutes(
      lastSlot.date,
      lastSlot.timeSlot,
      slot.date,
      slot.timeSlot
    );
    if (timeDiff < minRestMinutes) return false;
  }
  
  return true;
}

/**
 * 경기장·시간 자동 배정
 */
export async function autoAssignSchedule(
  options: AutoAssignScheduleOptions
): Promise<AutoAssignScheduleResult> {
  const {
    associationId,
    tournamentId,
    adminId,
    dateRange,
    timeSlots,
    facilities,
    restRule = { minRestMinutes: 90 },
    priority = { groupFirst: true },
  } = options;

  // 1️⃣ 미배정 경기 조회
  const matchesRef = collection(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/matches`
  );
  const matchesQuery = query(matchesRef, where("status", "==", "UNSCHEDULED"));
  const matchesSnap = await getDocs(matchesQuery);
  
  const unscheduledMatches = matchesSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as MatchOps[];

  if (unscheduledMatches.length === 0) {
    throw new Error("배정할 경기가 없습니다.");
  }

  // 2️⃣ 날짜 × 경기장 × 시간슬롯 그리드 생성
  const dates = generateDateRange(dateRange.start, dateRange.end);
  const grid: ScheduleSlot[] = [];
  
  for (const date of dates) {
    for (const facility of facilities) {
      for (const timeSlot of timeSlots) {
        grid.push({ date, facility, timeSlot, available: true });
      }
    }
  }

  // 3️⃣ 경기 우선순위 정렬
  const sortedMatches = sortMatchesByPriority(unscheduledMatches, priority);

  // 4️⃣ 배정 실행
  const assignments: Array<{ matchId: string; slot: ScheduleSlot }> = [];
  const teamAssignments = new Map<string, ScheduleSlot[]>();
  const warnings: string[] = [];
  let failedCount = 0;

  for (const match of sortedMatches) {
    let assigned = false;

    for (const slot of grid) {
      if (!slot.available) continue;

      // 휴식 규칙 검증
      if (canAssignMatch(match, slot, teamAssignments, restRule.minRestMinutes)) {
        // 배정
        assignments.push({ matchId: match.id, slot });
        slot.available = false;

        // 팀별 배정 기록
        const homeTeamId = match.homeTeamId;
        const awayTeamId = match.awayTeamId;
        
        if (!teamAssignments.has(homeTeamId)) {
          teamAssignments.set(homeTeamId, []);
        }
        if (!teamAssignments.has(awayTeamId)) {
          teamAssignments.set(awayTeamId, []);
        }
        
        teamAssignments.get(homeTeamId)!.push(slot);
        teamAssignments.get(awayTeamId)!.push(slot);

        assigned = true;
        break;
      }
    }

    if (!assigned) {
      failedCount++;
      warnings.push(`경기 ${match.id} (${match.homeTeam} vs ${match.awayTeam}) 배정 실패: 슬롯 부족 또는 휴식 규칙 위반`);
    }
  }

  // 5️⃣ 슬롯 부족 확인
  if (failedCount > 0) {
    warnings.push(
      `⚠️ ${failedCount}개 경기를 배정하지 못했습니다. 날짜 범위를 늘리거나 시간 슬롯을 추가해주세요.`
    );
  }

  // 6️⃣ Firestore 업데이트 (배치)
  const batch = writeBatch(db);
  
  for (const { matchId, slot } of assignments) {
    const matchRef = doc(matchesRef, matchId);
    batch.update(matchRef, {
      schedule: {
        date: slot.date,
        time: slot.timeSlot,
        facilityId: slot.facility,
      },
      status: "SCHEDULED",
      scheduledAt: serverTimestamp(),
      scheduledBy: adminId,
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();

  // 7️⃣ 일정표 뷰 업데이트 (비동기, 실패해도 무시)
  try {
    await updateScheduleViews(associationId, tournamentId, assignments);
  } catch (error) {
    console.error("일정표 뷰 업데이트 실패:", error);
    warnings.push("일정표 뷰 업데이트 중 오류가 발생했습니다. 경기는 정상적으로 배정되었습니다.");
  }

  return {
    success: true,
    totalMatches: unscheduledMatches.length,
    scheduledMatches: assignments.length,
    failedMatches: failedCount,
    warnings,
    schedule: {
      dateRange,
      facilities,
      timeSlots,
    },
  };
}

/**
 * 일정표 뷰 업데이트
 */
async function updateScheduleViews(
  associationId: string,
  tournamentId: string,
  assignments: Array<{ matchId: string; slot: ScheduleSlot }>
): Promise<void> {
  const { collection: col, doc: docRef, setDoc, serverTimestamp } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");

  // 날짜별 그룹화
  const byDate: Record<string, typeof assignments> = {};
  for (const assignment of assignments) {
    const date = assignment.slot.date;
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(assignment);
  }

  // 경기장별 그룹화
  const byFacility: Record<string, Record<string, typeof assignments>> = {};
  for (const assignment of assignments) {
    const facility = assignment.slot.facility;
    const date = assignment.slot.date;
    if (!byFacility[facility]) byFacility[facility] = {};
    if (!byFacility[facility][date]) byFacility[facility][date] = [];
    byFacility[facility][date].push(assignment);
  }

  // 날짜별 일정표 업데이트
  for (const [date, dateAssignments] of Object.entries(byDate)) {
    const scheduleRef = docRef(
      db,
      `associations/${associationId}/tournaments/${tournamentId}/matchSchedule/${date}`
    );
    await setDoc(
      scheduleRef,
      {
        date,
        tournamentId,
        matches: dateAssignments.map((a) => ({
          matchId: a.matchId,
          facilityId: a.slot.facility,
          time: a.slot.timeSlot,
        })),
        totalMatches: dateAssignments.length,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  // 경기장별 일정표 업데이트
  for (const [facility, facilityDates] of Object.entries(byFacility)) {
    for (const [date, dateAssignments] of Object.entries(facilityDates)) {
      const venueScheduleRef = docRef(
        db,
        `associations/${associationId}/tournaments/${tournamentId}/venueSchedule/${facility}/${date}`
      );
      await setDoc(
        venueScheduleRef,
        {
          venueId: facility,
          date,
          tournamentId,
          matches: dateAssignments.map((a) => ({
            matchId: a.matchId,
            time: a.slot.timeSlot,
          })),
          totalMatches: dateAssignments.length,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  }
}

