/**
 * 무거운 Functions 묶음 (의존성 트리가 큰 모듈)
 *
 * 로컬 에뮬/CLI가 "Timeout after 10000" 으로 실패하면
 * `index.ts` 맨 아래의 `export * from "./index.heavy"` 를 주석 처리한 뒤
 * `npm run build` 후 다시 실행하세요.
 * 프로덕션 배포 전에는 반드시 해당 export 를 켜 두세요.
 */

// 🔥 Analytics (플랫폼 엔티티 + 스케줄 다수)
export {
  onEventWrite as onEventWriteAnalytics,
  onTeamWrite as onTeamWriteAnalytics,
  onPlayerWrite as onPlayerWriteAnalytics,
  onEventMatchWrite,
  onPlayerGameWrite as onPlayerGameWriteAnalytics,
} from "./analytics/onPlatformEntityWrite";

export {
  dailyMonthlyStatsUpdate,
  weeklyStatsUpdate,
  monthlyStatsRecalculation,
  weeklyStatsRecalculation,
  dailyInsightsGeneration,
} from "./analytics/scheduledStatsUpdate";

// 🔥 Media / Email / Social / 마이그레이션
export { onMediaUploaded } from "./media/generateThumbnail";
export { sendEmail } from "./email/sendEmail";
export { onLikeCreated, onLikeDeleted } from "./social/onLikeCreated";
export { migrateActivityLogsToActivities } from "./migrate/activityLogsToActivities";

// 🔥 마켓 통합 처리 (부스트·가격 규율 등 — 의존성 큼)
export { onMarketPostCreated, onMarketPostUpdated } from "./market/integratedPostProcessor";
