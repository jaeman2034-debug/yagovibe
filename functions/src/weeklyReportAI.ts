import { onSchedule } from "firebase-functions/v2/scheduler";
import { admin } from "./lib/firebaseAdmin";
import fetch from "node-fetch";

const db = admin.firestore();
const SLACK_WEBHOOK_URL =
  process.env.SLACK_WEBHOOK_URL ||
  process.env.slack_webhook_url ||
  "";

export const generateWeeklyReportJob = onSchedule(
  {
    schedule: "every monday 09:00",
    timeZone: "Asia/Seoul",
  },
  async () => {
    console.log("📊 [YAGO SPORTS] 주간 리포트 생성 시작");

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const periodText = `${oneWeekAgo.toLocaleDateString("ko-KR").replace(/\./g, "/")} ~ ${now
      .toLocaleDateString("ko-KR")
      .replace(/\./g, "/")}`;

    const snapshot = await db
      .collection("reports")
      .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(oneWeekAgo))
      .orderBy("createdAt", "desc")
      .get();

    const reports = snapshot.docs.map((doc) => doc.data() as any);

    const total = reports.length;
    const unread = reports.filter((r) => !r.read).length;
    const read = total - unread;
    const latestDate = reports[0]?.createdAt?.toDate?.()
      ? reports[0].createdAt.toDate().toLocaleString("ko-KR")
      : "-";

    const message = `📢 *YAGO SPORTS 주간 리포트 요약*\n\n🗓️ 기간: ${periodText}\n\n📊 총 리포트 수: *${total}*\n✅ 확인 완료: *${read}*\n🕓 미확인: *${unread}*\n⏰ 최신 생성: ${latestDate}\n\n🔗 관리자 대시보드에서 자세히 보기`;

    if (!SLACK_WEBHOOK_URL) {
      console.warn("⚠️ SLACK_WEBHOOK_URL 환경 변수가 설정되지 않아 Slack 전송이 생략되었습니다.");
      return;
    }

    await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    });

    console.log("✅ Slack으로 주간 리포트 알림을 전송했습니다.");
  },
);
