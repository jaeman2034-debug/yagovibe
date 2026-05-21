import { getFirestore, FieldValue, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { buildCompetitionFeePaymentLinkForTx } from "./competitionFeePaymentLink.impl";

type MessengerParams = {
  dryRun?: boolean;
  federationId?: string;
  mode?: "manual" | "scheduled";
  triggeredBy?: string;
};

type KakaoMessagePayload = {
  federationId: string;
  federationName: string;
  recipientUid: string;
  recipientPhone?: string;
  teamName: string;
  competitionName: string;
  remainingAmount: number;
  overdueDays: number;
  stage: 2 | 3;
  link: string;
  payLink?: string;
};

type OverdueTx = {
  id: string;
  refPath: string;
  federationId: string;
  amount: number;
  remainingAmount: number;
  expectedAt: string;
  incomeStatus: string;
  teamId?: string;
  teamName?: string;
  competitionId?: string;
  leagueId?: string;
  sourceId?: string;
  lastNotifiedStage?: number;
};

function daysSince(iso: string, nowIso: string): number {
  const a = new Date(iso);
  const b = new Date(nowIso);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

function stageByDays(days: number): 0 | 1 | 2 | 3 {
  if (days >= 30) return 3;
  if (days >= 14) return 2;
  if (days >= 7) return 1;
  return 0;
}

function toTxRow(d: QueryDocumentSnapshot): OverdueTx | null {
  const data = d.data() as Record<string, unknown>;
  const federationId = d.ref.parent.parent?.id;
  if (!federationId) return null;
  const expectedAt = typeof data.expectedAt === "string" ? data.expectedAt.trim() : "";
  if (!expectedAt) return null;
  const amount = typeof data.amount === "number" ? Math.max(0, Math.floor(data.amount)) : 0;
  const remainingAmount =
    typeof data.remainingAmount === "number"
      ? Math.max(0, Math.floor(data.remainingAmount))
      : amount - (typeof data.paidAmount === "number" ? Math.max(0, Math.floor(data.paidAmount)) : 0);
  return {
    id: d.id,
    refPath: d.ref.path,
    federationId,
    amount,
    remainingAmount,
    expectedAt,
    incomeStatus: typeof data.incomeStatus === "string" ? data.incomeStatus : "",
    teamId: typeof data.teamId === "string" ? data.teamId.trim() : undefined,
    teamName: typeof data.teamName === "string" ? data.teamName.trim() : undefined,
    competitionId: typeof data.competitionId === "string" ? data.competitionId.trim() : undefined,
    leagueId: typeof data.leagueId === "string" ? data.leagueId.trim() : undefined,
    sourceId: typeof data.sourceId === "string" ? data.sourceId.trim() : undefined,
    lastNotifiedStage:
      typeof data.lastNotifiedStage === "number" && Number.isFinite(data.lastNotifiedStage)
        ? Math.max(0, Math.floor(data.lastNotifiedStage))
        : undefined,
  };
}

function titleByStage(stage: 1 | 2 | 3): string {
  if (stage === 1) return "[참가비 안내]";
  if (stage === 2) return "[참가비 미납 안내]";
  return "[중요] 참가비 미납";
}

function messageByStage(args: {
  stage: 1 | 2 | 3;
  teamName: string;
  competitionName: string;
  remainingAmount: number;
  overdueDays: number;
}): string {
  const base = `${args.teamName} 팀의 참가비 미수금이 있습니다.\n대회: ${args.competitionName}\n금액: ${args.remainingAmount.toLocaleString(
    "ko-KR"
  )}원`;
  if (args.stage === 1) return `${base}\n\n확인 후 입금 부탁드립니다.`;
  if (args.stage === 2) return `${base}\n\n현재 ${args.overdueDays}일 경과되었습니다. 빠른 확인 부탁드립니다.`;
  return `${base}\n\n장기간 미납 상태입니다. 참가 제한 또는 운영상 불이익이 발생할 수 있습니다.`;
}

function notificationDocId(txId: string, stage: 1 | 2 | 3, userId: string): string {
  return `overdue_team_${txId}_s${stage}_${userId}`;
}

async function sendKakaoOverdueMessage(payload: KakaoMessagePayload): Promise<void> {
  // 외부 알림톡 게이트웨이 연동용 웹훅 (예: 솔라피/NHN/알리고 중계 API)
  // 값이 없으면 발송을 스킵하고 로그만 남긴다.
  const webhookUrl = String(process.env.OVERDUE_KAKAO_WEBHOOK_URL || "").trim();
  if (!webhookUrl) {
    logger.info("[overdueReceivablesMessenger] kakao webhook not configured; skip", {
      federationId: payload.federationId,
      recipientUid: payload.recipientUid,
      stage: payload.stage,
    });
    return;
  }
  const authToken = String(process.env.OVERDUE_KAKAO_WEBHOOK_TOKEN || "").trim();
  const body = {
    templateCode: payload.stage === 2 ? "OVERDUE_STAGE_2" : "OVERDUE_STAGE_3",
    channel: "kakao_alimtalk",
    to: {
      uid: payload.recipientUid,
      phone: payload.recipientPhone || null,
    },
    variables: {
      federationName: payload.federationName,
      teamName: payload.teamName,
      competitionName: payload.competitionName,
      remainingAmount: payload.remainingAmount,
      overdueDays: payload.overdueDays,
      link: payload.link,
      payLink: payload.payLink || "",
    },
    buttons: payload.payLink
      ? [
          {
            type: "WL",
            name: "바로 결제하기",
            linkMobile: payload.payLink,
            linkPc: payload.payLink,
          },
        ]
      : undefined,
    meta: {
      federationId: payload.federationId,
      stage: payload.stage,
      source: "overdueReceivablesMessenger",
    },
  };

  const resp = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`kakao webhook failed: ${resp.status} ${txt.slice(0, 300)}`);
  }
}

async function resolveRecipientUserId(db: FirebaseFirestore.Firestore, tx: OverdueTx): Promise<string | null> {
  const fedId = tx.federationId;
  const appId = tx.sourceId;
  const leagueId = tx.leagueId || tx.competitionId;

  // 1) application.contactUserId
  if (appId && leagueId) {
    const appRef = db.doc(`federations/${fedId}/leagues/${leagueId}/applications/${appId}`);
    const appSnap = await appRef.get();
    if (appSnap.exists) {
      const ad = appSnap.data() as Record<string, unknown>;
      const contactUserId = typeof ad.contactUserId === "string" ? ad.contactUserId.trim() : "";
      if (contactUserId) return contactUserId;
      const createdBy = typeof ad.createdBy === "string" ? ad.createdBy.trim() : "";
      if (createdBy) return createdBy;
    }
  }

  // 2) team.managerUid / team.createdBy
  if (tx.teamId) {
    const teamRef = db.doc(`federations/${fedId}/teams/${tx.teamId}`);
    const teamSnap = await teamRef.get();
    if (teamSnap.exists) {
      const td = teamSnap.data() as Record<string, unknown>;
      const managerUid = typeof td.managerUid === "string" ? td.managerUid.trim() : "";
      if (managerUid) return managerUid;
      const createdBy = typeof td.createdBy === "string" ? td.createdBy.trim() : "";
      if (createdBy) return createdBy;
      const adminUids = Array.isArray(td.adminUids) ? (td.adminUids as unknown[]) : [];
      const firstAdminUid = adminUids.find((v) => typeof v === "string" && v.trim()) as string | undefined;
      if (firstAdminUid) return firstAdminUid.trim();
    }
  }

  // 3) federation fallback
  const fedRef = db.doc(`federations/${fedId}`);
  const fedSnap = await fedRef.get();
  if (!fedSnap.exists) return null;
  const fd = fedSnap.data() as Record<string, unknown>;
  const ownerUid = typeof fd.ownerUid === "string" ? fd.ownerUid.trim() : "";
  if (ownerUid) return ownerUid;
  const ownerId = typeof fd.ownerId === "string" ? fd.ownerId.trim() : "";
  if (ownerId) return ownerId;
  const adminUids = Array.isArray(fd.adminUids) ? (fd.adminUids as unknown[]) : [];
  const adminIds = Array.isArray(fd.adminIds) ? (fd.adminIds as unknown[]) : [];
  const roleAdmins = Array.isArray((fd.roles as any)?.admins) ? ((fd.roles as any).admins as unknown[]) : [];
  const roleEditors = Array.isArray((fd.roles as any)?.editors) ? ((fd.roles as any).editors as unknown[]) : [];
  const cands = [...adminUids, ...adminIds, ...roleAdmins, ...roleEditors].filter(
    (v): v is string => typeof v === "string" && v.trim().length > 0
  );
  return cands.length > 0 ? cands[0].trim() : null;
}

export async function runOverdueReceivablesMessenger(params?: MessengerParams): Promise<{
  scanned: number;
  dueRows: number;
  sent: number;
  skippedNoRecipient: number;
  kakaoSent: number;
  kakaoFailed: number;
  dryRun: boolean;
}> {
  const db = getFirestore();
  const dryRun = params?.dryRun === true;
  const federationId = params?.federationId?.trim() || "";
  const mode = params?.mode || "scheduled";
  const triggeredBy = params?.triggeredBy?.trim() || "system";
  const nowIso = new Date().toISOString();
  const threshold = new Date(Date.now() - 7 * 86400000).toISOString();

  const snap = await db
    .collectionGroup("transactions")
    .where("type", "==", "income")
    .where("category", "==", "competition_fee")
    .where("expectedAt", "<=", threshold)
    .orderBy("expectedAt", "asc")
    .limit(5000)
    .get();

  const rows = snap.docs
    .map((d) => toTxRow(d))
    .filter((r): r is OverdueTx => !!r)
    .filter((r) => (federationId ? r.federationId === federationId : true))
    .filter((r) => (r.incomeStatus === "expected" || r.incomeStatus === "partial") && r.remainingAmount > 0);
  const dueRows = rows.length;

  let sent = 0;
  let skippedNoRecipient = 0;
  let kakaoSent = 0;
  let kakaoFailed = 0;
  for (const row of rows) {
    const overdueDays = daysSince(row.expectedAt, nowIso);
    const stage = stageByDays(overdueDays);
    if (stage === 0) continue;
    const prevStage = row.lastNotifiedStage || 0;
    if (prevStage >= stage) continue;

    const recipientUid = await resolveRecipientUserId(db, row);
    if (!recipientUid) {
      skippedNoRecipient += 1;
      logger.warn("[overdueReceivablesMessenger] no recipient", {
        reason: "no_recipient",
        federationId: row.federationId,
        txId: row.id,
        teamId: row.teamId || null,
      });
      continue;
    }

    if (!dryRun) {
      const fedSnap = await db.doc(`federations/${row.federationId}`).get();
      const fedData = (fedSnap.data() || {}) as Record<string, unknown>;
      const competitionId = row.competitionId || row.leagueId || "";
      const compSnap = competitionId
        ? await db.doc(`federations/${row.federationId}/leagues/${competitionId}`).get()
        : null;
      const competitionName = String((compSnap?.data() as any)?.name || competitionId || "대회");
      const teamName = row.teamName || "해당";
      const stageCast = stage as 1 | 2 | 3;
      const payLink =
        stage >= 2
          ? await buildCompetitionFeePaymentLinkForTx({
              fedId: row.federationId,
              txId: row.id,
            })
          : null;
      const notiRef = db.collection("notifications").doc(notificationDocId(row.id, stageCast, recipientUid));
      const batch = db.batch();
      const plainLink = `/federations/${row.federationId}/admin?tab=finance&subtab=accounting&status=expected&sort=remaining`;
      const notiMessage = messageByStage({
        stage: stageCast,
        teamName,
        competitionName,
        remainingAmount: row.remainingAmount,
        overdueDays,
      });
      batch.set(
        notiRef,
        {
          userId: recipientUid,
          type: "OVERDUE_PAYMENT",
          title: titleByStage(stageCast),
          message: payLink ? `${notiMessage}\n\n바로 결제: ${payLink}` : notiMessage,
          link: payLink || plainLink,
          isRead: false,
          severity: stage === 1 ? "warning" : stage === 2 ? "critical" : "urgent",
          data: {
            fedId: row.federationId,
            federationName: String(fedData.name || row.federationId),
            txId: row.id,
            teamId: row.teamId || null,
            teamName,
            competitionId: competitionId || null,
            stage,
            overdueDays,
            remainingAmount: row.remainingAmount,
            paymentLink: payLink || null,
          },
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      batch.update(db.doc(row.refPath), {
        lastNotifiedStage: stage,
        lastNotifiedAt: nowIso,
        updatedAt: FieldValue.serverTimestamp(),
      });
      await batch.commit();

      // stage 2/3부터 외부 카카오 자동 발송 시도 (실패해도 앱 알림/원장 업데이트는 유지)
      if (stage >= 2) {
        const userSnap = await db.doc(`users/${recipientUid}`).get();
        const userData = (userSnap.data() || {}) as Record<string, unknown>;
        const recipientPhone =
          typeof userData.phoneNumber === "string"
            ? userData.phoneNumber
            : typeof userData.phone === "string"
              ? userData.phone
              : undefined;
        const link = plainLink;
        try {
          await sendKakaoOverdueMessage({
            federationId: row.federationId,
            federationName: String(fedData.name || row.federationId),
            recipientUid,
            recipientPhone,
            teamName,
            competitionName,
            remainingAmount: row.remainingAmount,
            overdueDays,
            stage: stage === 2 ? 2 : 3,
            link,
            payLink: payLink || undefined,
          });
          kakaoSent += 1;
        } catch (e) {
          kakaoFailed += 1;
          logger.error("[overdueReceivablesMessenger] kakao send failed", {
            federationId: row.federationId,
            recipientUid,
            stage,
            txId: row.id,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
    }

    sent += 1;
  }

  logger.info("[overdueReceivablesMessenger] done", {
    scanned: rows.length,
    dueRows,
    sent,
    skippedNoRecipient,
    kakaoSent,
    kakaoFailed,
    dryRun,
    federationId: federationId || null,
  });

  await db.collection("admin_logs").add({
    type: "OVERDUE_RECEIVABLES_MESSENGER",
    mode,
    triggeredBy,
    federationId: federationId || null,
    dryRun,
    result: {
      scanned: rows.length,
      dueRows,
      sent,
      skippedNoRecipient,
      kakaoSent,
      kakaoFailed,
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  return {
    scanned: rows.length,
    dueRows,
    sent,
    skippedNoRecipient,
    kakaoSent,
    kakaoFailed,
    dryRun,
  };
}

export async function handleTriggerOverdueReceivablesMessenger(req: {
  auth?: { uid?: string };
  data?: { federationId?: string; dryRun?: boolean };
}) {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

  // messenger는 overdue notifier의 권한 정책과 동일하게 운영
  const db = getFirestore();
  const userSnap = await db.doc(`users/${uid}`).get();
  const userData = (userSnap.data() || {}) as Record<string, unknown>;
  const isAdmin = String(userData.role || "").toUpperCase() === "ADMIN";
  const fedId = String(req.data?.federationId || "").trim();
  if (!fedId && !isAdmin) throw new HttpsError("permission-denied", "전체 실행은 ADMIN만 가능합니다.");

  return runOverdueReceivablesMessenger({
    federationId: fedId || undefined,
    dryRun: req.data?.dryRun,
    mode: "manual",
    triggeredBy: uid,
  });
}

