/**
 * 🔥 플레이오프(토너먼트) 자동 생성
 * 
 * 조별 리그 종료 후 각 조 상위 팀을 자동 추출하여 토너먼트 브라켓을 생성합니다.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";

interface StandingTeam {
  teamId: string;
  played: number;
  win: number;
  draw: number;
  loss: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

interface StandingData {
  divisionNumber: number;
  table: StandingTeam[];
}

interface PlayoffMatch {
  stage: "quarter" | "semi" | "final";
  round: number;
  homeTeamId: string;
  awayTeamId: string;
  status: "scheduled" | "completed";
  score: { home: number; away: number } | null;
  createdAt: any;
}

/**
 * 플레이오프 브라켓 생성
 * 
 * @param topTeams 각 조의 1위, 2위 팀 배열 [{ divisionNumber: 1, first: teamId, second: teamId }, ...]
 * @returns 라운드별 매칭 결과
 */
function generatePlayoffBracket(topTeams: Array<{ divisionNumber: number; first: string; second: string }>) {
  const totalTeams = topTeams.length * 2; // 각 조 1위, 2위
  let stage: "quarter" | "semi" | "final";
  let rounds: Array<{ stage: "quarter" | "semi" | "final"; round: number; matches: Array<{ home: string; away: string }> }> = [];

  if (totalTeams === 4) {
    // 2조 → 4팀 → 4강 (semi부터 시작)
    stage = "semi";
    
    // 조 1위 vs 다른 조 2위
    // 같은 조 팀끼리 첫 라운드에서 만나지 않음
    const [div1, div2] = topTeams;
    
    // Semi 1: 조1 1위 vs 조2 2위
    // Semi 2: 조2 1위 vs 조1 2위
    rounds.push({
      stage: "semi",
      round: 1,
      matches: [
        { home: div1.first, away: div2.second },
        { home: div2.first, away: div1.second },
      ],
    });
    
    // Final: Semi 승자들
    rounds.push({
      stage: "final",
      round: 1,
      matches: [
        { home: "__SEMI1_WINNER__", away: "__SEMI2_WINNER__" },
      ],
    });
    
  } else if (totalTeams === 8) {
    // 4조 → 8팀 → 8강 (quarter부터 시작)
    stage = "quarter";
    
    const [div1, div2, div3, div4] = topTeams;
    
    // Quarter: 조 1위 vs 다른 조 2위
    // 같은 조 팀끼리 첫 라운드에서 만나지 않음
    rounds.push({
      stage: "quarter",
      round: 1,
      matches: [
        { home: div1.first, away: div4.second },  // 조1 1위 vs 조4 2위
        { home: div2.first, away: div3.second },  // 조2 1위 vs 조3 2위
        { home: div3.first, away: div2.second },  // 조3 1위 vs 조2 2위
        { home: div4.first, away: div1.second },  // 조4 1위 vs 조1 2위
      ],
    });
    
    // Semi: Quarter 승자들
    rounds.push({
      stage: "semi",
      round: 1,
      matches: [
        { home: "__QUARTER1_WINNER__", away: "__QUARTER2_WINNER__" },
        { home: "__QUARTER3_WINNER__", away: "__QUARTER4_WINNER__" },
      ],
    });
    
    // Final: Semi 승자들
    rounds.push({
      stage: "final",
      round: 1,
      matches: [
        { home: "__SEMI1_WINNER__", away: "__SEMI2_WINNER__" },
      ],
    });
    
  } else {
    throw new Error(`지원하지 않는 진출 팀 수: ${totalTeams}팀`);
  }

  return { stage, rounds };
}

/**
 * 플레이오프 자동 생성 Callable Function
 */
export async function generatePlayoffCallableImpl(request: any) {
  // 🔥 firebaseAdmin.ts에서 초기화된 admin 사용
  const { admin } = await import("../firebaseAdmin");
  
  // 🔥 함수 실행 시점에만 필요한 모듈 동적 import
  const [httpsModule] = await Promise.all([
    import("firebase-functions/v2/https"),
  ]);
  
  const { HttpsError } = httpsModule;
  
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }
  
  const data = request.data ?? {};
  const associationId = data.associationId as string;
  const tournamentId = data.tournamentId as string;
  
  if (!associationId || !tournamentId) {
    throw new HttpsError("invalid-argument", "associationId/tournamentId 누락");
  }
  
  const db = admin.firestore();
  const tournamentRef = db.collection("associations").doc(associationId)
    .collection("tournaments").doc(tournamentId);
  
  const standingsCol = tournamentRef.collection("standings");
  const playoffMatchesCol = tournamentRef.collection("playoff").collection("matches");
  const playoffRoundsCol = tournamentRef.collection("playoff").collection("rounds");
  const logsCol = tournamentRef.collection("logs");
  
  const result = await db.runTransaction(async (tx) => {
    // 1️⃣ Tournament 문서 확인
    const tSnap = await tx.get(tournamentRef);
    if (!tSnap.exists) {
      throw new HttpsError("not-found", "tournament 문서가 없습니다.");
    }
    
    const t = tSnap.data() as any;
    
    // 🔥 실행 조건 확인
    if (t.status !== "matches_generated") {
      throw new HttpsError(
        "failed-precondition",
        "조별 리그 경기가 아직 생성되지 않았습니다."
      );
    }
    
    if (t.playoff?.locked === true) {
      throw new HttpsError(
        "failed-precondition",
        "이미 플레이오프가 생성되었습니다."
      );
    }
    
    // 2️⃣ Standings 로드
    const standingsSnap = await tx.get(standingsCol);
    if (standingsSnap.empty) {
      throw new HttpsError(
        "failed-precondition",
        "순위표(standings)가 없습니다. 조별 리그가 완료되지 않았습니다."
      );
    }
    
    // 각 조의 상위 2팀 추출
    const topTeams: Array<{ divisionNumber: number; first: string; second: string }> = [];
    
    standingsSnap.docs.forEach((doc) => {
      const standing = doc.data() as StandingData;
      const table = standing.table || [];
      
      if (table.length >= 2) {
        topTeams.push({
          divisionNumber: standing.divisionNumber,
          first: table[0].teamId,  // 1위
          second: table[1].teamId, // 2위
        });
      }
    });
    
    if (topTeams.length < 2) {
      throw new HttpsError(
        "failed-precondition",
        "플레이오프를 생성하기에는 조가 부족합니다. 최소 2조가 필요합니다."
      );
    }
    
    // 조 번호 순서대로 정렬
    topTeams.sort((a, b) => a.divisionNumber - b.divisionNumber);
    
    // 3️⃣ 플레이오프 브라켓 생성
    const { stage, rounds } = generatePlayoffBracket(topTeams);
    
    // 4️⃣ Matches / Rounds 생성
    const now = admin.firestore.FieldValue.serverTimestamp();
    let totalMatchCount = 0;
    const roundMap = new Map<string, string[]>(); // roundId -> matchIds[]
    
    rounds.forEach((roundData, roundIdx) => {
      const roundId = `${roundData.stage}_round${roundData.round}`;
      const matchIds: string[] = [];
      
      roundData.matches.forEach((match) => {
        // Winner 플레이스홀더는 나중에 업데이트 (경기 결과에 따라)
        if (match.home.includes("_WINNER__") || match.away.includes("_WINNER__")) {
          // Winner 매칭은 실제 경기 결과 후 업데이트 필요
          // 지금은 placeholder로 저장
        }
        
        const matchRef = playoffMatchesCol.doc();
        totalMatchCount++;
        
        tx.set(matchRef, {
          stage: roundData.stage,
          round: roundData.round,
          homeTeamId: match.home,
          awayTeamId: match.away,
          status: "scheduled",
          score: null,
          createdAt: now,
        });
        
        matchIds.push(matchRef.id);
      });
      
      roundMap.set(roundId, matchIds);
      
      // Rounds 문서 생성
      const roundRef = playoffRoundsCol.doc(roundId);
      tx.set(roundRef, {
        stage: roundData.stage,
        round: roundData.round,
        matchIds,
        createdAt: now,
      });
    });
    
    if (totalMatchCount === 0) {
      throw new HttpsError(
        "failed-precondition",
        "생성할 플레이오프 경기가 없습니다."
      );
    }
    
    // 5️⃣ Tournament 업데이트
    tx.update(tournamentRef, {
      "playoff.locked": true,
      "playoff.stage": stage,
      "playoff.generatedAt": now,
      "playoff.generatedBy": uid,
      "playoff.matchCount": totalMatchCount,
    });
    
    // 6️⃣ 로그 기록
    const logRef = logsCol.doc();
    tx.set(logRef, {
      type: "playoff_generate",
      message: "플레이오프 대진 생성 완료",
      createdAt: now,
      by: uid,
      payload: { 
        teamCount: topTeams.length * 2, 
        stage,
        matchCount: totalMatchCount,
      },
    });
    
    return { 
      matchCount: totalMatchCount,
      stage,
      teamCount: topTeams.length * 2,
    };
  });
  
  return { success: true, ...result };
}

