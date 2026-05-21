/**
 * `notifications/{id}` 생성 시 수신자 기기로 FCM 발송 (기본 functions 번들)
 */
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { handleSendPushOnNotificationCreate } from "./sendPushOnNotificationCreate.handler";

export const sendPushOnNotificationCreate = onDocumentCreated(
  {
    document: "notifications/{notificationId}",
    region: "asia-northeast3",
  },
  async (event) => {
    await handleSendPushOnNotificationCreate(event);
  }
);
