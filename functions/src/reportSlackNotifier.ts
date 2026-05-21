import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { sendSlack } from "./slack";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import axios from "axios";

// Firebase Admin 초기화
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

/**
 * Step 13: Slack 자동 알림 연동
 * 리포트 생성 시 이메일과 함께 Slack 채널에 자동 알림 전송
 */
export const notifySlack = onDocumentCreated(
  {
    document: "reports/{reportId}",
    region: "asia-northeast3",
  },
  async (event) => {
    try {
      const reportId = event.params.reportId;
      const report = event.data?.data() as any;

      if (!report) {
        logger.warn("⚠️ 리포트 데이터가 없습니다:", reportId);
        return;
      }

      logger.info("📢 리포트 생성 감지, Slack 알림 전송 시작:", reportId);

      // 날짜 포맷팅
      const dateStr = report?.date?.toDate
        ? report.date.toDate().toISOString().slice(0, 10)
        : report?.date
        ? new Date(report.date).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);

      // 리포트 제목 및 작성자
      const reportTitle = report.title || `주간 AI 리포트 - ${dateStr}`;
      const reportAuthor = report.author || "YAGO SPORTS AI";

      // 요약 텍스트
      const summaryText = report.summary || "요약 정보가 없습니다.";

      // PDF URL과 TTS URL (audioUrl을 ttsUrl로도 사용)
      const pdfUrl = report.pdfUrl || null;
      const ttsUrl = report.audioUrl || report.ttsUrl || null;

      // Slack 메시지 구성 (텍스트 + Attachments 형식)
      const message: any = {
        text: `📢 *AI 리포트 생성됨*\n\n*제목:* ${reportTitle}\n*작성자:* ${reportAuthor}\n*생성일:* ${dateStr}\n\n*요약:*\n${summaryText}`,
      };

      // 첨부 파일 및 버튼 추가
      const attachments: any[] = [];

      // PDF 버튼
      if (pdfUrl && pdfUrl !== "없음") {
        attachments.push({
          fallback: "PDF 보기",
          actions: [
            {
              type: "button",
              text: "📄 PDF 보기",
              url: pdfUrl,
              style: "primary",
            },
          ],
        });
      }

      // TTS/음성 버튼
      if (ttsUrl && ttsUrl !== "없음") {
        attachments.push({
          fallback: "음성 리포트 듣기",
          actions: [
            {
              type: "button",
              text: "🔊 음성 듣기",
              url: ttsUrl,
            },
          ],
        });
      }

      // 첨부 파일이 있으면 추가
      if (attachments.length > 0) {
        message.attachments = attachments;
      }

      // Slack 알림 전송
      await sendSlack(message);

      // 알림 로그 기록
      await db.collection("reports-log").add({
        at: FieldValue.serverTimestamp(),
        event: "slack_notified",
        reportId: reportId,
        date: dateStr,
        title: reportTitle,
      });

      logger.info("✅ Slack 알림 전송 완료:", reportId);
    } catch (error: any) {
      logger.error("❌ Slack 알림 전송 오류:", error);

      // 에러 로그 기록
      try {
        await db.collection("reports-log").add({
          at: FieldValue.serverTimestamp(),
          event: "slack_notified_error",
          reportId: event.params.reportId,
          error: error.message,
        });
      } catch (logError) {
        logger.error("❌ 에러 로그 기록 실패:", logError);
      }
    }
  }
);

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

export const notifySlackOnReport = onDocumentWritten("reports/{reportId}", async (event) => {
  try {
    if (!SLACK_WEBHOOK_URL) {
      console.warn("Slack webhook URL is not configured");
      return;
    }

    const afterData = event.data?.after?.data();
    if (!afterData) {
      return;
    }

    const { reportId } = event.params;
    const name = afterData.name || "이름 없음";
    const summary = afterData.analysis?.summary || "요약 없음";
    const pdfUrl = afterData.pdfUrl || "링크 없음";
    const audioUrl = afterData.audioUrl;

    const textLines = [
      "📢 *YAGO SPORTS AI 리포트 업데이트*",
      "",
      `🧾 *상품명*: ${name}`,
      `🧠 *AI 요약*: ${summary}`,
      `📄 <${pdfUrl}|PDF 보기>${audioUrl ? ` 🎧 <${audioUrl}|음성 듣기>` : ""}`,
      `🕒 ${new Date().toLocaleString("ko-KR")}`,
    ];

    await axios.post(SLACK_WEBHOOK_URL, {
      text: textLines.join("\n"),
    });

    console.log(`✅ Slack 알림 전송 완료 (${reportId})`);
  } catch (error) {
    console.error("Slack 알림 전송 실패", error);
  }
});

