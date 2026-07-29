/**
 * Sprint D-1.1a — Growth report delivery → parent notify (pure + I/O helpers)
 */
import type { Firestore } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";
import { mapLinkDocToRow } from "./parentLinkContract";

export type GrowthDeliveryAutoNotify = {
  schemaVersion: 1;
  sentAt: number;
  parentUids: string[];
  channel: "in_app" | "push";
  notificationIds: string[];
};

export type GrowthReportDeliveryDoc = {
  pdfDownloadUrl?: string;
  sharePath?: string;
  autoNotify?: GrowthDeliveryAutoNotify;
  notifiedParentUids?: string[];
  sharedAt?: number | null;
};

function normalizeRole(raw: unknown): string {
  return String(raw ?? "member").toLowerCase();
}

function displayNameFromMember(data: Record<string, unknown>): string {
  return String(data.name ?? data.displayName ?? data.userName ?? "").trim();
}

function memberAuthUid(docId: string, data: Record<string, unknown>): string {
  const uid = data.userId ?? data.uid;
  return typeof uid === "string" && uid.trim() ? uid.trim() : docId;
}

/** Roster key (member id · auth uid) → displayName for player role members */
export async function buildPlayerRosterNameMap(
  db: Firestore,
  teamId: string
): Promise<Map<string, string>> {
  const snap = await db.collection("teams").doc(teamId).collection("members").get();
  const map = new Map<string, string>();
  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    if (normalizeRole(data.role) !== "player") continue;
    const name = displayNameFromMember(data);
    if (!name) continue;
    map.set(doc.id, name);
    map.set(memberAuthUid(doc.id, data), name);
  }
  return map;
}

/** parentLinks SoT — active links for session playerName */
export async function resolveParentUidsForGrowthSession(
  db: Firestore,
  teamId: string,
  playerName: string
): Promise<string[]> {
  const targetName = playerName.trim();
  if (!targetName) return [];

  const [linksSnap, rosterNames] = await Promise.all([
    db.collection("teams").doc(teamId).collection("parentLinks").get(),
    buildPlayerRosterNameMap(db, teamId),
  ]);

  const parentUids = new Set<string>();
  for (const linkDoc of linksSnap.docs) {
    const row = mapLinkDocToRow(linkDoc.id, linkDoc.data());
    if (row.status !== "active" || !row.parentUid) continue;
    const linkedName = rosterNames.get(row.playerUid)?.trim() ?? "";
    if (linkedName === targetName) {
      parentUids.add(row.parentUid);
    }
  }
  return [...parentUids];
}

export function shouldNotifyGrowthDelivery(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined
): boolean {
  if (!after) return false;
  const afterDelivery = (after.delivery ?? {}) as GrowthReportDeliveryDoc;
  if (!afterDelivery.pdfDownloadUrl || !afterDelivery.sharePath) return false;
  if (afterDelivery.autoNotify?.sentAt) return false;

  const beforeDelivery = (before?.delivery ?? {}) as GrowthReportDeliveryDoc;
  if (beforeDelivery.autoNotify?.sentAt) return false;

  return true;
}

export async function buildGrowthReportNotifyCopy(
  db: Firestore,
  teamId: string,
  playerName: string
): Promise<{ title: string; message: string }> {
  const name = playerName.trim() || "선수";
  const title = "새 성장 리포트가 도착했습니다";

  const snap = await db
    .collection("teams")
    .doc(teamId)
    .collection("playerGrowthHistory")
    .where("playerName", "==", name)
    .orderBy("generatedAt", "desc")
    .limit(8)
    .get();

  const scores: number[] = [];
  for (const doc of snap.docs) {
    const overall = (doc.data().metrics as { growthScore?: { overall?: number } } | undefined)
      ?.growthScore?.overall;
    if (typeof overall === "number" && overall > 0) scores.push(overall);
  }

  if (scores.length >= 2) {
    const current = scores[0]!;
    const previous = scores[1]!;
    const delta = current - previous;
    if (delta > 0) {
      return { title, message: `${name} 선수\n${previous} → ${current} (+${delta})` };
    }
    if (delta < 0) {
      return { title, message: `${name} 선수\n${previous} → ${current} (${delta})` };
    }
    return { title, message: `${name} 선수\n${current}점 · 변화 없음` };
  }

  if (scores.length === 1) {
    return { title, message: `${name} 선수\n${scores[0]}점` };
  }

  return { title, message: `${name} 선수\n코치가 확인한 훈련 리포트` };
}

export async function notifyParentsOfGrowthReportDelivery(input: {
  db: Firestore;
  teamId: string;
  sessionId: string;
  playerName: string;
  sharePath: string;
  delivery: GrowthReportDeliveryDoc;
}): Promise<GrowthDeliveryAutoNotify | null> {
  const { db, teamId, sessionId, playerName, sharePath, delivery } = input;
  const parentUids = await resolveParentUidsForGrowthSession(db, teamId, playerName);
  if (parentUids.length === 0) {
    logger.info("[growthReportDeliveryNotify] no linked parents", { teamId, sessionId, playerName });
    return null;
  }

  const { title, message } = await buildGrowthReportNotifyCopy(db, teamId, playerName);
  const notificationIds: string[] = [];
  const now = Date.now();

  for (const parentUid of parentUids) {
    const ref = await db.collection("notifications").add({
      userId: parentUid,
      type: "GROWTH_REPORT_DELIVERED",
      title,
      message,
      body: `${message}\n\n지금 확인하기`,
      link: sharePath,
      status: "queued",
      teamId,
      priority: "high",
      pushDedupKey: `growth_report_v1_${teamId}_${sessionId}_${parentUid}`,
      payload: {
        teamId,
        sessionId,
        playerName,
        sharePath,
      },
      isRead: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    notificationIds.push(ref.id);

    // Sprint C — AI_REPORT_READY AlimTalk when parent phone is on users/{uid}
    try {
      const userSnap = await db.collection("users").doc(parentUid).get();
      const u = (userSnap.data() || {}) as Record<string, unknown>;
      const phoneRaw =
        (typeof u.phone === "string" && u.phone) ||
        (typeof u.phoneNumber === "string" && u.phoneNumber) ||
        (typeof u.mobile === "string" && u.mobile) ||
        "";
      const phone = String(phoneRaw).replace(/\D/g, "");
      if (phone.length >= 10) {
        const outId = `ai_report_${teamId}_${sessionId}_${parentUid}`.replace(
          /[^a-zA-Z0-9_-]/g,
          "_"
        );
        const outRef = db.collection("notifications").doc(outId);
        if (!(await outRef.get()).exists) {
          await outRef.set({
            userId: parentUid,
            recipientUid: parentUid,
            recipientPhone: phone,
            type: "SYSTEM_NOTICE",
            notificationType: "AI_REPORT_READY",
            templateKey: "AI_REPORT_READY",
            alimTalkTemplateId: "AI_REPORT_READY",
            title: "AI 분석 완료",
            message: `${playerName} 선수 AI 리포트가 준비되었습니다`,
            body: `${message}\n\n${sharePath}`,
            link: sharePath,
            status: "queued_sms_pending",
            deliveryStatus: "queued",
            teamId,
            priority: "high",
            pushDedupKey: `ai_report_alimtalk_${teamId}_${sessionId}_${parentUid}`,
            retryCount: 0,
            success: null,
            payload: {
              teamId,
              sessionId,
              player: playerName,
              playerName,
              reportUrl: sharePath,
              templateKey: "AI_REPORT_READY",
              recipientPhone: phone,
            },
            isRead: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          notificationIds.push(outId);
        }
      }
    } catch (e) {
      logger.warn("[growthReportDeliveryNotify] AI_REPORT_READY enqueue skipped", {
        parentUid,
        e: String(e),
      });
    }
  }

  logger.info("[growthReportDeliveryNotify] notifications queued", {
    teamId,
    sessionId,
    parentCount: parentUids.length,
  });

  return {
    schemaVersion: 1,
    sentAt: now,
    parentUids,
    channel: "in_app",
    notificationIds,
  };
}

export async function applyGrowthDeliveryAutoNotify(
  db: Firestore,
  teamId: string,
  sessionId: string,
  delivery: GrowthReportDeliveryDoc,
  autoNotify: GrowthDeliveryAutoNotify
): Promise<void> {
  const sessionRef = db.collection("teams").doc(teamId).collection("playerGrowthHistory").doc(sessionId);
  await sessionRef.update({
    delivery: {
      ...delivery,
      notifiedParentUids: autoNotify.parentUids,
      sharedAt: delivery.sharedAt ?? autoNotify.sentAt,
      autoNotify,
    },
  });
}
