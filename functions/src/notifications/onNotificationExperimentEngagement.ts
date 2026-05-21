/**
 * 알림 문서의 openedAt / clickedAt 최초 설정 시 팀 실험 집계를 갱신한다.
 */
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { bumpTeamNotificationExperimentMetric } from "../lib/notificationExperimentMetrics";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

function fieldAppeared(before: Record<string, unknown>, after: Record<string, unknown>, key: string): boolean {
  return !before[key] && !!after[key];
}

export const onNotificationExperimentEngagement = onDocumentUpdated(
  {
    document: "notifications/{notificationId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const before = event.data?.before.data() as Record<string, unknown> | undefined;
    const after = event.data?.after.data() as Record<string, unknown> | undefined;
    if (!before || !after) return;

    const experiment = typeof after.experiment === "string" ? after.experiment : "";
    const variant = after.variant === "A" || after.variant === "B" ? after.variant : null;
    const teamId = typeof after.teamId === "string" ? after.teamId.trim() : "";
    if (!experiment || !variant || !teamId) return;

    const opened = fieldAppeared(before, after, "openedAt");
    const clicked = fieldAppeared(before, after, "clickedAt");
    if (!opened && !clicked) return;

    try {
      if (opened) {
        await bumpTeamNotificationExperimentMetric(db, teamId, experiment, variant, "opened");
      }
      if (clicked) {
        await bumpTeamNotificationExperimentMetric(db, teamId, experiment, variant, "clicked");
      }
    } catch {
      // 집계 실패는 알림 UX에 영향 없음
    }
  }
);
