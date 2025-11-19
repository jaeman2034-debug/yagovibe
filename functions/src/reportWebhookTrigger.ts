import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import fetch from "node-fetch";

// Firebase Admin 초기화
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

/**
 * Step 14: n8n 완전 자동화 파이프라인
 * 리포트 생성 시 n8n Webhook으로 트리거하여
 * Slack, Email, Notion, PDF 저장까지 자동 실행
 */
export const triggerN8nWorkflow = onDocumentCreated(
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

      logger.info("🚀 리포트 생성 감지, n8n 워크플로우 트리거 시작:", reportId);

      // n8n Webhook URL 확인
      const webhookUrl = process.env.N8N_WEBHOOK_URL || (process as any).env.n8n_webhook_url;

      if (!webhookUrl) {
        logger.warn("⚠️ N8N_WEBHOOK_URL이 설정되지 않았습니다. n8n 트리거를 건너뜁니다.");
        return;
      }

      // 날짜 포맷팅
      const dateStr = report?.date?.toDate
        ? report.date.toDate().toISOString().slice(0, 10)
        : report?.date
        ? new Date(report.date).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);

      // n8n으로 전송할 페이로드 구성
      const payload = {
        reportId: reportId,
        title: report.title || `주간 AI 리포트 - ${dateStr}`,
        summary: report.summary || "요약 정보가 없습니다.",
        author: report.author || "YAGO VIBE AI",
        pdfUrl: report.pdfUrl || null,
        audioUrl: report.audioUrl || report.ttsUrl || null,
        ttsUrl: report.audioUrl || report.ttsUrl || null,
        email: report.email || process.env.ALERT_EMAIL_TO || "admin@yago-vibe.com",
        totalSales: report.totalSales || 0,
        avgRating: report.avgRating || 0,
        topProducts: report.topProducts || [],
        date: dateStr,
        createdAt: report.createdAt?.toDate
          ? report.createdAt.toDate().toISOString()
          : report.createdAt || new Date().toISOString(),
        type: report.type || "weekly",
      };

      // n8n Webhook 호출
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`n8n 워크플로우 호출 실패: ${response.status} ${errorText}`);
      }

      const result = await response.json().catch(() => ({}));

      logger.info("✅ n8n 워크플로우 트리거 성공:", {
        reportId,
        webhookUrl: webhookUrl.substring(0, 50) + "...",
        status: response.status,
      });

      // 트리거 로그 기록
      await db.collection("reports-log").add({
        at: FieldValue.serverTimestamp(),
        event: "n8n_triggered",
        reportId: reportId,
        date: dateStr,
        title: payload.title,
        status: "success",
        response: result,
      });
    } catch (error: any) {
      logger.error("❌ n8n 워크플로우 트리거 오류:", error);

      // 에러 로그 기록
      try {
        await db.collection("reports-log").add({
          at: FieldValue.serverTimestamp(),
          event: "n8n_triggered_error",
          reportId: event.params.id,
          error: error.message,
          status: "error",
        });
      } catch (logError) {
        logger.error("❌ 에러 로그 기록 실패:", logError);
      }
    }
  }
);

