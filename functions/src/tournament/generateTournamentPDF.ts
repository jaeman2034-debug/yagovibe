/**
 * 🔥 구청·감사용 PDF 생성 (Cloud Function)
 * 
 * 서버에서 직접 데이터 수집 → HTML 생성 → PDF 변환
 * Puppeteer를 사용하여 HTML → PDF 변환
 * 한글 폰트 완전 임베딩 보장
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import * as admin from "firebase-admin";
// @ts-ignore - puppeteer는 런타임에만 필요
const puppeteer = require("puppeteer");

interface GeneratePDFRequest {
  associationId: string;
  tournamentId: string;
}

/**
 * 🔥 HTML 생성 함수 (대진표 + 결과)
 */
function buildBracketHtml(tournament: any, rounds: any[], matches: any[]): string {
  // 라운드별로 정렬
  const sortedRounds = rounds
    .filter((r) => r.roundNumber != null)
    .sort((a, b) => (a.roundNumber || 0) - (b.roundNumber || 0));

  const completedAt = tournament.completedAt
    ? (tournament.completedAt as any)?.toDate?.()?.toLocaleDateString("ko-KR") || ""
    : "";

  const roundsHtml = sortedRounds
    .map((round) => {
      const roundMatches = matches.filter((m) => m.roundNumber === round.roundNumber);
      const matchesHtml = roundMatches
        .map((match) => {
          const home = match.homeTeamName || match.homeTeamId || "TBD";
          const away = match.awayTeamName || match.awayTeamId || "TBD";
          let winner = "";
          if (match.winnerTeamId === match.homeTeamId) {
            winner = home;
          } else if (match.winnerTeamId === match.awayTeamId) {
            winner = away;
          }
          const score = match.homeScore != null && match.awayScore != null
            ? `${match.homeScore} : ${match.awayScore}`
            : "";

          return `
            <tr>
              <td>${home}</td>
              <td>vs</td>
              <td>${away}</td>
              <td>${score}</td>
              <td>${winner || "-"}</td>
            </tr>
          `;
        })
        .join("");

      const roundTitle = round.title || round.name || `라운드 ${round.roundNumber}`;

      return `
        <div style="margin-bottom: 30px;">
          <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #333; padding-bottom: 5px;">
            ${roundTitle}
          </h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">홈팀</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">vs</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">원정팀</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">점수</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">승자</th>
              </tr>
            </thead>
            <tbody>
              ${matchesHtml || "<tr><td colspan='5' style='text-align: center; padding: 10px;'>경기 없음</td></tr>"}
            </tbody>
          </table>
        </div>
      `;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${tournament.name} - 대회 결과 리포트</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap');
        body {
          font-family: 'Noto Sans KR', sans-serif;
          margin: 0;
          padding: 40px;
          color: #333;
          line-height: 1.6;
        }
        h1 {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 10px;
          border-bottom: 3px solid #333;
          padding-bottom: 10px;
        }
        .meta {
          margin-bottom: 20px;
          color: #666;
          font-size: 14px;
        }
        .winner {
          background-color: #fff9c4;
          border: 2px solid #fbc02d;
          padding: 15px;
          margin-bottom: 30px;
          text-align: center;
          border-radius: 5px;
        }
        .winner h2 {
          margin: 0 0 10px 0;
          font-size: 18px;
          color: #f57c00;
        }
        .winner strong {
          font-size: 20px;
          color: #e65100;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th, td {
          padding: 10px;
          border: 1px solid #ddd;
          text-align: left;
        }
        th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          text-align: right;
          font-size: 12px;
          color: #999;
        }
      </style>
    </head>
    <body>
      <h1>${tournament.name}</h1>
      <div class="meta">
        ${tournament.ageGroup ? `<p>연령대: ${tournament.ageGroup}</p>` : ""}
        ${completedAt ? `<p>대회 종료일: ${completedAt}</p>` : ""}
      </div>
      ${tournament.status === "completed" && tournament.winnerTeamName
        ? `
          <div class="winner">
            <h2>🏆 우승팀</h2>
            <strong>${tournament.winnerTeamName}</strong>
          </div>
        `
        : ""}
      <div>
        <p><strong>총 경기 수:</strong> ${matches.length}경기</p>
      </div>
      ${roundsHtml}
      <div class="footer">
        <p>생성일: ${new Date().toLocaleDateString("ko-KR")}</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * 🔥 PDF 생성 (Callable)
 * 대진표 + 결과 PDF 출력
 */
export const generateTournamentPdf = onCall(
  {
    region: "asia-northeast3",
    cors: true,
    timeoutSeconds: 300, // 5분 (PDF 생성 시간 고려)
    memory: "1GiB", // Puppeteer 메모리 요구사항
  },
  async (request) => {
    const { associationId, tournamentId } = request.data as GeneratePDFRequest;
    const uid = request.auth?.uid;

    if (!uid) {
      throw new HttpsError("unauthenticated", "인증이 필요합니다.");
    }

    const db = admin.firestore();

    try {
      // 1️⃣ Tournament 문서 조회
      const tRef = db
        .collection("associations")
        .doc(associationId)
        .collection("tournaments")
        .doc(tournamentId);

      const tSnap = await tRef.get();
      if (!tSnap.exists) {
        throw new HttpsError("not-found", "대회를 찾을 수 없습니다.");
      }
      const tournament = tSnap.data();
      if (!tournament) {
        throw new HttpsError("not-found", "대회 데이터가 없습니다.");
      }

      // 2️⃣ Rounds 조회
      const roundsSnap = await tRef.collection("rounds").orderBy("roundNumber", "asc").get();
      const rounds = roundsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // 3️⃣ Matches 조회
      const matchesSnap = await tRef.collection("matches").orderBy("roundNumber", "asc").get();
      const matches = matchesSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // 4️⃣ HTML 생성
      const html = buildBracketHtml(tournament, rounds, matches);

      // 5️⃣ Puppeteer로 PDF 생성
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--disable-gpu",
        ],
      });

      const page = await browser.newPage();
      await page.setContent(html, {
        waitUntil: "networkidle0",
        timeout: 60000,
      });

      // 폰트 로드 대기
      await page.evaluate(() => {
        // @ts-ignore - document.fonts는 브라우저 환경에서만 사용 가능
        return (globalThis as any).document?.fonts?.ready || Promise.resolve();
      });

      // PDF 생성 (한글 폰트 임베딩 보장)
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        margin: {
          top: "2cm",
          right: "2cm",
          bottom: "2cm",
          left: "2cm",
        },
      });

      await browser.close();

      // 6️⃣ PDF를 Storage에 업로드
      const bucket = admin.storage().bucket();
      const fileName = `pdf/${tournamentId}.pdf`;
      const file = bucket.file(fileName);

      await file.save(pdfBuffer, {
        metadata: {
          contentType: "application/pdf",
          metadata: {
            tournamentId,
            generatedBy: uid,
            generatedAt: new Date().toISOString(),
          },
        },
      });

      // 7️⃣ 공개 URL 생성 (2030년까지 유효)
      const [url] = await file.getSignedUrl({
        action: "read",
        expires: "2030-01-01",
      });

      logger.info(`✅ PDF 생성 완료: ${tournamentId}`);

      return {
        pdfUrl: url,
      };
    } catch (error: any) {
      logger.error("❌ PDF 생성 실패:", error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", `PDF 생성 실패: ${error.message || "알 수 없는 오류"}`);
    }
  }
);

