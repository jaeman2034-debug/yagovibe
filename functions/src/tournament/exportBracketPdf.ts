/**
 * 🔥 FINAL+ 단계: 토너먼트 브라켓 PDF 출력 Callable (Puppeteer, 실서비스 정답)
 * 
 * 브라켓 전체를 PDF로 생성하여 현장/공지용으로 제공
 * - Puppeteer로 HTML → PDF 변환 (운영 산출물 레벨)
 * - 어떤 기기에서 눌러도 동일한 PDF
 * - 심판·현장 게시·공지 바로 사용 가능
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";
import puppeteer from "puppeteer";

const db = admin.firestore();

interface ExportBracketPdfRequest {
  associationId: string;
  tournamentId: string;
}

interface MatchData {
  id: string;
  round: number;
  matchNo: number;
  homeTeamId?: string | null;
  awayTeamId?: string | null;
  homeTeam?: string;
  awayTeam?: string;
  score?: { home?: number; away?: number };
  status: string;
  winnerTeamId?: string;
  isBye?: boolean;
}

/**
 * 🔥 토너먼트 브라켓 PDF 생성 (관리자 전용, Puppeteer)
 */
export const exportBracketPdfCallable = functions
  .region("asia-northeast3")
  .runWith({
    memory: "1GB", // Puppeteer는 메모리 많이 사용
    timeoutSeconds: 300,
  })
  .https.onCall(async (data: ExportBracketPdfRequest, context) => {
    // 🔥 인증 체크
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "로그인이 필요합니다."
      );
    }

    const { associationId, tournamentId } = data;
    const uid = context.auth.uid;

    // 🔥 입력 검증
    if (!associationId || !tournamentId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "필수 파라미터가 누락되었습니다."
      );
    }

    logger.info(`[exportBracketPdf] 시작`, {
      associationId,
      tournamentId,
      uid,
    });

    let browser: puppeteer.Browser | null = null;

    try {
      // 🔥 1. 관리자 권한 체크
      const associationRef = db.doc(`associations/${associationId}`);
      const associationSnap = await associationRef.get();

      if (!associationSnap.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "협회를 찾을 수 없습니다."
        );
      }

      const associationData = associationSnap.data()!;
      const adminUids = associationData.adminUids || {};

      if (!adminUids[uid]) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "협회 관리자만 PDF를 다운로드할 수 있습니다."
        );
      }

      // 🔥 2. 대회 정보 조회
      const tournamentRef = db.doc(
        `associations/${associationId}/tournaments/${tournamentId}`
      );
      const tournamentSnap = await tournamentRef.get();

      if (!tournamentSnap.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "대회를 찾을 수 없습니다."
        );
      }

      const tournament = tournamentSnap.data()!;

      // 🔥 3. 토너먼트 경기 조회
      const matchesRef = tournamentRef.collection("matches");
      const matchesSnap = await matchesRef
        .where("stage", "==", "KNOCKOUT")
        .orderBy("round", "asc")
        .orderBy("matchNo", "asc")
        .get();

      if (matchesSnap.empty) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "토너먼트 브라켓이 생성되지 않았습니다."
        );
      }

      const matches = matchesSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as MatchData[];

      // 🔥 4. 팀 ID → 팀명 매핑 (팀 정보 조회)
      const teamIds = new Set<string>();
      matches.forEach((match) => {
        if (match.homeTeamId) teamIds.add(match.homeTeamId);
        if (match.awayTeamId) teamIds.add(match.awayTeamId);
      });

      const teamsRef = tournamentRef.collection("teams");
      const teamSnaps = await Promise.all(
        Array.from(teamIds).map((teamId) => teamsRef.doc(teamId).get())
      );

      const teamNameMap = new Map<string, string>();
      teamSnaps.forEach((snap) => {
        if (snap.exists) {
          const data = snap.data()!;
          const teamName = data.teamName || data.name || "팀명 없음";
          teamNameMap.set(snap.id, teamName);
        }
      });

      // 🔥 5. 우승팀 정보 조회
      let championTeamName: string | null = null;
      if (tournament.winnerTeamId) {
        championTeamName = teamNameMap.get(tournament.winnerTeamId) || null;
      }

      // 🔥 6. 라운드별 경기 그룹화
      const matchesByRound = new Map<number, MatchData[]>();
      matches.forEach((match) => {
        const round = match.round || 1;
        if (!matchesByRound.has(round)) {
          matchesByRound.set(round, []);
        }
        matchesByRound.get(round)!.push(match);
      });

      const rounds = Array.from(matchesByRound.keys()).sort((a, b) => a - b);
      const totalRounds = Math.max(...rounds, 1);

      // 🔥 7. HTML 템플릿 생성
      const html = renderTournamentPdfHtml({
        tournament,
        matchesByRound,
        rounds,
        totalRounds,
        teamNameMap,
        championTeamName,
      });

      // 🔥 8. Puppeteer로 PDF 생성
      browser = await puppeteer.launch({
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
        ],
        headless: true,
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: 20,
          bottom: 20,
          left: 20,
          right: 20,
        },
      });

      await browser.close();
      browser = null;

      logger.info(`[exportBracketPdf] 완료`, {
        tournamentId,
        matchesCount: matches.length,
        roundsCount: rounds.length,
        pdfSize: pdfBuffer.length,
      });

      return {
        success: true,
        file: pdfBuffer.toString("base64"),
        fileName: `${tournament.name || "대회"}_브라켓_${new Date().toISOString().split("T")[0]}.pdf`,
      };
    } catch (error: any) {
      // 브라우저 정리
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          // 무시
        }
      }

      logger.error(`[exportBracketPdf] 오류`, {
        error: error?.message,
        stack: error?.stack,
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        `PDF 생성 중 오류가 발생했습니다: ${error?.message}`
      );
    }
  });

/**
 * 🔥 HTML 템플릿 렌더링 (순수 HTML + CSS)
 */
function renderTournamentPdfHtml({
  tournament,
  matchesByRound,
  rounds,
  totalRounds,
  teamNameMap,
  championTeamName,
}: {
  tournament: any;
  matchesByRound: Map<number, MatchData[]>;
  rounds: number[];
  totalRounds: number;
  teamNameMap: Map<string, string>;
  championTeamName: string | null;
}): string {
  const tournamentName = tournament.name || "토너먼트 브라켓";
  const bracketInfo = tournament.bracket;
  const bracketInfoText = bracketInfo
    ? `브라켓 사이즈: ${bracketInfo.size}팀 (참가: ${bracketInfo.teamCount}팀, BYE: ${bracketInfo.byes}팀)`
    : "";

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${tournamentName} - 브라켓</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: "Malgun Gothic", "맑은 고딕", Arial, sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #333;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 15px;
    }
    .header h1 {
      font-size: 24px;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 8px;
    }
    .header .meta {
      font-size: 11px;
      color: #666;
      margin-top: 5px;
    }
    .header .bracket-info {
      font-size: 10px;
      color: #888;
      margin-top: 5px;
    }
    .round {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    .round-title {
      font-size: 18px;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
    }
    .match {
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 10px;
      background-color: #f9fafb;
    }
    .match-header {
      font-size: 10px;
      color: #6b7280;
      margin-bottom: 8px;
      font-weight: 600;
    }
    .match-teams {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .team {
      flex: 1;
      padding: 8px;
      border-radius: 4px;
      background-color: white;
      border: 1px solid #e5e7eb;
    }
    .team.winner {
      background-color: #dcfce7;
      border-color: #22c55e;
      font-weight: bold;
      color: #166534;
    }
    .team-name {
      font-size: 13px;
      font-weight: 600;
    }
    .team-score {
      font-size: 16px;
      font-weight: bold;
      color: #1e40af;
      margin-top: 4px;
    }
    .vs {
      font-size: 14px;
      color: #9ca3af;
      font-weight: 600;
      padding: 0 10px;
    }
    .match-result {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px dashed #d1d5db;
      font-size: 11px;
      color: #059669;
      font-weight: 600;
    }
    .bye-badge {
      display: inline-block;
      background-color: #fef3c7;
      color: #92400e;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      margin-left: 8px;
    }
    .champion {
      text-align: center;
      margin-top: 40px;
      padding: 30px;
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border-radius: 12px;
      border: 3px solid #f59e0b;
    }
    .champion-title {
      font-size: 20px;
      font-weight: bold;
      color: #92400e;
      margin-bottom: 10px;
    }
    .champion-name {
      font-size: 28px;
      font-weight: bold;
      color: #78350f;
    }
    @media print {
      body {
        padding: 10px;
      }
      .round {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(tournamentName)}</h1>
    <div class="meta">생성일: ${new Date().toLocaleDateString("ko-KR")}</div>
    ${bracketInfoText ? `<div class="bracket-info">${escapeHtml(bracketInfoText)}</div>` : ""}
  </div>

  ${renderRounds(matchesByRound, rounds, totalRounds, teamNameMap)}

  ${championTeamName ? renderChampion(championTeamName) : ""}
</body>
</html>`;
}

/**
 * 🔥 라운드별 경기 렌더링
 */
function renderRounds(
  matchesByRound: Map<number, MatchData[]>,
  rounds: number[],
  totalRounds: number,
  teamNameMap: Map<string, string>
): string {
  return rounds
    .map((round) => {
      const roundMatches = matchesByRound.get(round)!;
      const roundName = getRoundName(round, totalRounds);

      return `
  <div class="round">
    <div class="round-title">${roundName}</div>
    ${roundMatches
      .map((match) => renderMatch(match, teamNameMap))
      .join("\n    ")}
  </div>`;
    })
    .join("\n");
}

/**
 * 🔥 경기 렌더링
 */
function renderMatch(match: MatchData, teamNameMap: Map<string, string>): string {
  const homeTeamId = match.homeTeamId;
  const awayTeamId = match.awayTeamId;
  const homeTeamName =
    homeTeamId && teamNameMap.has(homeTeamId)
      ? teamNameMap.get(homeTeamId)!
      : homeTeamId || "TBD";
  const awayTeamName =
    awayTeamId && teamNameMap.has(awayTeamId)
      ? teamNameMap.get(awayTeamId)!
      : awayTeamId || "TBD";

  const homeScore = match.score?.home;
  const awayScore = match.score?.away;
  const isCompleted =
    match.status === "END" || match.status === "FINISHED";
  const isBye = match.isBye === true;
  const winnerTeamId = match.winnerTeamId;

  const homeIsWinner = winnerTeamId === homeTeamId;
  const awayIsWinner = winnerTeamId === awayTeamId;

  if (isBye) {
    return `
    <div class="match">
      <div class="match-header">경기 ${match.matchNo}</div>
      <div class="match-teams">
        <div class="team winner">
          <div class="team-name">${escapeHtml(homeTeamName)}</div>
          <div class="team-score">BYE</div>
        </div>
      </div>
      ${isCompleted && winnerTeamId ? `<div class="match-result">✅ 승자: ${escapeHtml(homeTeamName)}</div>` : ""}
    </div>`;
  }

  const scoreText =
    homeScore !== undefined && awayScore !== undefined
      ? `${homeScore} : ${awayScore}`
      : "vs";

  return `
    <div class="match">
      <div class="match-header">경기 ${match.matchNo}</div>
      <div class="match-teams">
        <div class="team ${homeIsWinner ? "winner" : ""}">
          <div class="team-name">${escapeHtml(homeTeamName)}</div>
          ${homeScore !== undefined ? `<div class="team-score">${homeScore}</div>` : ""}
        </div>
        <div class="vs">${scoreText}</div>
        <div class="team ${awayIsWinner ? "winner" : ""}">
          <div class="team-name">${escapeHtml(awayTeamName)}</div>
          ${awayScore !== undefined ? `<div class="team-score">${awayScore}</div>` : ""}
        </div>
      </div>
      ${isCompleted && winnerTeamId ? `<div class="match-result">✅ 승자: ${escapeHtml(homeIsWinner ? homeTeamName : awayTeamName)}</div>` : ""}
    </div>`;
}

/**
 * 🔥 우승팀 렌더링
 */
function renderChampion(championTeamName: string): string {
  return `
  <div class="champion">
    <div class="champion-title">🏆 우승팀</div>
    <div class="champion-name">${escapeHtml(championTeamName)}</div>
  </div>`;
}

/**
 * 🔥 라운드 이름 표시
 */
function getRoundName(round: number, totalRounds: number): string {
  if (round === totalRounds) return "결승";
  if (round === totalRounds - 1) return "준결승";
  if (round === totalRounds - 2) return "4강";
  if (round === totalRounds - 3) return "8강";

  switch (round) {
    case 1:
      return "1라운드";
    case 2:
      return "8강";
    case 3:
      return "4강";
    case 4:
      return "준결승";
    case 5:
      return "결승";
    default:
      return `${round}라운드`;
  }
}

/**
 * 🔥 HTML 이스케이프 (XSS 방지)
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
