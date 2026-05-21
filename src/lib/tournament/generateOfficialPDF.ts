/**
 * 🔥 구청·감사용 자동 PDF 패키지 생성
 * 
 * 대회 전 과정이 버튼 1번으로 '공식 문서(PDF)'로 자동 정리됩니다.
 */

import { collection, doc, getDoc, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Tournament } from "@/types/tournament";

export interface GeneratePDFOptions {
  associationId: string;
  tournamentId: string;
  generatedBy: string;
}

export interface PDFPackageData {
  tournament: Tournament;
  teams: Array<{ id: string; name: string; status: string; playerCount: number }>;
  players: Array<{ id: string; name: string; teamId: string; status: string; ageVerified: boolean }>;
  drawLog: any;
  matches: Array<{ id: string; date: string; time: string; venueId: string; homeTeam: string; awayTeam: string; homeScore?: number; awayScore?: number; status: string }>;
  checkIns: Array<{ matchId: string; playerId: string; checkedInAt: any }>;
  opsLogs: Array<{ action: string; executor: string; timestamp: any; details: string }>;
  generatedAt: Date;
  generatedBy: string;
}

/**
 * PDF 패키지 데이터 수집
 */
export async function collectPDFData(
  options: GeneratePDFOptions
): Promise<PDFPackageData> {
  const { associationId, tournamentId, generatedBy } = options;

  // 1️⃣ 대회 정보
  const tournamentRef = doc(
    db,
    `associations/${associationId}/tournaments/${tournamentId}`
  );
  const tournamentSnap = await getDoc(tournamentRef);
  const tournament = { id: tournamentId, ...tournamentSnap.data() } as Tournament;

  // 2️⃣ 참가 팀
  const teamsRef = collection(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/teams`
  );
  const teamsSnap = await getDocs(teamsRef);
  const teams = teamsSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Array<{ id: string; name: string; status: string; playerCount: number }>;

  // 3️⃣ 참가 선수
  const playersRef = collection(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/players`
  );
  const playersSnap = await getDocs(playersRef);
  const players = playersSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Array<{ id: string; name: string; teamId: string; status: string; ageVerified: boolean }>;

  // 4️⃣ 조 추첨 로그
  let drawLog: any = null;
  if (tournament.drawLogId) {
    const drawLogRef = doc(
      db,
      `associations/${associationId}/tournaments/${tournamentId}/drawLogs/${tournament.drawLogId}`
    );
    const drawLogSnap = await getDoc(drawLogRef);
    if (drawLogSnap.exists()) {
      drawLog = drawLogSnap.data();
    }
  }

  // 5️⃣ 경기 목록
  const matchesRef = collection(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/matches`
  );
  const matchesSnap = await getDocs(query(matchesRef, orderBy("date", "asc"), orderBy("startTime", "asc")));
  const matches = matchesSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Array<{ id: string; date: string; time: string; venueId: string; homeTeam: string; awayTeam: string; homeScore?: number; awayScore?: number; status: string }>;

  // 6️⃣ 체크인 기록
  const checkIns: Array<{ matchId: string; playerId: string; checkedInAt: any }> = [];
  for (const match of matches) {
    const checkInsRef = collection(
      db,
      `associations/${associationId}/tournaments/${tournamentId}/matches/${match.id}/checkIns`
    );
    const checkInsSnap = await getDocs(checkInsRef);
    checkIns.push(...checkInsSnap.docs.map((doc) => ({
      matchId: match.id,
      playerId: doc.data().playerId,
      checkedInAt: doc.data().checkedInAt,
    })));
  }

  // 7️⃣ 운영 로그
  const opsLogsRef = collection(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/opsLogs`
  );
  const opsLogsSnap = await getDocs(query(opsLogsRef, orderBy("timestamp", "asc")));
  const opsLogs = opsLogsSnap.docs.map((doc) => ({
    action: doc.data().action,
    executor: doc.data().executor,
    timestamp: doc.data().timestamp,
    details: doc.data().details || "",
  }));

  return {
    tournament,
    teams,
    players,
    drawLog,
    matches,
    checkIns,
    opsLogs,
    generatedAt: new Date(),
    generatedBy,
  };
}

/**
 * PDF HTML 생성
 */
export function generatePDFHTML(data: PDFPackageData): string {
  const { tournament, teams, players, drawLog, matches, checkIns, opsLogs } = data;

  // 통계 계산
  const approvedTeams = teams.filter((t) => t.status === "approved").length;
  const approvedPlayers = players.filter((p) => p.status === "approved").length;
  const ageVerifiedPlayers = players.filter((p) => p.ageVerified).length;
  const completedMatches = matches.filter((m) => m.status === "COMPLETED").length;

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>대회 운영·검증 종합 보고서</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap');
    
    @font-face {
      font-family: "NotoSansKR";
      src: url("https://fonts.gstatic.com/s/notosanskr/v27/PbykFmXiEBPT4ITbgNA5Cgm20HTs4JMMuA.woff2") format("woff2"),
           url("https://fonts.gstatic.com/s/notosanskr/v27/PbykFmXiEBPT4ITbgNA5Cgm20HTs4JMMuA.woff") format("woff");
      font-weight: 400;
      font-style: normal;
      font-display: swap;
    }
    
    @font-face {
      font-family: "NotoSansKR";
      src: url("https://fonts.gstatic.com/s/notosanskr/v27/Pby7FmXiEBPT4ITbgNA5Cgm20HTs4JMMuA.woff2") format("woff2"),
           url("https://fonts.gstatic.com/s/notosanskr/v27/Pby7FmXiEBPT4ITbgNA5Cgm20HTs4JMMuA.woff") format("woff");
      font-weight: 500;
      font-style: normal;
      font-display: swap;
    }
    
    @font-face {
      font-family: "NotoSansKR";
      src: url("https://fonts.gstatic.com/s/notosanskr/v27/Pby8FmXiEBPT4ITbgNA5Cgm20HTs4JMMuA.woff2") format("woff2"),
           url("https://fonts.gstatic.com/s/notosanskr/v27/Pby8FmXiEBPT4ITbgNA5Cgm20HTs4JMMuA.woff") format("woff");
      font-weight: 700;
      font-style: normal;
      font-display: swap;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    html, body {
      font-family: "NotoSansKR", "Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    body {
      font-size: 11pt;
      line-height: 1.8;
      color: #000;
      background: #fff;
    }
    
    @page {
      size: A4;
      margin: 2cm;
      @bottom-center {
        content: counter(page);
        font-family: "NotoSansKR", sans-serif;
        font-size: 9pt;
        color: #666;
      }
    }
    .page-break {
      page-break-before: always;
    }
    
    h1 {
      font-family: "NotoSansKR", "Noto Sans KR", sans-serif;
      font-size: 24pt;
      font-weight: 700;
      text-align: center;
      margin: 40px 0;
      color: #000;
    }
    
    h2 {
      font-family: "NotoSansKR", "Noto Sans KR", sans-serif;
      font-size: 18pt;
      font-weight: 700;
      margin-top: 30px;
      margin-bottom: 15px;
      border-bottom: 2px solid #000;
      padding-bottom: 5px;
      color: #000;
    }
    
    h3 {
      font-family: "NotoSansKR", "Noto Sans KR", sans-serif;
      font-size: 14pt;
      font-weight: 500;
      margin-top: 20px;
      margin-bottom: 10px;
      color: #000;
    }
    
    p, td, th, li, span, div {
      font-family: "NotoSansKR", "Noto Sans KR", sans-serif;
      color: #000;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 10pt;
      font-family: "NotoSansKR", "Noto Sans KR", sans-serif;
    }
    
    th, td {
      border: 1px solid #000;
      padding: 8px;
      text-align: left;
      font-family: "NotoSansKR", "Noto Sans KR", sans-serif;
      white-space: pre-wrap;
      word-break: keep-all;
      overflow-wrap: break-word;
    }
    
    th {
      background-color: #f0f0f0;
      font-weight: 700;
    }
    
    .text-center {
      text-align: center;
    }
  </style>
</head>
<body>

  <!-- ① 표지 -->
  <div style="text-align: center; padding-top: 200px;">
    <h1>${tournament.name || "대회명"}</h1>
    <h2 style="border: none; margin-top: 50px;">운영·검증 종합 보고서</h2>
    <div style="margin-top: 100px;">
      <p>생성 일시: ${data.generatedAt.toLocaleString("ko-KR")}</p>
      <p>생성 주체: ${tournament.organizer || "협회명"}</p>
      <p>시스템명: YAGO SPORTS SPT</p>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- ② 대회 개요 -->
  <h2>1. 대회 개요</h2>
  <table>
    <tr><th style="width: 30%;">항목</th><th>내용</th></tr>
    <tr><td>대회명</td><td>${tournament.name || "-"}</td></tr>
    <tr><td>개최 기간</td><td>${tournament.startDate ? new Date(tournament.startDate).toLocaleDateString("ko-KR") : "-"} ~ ${tournament.endDate ? new Date(tournament.endDate).toLocaleDateString("ko-KR") : "-"}</td></tr>
    <tr><td>장소</td><td>${tournament.location || "-"}</td></tr>
    <tr><td>참가 대상</td><td>${tournament.organizer || "-"}</td></tr>
    <tr><td>대회 유형</td><td>${tournament.drawDivisions ? "조별 리그" : "토너먼트"}</td></tr>
    <tr><td>시스템 운영 여부</td><td>전자 검증 (비대면 조 추첨, QR 체크인)</td></tr>
  </table>

  <div class="page-break"></div>

  <!-- ③ 참가 및 선수 검증 현황 -->
  <h2>2. 참가 및 선수 검증 현황</h2>
  <table>
    <tr><th>항목</th><th>수량</th></tr>
    <tr><td>참가 팀 수</td><td>${approvedTeams}팀</td></tr>
    <tr><td>참가 선수 수</td><td>${approvedPlayers}명</td></tr>
    <tr><td>연령 검증 완료</td><td>${ageVerifiedPlayers}명</td></tr>
    <tr><td>승인 현황</td><td>승인: ${approvedTeams}팀 / ${approvedPlayers}명</td></tr>
  </table>
  <p style="margin-top: 15px;">
    <strong>※ 시스템 자동 검증 + 사무국 승인 로그 기반</strong>
  </p>

  <div class="page-break"></div>

  <!-- ④ 조 추첨 보고 -->
  <h2>3. 조 추첨 보고</h2>
  ${drawLog ? `
    <table>
      <tr><th style="width: 30%;">항목</th><th>내용</th></tr>
      <tr><td>조 추첨 방식</td><td>시스템 자동 비대면</td></tr>
      <tr><td>실행 일시</td><td>${drawLog.executedAt?.toDate ? drawLog.executedAt.toDate().toLocaleString("ko-KR") : "-"}</td></tr>
      <tr><td>실행자</td><td>${drawLog.executedByEmail || drawLog.executedBy || "-"}</td></tr>
      <tr><td>랜덤 시드</td><td>${drawLog.algorithm?.seed || "-"}</td></tr>
    </table>
    <h3>조 편성 결과</h3>
    <table>
      <tr><th>조</th><th>팀 수</th><th>팀명</th></tr>
      ${tournament.drawDivisions?.map((div) => `
        <tr>
          <td>${div.division}</td>
          <td>${div.teams.length}팀</td>
          <td>${div.teams.map((t) => t.teamName).join(", ")}</td>
        </tr>
      `).join("") || ""}
    </table>
    <p style="margin-top: 15px;">
      <strong>📌 사람 개입 없음 명시</strong>
    </p>
  ` : "<p>조 추첨이 아직 실행되지 않았습니다.</p>"}

  <div class="page-break"></div>

  <!-- ⑤ 경기 일정표 -->
  <h2>4. 경기 일정표</h2>
  <table>
    <tr><th>날짜</th><th>시간</th><th>경기장</th><th>홈팀</th><th>원정팀</th><th>상태</th></tr>
    ${matches.map((match) => `
      <tr>
        <td>${match.date || "-"}</td>
        <td>${match.time || "-"}</td>
        <td>${match.venueId || "-"}</td>
        <td>${match.homeTeam || "-"}</td>
        <td>${match.awayTeam || "-"}</td>
        <td>${match.status === "COMPLETED" ? "종료" : match.status === "IN_PROGRESS" ? "진행중" : "예정"}</td>
      </tr>
    `).join("")}
  </table>
  <p style="margin-top: 15px;">
    <strong>※ 자동 배정 규칙: 날짜 × 경기장 × 시간슬롯 그리드 기반</strong>
  </p>

  <div class="page-break"></div>

  <!-- ⑥ 경기 결과 요약 -->
  <h2>5. 경기 결과 요약</h2>
  <table>
    <tr><th>항목</th><th>수량</th></tr>
    <tr><td>총 경기 수</td><td>${matches.length}경기</td></tr>
    <tr><td>완료 경기</td><td>${completedMatches}경기</td></tr>
    <tr><td>진행 중</td><td>${matches.filter((m) => m.status === "IN_PROGRESS").length}경기</td></tr>
    <tr><td>예정</td><td>${matches.filter((m) => m.status === "SCHEDULED" || m.status === "UNSCHEDULED").length}경기</td></tr>
  </table>

  <div class="page-break"></div>

  <!-- ⑦ 현장 운영 및 체크인 -->
  <h2>6. 현장 운영 및 체크인</h2>
  <p><strong>QR 체크인 방식:</strong> 승인된 선수만 1회성 QR 토큰으로 현장 입장</p>
  <table>
    <tr><th>항목</th><th>수량</th></tr>
    <tr><td>체크인 기록 수</td><td>${checkIns.length}건</td></tr>
    <tr><td>미승인 선수 차단</td><td>시스템 자동 차단</td></tr>
  </table>

  <div class="page-break"></div>

  <!-- ⑧ 운영 로그 요약 -->
  <h2>7. 운영 로그 요약</h2>
  <table>
    <tr><th>일시</th><th>작업</th><th>실행자</th><th>상세</th></tr>
    ${opsLogs.map((log) => `
      <tr>
        <td>${log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString("ko-KR") : "-"}</td>
        <td>${log.action || "-"}</td>
        <td>${log.executor || "-"}</td>
        <td>${log.details || "-"}</td>
      </tr>
    `).join("")}
  </table>
  <p style="margin-top: 15px;">
    <strong>✔ 전부 시스템 타임스탬프 포함</strong>
  </p>

  <div class="page-break"></div>

  <!-- ⑨ 결론 및 책임 주체 -->
  <h2>8. 결론 및 책임 주체</h2>
  <div style="padding: 20px; border: 1px solid #000; margin-top: 20px;">
    <p style="font-size: 12pt; line-height: 2;">
      본 대회는 협회 공식 시스템을 통해<br/>
      참가·검수·조 추첨·경기 운영이 이루어졌으며,<br/>
      모든 과정은 시스템 로그로 기록되었습니다.
    </p>
  </div>
  <div style="margin-top: 50px; text-align: right;">
    <p>${data.generatedAt.toLocaleDateString("ko-KR")}</p>
    <p style="margin-top: 30px;">
      <strong>${tournament.organizer || "협회명"}</strong>
    </p>
  </div>

</body>
</html>
  `;
}

/**
 * PDF 생성 (Cloud Function 호출)
 */
export async function generatePDF(
  options: GeneratePDFOptions
): Promise<{ pdfUrl: string; html: string }> {
  const data = await collectPDFData(options);
  const html = generatePDFHTML(data);

  // Cloud Function 호출
  const { httpsCallable } = await import("firebase/functions");
  const { getFunctions } = await import("firebase/functions");
  const functions = getFunctions();
  const generatePDFCallable = httpsCallable(functions, "generateTournamentPDFCallable");

  const result = await generatePDFCallable({
    associationId: options.associationId,
    tournamentId: options.tournamentId,
    generatedBy: options.generatedBy,
    html, // HTML 전달
  });

  return {
    pdfUrl: (result.data as any).pdfUrl,
    html,
  };
}

