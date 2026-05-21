/**
 * 🔥 조별 리그(라운드로빈) 경기 자동 생성
 * 
 * 목표: divisions 기준으로 matches 생성 + logs 기록 + tournament 상태 업데이트
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import type * as FirebaseFirestore from "firebase-admin/firestore";
// 🔥 Firebase Admin static import (동적 import 제거 - 초기화 보장)
import { admin } from "../firebaseAdmin";

/**
 * 라운드로빈 스케줄 생성 (Circle Method)
 * 
 * 팀 수가 짝수(n=4)면: 라운드 수 = n-1, 라운드당 경기 수 = n/2
 * 팀 수가 홀수(n=5)면: BYE 추가하여 짝수로 처리
 */
function roundRobinSchedule(teamIds: string[]): Array<{ round: number; home: string | null; away: string | null }> {
  // copy
  const teams = [...teamIds];
  
  // 홀수면 BYE 추가
  const BYE = "__BYE__";
  if (teams.length % 2 === 1) teams.push(BYE);
  
  const n = teams.length;
  const rounds = n - 1;
  const half = n / 2;
  
  // "원형" 회전: teams[0] 고정, 나머지 회전
  const fixed = teams[0];
  let rotating = teams.slice(1);
  
  const fixtures: Array<{ round: number; home: string | null; away: string | null }> = [];
  
  for (let r = 1; r <= rounds; r++) {
    const current = [fixed, ...rotating];
    
    for (let i = 0; i < half; i++) {
      const a = current[i];
      const b = current[n - 1 - i];
      
      // BYE 처리 (BYE는 match 문서 안 만들고 스킵)
      if (a === BYE || b === BYE) {
        continue;
      }
      
      // 홈/어웨이 밸런싱 (간단 규칙: 라운드별 교대)
      const swap = r % 2 === 0;
      fixtures.push({
        round: r,
        home: swap ? b : a,
        away: swap ? a : b,
      });
    }
    
    // rotate: 마지막을 맨 앞으로
    rotating = [rotating[rotating.length - 1], ...rotating.slice(0, rotating.length - 1)];
  }
  
  return fixtures;
}

/**
 * 경기 자동 생성 Callable Function
 * 
 * 방어 조건:
 * - tournament.bracket.locked === true 또는 status === "matches_generated"면 중단
 * - divisions가 없으면 중단
 * 
 * 생성 항목:
 * - matches 컬렉션 (각 조별 라운드로빈 경기)
 * - rounds 컬렉션 (선택, 라운드별 matchIds)
 * - opsLogs 컬렉션 (운영 로그 기록)
 * - tournament.status = "matches_generated"
 */
export async function generateMatchesCallableImpl(request: any) {
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
  
  const divisionsCol = tournamentRef.collection("divisions");
  const matchesCol = tournamentRef.collection("matches");
  const roundsCol = tournamentRef.collection("rounds");
  const logsCol = tournamentRef.collection("logs"); // 🔥 UI 로그용 컬렉션 (기본값: logs)
  
  const result = await db.runTransaction(async (tx) => {
    // 1️⃣ Tournament 문서 확인
    const tSnap = await tx.get(tournamentRef);
    if (!tSnap.exists) {
      throw new HttpsError("not-found", "tournament 문서가 없습니다.");
    }
    
    const t = tSnap.data() as any;
    
    // 🔥 중복 생성 방지 (대소문자 모두 체크)
    const currentStatus = t?.status?.toUpperCase();
    if (t?.bracket?.locked === true || 
        currentStatus === "MATCHES_GENERATED" || 
        currentStatus === "MATCHES_GENERATED") {
      throw new HttpsError(
        "failed-precondition",
        "이미 대진표(경기)가 생성되었습니다."
      );
    }
    
    // 2️⃣ Divisions 로드
    const divSnap = await tx.get(divisionsCol);
    if (divSnap.empty) {
      throw new HttpsError(
        "failed-precondition",
        "조(divisions)가 없습니다. 먼저 조 추첨을 실행하세요."
      );
    }
    
    // 3️⃣ Matches/Rounds 생성 준비
    const now = admin.firestore.FieldValue.serverTimestamp();
    let totalMatchCount = 0;
    
    divSnap.docs.forEach((d) => {
      const div = d.data() as any;
      const divisionNumber = div.divisionNumber as number;
      const teamIds = (div.teamIds ?? []) as string[];
      
      if (!divisionNumber || teamIds.length < 2) return;
      
      // 라운드로빈 스케줄 생성
      const fixtures = roundRobinSchedule(teamIds);
      
      // 라운드별 matchIds 수집
      const roundMap = new Map<number, string[]>();
      
      fixtures.forEach((fx) => {
        const matchRef = matchesCol.doc(); // auto id
        totalMatchCount++;
        
        tx.set(matchRef, {
          divisionNumber,
          round: fx.round,
          homeTeamId: fx.home,
          awayTeamId: fx.away,
          status: "scheduled",
          scheduledAt: null,
          score: null,
          createdAt: now,
          createdBy: uid,
        });
        
        const arr = roundMap.get(fx.round) ?? [];
        arr.push(matchRef.id);
        roundMap.set(fx.round, arr);
      });
      
      // Rounds 문서 생성 (선택, UI 편의성)
      roundMap.forEach((matchIds, round) => {
        const roundRef = roundsCol.doc(`div${divisionNumber}_round${round}`);
        tx.set(roundRef, {
          divisionNumber,
          round,
          matchIds,
          createdAt: now,
        });
      });
    });
    
    if (totalMatchCount === 0) {
      throw new HttpsError(
        "failed-precondition",
        "생성할 경기가 없습니다 (팀 수/조 데이터 확인)."
      );
    }
    
    // 4️⃣ Tournament 업데이트 + Lock
    // ⭐⭐⭐ 핵심: 대진표 생성 완료 상태 확정 (승인 종료 신호)
    tx.update(tournamentRef, {
      status: "MATCHES_GENERATED", // 🔥 대문자로 통일 (approveApplicationCallable 가드와 일치)
      "bracket.locked": true,
      "bracket.generatedAt": now,
      "bracket.generatedBy": uid,
      "bracket.matchCount": totalMatchCount,
      "bracket.format": "group_round_robin",
      matchesGeneratedAt: now, // 🔥 추가: 타임스탬프 명시
    });
    
    // 5️⃣ 로그 기록 (UI 로그용 - 반드시 write 필요)
    const logRef = logsCol.doc();
    tx.set(logRef, {
      type: "match_generate",
      message: `경기 자동 생성 완료: ${totalMatchCount}경기`,
      createdAt: now,
      by: uid,
      payload: { matchCount: totalMatchCount },
    });
    
    return { matchCount: totalMatchCount };
  });
  
  return { success: true, ...result };
}

