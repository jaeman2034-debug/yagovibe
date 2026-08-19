/**
 * J1-2b — Client FCM payload projection (mirrors server · read-only)
 */
import type { ParentGrowthNotification } from "@/lib/ai-growth/parentGrowthNotificationTypes";

export const PARENT_GROWTH_FCM_ROUTE = "/home/parent" as const;

export type ParentGrowthFcmPayload = {
  title: string;
  body: string;
  route: string;
  notificationId: string;
};

/** J1-2a WEEKLY_GROWTH_DIGEST → FCM payload (J1-2b channel extension) */
export function buildFcmPayloadFromGrowthNotification(
  notification: ParentGrowthNotification
): ParentGrowthFcmPayload | null {
  if (notification.type !== "WEEKLY_GROWTH_DIGEST") return null;

  const lines =
    notification.digestLines && notification.digestLines.length > 0
      ? notification.digestLines
      : [notification.body];

  return {
    title: notification.title || "🎉 이번 주 성장 알림",
    body: lines.join("\n"),
    route: PARENT_GROWTH_FCM_ROUTE,
    notificationId: notification.id,
  };
}
