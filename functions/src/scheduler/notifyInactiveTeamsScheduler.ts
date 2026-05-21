/**
 * 30일 이상 `teams.updatedAt` 활동이 없는 팀 → 팀장(오너)에게 푸시 알림 후보 생성.
 * - `notifications/{docId}` + 기존 sendPushOnNotificationCreate 파이프라인
 * - `teams.lastInactiveNotifiedAt` 으로 동일 팀 주 1회 상한(7일)
 * - metrics의 inactiveTeamIds는 샘플(최대 40)이라 전체 teams 페이지 스캔
 * - 성장 후: `updatedAt` 단일필드 인덱스 + `.where("updatedAt", "<", …)` 로 후보 축소 가능(누락 updatedAt은 백필 후)
 */
import * as admin from "firebase-admin";
import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { resolveTeamCaptainUid } from "../lib/resolveTeamCaptainUid";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const TEAMS_PAGE_SIZE = 400;
const THIRTY_DAYS_MS = 30 * 86400000;
const NOTIFY_COOLDOWN_MS = 7 * 86400000;
const TEAM_MIN_AGE_MS = 7 * 86400000;

function millisFromTs(raw: unknown): number | null {
  if (raw && typeof (raw as { toMillis?: () => number }).toMillis === "function") {
    return (raw as admin.firestore.Timestamp).toMillis();
  }
  return null;
}

/** 7일 단위 버킷 — pushDedupKey·문서 ID에 사용 (동일 주 재전송 방지) */
function notifyWeekBucket(nowMs: number): string {
  return String(Math.floor(nowMs / NOTIFY_COOLDOWN_MS));
}

function isTeamDisbanded(teamData: Record<string, unknown>): boolean {
  const s = String(teamData.status || "").toUpperCase();
  return s === "DISBANDED" || s === "DELETED" || s === "ARCHIVED";
}

export const notifyInactiveTeamsScheduler = onSchedule(
  {
    schedule: "0 10 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async () => {
    const now = Date.now();
    const weekBucket = notifyWeekBucket(now);

    let scanned = 0;
    let notified = 0;
    let skippedActive = 0;
    let skippedCooldown = 0;
    let skippedYoung = 0;
    let skippedDisbanded = 0;
    let skippedNoCaptain = 0;
    let errors = 0;

    let lastDoc: admin.firestore.QueryDocumentSnapshot | undefined;

    for (;;) {
      let q = db.collection("teams").orderBy(FieldPath.documentId()).limit(TEAMS_PAGE_SIZE);
      if (lastDoc) {
        q = q.startAfter(lastDoc);
      }
      const snap = await q.get();
      if (snap.empty) break;

      for (const teamDoc of snap.docs) {
        scanned++;
        const teamId = teamDoc.id;
        const d = teamDoc.data() as Record<string, unknown>;

        if (isTeamDisbanded(d)) {
          skippedDisbanded++;
          continue;
        }

        const createdMs = millisFromTs(d.createdAt);
        if (createdMs != null && now - createdMs < TEAM_MIN_AGE_MS) {
          skippedYoung++;
          continue;
        }

        const updatedMs = millisFromTs(d.updatedAt);
        const inactive30 =
          updatedMs == null ? true : now - updatedMs > THIRTY_DAYS_MS;
        if (!inactive30) {
          skippedActive++;
          continue;
        }

        const lastN = millisFromTs(d.lastInactiveNotifiedAt);
        if (lastN != null && now - lastN < NOTIFY_COOLDOWN_MS) {
          skippedCooldown++;
          continue;
        }

        const captainUid = await resolveTeamCaptainUid(teamId, d).catch(() => null);
        if (!captainUid) {
          skippedNoCaptain++;
          continue;
        }

        const teamName =
          (typeof d.name === "string" && d.name.trim()) ||
          (typeof d.teamName === "string" && d.teamName.trim()) ||
          "팀";

        const notifDocId = `inactive_team_${teamId}_${weekBucket}`;
        const batch = db.batch();
        const notifRef = db.collection("notifications").doc(notifDocId);
        batch.set(
          notifRef,
          {
            type: "inactive_team_alert",
            teamId,
            targetUid: captainUid,
            userId: captainUid,
            title: "[팀 활동 알림]",
            body:
              `「${teamName}」 최근 30일간 팀 활동이 없었습니다.\n` +
              `지금 팀 홈에서 일정·회비·공지 중 하나만 업데이트해도 도움이 됩니다.\n` +
              `탭하면 팀 홈으로 이동합니다.`,
            link: `/team/${encodeURIComponent(teamId)}?tab=home`,
            status: "queued",
            pushDedupKey: `inactive_team:${teamId}:${weekBucket}`,
            createdAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        batch.update(teamDoc.ref, {
          lastInactiveNotifiedAt: FieldValue.serverTimestamp(),
        });

        try {
          await batch.commit();
          notified++;
        } catch (e) {
          errors++;
          logger.error("[notifyInactiveTeamsScheduler] team batch failed", {
            teamId,
            message: e instanceof Error ? e.message : String(e),
          });
        }
      }

      lastDoc = snap.docs[snap.docs.length - 1];
      if (snap.size < TEAMS_PAGE_SIZE) {
        break;
      }
    }

    logger.info("[notifyInactiveTeamsScheduler] done", {
      scanned,
      notified,
      skippedActive,
      skippedCooldown,
      skippedYoung,
      skippedDisbanded,
      skippedNoCaptain,
      errors,
      weekBucket,
    });
  }
);
