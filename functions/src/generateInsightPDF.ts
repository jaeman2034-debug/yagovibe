import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import * as fs from "fs";
import * as path from "path";
import PDFDocument from "pdfkit";
import { sendSlack } from "./slack";
import * as nodemailer from "nodemailer";
import { logWorkflowEvent } from "./logWorkflowEvent";
import { sendSlackAlert } from "./slackAlertHandler";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const storage = getStorage().bucket();

/**
 * Step 23: AI 주간 인사이트 PDF 자동 생성 및 Slack/이메일 공유
 * insights/weekly 문서 생성/업데이트 시 PDF를 생성하고 Slack/이메일로 공유
 */
export const generateInsightPDF = onDocumentWritten(
  {
    document: "insights/weekly",
    region: "asia-northeast3",
    timeoutSeconds: 180, // PDF 생성 시간 고려
  },
  async (event) => {
    const startTime = Date.now();
    try {
      const after = event.data?.after?.data();
      const before = event.data?.before?.data();

      // 문서가 삭제되었거나 content가 없으면 건너뛰기
      if (!after?.content) {
        logger.info("ℹ️ content가 없거나 문서가 삭제되었습니다.");
        return;
      }

      // 이미 pdfUrl이 있고 내용이 변경되지 않았으면 건너뛰기 (중복 생성 방지)
      if (after.pdfUrl && before && before.content === after.content) {
        logger.info("ℹ️ 이미 PDF 파일이 존재하고 내용이 변경되지 않았습니다. 건너뜁니다.");
        return;
      }

      logger.info("📄 주간 인사이트 생성/업데이트 감지, PDF 생성 시작");

      // JSON 파싱 시도
      let parsedContent: any = null;
      try {
        const jsonMatch = after.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedContent = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        // JSON 파싱 실패 시 원본 텍스트 사용
      }

      // PDF 생성
      const pdfPath = path.join("/tmp", `insight_weekly_${Date.now()}.pdf`);
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
      });

      const writeStream = fs.createWriteStream(pdfPath);
      doc.pipe(writeStream);

      // 페이지 1: 제목 및 요약
      doc.fontSize(24).font("Helvetica-Bold").text("YAGO VIBE AI 주간 인사이트 리포트", {
        align: "center",
      });

      doc.moveDown(0.5);
      doc.fontSize(10).font("Helvetica").fillColor("#666666");

      const generatedAt = after.generatedAt?.toDate
        ? after.generatedAt.toDate().toLocaleDateString("ko-KR")
        : after.createdAt?.toDate
        ? after.createdAt.toDate().toLocaleDateString("ko-KR")
        : new Date().toLocaleDateString("ko-KR");

      doc.text(`생성일: ${generatedAt}`, { align: "center" });
      if (after.reportCount) {
        doc.text(`분석 리포트 수: ${after.reportCount}개`, { align: "center" });
      }

      doc.moveDown(1.5);
      doc.fontSize(12).font("Helvetica-Bold").fillColor("#000000").text("📊 주요 트렌드", {
        underline: true,
      });

      doc.moveDown(0.5);
      doc.fontSize(11).font("Helvetica").fillColor("#000000");

      if (parsedContent?.trends) {
        // JSON 파싱된 경우 구조화된 형식으로 표시
        const trendsText = parsedContent.trends;
        doc.text(trendsText, {
          lineGap: 5,
          align: "left",
        });
      } else {
        // 원본 텍스트 사용 (최대 2000자)
        const content = after.content.slice(0, 2000);
        doc.text(content, {
          lineGap: 5,
          align: "left",
        });
      }

      // 페이지 2: 키워드 및 예측
      doc.addPage();

      if (parsedContent?.keywords && Array.isArray(parsedContent.keywords) && parsedContent.keywords.length > 0) {
        doc.fontSize(14).font("Helvetica-Bold").fillColor("#000000").text("🔑 주요 키워드", {
          underline: true,
        });
        doc.moveDown(0.5);
        doc.fontSize(11).font("Helvetica").fillColor("#000000");

        parsedContent.keywords.forEach((keyword: string, index: number) => {
          const keywordText = keyword.replace(/^#+/, ""); // 해시태그 제거
          doc.text(`${index + 1}. ${keywordText}`, {
            lineGap: 3,
          });
        });

        doc.moveDown(1);
      }

      if (parsedContent?.predictions && Array.isArray(parsedContent.predictions) && parsedContent.predictions.length > 0) {
        doc.fontSize(14).font("Helvetica-Bold").fillColor("#000000").text("🔮 예측 포인트", {
          underline: true,
        });
        doc.moveDown(0.5);
        doc.fontSize(11).font("Helvetica").fillColor("#000000");

        parsedContent.predictions.forEach((prediction: string, index: number) => {
          doc.text(`• ${prediction}`, {
            lineGap: 3,
          });
        });
      }

      // 페이지 3: 메타데이터 및 생성 정보
      doc.addPage();
      doc.fontSize(14).font("Helvetica-Bold").fillColor("#000000").text("📋 리포트 정보", {
        underline: true,
      });

      doc.moveDown(1);
      doc.fontSize(10).font("Helvetica").fillColor("#666666");

      doc.text(`생성일: ${generatedAt}`);
      doc.text(`분석 리포트 수: ${after.reportCount || 0}개`);
      if (after.ttsUrl) {
        doc.text(`음성 리포트: 생성됨`);
      }
      if (after.pdfUrl) {
        doc.text(`PDF 리포트: 생성됨`);
      }

      doc.moveDown(2);
      doc.fontSize(8).font("Helvetica").fillColor("#999999").text(
        "© 2025 YAGO VIBE · Powered by AI",
        {
          align: "center",
        }
      );

      doc.end();

      // PDF 저장 완료 대기
      await new Promise<void>((resolve, reject) => {
        writeStream.on("finish", () => resolve());
        writeStream.on("error", reject);
      });

      logger.info("✅ PDF 생성 완료:", pdfPath);

      // Firebase Storage에 업로드
      const dest = `reports/insights/weekly_${Date.now()}.pdf`;
      await storage.upload(pdfPath, {
        destination: dest,
        contentType: "application/pdf",
        metadata: {
          metadata: {
            generatedAt: new Date().toISOString(),
            type: "weekly_insight",
            reportCount: (after.reportCount || 0).toString(),
          },
        },
      });

      logger.info("✅ PDF 파일 Storage 업로드 완료:", dest);

      // Signed URL 생성 (30일 유효)
      const [pdfUrl] = await storage.file(dest).getSignedUrl({
        action: "read",
        expires: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });

      // Firestore 문서 업데이트
      await event.data?.after?.ref.update({
        pdfUrl: pdfUrl,
        pdfGeneratedAt: FieldValue.serverTimestamp(),
      });

      logger.info("✅ Firestore에 PDF URL 업데이트 완료");

      // Slack 알림 전송
      try {
        const reportCount = after.reportCount || 0;
        const message = {
          text: `📄 *AI 인사이트 PDF 리포트*\n\n📅 생성일: ${generatedAt}\n📊 리포트 ${reportCount}개 분석\n\n📎 [PDF 보기](${pdfUrl})`,
          attachments: [
            {
              fallback: "PDF 리포트 보기",
              color: "#36a64f",
              actions: [
                {
                  type: "button",
                  text: "📄 PDF 보기",
                  url: pdfUrl,
                  style: "primary",
                },
              ],
            },
          ],
        };

        await sendSlack(message);
        logger.info("✅ Slack PDF 알림 전송 완료");
      } catch (slackError: any) {
        logger.error("❌ Slack 알림 전송 오류:", slackError);
        // Slack 오류는 전체 프로세스를 실패시키지 않음
      }

      // 이메일 알림 전송
      try {
        const gmailUser = process.env.GMAIL_USER;
        const gmailPass = process.env.GMAIL_PASS || process.env.GMAIL_APP_PASSWORD;
        const sendGridApiKey = process.env.SENDGRID_API_KEY;
        const recipientEmail = process.env.ALERT_EMAIL_TO || gmailUser || "admin@yagovibe.com";

        if (!gmailUser && !gmailPass && !sendGridApiKey) {
          logger.warn("⚠️ 이메일 설정이 없어 이메일 발송을 건너뜁니다.");
        } else {
          // Nodemailer Transporter 생성
          const transporter = sendGridApiKey
            ? nodemailer.createTransport({
                service: "SendGrid",
                auth: {
                  user: "apikey",
                  pass: sendGridApiKey,
                },
              })
            : nodemailer.createTransport({
                service: "gmail",
                auth: {
                  user: gmailUser,
                  pass: gmailPass,
                },
              });

          const summary = parsedContent?.trends
            ? parsedContent.trends.slice(0, 500)
            : after.content.slice(0, 500);

          const emailSubject = `📄 YAGO VIBE AI 주간 인사이트 PDF 리포트 - ${generatedAt}`;

          const emailHtml = `
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
    <h1>📄 YAGO VIBE AI 주간 인사이트 PDF 리포트</h1>
    <p style="margin: 0; opacity: 0.9;">생성일: ${generatedAt}</p>
  </div>
  
  <div class="content">
    <div class="card">
      <h2>📊 리포트 요약</h2>
      <p>${summary}</p>
      <p><strong>분석 리포트 수:</strong> ${reportCount || 0}개</p>
    </div>
    
    <div class="card">
      <h2>📎 다운로드</h2>
      <p>PDF 리포트를 다운로드하여 상세 내용을 확인하세요.</p>
      <a href="${pdfUrl}" class="button">📄 PDF 보기</a>
    </div>
  </div>
  
  <div class="footer">
    <p>© 2025 YAGO VIBE · Powered by AI</p>
    <p>이 이메일은 자동으로 생성되었습니다.</p>
  </div>
</body>
</html>
          `.trim();

          await transporter.sendMail({
            from: gmailUser || "noreply@yagovibe.com",
            to: recipientEmail,
            subject: emailSubject,
            html: emailHtml,
            text: `YAGO VIBE AI 주간 인사이트 PDF 리포트\n\n생성일: ${generatedAt}\n분석 리포트 수: ${reportCount || 0}개\n\nPDF 다운로드: ${pdfUrl}`,
          });

          logger.info("✅ 이메일 PDF 알림 전송 완료");
        }
      } catch (emailError: any) {
        logger.error("❌ 이메일 알림 전송 오류:", emailError);
        // 이메일 오류는 전체 프로세스를 실패시키지 않음
      }

      // 임시 파일 삭제
      try {
        fs.unlinkSync(pdfPath);
      } catch (unlinkError) {
        logger.warn("⚠️ 임시 파일 삭제 실패:", unlinkError);
      }
      const duration = Date.now() - startTime;
      await logWorkflowEvent("generateInsightPDF", "success", duration);
    } catch (error: any) {
      logger.error("❌ 주간 인사이트 PDF 생성 오류:", error);
      const duration = Date.now() - startTime;
      await logWorkflowEvent("generateInsightPDF", "error", duration, error.message);
      await sendSlackAlert(`🚨 [generateInsightPDF] PDF 생성 오류: ${error.message}`);
      try {
        // 에러 로그 기록
        await db.collection("insights-log").add({
          createdAt: FieldValue.serverTimestamp(),
          event: "pdf_generation_error",
          error: error.message,
          status: "error",
        });
      } catch (logError) {
        logger.error("❌ 에러 로그 기록 실패:", logError);
      }
    }
  }
);

