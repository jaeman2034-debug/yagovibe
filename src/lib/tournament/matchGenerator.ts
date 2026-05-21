/**
 * 🔥 경기 자동 생성 로직 (조 추첨 → 경기 생성)
 * 
 * 조 추첨 완료 후 조별 리그 방식으로 경기를 자동 생성합니다.
 * 
 * 핵심 원칙:
 * 1. 조 추첨 완료 필수 (drawDivisions 존재)
 * 2. 중복 생성 방지 (기존 경기 존재 시 에러)
 * 3. 조별 리그 방식 (각 조 내에서 모든 팀이 서로 한 번씩 경기)
 * 4. 경기장/시간 배정은 나중에 (사무국이 수동 조정)
 */

import type { Tournament } from "@/types/tournament";

/**
 * 조별 리그 경기 생성 알고리즘
 * 
 * 🔥 팀 수별 경기 생성 규칙:
 * 
 * 1. 2팀: 1경기 (A vs B)
 * 2. 3팀: 3경기 (A vs B, A vs C, B vs C)
 * 3. 4팀: 6경기 (A vs B, A vs C, A vs D, B vs C, B vs D, C vs D)
 * 4. 6팀: 15경기 (n * (n-1) / 2)
 * 5. 8팀: 28경기
 * 
 * 공식: n * (n-1) / 2 (단순 조별 리그)
 * 
 * 홈/어웨이 결정:
 * - seed 순서대로 홈/어웨이 교대
 * - 홀수 번째 경기: 낮은 seed = 홈, 높은 seed = 어웨이
 * - 짝수 번째 경기: 높은 seed = 홈, 낮은 seed = 어웨이
 * 
 * @param teams 조 내 팀 목록 (seed 순서대로 정렬됨)
 * @returns 경기 매칭 배열
 */
function generateGroupMatches(
  teams: Array<{ teamId: string; teamName: string; seed?: number }>
): Array<{ homeTeamId: string; homeTeamName: string; awayTeamId: string; awayTeamName: string }> {
  const matches: Array<{
    homeTeamId: string;
    homeTeamName: string;
    awayTeamId: string;
    awayTeamName: string;
  }> = [];

  // 팀 수가 2팀 미만이면 경기 생성 불가
  if (teams.length < 2) {
    return matches;
  }

  // seed 기준 정렬 (없으면 그대로)
  const sortedTeams = [...teams].sort((a, b) => {
    const seedA = a.seed ?? 999;
    const seedB = b.seed ?? 999;
    return seedA - seedB;
  });

  let matchIndex = 0;

  // 각 팀이 다른 모든 팀과 한 번씩 경기
  for (let i = 0; i < sortedTeams.length; i++) {
    for (let j = i + 1; j < sortedTeams.length; j++) {
      const teamA = sortedTeams[i];
      const teamB = sortedTeams[j];

      // 홈/어웨이 결정: 홀수 경기면 낮은 seed가 홈, 짝수 경기면 높은 seed가 홈
      // 이렇게 하면 각 팀이 홈/어웨이를 공평하게 치름
      const isOddMatch = matchIndex % 2 === 0;
      const homeTeam = isOddMatch ? teamA : teamB;
      const awayTeam = isOddMatch ? teamB : teamA;

      matches.push({
        homeTeamId: homeTeam.teamId,
        homeTeamName: homeTeam.teamName,
        awayTeamId: awayTeam.teamId,
        awayTeamName: awayTeam.teamName,
      });

      matchIndex++;
    }
  }

  return matches;
}

/**
 * 경기 자동 생성 옵션
 */
export interface GenerateMatchesOptions {
  associationId: string;
  tournamentId: string;
  tournament: Tournament;
  venueId?: string; // 선택적: 기본 경기장 ID (없으면 나중에 배정)
  courtNo?: number; // 선택적: 기본 코트 번호 (없으면 나중에 배정)
  startDate?: string; // 선택적: 대회 시작일 (ISO string, 없으면 tournament.startDate 사용)
  defaultMatchDuration?: number; // 기본 경기 시간 (분, 기본 40분)
  defaultMatchInterval?: number; // 경기 간격 (분, 기본 20분)
  testMode?: boolean; // 🔥 테스트 모드 (운영 기록 미반영)
}

/**
 * 경기 생성 결과
 */
export interface GenerateMatchesResult {
  totalMatches: number;
  matchesByDivision: Array<{
    division: string;
    matchCount: number;
  }>;
  createdMatchIds: string[];
  warnings: string[];
}

/**
 * 경기 자동 생성 (조 추첨 → 경기 생성)
 * 
 * 사용법:
 * ```typescript
 * const result = await generateMatchesFromDraw({
 *   associationId,
 *   tournamentId,
 *   tournament,
 * });
 * ```
 * 
 * @param options 생성 옵션
 * @returns 생성 결과
 */
export async function generateMatchesFromDraw(
  options: GenerateMatchesOptions
): Promise<GenerateMatchesResult> {
  const {
    associationId,
    tournamentId,
    tournament,
    venueId,
    courtNo = 1,
    startDate,
    defaultMatchDuration = 40,
    defaultMatchInterval = 20,
  } = options;

  // 1️⃣ 조 추첨 완료 확인
  if (!tournament.drawExecuted || !tournament.drawDivisions || tournament.drawDivisions.length === 0) {
    throw new Error("조 추첨이 완료되지 않았습니다. 먼저 조 추첨을 실행해주세요.");
  }

  // 2️⃣ 기존 경기 존재 확인 (중복 생성 방지)
  const { getMatches } = await import("./tournamentRepository");
  const existingMatches = await getMatches(associationId, tournamentId, {});
  if (existingMatches.length > 0) {
    throw new Error(
      `이미 ${existingMatches.length}개의 경기가 생성되어 있습니다. 경기 재생성은 불가능합니다.`
    );
  }

  // 3️⃣ 경기장 확인 (선택적)
  let defaultVenueId = venueId;
  if (!defaultVenueId) {
    const { getVenues } = await import("./tournamentRepository");
    const venues = await getVenues(associationId, tournamentId);
    if (venues.length > 0) {
      defaultVenueId = venues[0].id;
    } else {
      // 경기장이 없으면 경기는 생성하되 경기장 배정은 나중에
      console.warn("⚠️ 경기장이 없습니다. 경기장 배정은 나중에 수동으로 해야 합니다.");
    }
  }

  // 4️⃣ 날짜 설정
  const matchStartDate = startDate || tournament.startDate;
  const startDateObj = new Date(matchStartDate);
  startDateObj.setHours(9, 0, 0, 0); // 오전 9시 시작 (기본값)

  // 5️⃣ 조별로 경기 생성
  const allMatches: Array<{
    venueId?: string;
    courtNo: number;
    date: string;
    startTime: string;
    endTime: string;
    homeTeam: string;
    homeTeamId: string;
    awayTeam: string;
    awayTeamId: string;
  }> = [];

  const matchesByDivision: Array<{ division: string; matchCount: number }> = [];
  const warnings: string[] = [];

  let currentDate = new Date(startDateObj);
  let currentTime = new Date(currentDate);

  // 조별로 순회하며 경기 생성
  for (const division of tournament.drawDivisions) {
    const teams = division.teams;
    
    if (teams.length < 2) {
      warnings.push(`${division.division}: 팀 수가 부족합니다 (최소 2팀 필요).`);
      continue;
    }

    // 조별 리그 경기 생성
    const divisionMatches = generateGroupMatches(teams);
    
    matchesByDivision.push({
      division: division.division,
      matchCount: divisionMatches.length,
    });

    // 각 경기를 일정에 배정
    for (const match of divisionMatches) {
      // 경기 시간 설정
      const matchStartTime = new Date(currentTime);
      const matchEndTime = new Date(matchStartTime);
      matchEndTime.setMinutes(matchEndTime.getMinutes() + defaultMatchDuration);

      // 날짜 포맷: YYYY-MM-DD
      const matchDate = matchStartTime.toISOString().split("T")[0];
      
      // 시간 포맷: HH:mm
      const startTimeStr = matchStartTime.toTimeString().slice(0, 5);
      const endTimeStr = matchEndTime.toTimeString().slice(0, 5);

      allMatches.push({
        venueId: defaultVenueId,
        courtNo,
        date: matchDate,
        startTime: startTimeStr,
        endTime: endTimeStr,
        homeTeam: match.homeTeamName,
        homeTeamId: match.homeTeamId,
        awayTeam: match.awayTeamName,
        awayTeamId: match.awayTeamId,
        division: division.division, // 🔥 조 정보 추가
      });

      // 다음 경기 시간으로 이동 (경기 시간 + 간격)
      currentTime.setMinutes(currentTime.getMinutes() + defaultMatchDuration + defaultMatchInterval);

      // 하루에 너무 많은 경기가 배정되면 다음 날로 이동
      // 오후 6시 이후면 다음 날 오전 9시로 이동 (기본값)
      if (currentTime.getHours() >= 18) {
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setHours(9, 0, 0, 0);
        currentTime = new Date(currentDate);
      }
    }
  }

  // 6️⃣ 경기 데이터 저장
  if (allMatches.length === 0) {
    throw new Error("생성할 경기가 없습니다.");
  }

  // 🔥 테스트 모드 분기: 경기 저장
  let createdMatchIds: string[] = [];
  if (testMode) {
    // 🔥 테스트 모드: test_matches 컬렉션에 저장
    const { collection, doc, writeBatch, serverTimestamp } = await import("firebase/firestore");
    const { db } = await import("@/lib/firebase");
    const testMatchesRef = collection(
      db,
      `associations/${associationId}/tournaments/${tournamentId}/test_matches`
    );
    const batch = writeBatch(db);
    
    for (const match of allMatches) {
      const matchRef = doc(testMatchesRef);
      batch.set(matchRef, {
        ...match,
        tournamentId,
        status: "UNSCHEDULED",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      createdMatchIds.push(matchRef.id);
    }
    await batch.commit();
  } else {
    // 🔥 운영 모드: 기존 로직
    const { createMatchesBulk } = await import("./tournamentRepository");
    createdMatchIds = await createMatchesBulk(associationId, tournamentId, allMatches);
  }

  // 🔥 일정표 뷰 자동 생성 (날짜별, 경기장별)
  try {
    await updateScheduleViews(associationId, tournamentId, allMatches, createdMatchIds);
  } catch (error) {
    console.error("⚠️ 일정표 뷰 생성 실패 (경기는 생성됨):", error);
    warnings.push("일정표 뷰 생성 중 오류가 발생했습니다. 경기는 정상적으로 생성되었습니다.");
  }

  return {
    totalMatches: allMatches.length,
    matchesByDivision,
    createdMatchIds,
    warnings,
  };
}

/**
 * 일정표 뷰 자동 생성 (날짜별, 경기장별)
 * 
 * 경기 생성 후 자동으로 일정표 뷰를 생성하여 조회 성능을 최적화합니다.
 */
async function updateScheduleViews(
  associationId: string,
  tournamentId: string,
  matches: Array<{
    date: string;
    venueId?: string;
    courtNo: number;
    startTime: string;
    endTime: string;
    homeTeam: string;
    awayTeam: string;
    division?: string;
  }>,
  matchIds: string[]
): Promise<void> {
  const { collection, doc, setDoc, serverTimestamp } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");

  // 날짜별 그룹화
  const matchesByDate: Record<string, typeof matches> = {};
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const matchId = matchIds[i];
    const date = match.date;
    
    if (!matchesByDate[date]) {
      matchesByDate[date] = [];
    }
    
    matchesByDate[date].push({
      ...match,
      matchId,
    });
  }

  // 경기장별 그룹화
  const matchesByVenue: Record<string, Record<string, typeof matches>> = {};
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const matchId = matchIds[i];
    const venueId = match.venueId || "UNASSIGNED";
    const date = match.date;
    
    if (!matchesByVenue[venueId]) {
      matchesByVenue[venueId] = {};
    }
    if (!matchesByVenue[venueId][date]) {
      matchesByVenue[venueId][date] = [];
    }
    
    matchesByVenue[venueId][date].push({
      ...match,
      matchId,
    });
  }

  // 날짜별 일정표 업데이트
  for (const [date, dateMatches] of Object.entries(matchesByDate)) {
    const scheduleRef = doc(
      db,
      `associations/${associationId}/tournaments/${tournamentId}/matchSchedule/${date}`
    );
    await setDoc(
      scheduleRef,
      {
        date,
        tournamentId,
        matches: dateMatches.map((m) => ({
          matchId: (m as any).matchId,
          division: m.division || "",
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          startTime: m.startTime,
          endTime: m.endTime,
          venueId: m.venueId,
          courtNo: m.courtNo,
          status: "WAIT",
        })),
        totalMatches: dateMatches.length,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  // 경기장별 일정표 업데이트
  for (const [venueId, venueDates] of Object.entries(matchesByVenue)) {
    for (const [date, dateMatches] of Object.entries(venueDates)) {
      const venueScheduleRef = doc(
        db,
        `associations/${associationId}/tournaments/${tournamentId}/venueSchedule/${venueId}/${date}`
      );
      await setDoc(
        venueScheduleRef,
        {
          venueId,
          date,
          tournamentId,
          matches: dateMatches.map((m) => ({
            matchId: (m as any).matchId,
            division: m.division || "",
            homeTeam: m.homeTeam,
            awayTeam: m.awayTeam,
            startTime: m.startTime,
            endTime: m.endTime,
            courtNo: m.courtNo,
            status: "WAIT",
          })),
          totalMatches: dateMatches.length,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  }
}

/**
 * 조별 경기 수 계산 (유틸리티)
 * 
 * @param teamCount 조 내 팀 수
 * @returns 총 경기 수
 */
export function calculateGroupMatchCount(teamCount: number): number {
  if (teamCount < 2) return 0;
  return (teamCount * (teamCount - 1)) / 2;
}

/**
 * 전체 경기 수 계산 (유틸리티)
 * 
 * @param divisions 조 목록
 * @returns 전체 경기 수
 */
export function calculateTotalMatchCount(
  divisions: Array<{ teams: Array<{ teamId: string }> }>
): number {
  return divisions.reduce((total, division) => {
    return total + calculateGroupMatchCount(division.teams.length);
  }, 0);
}

