import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getDefaultStorageBucket } from "./lib/defaultStorageBucket";
import * as fs from "fs";
import * as path from "path";
import { PDFDocument, rgb, StandardFonts, PDFPage } from "pdf-lib";
import fetch from "node-fetch";
import * as nodemailer from "nodemailer";
import { sendSlackAlert } from "./slackAlertHandler";
import { logWorkflowEvent } from "./logWorkflowEvent";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

/**
 * PDF에 텍스트를 그리는 헬퍼 함수
 */
function drawText(
  page: PDFPage,
  font: any,
  text: string,
  y: number,
  size: number = 12,
  color: any = rgb(0, 0, 0),
  x: number = 50,
  maxWidth: number = 495
): number {
  // 텍스트가 너무 길면 줄바꿈 처리
  const words = text.split(" ");
  let currentLine = "";
  let currentY = y;

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, size);

    if (testWidth > maxWidth && currentLine) {
      page.drawText(currentLine, { x, y: currentY, size, font, color });
      currentLine = word;
      currentY -= size + 4;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    page.drawText(currentLine, { x, y: currentY, size, font, color });
  }

  return currentY;
}

/**
 * 주간 종합 리포트 생성 로직
 */
async function generateCombinedReportLogic(): Promise<{
  ok: boolean;
  pdfUrl?: string;
  error?: string;
}> {
  const startTime = Date.now();
  try {
    logger.info("📘 주간 종합 리포트 생성 시작");

    // 1️⃣ Firestore 데이터 로드
    const [insightSnap, statsSnap, logsSnap] = await Promise.all([
      db.doc("insights/weekly").get(),
      db.doc("workflowStats/weekly").get(),
      db
        .collection("workflowLogs")
        .orderBy("timestamp", "desc")
        .limit(10)
        .get(),
    ]);

    const insight = insightSnap.exists() ? insightSnap.data() : {};
    const stats = statsSnap.exists() ? statsSnap.data() : {};
    const logs = logsSnap.docs.map((d) => d.data());

    logger.info(`📦 데이터 로드 완료: insight=${!!insight?.content}, stats=${!!stats?.total}, logs=${logs.length}`);

    // 2️⃣ PDF 생성
    const doc = await PDFDocument.create();
    const page = doc.addPage([595, 842]); // A4 크기
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

    let cursor = 800;

    // 제목
    page.drawText("📘 YAGO SPORTS — AI 종합 리포트", {
      x: 50,
      y: cursor,
      size: 20,
      font: boldFont,
      color: rgb(0, 0.3, 0.6),
    });
    cursor -= 30;

    const currentDate = new Date().toLocaleDateString("ko-KR");
    page.drawText(`생성일: ${currentDate}`, {
      x: 50,
      y: cursor,
      size: 10,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });
    cursor -= 40;

    // Ⅰ. AI 인사이트 요약
    page.drawText("Ⅰ. AI 인사이트 요약", {
      x: 50,
      y: cursor,
      size: 14,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    cursor -= 25;

    let insightText = "데이터 없음";
    if (insight?.content) {
      try {
        const jsonMatch = insight.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const parts: string[] = [];
          if (parsed.trends) parts.push(`주요 트렌드: ${parsed.trends}`);
          if (parsed.keywords && Array.isArray(parsed.keywords)) {
            parts.push(`주요 키워드: ${parsed.keywords.join(", ")}`);
          }
          if (parsed.predictions && Array.isArray(parsed.predictions)) {
            parts.push(`예측 포인트: ${parsed.predictions.join(", ")}`);
          }
          if (parts.length > 0) {
            insightText = parts.join("\n");
          } else {
            insightText = insight.content.slice(0, 500);
          }
        } else {
          insightText = insight.content.slice(0, 500);
        }
      } catch (e) {
        insightText = insight.content.slice(0, 500);
      }
    }

    cursor = drawText(page, font, insightText, cursor, 10, rgb(0, 0, 0), 50, 495);
    cursor -= 30;

    // Ⅱ. 워크플로우 통계
    page.drawText("Ⅱ. 워크플로우 통계", {
      x: 50,
      y: cursor,
      size: 14,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    cursor -= 25;

    cursor = drawText(page, font, `• 총 실행: ${stats?.total ?? "-"}회`, cursor, 11);
    cursor -= 15;
    cursor = drawText(page, font, `• 성공률: ${stats?.successRate ?? "-"}%`, cursor, 11);
    cursor -= 15;
    cursor = drawText(page, font, `• 평균 지연시간: ${stats?.avgDuration ?? "-"}ms`, cursor, 11);
    cursor -= 15;
    cursor = drawText(page, font, `• 오류: ${stats?.error ?? "-"}건`, cursor, 11);
    cursor -= 30;

    // Ⅲ. 주요 오류
    page.drawText("Ⅲ. 주요 오류", {
      x: 50,
      y: cursor,
      size: 14,
      font: boldFont,
      color: rgb(0.7, 0, 0),
    });
    cursor -= 25;

    const errors = stats?.topErrors ?? [];
    if (errors.length === 0) {
      cursor = drawText(page, font, "없음 ✅", cursor, 11, rgb(0, 0.6, 0));
    } else {
      for (const error of errors) {
        cursor = drawText(page, font, `• ${error}`, cursor, 10, rgb(0.7, 0, 0), 60, 485);
        cursor -= 12;
      }
    }
    cursor -= 30;

    // Ⅳ. 최근 실행 로그
    page.drawText("Ⅳ. 최근 실행 로그 (최근 10건)", {
      x: 50,
      y: cursor,
      size: 14,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    cursor -= 25;

    if (logs.length === 0) {
      cursor = drawText(page, font, "로그 데이터 없음", cursor, 11);
    } else {
      for (const log of logs.slice(0, 10)) {
        const timestamp = log.timestamp?.toDate
          ? log.timestamp.toDate().toLocaleString("ko-KR")
          : log.timestamp?.seconds
          ? new Date(log.timestamp.seconds * 1000).toLocaleString("ko-KR")
          : log.createdAt?.toDate
          ? log.createdAt.toDate().toLocaleString("ko-KR")
          : "날짜 없음";

        const status = log.status === "success" ? "✅" : "❌";
        const duration = log.durationMs ? `${Math.round(log.durationMs)}ms` : "-";
        const logText = `• ${status} ${log.step || "unknown"} — ${duration} (${timestamp})`;

        cursor = drawText(page, font, logText, cursor, 9, rgb(0.3, 0.3, 0.3), 60, 485);
        cursor -= 12;

        if (cursor < 50) {
          // 새 페이지 추가
          const newPage = doc.addPage([595, 842]);
          cursor = 800;
          page = newPage;
        }
      }
    }
    cursor -= 30;

    // Ⅴ. 배포 상태
    page.drawText("Ⅴ. 배포 상태", {
      x: 50,
      y: cursor,
      size: 14,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    cursor -= 25;

    const slackStatus = process.env.SLACK_ALERT_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL ? "✅" : "❌";
    const emailStatus = process.env.GMAIL_USER && process.env.GMAIL_PASS ? "✅" : "❌";
    cursor = drawText(page, font, `Slack ${slackStatus}  Email ${emailStatus}`, cursor, 11);

    // PDF 저장
    const pdfBytes = await doc.save();
    const tempFile = path.join("/tmp", `combined_report_${Date.now()}.pdf`);
    fs.writeFileSync(tempFile, pdfBytes);

    logger.info("✅ PDF 생성 완료:", tempFile);

    // 3️⃣ Storage 업로드
    const dateStr = new Date().toISOString().slice(0, 10);
    const dest = `reports/combined_report_${dateStr}.pdf`;

    await getDefaultStorageBucket().upload(tempFile, {
      destination: dest,
      contentType: "application/pdf",
      metadata: {
        metadata: {
          generatedAt: new Date().toISOString(),
          type: "combined_report",
          week: dateStr,
        },
      },
    });

    logger.info("✅ PDF 파일 Storage 업로드 완료:", dest);

    const [pdfUrl] = await getDefaultStorageBucket().file(dest).getSignedUrl({
      action: "read",
      expires: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30일
    });

    // Firestore에 저장
    await db.collection("reports").doc("combined").set({
      url: pdfUrl,
      pdfUrl: pdfUrl,
      week: dateStr,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info("✅ Firestore에 리포트 URL 저장 완료");

    // 임시 파일 삭제
    try {
      fs.unlinkSync(tempFile);
    } catch (unlinkError) {
      logger.warn("⚠️ 임시 파일 삭제 실패:", unlinkError);
    }

    // 4️⃣ Slack 알림
    const webhookUrl = process.env.SLACK_ALERT_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        const message = {
          text: `📘 *YAGO SPORTS AI 종합 리포트*\n\n📅 ${currentDate}\n✅ PDF 생성 완료\n\n📊 통계:\n• 총 실행: ${stats?.total ?? "-"}회\n• 성공률: ${stats?.successRate ?? "-"}%\n• 오류: ${stats?.error ?? "-"}건`,
          attachments: [
            {
              color: "#36a64f",
              actions: [
                {
                  type: "button",
                  text: "📎 PDF 보기",
                  url: pdfUrl,
                  style: "primary",
                },
              ],
              footer: "YAGO SPORTS AI 시스템",
              ts: Math.floor(Date.now() / 1000),
            },
          ],
        };

        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(message),
        });

        logger.info("✅ Slack 알림 전송 완료");
      } catch (slackError: any) {
        logger.error("❌ Slack 알림 전송 오류:", slackError);
        // Slack 오류는 전체 프로세스를 실패시키지 않음
      }
    }

    // 5️⃣ 이메일 발송
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_PASS || process.env.GMAIL_APP_PASSWORD;
    const sendGridApiKey = process.env.SENDGRID_API_KEY;
    const managerEmail = process.env.MANAGER_EMAIL || gmailUser || "admin@yago-vibe.com";

    if ((gmailUser && gmailPass) || sendGridApiKey) {
      try {
        const transporter = sendGridApiKey
          ? nodemailer.createTransport({
              service: "SendGrid",
              auth: { user: "apikey", pass: sendGridApiKey },
            })
          : nodemailer.createTransport({
              service: "gmail",
              auth: { user: gmailUser, pass: gmailPass },
            });

        // PDF 다운로드
        const pdfResponse = await fetch(pdfUrl);
        const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());

        await transporter.sendMail({
          from: `"YAGO SPORTS AI" <${gmailUser || "noreply@yagovibe.com"}>`,
          to: managerEmail,
          subject: `📘 YAGO SPORTS AI 종합 리포트 - ${dateStr}`,
          text: `YAGO SPORTS AI 종합 리포트가 생성되었습니다.\n\n생성일: ${currentDate}\n\n통계:\n• 총 실행: ${stats?.total ?? "-"}회\n• 성공률: ${stats?.successRate ?? "-"}%\n• 평균 지연시간: ${stats?.avgDuration ?? "-"}ms\n• 오류: ${stats?.error ?? "-"}건\n\nPDF 다운로드: ${pdfUrl}`,
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { padding: 20px; background: #f9fafb; }
    .card { background: white; padding: 20px; border-radius: 8px; margin: 10px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .button { display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📘 YAGO SPORTS AI 종합 리포트</h1>
    <p style="margin: 0; opacity: 0.9;">생성일: ${currentDate}</p>
  </div>
  
  <div class="content">
    <div class="card">
      <h2>📊 통계 요약</h2>
      <p><strong>총 실행:</strong> ${stats?.total ?? "-"}회</p>
      <p><strong>성공률:</strong> ${stats?.successRate ?? "-"}%</p>
      <p><strong>평균 지연시간:</strong> ${stats?.avgDuration ?? "-"}ms</p>
      <p><strong>오류:</strong> ${stats?.error ?? "-"}건</p>
    </div>
    
    <div class="card">
      <h2>📎 다운로드</h2>
      <p>종합 리포트 PDF를 다운로드하여 상세 내용을 확인하세요.</p>
      <a href="${pdfUrl}" class="button">📄 PDF 보기</a>
    </div>
  </div>
  
  <div class="footer">
    <p>© 2025 YAGO SPORTS · Powered by AI</p>
    <p>이 이메일은 자동으로 생성되었습니다.</p>
  </div>
</body>
</html>
          `.trim(),
          attachments: [
            {
              filename: `AI_Combined_Report_${dateStr}.pdf`,
              content: pdfBuffer,
              contentType: "application/pdf",
            },
          ],
        });

        logger.info("✅ 이메일 발송 완료");
      } catch (emailError: any) {
        logger.error("❌ 이메일 발송 오류:", emailError);
        // 이메일 오류는 전체 프로세스를 실패시키지 않음
      }
    } else {
      logger.warn("⚠️ 이메일 설정이 없어 이메일 발송을 건너뜁니다.");
    }

    const duration = Date.now() - startTime;
    await logWorkflowEvent("generateCombinedReport", "success", duration);

    return { ok: true, pdfUrl };
  } catch (error: any) {
    logger.error("❌ 주간 종합 리포트 생성 오류:", error);
    const duration = Date.now() - startTime;
    await logWorkflowEvent("generateCombinedReport", "error", duration, error.message);
    await sendSlackAlert(`🚨 [generateCombinedReport] 리포트 생성 오류: ${error.message}`);
    return { ok: false, error: error.message || "Unknown error" };
  }
}

/**
 * 스케줄러 함수: 매주 월요일 09:15 KST 자동 실행
 */
export const generateCombinedReportJob = onSchedule(
  {
    schedule: "15 9 * * 1", // 매주 월요일 09:15
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    timeoutSeconds: 180,
  },
  async (event) => {
    try {
      logger.info("🕘 주간 종합 리포트 자동 생성 시작", { scheduleTime: event.scheduleTime });
      const result = await generateCombinedReportLogic();
      if (result.ok) {
        logger.info("✅ 주간 종합 리포트 자동 생성 완료");
      } else {
        logger.error("❌ 주간 종합 리포트 자동 생성 실패", { error: result.error });
      }
    } catch (error: any) {
      logger.error("❌ 주간 종합 리포트 자동 생성 오류:", error);
    }
  }
);

/**
 * HTTP 함수: 수동으로 종합 리포트 생성
 */
export const generateCombinedReport = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    maxInstances: 3,
    timeoutSeconds: 180,
  },
  async (req, res) => {
    const startTime = Date.now();
    try {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type");

      if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
      }

      if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
      }

      const result = await generateCombinedReportLogic();

      if (result.ok) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error: any) {
      logger.error("❌ 주간 종합 리포트 생성 오류:", error);
      const duration = Date.now() - startTime;
      await logWorkflowEvent("generateCombinedReport", "error", duration, error.message);
      await sendSlackAlert(`🚨 [generateCombinedReport HTTP] 오류 발생: ${error.message}`);
      res.status(500).json({
        ok: false,
        error: error.message || "Unknown error",
      });
    }
  }
);

