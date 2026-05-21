import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { sendSlack } from "./slack";

// Firebase Admin 초기화
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

/**
 * Step 11: Slack 자동 알림
 * 리포트 생성 시 자동으로 Slack에 알림 전송
 */
export const onReportCreate = onDocumentCreated(
  {
    document: "reports/{id}",
    region: "asia-northeast3",
  },
  async (event) => {
    try {
      const reportId = event.params.id;
      const r = event.data?.data() as any;

      if (!r) {
        logger.warn("⚠️ 리포트 데이터가 없습니다:", reportId);
        return;
      }

      logger.info("📢 리포트 생성 감지, Slack 알림 전송 시작:", reportId);

      // 날짜 포맷팅
      const dateStr = r?.date?.toDate
        ? r.date.toDate().toISOString().slice(0, 10)
        : r?.date
        ? new Date(r.date).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);

      // Slack Block Kit 메시지 구성
      const blocks = [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "📄 주간 AI 리포트가 생성되었습니다!",
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*생성일:*\n${dateStr}`,
            },
            {
              type: "mrkdwn",
              text: `*총 판매(추정):*\n${(r.totalSales ?? 0).toLocaleString()} 개`,
            },
            {
              type: "mrkdwn",
              text: `*평균 평점:*\n${r.avgRating ?? "-"}/5`,
            },
            {
              type: "mrkdwn",
              text: `*TOP 상품:*\n${r.topProducts?.[0]?.name ?? "-"}`,
            },
          ],
        },
        ...(r.summary
          ? [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `*요약*\n${r.summary.slice(0, 500)}${r.summary.length > 500 ? "..." : ""}`,
                },
              },
            ]
          : []),
        {
          type: "actions",
          elements: [
            ...(r.pdfUrl
              ? [
                  {
                    type: "button",
                    text: {
                      type: "plain_text",
                      text: "📄 PDF 열기",
                      emoji: true,
                    },
                    url: r.pdfUrl,
                    style: "primary",
                  },
                ]
              : []),
            ...(r.audioUrl
              ? [
                  {
                    type: "button",
                    text: {
                      type: "plain_text",
                      text: "🔊 MP3 듣기",
                      emoji: true,
                    },
                    url: r.audioUrl,
                  },
                ]
              : []),
          ],
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: "_YAGO SPORTS · 자동 발행_",
            },
          ],
        },
      ];

      // Slack 알림 전송
      await sendSlack({ blocks });

      // 알림 로그 기록
      await db.collection("reports-log").add({
        at: FieldValue.serverTimestamp(),
        event: "slack_notified",
        reportId: reportId,
        date: dateStr,
      });

      logger.info("✅ Slack 알림 전송 완료:", reportId);
    } catch (error: any) {
      logger.error("❌ Slack 알림 전송 오류:", error);

      // 에러 로그 기록
      try {
        await db.collection("reports-log").add({
          at: FieldValue.serverTimestamp(),
          event: "slack_notified_error",
          reportId: event.params.id,
          error: error.message,
        });
      } catch (logError) {
        logger.error("❌ 에러 로그 기록 실패:", logError);
      }
    }
  }
);

