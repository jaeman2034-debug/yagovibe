// 🔥 테스트용 ping Callable (엔드포인트 연결 확인용)
import { onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";

export const pingCallable = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    const timestamp = new Date().toISOString();
    logger.info("🔥 PING CALLED", {
      timestamp,
      uid: request.auth?.uid || "anonymous",
      projectId: process.env.GCLOUD_PROJECT,
    });
    console.log("🔥 PING CALLED (console.log)", {
      timestamp,
      uid: request.auth?.uid || "anonymous",
      projectId: process.env.GCLOUD_PROJECT,
    });
    return { ok: true, timestamp, projectId: process.env.GCLOUD_PROJECT };
  }
);
