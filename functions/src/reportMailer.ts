import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import * as nodemailer from "nodemailer";
import fetch from "node-fetch";

// Firebase Admin 초기화
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const storage = getStorage().bucket();

/**
 * Nodemailer Transporter 초기화
 * Gmail 또는 SendGrid 사용 가능
 */
function createTransporter() {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_PASS || process.env.GMAIL_APP_PASSWORD;
  const sendGridApiKey = process.env.SENDGRID_API_KEY;

  // SendGrid 우선 사용
  if (sendGridApiKey) {
    return nodemailer.createTransport({
      service: "SendGrid",
      auth: {
        user: "apikey",
        pass: sendGridApiKey,
      },
    });
  }

  // Gmail 사용
  if (gmailUser && gmailPass) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });
  }

  throw new Error("이메일 설정이 없습니다. GMAIL_USER/GMAIL_PASS 또는 SENDGRID_API_KEY를 설정하세요.");
}

/**
 * Storage에서 PDF 파일 다운로드
 */
async function downloadPDFFromStorage(pdfPath: string): Promise<Buffer | null> {
  try {
    const file = storage.file(pdfPath);
    const [exists] = await file.exists();

    if (!exists) {
      logger.warn(`⚠️ PDF 파일이 존재하지 않습니다: ${pdfPath}`);
      return null;
    }

    const [buffer] = await file.download();
    return buffer;
  } catch (error: any) {
    logger.error(`❌ PDF 다운로드 실패: ${pdfPath}`, error);
    return null;
  }
}

/**
 * PDF URL에서 직접 다운로드 (Signed URL)
 */
async function downloadPDFFromUrl(pdfUrl: string): Promise<Buffer | null> {
  try {
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error: any) {
    logger.error(`❌ PDF URL 다운로드 실패: ${pdfUrl}`, error);
    return null;
  }
}

/**
 * Step 12: 이메일 자동 발송 기능
 * 리포트 생성 시 자동으로 이메일 전송 (PDF 첨부 + 요약 본문)
 */
export const onReportCreateEmail = onDocumentCreated(
  {
    document: "reports/{reportId}",
    region: "asia-northeast3",
  },
  async (event) => {
    try {
      const reportId = event.params.id;
      const report = event.data?.data() as any;

      if (!report) {
        logger.warn("⚠️ 리포트 데이터가 없습니다:", reportId);
        return;
      }

      logger.info("📧 리포트 생성 감지, 이메일 발송 시작:", reportId);

      // 이메일 설정 확인
      try {
        const transporter = createTransporter();
      } catch (error: any) {
        logger.warn("⚠️ 이메일 설정이 없어 건너뜁니다:", error.message);
        return;
      }

      // 수신자 이메일 주소 결정
      const recipientEmail = report.email || process.env.ALERT_EMAIL_TO || process.env.GMAIL_USER || "admin@yagovibe.com";

      // 날짜 포맷팅
      const dateStr = report?.date?.toDate
        ? report.date.toDate().toISOString().slice(0, 10)
        : report?.date
        ? new Date(report.date).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);

      // PDF 첨부 파일 준비
      let pdfAttachment: nodemailer.Attachment | null = null;

      if (report.pdfPath) {
        // Storage 경로에서 다운로드
        const pdfBuffer = await downloadPDFFromStorage(report.pdfPath);
        if (pdfBuffer) {
          pdfAttachment = {
            filename: `weekly-report-${dateStr}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          };
        }
      } else if (report.pdfUrl) {
        // Signed URL에서 다운로드
        const pdfBuffer = await downloadPDFFromUrl(report.pdfUrl);
        if (pdfBuffer) {
          pdfAttachment = {
            filename: `weekly-report-${dateStr}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          };
        }
      }

      // 이메일 본문 구성
      const emailSubject = `📊 YAGO VIBE 주간 AI 리포트 - ${dateStr}`;
      
      const emailText = `
📊 YAGO VIBE 주간 AI 리포트

생성일: ${dateStr}
총 판매(추정): ${(report.totalSales ?? 0).toLocaleString()} 개
평균 평점: ${report.avgRating ?? "-"}/5

${report.summary ? `\n요약:\n${report.summary}` : ""}

${report.pdfUrl ? `\n📄 PDF 다운로드: ${report.pdfUrl}` : ""}
${report.audioUrl ? `\n🎧 TTS 음성 리포트: ${report.audioUrl}` : ""}

---
YAGO VIBE AI · 자동 발행
      `.trim();

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
    .kpi { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
    .kpi-item { padding: 15px; background: #f3f4f6; border-radius: 6px; }
    .kpi-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
    .kpi-value { font-size: 24px; font-weight: bold; color: #1e40af; margin-top: 5px; }
    .summary { background: #eff6ff; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6; margin: 20px 0; }
    .button { display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .top-products { margin: 20px 0; }
    .product-item { padding: 10px; background: #f9fafb; margin: 5px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 YAGO VIBE 주간 AI 리포트</h1>
    <p style="margin: 0; opacity: 0.9;">생성일: ${dateStr}</p>
  </div>
  
  <div class="content">
    <div class="card">
      <h2 style="margin-top: 0;">📈 핵심 KPI</h2>
      <div class="kpi">
        <div class="kpi-item">
          <div class="kpi-label">총 판매(추정)</div>
          <div class="kpi-value">${(report.totalSales ?? 0).toLocaleString()}개</div>
        </div>
        <div class="kpi-item">
          <div class="kpi-label">평균 평점</div>
          <div class="kpi-value">${report.avgRating ?? "-"}/5</div>
        </div>
      </div>
    </div>

    ${report.summary ? `
    <div class="card">
      <h2 style="margin-top: 0;">📋 AI 요약</h2>
      <div class="summary">
        ${report.summary.replace(/\n/g, "<br>")}
      </div>
    </div>
    ` : ""}

    ${report.topProducts && report.topProducts.length > 0 ? `
    <div class="card">
      <h2 style="margin-top: 0;">🏆 TOP 5 상품</h2>
      <div class="top-products">
        ${report.topProducts.map((p: any, i: number) => `
          <div class="product-item">
            <strong>${i + 1}. ${p.name}</strong><br>
            주간 판매: ${p.weeklySales?.toLocaleString() || 0}개 · 평점: ${p.rating?.toFixed(1) || "0.0"}
          </div>
        `).join("")}
      </div>
    </div>
    ` : ""}

    <div class="card" style="text-align: center;">
      ${report.pdfUrl ? `<a href="${report.pdfUrl}" class="button">📄 PDF 다운로드</a>` : ""}
      ${report.audioUrl ? `<a href="${report.audioUrl}" class="button" style="background: #10b981;">🎧 TTS 음성 리포트</a>` : ""}
    </div>
  </div>

  <div class="footer">
    <p>YAGO VIBE AI · 자동 발행</p>
    <p>이 이메일은 자동으로 생성되어 발송되었습니다.</p>
  </div>
</body>
</html>
      `.trim();

      // 이메일 발송
      const transporter = createTransporter();
      const mailOptions: nodemailer.SendMailOptions = {
        from: `"YAGO VIBE AI" <${process.env.GMAIL_USER || "noreply@yagovibe.com"}>`,
        to: recipientEmail,
        subject: emailSubject,
        text: emailText,
        html: emailHtml,
        attachments: pdfAttachment ? [pdfAttachment] : [],
      };

      await transporter.sendMail(mailOptions);

      // 발송 로그 기록
      await db.collection("reports-log").add({
        at: FieldValue.serverTimestamp(),
        event: "email_sent",
        reportId: reportId,
        recipientEmail,
        date: dateStr,
        hasPdf: !!pdfAttachment,
      });

      logger.info("✅ 이메일 발송 완료:", { reportId, recipientEmail });
    } catch (error: any) {
      logger.error("❌ 이메일 발송 오류:", error);

      // 에러 로그 기록
      try {
        await db.collection("reports-log").add({
          at: FieldValue.serverTimestamp(),
          event: "email_sent_error",
          reportId: event.params.id,
          error: error.message,
        });
      } catch (logError) {
        logger.error("❌ 에러 로그 기록 실패:", logError);
      }
    }
  }
);

/**
 * HTTP 함수: 수동 이메일 발송 테스트
 */
export const sendReportEmailManual = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    maxInstances: 5,
  },
  async (req, res) => {
    try {
      // CORS 헤더 설정
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type");

      // OPTIONS 요청 처리
      if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
      }

      const { reportId, recipientEmail } = req.body || {};

      if (!reportId) {
        res.status(400).json({
          ok: false,
          error: "reportId is required",
        });
        return;
      }

      logger.info("📧 수동 이메일 발송 요청:", reportId);

      // 리포트 조회
      const reportDoc = await db.collection("reports").doc(reportId).get();

      if (!reportDoc.exists) {
        res.status(404).json({
          ok: false,
          error: "Report not found",
        });
        return;
      }

      const report = reportDoc.data() as any;
      const targetEmail = recipientEmail || report.email || process.env.ALERT_EMAIL_TO || process.env.GMAIL_USER || "admin@yagovibe.com";

      // 이메일 발송 로직 (위와 동일)
      const transporter = createTransporter();

      const dateStr = report?.date?.toDate
        ? report.date.toDate().toISOString().slice(0, 10)
        : report?.date
        ? new Date(report.date).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);

      let pdfAttachment: nodemailer.Attachment | null = null;

      if (report.pdfPath) {
        const pdfBuffer = await downloadPDFFromStorage(report.pdfPath);
        if (pdfBuffer) {
          pdfAttachment = {
            filename: `weekly-report-${dateStr}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          };
        }
      } else if (report.pdfUrl) {
        const pdfBuffer = await downloadPDFFromUrl(report.pdfUrl);
        if (pdfBuffer) {
          pdfAttachment = {
            filename: `weekly-report-${dateStr}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          };
        }
      }

      const emailSubject = `📊 YAGO VIBE 주간 AI 리포트 - ${dateStr}`;
      const emailText = `
📊 YAGO VIBE 주간 AI 리포트

생성일: ${dateStr}
총 판매(추정): ${(report.totalSales ?? 0).toLocaleString()} 개
평균 평점: ${report.avgRating ?? "-"}/5

${report.summary ? `\n요약:\n${report.summary}` : ""}

${report.pdfUrl ? `\n📄 PDF 다운로드: ${report.pdfUrl}` : ""}
${report.audioUrl ? `\n🎧 TTS 음성 리포트: ${report.audioUrl}` : ""}

---
YAGO VIBE AI · 자동 발행
      `.trim();

      const mailOptions: nodemailer.SendMailOptions = {
        from: `"YAGO VIBE AI" <${process.env.GMAIL_USER || "noreply@yagovibe.com"}>`,
        to: targetEmail,
        subject: emailSubject,
        text: emailText,
        attachments: pdfAttachment ? [pdfAttachment] : [],
      };

      await transporter.sendMail(mailOptions);

      // 발송 로그 기록
      await db.collection("reports-log").add({
        at: FieldValue.serverTimestamp(),
        event: "email_sent_manual",
        reportId,
        recipientEmail: targetEmail,
        date: dateStr,
      });

      logger.info("✅ 수동 이메일 발송 완료:", { reportId, recipientEmail: targetEmail });

      res.set("Access-Control-Allow-Origin", "*");
      res.json({
        ok: true,
        reportId,
        recipientEmail: targetEmail,
        message: "이메일이 발송되었습니다.",
      });
    } catch (error: any) {
      logger.error("❌ 수동 이메일 발송 오류:", error);
      res.status(500).json({
        ok: false,
        error: "EMAIL_SEND_FAILED",
        message: error.message,
      });
    }
  }
);

