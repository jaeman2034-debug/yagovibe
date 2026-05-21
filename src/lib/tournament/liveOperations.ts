/**
 * 🔥 현장 운영 로직 (QR 체크인 → 경기 시작/종료 → 결과 반영)
 * 
 * 승인된 선수만 현장에 입장하고,
 * 체크인 → 경기 → 결과가 하나의 로그 체인으로 이어집니다.
 */

import { collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import * as crypto from "crypto";

export interface GenerateQRRequest {
  tournamentId: string;
  matchId: string;
  playerId: string;
}

export interface GenerateQRResponse {
  qrToken: string;
  expiresAt: Date;
  playerName: string;
  teamName: string;
}

export interface ScanQRRequest {
  tournamentId: string;
  matchId: string;
  qrToken: string;
  scannedBy: string;
}

export interface ScanQRResponse {
  success: boolean;
  playerId: string;
  playerName: string;
  teamName: string;
  checkedInAt: Date;
  reason?: string;
}

/**
 * QR 토큰 생성 (1회성, 5분 유효)
 */
export async function generateQRToken(
  associationId: string,
  request: GenerateQRRequest
): Promise<GenerateQRResponse> {
  const { tournamentId, matchId, playerId } = request;

  // 1️⃣ 선수 승인 상태 확인
  const playerRef = doc(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/players/${playerId}`
  );
  const playerSnap = await getDoc(playerRef);
  
  if (!playerSnap.exists()) {
    throw new Error("선수를 찾을 수 없습니다.");
  }

  const playerData = playerSnap.data();
  if (playerData.status !== "approved") {
    throw new Error("승인되지 않은 선수입니다.");
  }

  // 2️⃣ 경기 참가 선수 확인
  const matchRef = doc(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/matches/${matchId}`
  );
  const matchSnap = await getDoc(matchRef);
  
  if (!matchSnap.exists()) {
    throw new Error("경기를 찾을 수 없습니다.");
  }

  const matchData = matchSnap.data();
  const isHomePlayer = matchData.homeTeamId === playerData.teamId;
  const isAwayPlayer = matchData.awayTeamId === playerData.teamId;
  
  if (!isHomePlayer && !isAwayPlayer) {
    throw new Error("해당 경기에 참가하지 않는 선수입니다.");
  }

  // 3️⃣ 1회성 토큰 생성
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(16).toString("hex");
  const qrToken = crypto
    .createHash("sha256")
    .update(`${tournamentId}_${matchId}_${playerId}_${timestamp}_${randomBytes}`)
    .digest("hex")
    .substring(0, 32);

  const expiresAt = new Date(timestamp + 5 * 60 * 1000); // 5분 후

  // 4️⃣ 토큰 저장 (5분 후 자동 만료)
  const tokenRef = doc(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/qrTokens/${qrToken}`
  );
  await setDoc(tokenRef, {
    tournamentId,
    matchId,
    playerId,
    teamId: playerData.teamId,
    expiresAt: expiresAt,
    createdAt: serverTimestamp(),
    used: false,
  });

  return {
    qrToken,
    expiresAt,
    playerName: playerData.name || "선수명 없음",
    teamName: playerData.teamName || "팀명 없음",
  };
}

/**
 * QR 스캔 (체크인)
 */
export async function scanQRToken(
  associationId: string,
  request: ScanQRRequest
): Promise<ScanQRResponse> {
  const { tournamentId, matchId, qrToken, scannedBy } = request;

  // 1️⃣ 토큰 조회
  const tokenRef = doc(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/qrTokens/${qrToken}`
  );
  const tokenSnap = await getDoc(tokenRef);

  if (!tokenSnap.exists()) {
    return {
      success: false,
      playerId: "",
      playerName: "",
      teamName: "",
      checkedInAt: new Date(),
      reason: "QR 토큰이 유효하지 않습니다.",
    };
  }

  const tokenData = tokenSnap.data();

  // 2️⃣ 만료 확인
  const expiresAt = tokenData.expiresAt?.toDate();
  if (!expiresAt || expiresAt < new Date()) {
    return {
      success: false,
      playerId: tokenData.playerId,
      playerName: "",
      teamName: "",
      checkedInAt: new Date(),
      reason: "QR 토큰이 만료되었습니다.",
    };
  }

  // 3️⃣ 사용 여부 확인
  if (tokenData.used) {
    return {
      success: false,
      playerId: tokenData.playerId,
      playerName: "",
      teamName: "",
      checkedInAt: new Date(),
      reason: "이미 사용된 QR 토큰입니다.",
    };
  }

  // 4️⃣ 경기 확인
  if (tokenData.matchId !== matchId) {
    return {
      success: false,
      playerId: tokenData.playerId,
      playerName: "",
      teamName: "",
      checkedInAt: new Date(),
      reason: "해당 경기의 QR 토큰이 아닙니다.",
    };
  }

  // 5️⃣ 중복 체크인 확인
  const checkInsRef = collection(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/matches/${matchId}/checkIns`
  );
  const existingCheckIn = await getDocs(
    query(checkInsRef, where("playerId", "==", tokenData.playerId))
  );

  if (!existingCheckIn.empty) {
    return {
      success: false,
      playerId: tokenData.playerId,
      playerName: "",
      teamName: "",
      checkedInAt: new Date(),
      reason: "이미 체크인되었습니다.",
    };
  }

  // 6️⃣ 체크인 기록
  const checkInRef = doc(checkInsRef);
  await setDoc(checkInRef, {
    matchId,
    playerId: tokenData.playerId,
    teamId: tokenData.teamId,
    checkedInAt: serverTimestamp(),
    by: scannedBy,
    status: "CHECKED_IN",
  });

  // 7️⃣ 토큰 사용 처리
  await updateDoc(tokenRef, {
    used: true,
    usedAt: serverTimestamp(),
    usedBy: scannedBy,
  });

  // 8️⃣ 선수 정보 조회
  const playerRef = doc(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/players/${tokenData.playerId}`
  );
  const playerSnap = await getDoc(playerRef);
  const playerData = playerSnap.data();

  return {
    success: true,
    playerId: tokenData.playerId,
    playerName: playerData?.name || "선수명 없음",
    teamName: playerData?.teamName || "팀명 없음",
    checkedInAt: new Date(),
  };
}

/**
 * 경기 시작
 */
export async function startMatch(
  associationId: string,
  tournamentId: string,
  matchId: string,
  startedBy: string,
  minPlayersPerTeam: number = 7
): Promise<{ success: boolean; startedAt: Date; checkedInPlayers: { home: number; away: number } }> {
  // 1️⃣ 체크인 인원 확인
  const checkInsRef = collection(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/matches/${matchId}/checkIns`
  );
  const checkInsSnap = await getDocs(checkInsRef);
  
  const matchRef = doc(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/matches/${matchId}`
  );
  const matchSnap = await getDoc(matchRef);
  const matchData = matchSnap.data();

  const homeTeamId = matchData?.homeTeamId;
  const awayTeamId = matchData?.awayTeamId;

  const homeCheckIns = checkInsSnap.docs.filter(
    (doc) => doc.data().teamId === homeTeamId
  ).length;
  const awayCheckIns = checkInsSnap.docs.filter(
    (doc) => doc.data().teamId === awayTeamId
  ).length;

  if (homeCheckIns < minPlayersPerTeam || awayCheckIns < minPlayersPerTeam) {
    throw new Error(
      `최소 출전 인원이 부족합니다. (홈: ${homeCheckIns}/${minPlayersPerTeam}, 원정: ${awayCheckIns}/${minPlayersPerTeam})`
    );
  }

  // 2️⃣ 경기 시작 처리
  await updateDoc(matchRef, {
    status: "IN_PROGRESS",
    startedAt: serverTimestamp(),
    startedBy,
    updatedAt: serverTimestamp(),
  });

  // 3️⃣ 운영 로그 기록
  const opsLogRef = collection(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/opsLogs`
  );
  await setDoc(doc(opsLogRef), {
    action: "경기 시작",
    executor: startedBy,
    timestamp: serverTimestamp(),
    details: `홈 ${homeCheckIns}명, 원정 ${awayCheckIns}명 체크인`,
    metadata: {
      matchId,
      checkedInPlayers: { home: homeCheckIns, away: awayCheckIns },
    },
  });

  return {
    success: true,
    startedAt: new Date(),
    checkedInPlayers: { home: homeCheckIns, away: awayCheckIns },
  };
}

/**
 * 경기 종료
 */
export async function finishMatch(
  associationId: string,
  tournamentId: string,
  matchId: string,
  finishedBy: string,
  homeScore: number,
  awayScore: number,
  resultType: "FT" | "PK" | "ET" = "FT",
  notes?: string
): Promise<{ success: boolean; finishedAt: Date; winner: "HOME" | "AWAY" | "DRAW"; nextMatchId?: string }> {
  const matchRef = doc(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/matches/${matchId}`
  );
  const matchSnap = await getDoc(matchRef);
  const matchData = matchSnap.data();

  if (!matchData) {
    throw new Error("경기를 찾을 수 없습니다.");
  }

  // 1️⃣ 승자 계산
  let winner: "HOME" | "AWAY" | "DRAW" = "DRAW";
  if (homeScore > awayScore) {
    winner = "HOME";
  } else if (awayScore > homeScore) {
    winner = "AWAY";
  }

  // 2️⃣ 경기 종료 처리
  await updateDoc(matchRef, {
    status: "COMPLETED",
    finishedAt: serverTimestamp(),
    finishedBy,
    homeScore,
    awayScore,
    winner,
    resultType,
    notes: notes || null,
    updatedAt: serverTimestamp(),
  });

  // 3️⃣ 토너먼트일 경우 다음 경기 업데이트
  let nextMatchId: string | undefined;
  if (matchData.phase === "KNOCKOUT" && winner !== "DRAW") {
    // 다음 경기 찾기 및 승자 배정
    // (구현 생략, 실제로는 bracket 구조에 따라 처리)
  }

  // 4️⃣ 운영 로그 기록
  const opsLogRef = collection(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/opsLogs`
  );
  await setDoc(doc(opsLogRef), {
    action: "경기 종료",
    executor: finishedBy,
    timestamp: serverTimestamp(),
    details: `${matchData.homeTeam} ${homeScore} - ${awayScore} ${matchData.awayTeam}`,
    metadata: {
      matchId,
      homeScore,
      awayScore,
      winner,
      resultType,
    },
  });

  return {
    success: true,
    finishedAt: new Date(),
    winner,
    nextMatchId,
  };
}

