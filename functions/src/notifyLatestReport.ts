import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { sendSlack } from "./slack";

// Firebase Admin 초기화
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

/**
 * Step 11: 최신 리포트 Slack 알림 (수동 테스트용)
 * HTTP 함수로 최신 리포트를 Slack에 전송
 */
export const notifyLatestReport = onRequest(
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

      logger.info("📢 최신 리포트 Slack 알림 요청");

      // 최신 리포트 조회
      const snap = await db.collection("reports").orderBy("date", "desc").limit(1).get();

      if (snap.empty) {
        res.status(404).json({
          ok: false,
          error: "no reports",
          message: "생성된 리포트가 없습니다.",
        });
        return;
      }

      const r = snap.docs[0].data() as any;
      const reportId = snap.docs[0].id;

      // 날짜 포맷팅
      const dateStr = r?.date?.toDate
        ? r.date.toDate().toISOString().slice(0, 10)
        : r?.date
        ? new Date(r.date).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);

      // Slack 메시지 전송
      await sendSlack({
        text: "📄 주간 AI 리포트 알림",
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "📄 주간 AI 리포트 (수동 알림)",
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
                text: `_YAGO VIBE · 수동 알림 · 리포트 ID: ${reportId}_`,
              },
            ],
          },
        ],
      });

      logger.info("✅ 최신 리포트 Slack 알림 전송 완료:", reportId);

      res.set("Access-Control-Allow-Origin", "*");
      res.json({
        ok: true,
        reportId,
        date: dateStr,
        message: "Slack 알림이 전송되었습니다.",
      });
    } catch (error: any) {
      logger.error("❌ 최신 리포트 Slack 알림 오류:", error);
      res.status(500).json({
        ok: false,
        error: "NOTIFICATION_FAILED",
        message: error.message,
      });
    }
  }
);

