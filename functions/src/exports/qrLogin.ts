/**
 * 🔐 QR 로그인 관련 Cloud Functions Export
 */

// Callable 함수 (레거시, 필요시 사용)
export { createCustomTokenForQR } from "../qrLogin/createCustomTokenForQR";

// Firestore Trigger 함수 (자동화, 권장)
export { issueCustomTokenForQrSession } from "../qrLogin/issueCustomTokenForQrSession";

// 스케줄 함수 (모니터링 및 알림 - 기존)
export {
  monitorQRLoginHealthHourly,
  monitorQRLoginHealthDaily,
} from "../qrLogin/monitorQRLoginHealth";

// 스케줄 함수 (모니터링 및 알림 - 5분/10분 주기, 요구사항 기반)
export {
  qrLoginAlert5min,
  qrLoginAlert10min,
} from "../monitoring/qrLoginAlert";
