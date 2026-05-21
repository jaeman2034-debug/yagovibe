/**
 * 🔥 구청 리포트 데이터 Repository
 * Phase 1-4: 구청 리포트 자동화
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TOURNAMENT_COLLECTIONS } from "./constants";

export interface TournamentReportData {
  tournament: {
    name: string;
    startDate: string;
    endDate: string;
    organizer: string;
    location: string;
  };
  venue?: {
    name: string;
  };
  stats: {
    totalMatches: number;
    totalTeams: number;
    totalPlayers: number;
    totalReferees: number;
  };
  matches: Array<{
    id: string;
    startAt: Date;
    venueName: string;
    courtNo: string | number;
    homeTeam: string;
    awayTeam: string;
    referees: string;
    hasIncident: boolean;
  }>;
}

/**
 * 대회 리포트 데이터 조회
 */
export async function getTournamentReportData(
  associationId: string,
  tournamentId: string
): Promise<TournamentReportData> {
  // 1. 대회 기본 정보
  const tournamentRef = doc(
    db,
    TOURNAMENT_COLLECTIONS.tournament(associationId, tournamentId)
  );
  const tournamentSnap = await getDoc(tournamentRef);
  
  if (!tournamentSnap.exists()) {
    throw new Error("Tournament not found");
  }

  const tournamentData = tournamentSnap.data() as any;

  // 2. 경기장 정보 (첫 번째 경기장 사용)
  let venueName = tournamentData.location || "미지정";
  const venuesRef = collection(
    db,
    TOURNAMENT_COLLECTIONS.venues(associationId, tournamentId)
  );
  const venuesSnap = await getDocs(venuesRef);
  if (!venuesSnap.empty) {
    const firstVenue = venuesSnap.docs[0].data();
    venueName = firstVenue.name || venueName;
  }

  // 3. 경기 목록 조회
  const matchesRef = collection(
    db,
    TOURNAMENT_COLLECTIONS.matches(associationId, tournamentId)
  );
  const matchesQuery = query(matchesRef, orderBy("startAt", "asc"));
  const matchesSnap = await getDocs(matchesQuery);

  // 4. 경기 데이터 가공
  const matches: TournamentReportData["matches"] = [];
  const teamSet = new Set<string>();
  const playerSet = new Set<string>();
  const refereeSet = new Set<string>();

  for (const matchDoc of matchesSnap.docs) {
    const m = matchDoc.data() as any;

    // 시간 파싱
    let startAt: Date;
    if (m.startAt?.toDate) {
      startAt = m.startAt.toDate();
    } else if (typeof m.startAt === "string") {
      startAt = new Date(m.startAt);
    } else if (m.startAt instanceof Date) {
      startAt = m.startAt;
    } else {
      continue; // 시간 정보가 없으면 스킵
    }

    // 팀 정보
    const homeTeam = m.homeTeam || m.homeTeamName || m.teamA || "미지정";
    const awayTeam = m.awayTeam || m.awayTeamName || m.teamB || "미지정";
    teamSet.add(homeTeam);
    teamSet.add(awayTeam);

    // 심판 정보
    const referees = m.referees || {};
    const refereeIds = [
      referees.main,
      referees.assistant1,
      referees.assistant2,
    ].filter((id): id is string => !!id);
    
    refereeIds.forEach((id) => refereeSet.add(id));
    const refereesText = refereeIds.length > 0 
      ? refereeIds.join(", ") 
      : "미배정";

    // 경기장/코트 정보
    const venueName = m.venueName || m.venue || venueName;
    const courtNo = m.courtNo || m.court || "";

    // 특이사항 확인 (경고/퇴장)
    let hasIncident = false;
    if (m.hasIncident === true) {
      hasIncident = true;
    } else {
      // cards 서브컬렉션 확인
      try {
        const cardsRef = collection(
          db,
          TOURNAMENT_COLLECTIONS.cards(associationId, tournamentId, matchDoc.id)
        );
        const cardsSnap = await getDocs(cardsRef);
        hasIncident = !cardsSnap.empty;
      } catch {
        // 서브컬렉션 조회 실패 시 무시
      }
    }

    matches.push({
      id: matchDoc.id,
      startAt,
      venueName,
      courtNo,
      homeTeam,
      awayTeam,
      referees: refereesText,
      hasIncident,
    });
  }

  // 5. 선수 수 집계 (rosters에서)
  for (const matchDoc of matchesSnap.docs) {
    try {
      const rostersRef = collection(
        db,
        TOURNAMENT_COLLECTIONS.rosters(associationId, tournamentId, matchDoc.id)
      );
      const rostersSnap = await getDocs(rostersRef);
      rostersSnap.docs.forEach((doc) => {
        const roster = doc.data();
        if (roster.playerId) {
          playerSet.add(roster.playerId);
        }
      });
    } catch {
      // 서브컬렉션 조회 실패 시 무시
    }
  }

  return {
    tournament: {
      name: tournamentData.name || "미지정 대회",
      startDate: tournamentData.startDate || "",
      endDate: tournamentData.endDate || "",
      organizer: tournamentData.organizer || tournamentData.host || "미지정",
      location: tournamentData.location || venueName,
    },
    venue: {
      name: venueName,
    },
    stats: {
      totalMatches: matches.length,
      totalTeams: teamSet.size,
      totalPlayers: playerSet.size,
      totalReferees: refereeSet.size,
    },
    matches,
  };
}

