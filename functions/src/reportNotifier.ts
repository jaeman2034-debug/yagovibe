import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import fetch from "node-fetch";
import { getStorage } from "firebase-admin/storage";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp } from "firebase-admin/app";

initializeApp();

const SLACK_WEBHOOK_URL = "<SLACK_WEBHOOK_URL>"; // 실제 Webhook으로 교체

export const notifyWeeklyReport = onSchedule(
  {
    schedule: "10 9 * * 1", // 매주 월요일 09:10
    timeZone: "Asia/Seoul",
  },
  async () => {
    const db = getFirestore();
    const bucket = getStorage().bucket();
    logger.info("💬 Slack 리포트 자동 전송 시작");

    try {
      // 1️⃣ Firestore에서 가장 최근 weeklyReports 문서 가져오기
      const reportsRef = db.collection("weeklyReports").orderBy("createdAt", "desc").limit(1);
      const snapshot = await reportsRef.get();
      if (snapshot.empty) {
        logger.warn("⚠️ 최근 리포트 없음");
        return;
      }

      const latest = snapshot.docs[0].data();
      const filePath = latest.storagePath;

      // 2️⃣ Storage의 Signed URL 생성 (임시 접근 링크)
      const [url] = await bucket.file(filePath).getSignedUrl({
        action: "read",
        expires: Date.now() + 1000 * 60 * 60 * 24 * 3, // 3일 유효
      });

      // 3️⃣ Slack 메시지 작성
      const message = {
        text: `📊 *YAGO VIBE 주간 리포트*\n\n👥 총 회원 수: ${latest.totalMembers}\n⚽ 경기 수: ${latest.totalMatches}\n\n📄 [PDF 다운로드](${url})`,
      };

      // 4️⃣ Slack 전송
      await fetch(SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      });

      logger.info("✅ Slack 리포트 전송 완료", { url });
    } catch (err) {
      logger.error("❌ Slack 전송 오류", err);
    }
  }
);
