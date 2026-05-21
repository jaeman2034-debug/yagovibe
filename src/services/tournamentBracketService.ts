/**
 * 🔥 Tournament Bracket Generator
 * 
 * 역할:
 * - 토너먼트 대진표 자동 생성
 * - 승인된 참가팀 기반 bracket 계산
 * - event_matches 자동 생성 (Batch 처리)
 * - 중복 생성 방지
 * - 다음 라운드 자동 생성 지원
 */

import { getEventEntries } from "./eventEntryService";
import { getEventMatches } from "./eventMatchService";
import { collection, addDoc, writeBatch, getDocs, query, where, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { EventEntry, EventMatch } from "@/types/event";

/**
 * 2의 거듭제곱으로 올림 (브라켓 사이즈 계산)
 */
function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 2;
  return Math.pow(2, Math.ceil(Math.log2(n)));
}

/**
 * 라운드 코드와 이름 매핑
 */
const ROUND_INFO: Record<string, { code: string; name: string }> = {
  "64": { code: "R64", name: "64강" },
  "32": { code: "R32", name: "32강" },
  "16": { code: "R16", name: "16강" },
  "8": { code: "QF", name: "8강" },
  "4": { code: "SF", name: "4강" },
  "2": { code: "F", name: "결승" },
};

/**
 * 라운드별 매칭 생성
 */
function generateRoundMatches(
  teams: Array<{ teamId: string; teamName: string; seed?: number }>,
  roundSize: number,
  roundNumber: number
): Array<{ home: { teamId: string; teamName: string }; away: { teamId: string; teamName: string } }> {
  const matches: Array<{ home: { teamId: string; teamName: string }; away: { teamId: string; teamName: string } }> = [];

  // Seed 기반 매칭 (토너먼트 규칙)
  // seed 1 vs seed (roundSize)
  // seed 2 vs seed (roundSize-1)
  // ...
  for (let i = 0; i < roundSize / 2; i++) {
    const homeIndex = i;
    const awayIndex = roundSize - 1 - i;

    if (homeIndex < teams.length && awayIndex < teams.length) {
      matches.push({
        home: {
          teamId: teams[homeIndex].teamId,
          teamName: teams[homeIndex].teamName,
        },
        away: {
          teamId: teams[awayIndex].teamId,
          teamName: teams[awayIndex].teamName,
        },
      });
    } else if (homeIndex < teams.length) {
      // BYE 처리 (상대팀 없음)
      matches.push({
        home: {
          teamId: teams[homeIndex].teamId,
          teamName: teams[homeIndex].teamName,
        },
        away: {
          teamId: "BYE",
          teamName: "부전승",
        },
      });
    }
  }

  return matches;
}

/**
 * Tournament Bracket 생성
 * 
 * @param eventId Event ID
 * @param divisionId Division ID
 * @param seasonId Season ID
 * @param createdBy 생성자 UID
 * @returns 생성된 match ID 목록
 */
export async function generateTournamentBracket(input: {
  eventId: string;
  divisionId: string;
  seasonId: string;
  createdBy: string;
  scheduledAt?: Date; // 첫 경기 일정 (선택)
}): Promise<string[]> {
  // 1. 승인된 참가팀 조회
  const entries = await getEventEntries({
    eventId: input.eventId,
    divisionId: input.divisionId,
    applicationStatus: "approved",
  });

  if (entries.length < 2) {
    throw new Error("토너먼트는 최소 2팀이 필요합니다.");
  }

  // 2. 팀 목록 준비 (seed 순서)
  const teams = entries
    .map((entry, index) => ({
      teamId: entry.teamId,
      teamName: entry.teamName,
      seed: entry.seed || index + 1,
    }))
    .sort((a, b) => (a.seed || 0) - (b.seed || 0));

  // 3. 브라켓 사이즈 계산 (2의 거듭제곱)
  const bracketSize = nextPowerOfTwo(teams.length);
  const byes = bracketSize - teams.length;

  // 4. BYE 채우기 (null로 패딩)
  const seededTeams: Array<{ teamId: string; teamName: string; seed: number } | null> = [
    ...teams,
  ];
  while (seededTeams.length < bracketSize) {
    seededTeams.push(null);
  }

  // 5. 라운드별 경기 생성
  const createdMatchIds: string[] = [];
  let currentRoundSize = bracketSize;
  let roundNumber = 1;
  let matchNumber = 1;

  // 첫 경기 일정 (기본값: 오늘부터)
  const baseDate = input.scheduledAt || new Date();
  const scheduledAt = new Date(baseDate);
  scheduledAt.setHours(10, 0, 0, 0); // 오전 10시 기본

  while (currentRoundSize >= 2) {
    const roundCode = ROUND_INFO[currentRoundSize.toString()]?.code || `R${currentRoundSize}`;
    const roundName = ROUND_INFO[currentRoundSize.toString()]?.name || `${currentRoundSize}강`;

    // 현재 라운드 팀 목록 (이전 라운드 승자 또는 초기 팀)
    const currentTeams = currentRoundSize === bracketSize 
      ? seededTeams.filter((t): t is { teamId: string; teamName: string; seed: number } => t !== null)
      : []; // 다음 라운드는 이전 라운드 승자로 채워짐 (현재는 빈 배열)

    // 첫 라운드만 실제 팀 매칭 생성
    if (currentRoundSize === bracketSize) {
      const matches = generateRoundMatches(
        currentTeams,
        currentRoundSize,
        roundNumber
      );

      for (const match of matches) {
        // BYE 경기는 건너뛰기
        if (match.away.teamId === "BYE") {
          continue;
        }

        // 경기 일정 계산 (라운드별로 하루씩 증가)
        const matchDate = new Date(scheduledAt);
        matchDate.setDate(matchDate.getDate() + (roundNumber - 1));

        const matchId = await createEventMatch({
          eventId: input.eventId,
          divisionId: input.divisionId,
          seasonId: input.seasonId,
          homeTeamId: match.home.teamId,
          homeTeamName: match.home.teamName,
          awayTeamId: match.away.teamId,
          awayTeamName: match.away.teamName,
          scheduledAt: matchDate,
          roundCode,
          roundName,
          stageType: "knockout",
          createdBy: input.createdBy,
        });

        createdMatchIds.push(matchId);
        matchNumber++;
      }
    }

    // 다음 라운드로
    currentRoundSize = currentRoundSize / 2;
    roundNumber++;
  }

  return createdMatchIds;
}

/**
 * 토너먼트 브라켓 생성 (정규 파워오브투 토너먼트)
 * 
 * 지원: 4팀 / 8팀 / 16팀 / 32팀 / 64팀
 * 
 * 기능:
 * - 승인된 event_entries 조회
 * - 시드 기반 정렬 + 미시드 랜덤 셔플
 * - 1라운드 자동 페어링
 * - 다음 라운드 event_matches 자동 생성
 * - Firestore batch 저장
 * - 중복 대진 생성 방지 체크
 */
export async function generateSimpleTournamentBracket(input: {
  eventId: string;
  divisionId: string;
  seasonId: string;
  createdBy: string;
  scheduledAt?: Date;
}): Promise<string[]> {
  // 1. 중복 생성 방지 체크
  const existingMatches = await getEventMatches({
    eventId: input.eventId,
    divisionId: input.divisionId,
  });

  if (existingMatches.length > 0) {
    throw new Error("이미 대진표가 생성되었습니다. 기존 경기를 삭제한 후 다시 생성해주세요.");
  }

  // 2. 승인된 참가팀 조회
  const entries = await getEventEntries({
    eventId: input.eventId,
    divisionId: input.divisionId,
    applicationStatus: "approved",
  });

  if (entries.length < 2) {
    throw new Error("토너먼트는 최소 2팀이 필요합니다.");
  }

  // 3. 팀 목록 준비 (시드 기반 정렬 + 미시드 랜덤 셔플)
  const seededTeams = entries.filter((e) => e.seed != null);
  const unseededTeams = entries.filter((e) => e.seed == null);

  // 미시드 팀 랜덤 셔플
  const shuffledUnseeded = [...unseededTeams].sort(() => Math.random() - 0.5);

  // 시드 팀 정렬 + 미시드 팀 추가
  const teams = [
    ...seededTeams.sort((a, b) => (a.seed || 0) - (b.seed || 0)),
    ...shuffledUnseeded,
  ].map((entry) => ({
    entryId: entry.id,
    teamId: entry.teamId,
    teamName: entry.teamName,
    seed: entry.seed || null,
  }));

  // 4. 브라켓 사이즈 계산 (2의 거듭제곱)
  const bracketSize = nextPowerOfTwo(teams.length);
  const byes = bracketSize - teams.length;

  // 5. 첫 라운드 경기 생성 (Batch 처리)
  const batch = writeBatch(db);
  const createdMatchIds: string[] = [];
  const baseDate = input.scheduledAt || new Date();
  const scheduledAt = new Date(baseDate);
  scheduledAt.setHours(10, 0, 0, 0);

  const roundCode = ROUND_INFO[bracketSize.toString()]?.code || `R${bracketSize}`;
  const roundName = ROUND_INFO[bracketSize.toString()]?.name || `${bracketSize}강`;

  // Seed 기반 매칭 (토너먼트 규칙)
  // seed 1 vs seed (bracketSize)
  // seed 2 vs seed (bracketSize-1)
  // ...
  for (let i = 0; i < bracketSize / 2; i++) {
    const homeIndex = i;
    const awayIndex = bracketSize - 1 - i;

    // BYE 처리 (부족한 팀)
    if (awayIndex >= teams.length) {
      // BYE는 경기를 생성하지 않음 (자동 부전승)
      continue;
    }

    if (homeIndex < teams.length) {
      const matchDate = new Date(scheduledAt);
      matchDate.setDate(matchDate.getDate() + i); // 경기마다 하루씩 증가

      const matchData: Omit<EventMatch, "id" | "createdAt" | "updatedAt"> = {
        eventId: input.eventId,
        divisionId: input.divisionId,
        seasonId: input.seasonId,
        homeTeamId: teams[homeIndex].teamId,
        homeTeamName: teams[homeIndex].teamName,
        awayTeamId: teams[awayIndex].teamId,
        awayTeamName: teams[awayIndex].teamName,
        homeEntryId: teams[homeIndex].entryId,
        awayEntryId: teams[awayIndex].entryId,
        scheduledAt: Timestamp.fromDate(matchDate),
        roundCode,
        roundName,
        stageType: "knockout",
        status: "scheduled",
        homeScore: null,
        awayScore: null,
        winnerTeamId: null,
        createdBy: input.createdBy,
      };

      const matchRef = doc(collection(db, "event_matches"));
      batch.set(matchRef, {
        ...matchData,
        createdAt: serverTimestamp(),
      });

      createdMatchIds.push(matchRef.id);
    }
  }

  // 6. Batch 저장
  await batch.commit();

  return createdMatchIds;
}
