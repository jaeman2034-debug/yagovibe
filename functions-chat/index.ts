/**
 * 채팅 FCM 전용 엔트리 — 의존성 최소화 (메인 functions/index 10초 로드 타임아웃 방지)
 *
 * 배포: firebase deploy --only functions:chat
 * 또는 전체: firebase deploy --only functions
 */

export { onMessageCreated } from "./src/onMessageCreated";
export { notifyOnChatMessage } from "./src/notifyOnChatMessage";
