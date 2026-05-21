import { getFirestore, FieldValue, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";

type NotifierParams = {
  overdueDays?: number;
  remindIntervalDays?: number;
  dryRun?: boolean;
  federationId?: string;
  mode?: "manual" | "scheduled";
  triggeredBy?: string;
};

type TxRow = {
  id: string;
  refPath: string;
  federationId: string;
  amount: number;
  remainingAmount: number;
  expectedAt: string;
  incomeStatus: string;
  payerName?: string;
  teamName?: string;
  teamId?: string;
  lastRemindedAt?: string;
};

function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso);
  const b = new Date(toIso);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return Number.MAX_SAFE_INTEGER;
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

function chunk<T>(arr: T[], size: number): T[][] {
  if (arr.length === 0) return [];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function toRow(d: QueryDocumentSnapshot): TxRow | null {
  const data = d.data() as Record<string, unknown>;
  const fedId = d.ref.parent.parent?.id;
  if (!fedId) return null;
  const expectedAt = typeof data.expectedAt === "string" ? data.expectedAt.trim() : "";
  if (!expectedAt) return null;
  const amount = typeof data.amount === "number" ? Math.max(0, Math.floor(data.amount)) : 0;
  const remainingAmount =
    typeof data.remainingAmount === "number"
      ? Math.max(0, Math.floor(data.remainingAmount))
      : amount - (typeof data.paidAmount === "number" ? Math.max(0, Math.floor(data.paidAmount)) : 0);
  const incomeStatus = typeof data.incomeStatus === "string" ? data.incomeStatus : "";
  const lastRemindedAt = typeof data.lastRemindedAt === "string" ? data.lastRemindedAt.trim() : undefined;
  return {
    id: d.id,
    refPath: d.ref.path,
    federationId: fedId,
    amount,
    remainingAmount,
    expectedAt,
    incomeStatus,
    payerName: typeof data.payerName === "string" ? data.payerName : undefined,
    teamName: typeof data.teamName === "string" ? data.teamName : undefined,
    teamId: typeof data.teamId === "string" ? data.teamId : undefined,
    lastRemindedAt,
  };
}

function severityByDays(overdueDays: number): "warning" | "critical" | "urgent" {
  if (overdueDays >= 30) return "urgent";
  if (overdueDays >= 14) return "critical";
  return "warning";
}

export async function runOverdueReceivablesNotifier(params?: NotifierParams): Promise<{
  scanned: number;
  dueRows: number;
  notifiedFederations: number;
  notifiedUsers: number;
  dryRun: boolean;
  federations: Array<{
    fedId: string;
    federationName: string;
    count: number;
    totalRemaining: number;
    maxOverdueDays: number;
    severity: "warning" | "critical" | "urgent";
    topTeams: Array<{ name: string; amount: number }>;
    recipientCount: number;
  }>;
}> {
  const db = getFirestore();
  const overdueDays = Math.max(1, Math.floor(params?.overdueDays ?? 7));
  const remindIntervalDays = Math.max(1, Math.floor(params?.remindIntervalDays ?? 3));
  const dryRun = params?.dryRun === true;
  const federationId = params?.federationId?.trim() || "";
  const mode = params?.mode || "scheduled";
  const triggeredBy = params?.triggeredBy?.trim() || "system";
  const nowIso = new Date().toISOString();
  const threshold = new Date(Date.now() - overdueDays * 86400000).toISOString();
  const todayKey = nowIso.slice(0, 10).replace(/-/g, "");

  // 비용 절감을 위해 expectedAt 기준으로 먼저 자른다. (status/remaining은 코드에서 안전 필터)
  const snap = await db
    .collectionGroup("transactions")
    .where("type", "==", "income")
    .where("category", "==", "competition_fee")
    .where("expectedAt", "<=", threshold)
    .orderBy("expectedAt", "asc")
    .limit(5000)
    .get();

  const scannedRows = snap.docs
    .map((d) => toRow(d))
    .filter((r): r is TxRow => !!r)
    .filter((r) => (federationId ? r.federationId === federationId : true));
  const dueRows = scannedRows.filter((r) => {
    if (r.remainingAmount <= 0) return false;
    if (r.incomeStatus !== "expected" && r.incomeStatus !== "partial") return false;
    if (!r.lastRemindedAt) return true;
    return daysBetween(r.lastRemindedAt, nowIso) >= remindIntervalDays;
  });

  const byFed = new Map<string, TxRow[]>();
  for (const row of dueRows) {
    const prev = byFed.get(row.federationId) || [];
    prev.push(row);
    byFed.set(row.federationId, prev);
  }

  let notifiedFederations = 0;
  let notifiedUsers = 0;
  const federationSummaries: Array<{
    fedId: string;
    federationName: string;
    count: number;
    totalRemaining: number;
    maxOverdueDays: number;
    severity: "warning" | "critical" | "urgent";
    topTeams: Array<{ name: string; amount: number }>;
    recipientCount: number;
  }> = [];
  for (const [fedId, rows] of byFed.entries()) {
    const fedRef = db.doc(`federations/${fedId}`);
    const fedSnap = await fedRef.get();
    const fedData = (fedSnap.data() || {}) as Record<string, unknown>;
    const federationName = String(fedData.name || fedData.displayName || fedId);

    const recipients = new Set<string>();
    const ownerUid = String(fedData.ownerUid || fedData.ownerId || "").trim();
    if (ownerUid) recipients.add(ownerUid);
    const adminIds = Array.isArray(fedData.adminIds) ? (fedData.adminIds as unknown[]) : [];
    const adminUids = Array.isArray(fedData.adminUids) ? (fedData.adminUids as unknown[]) : [];
    const roles = (fedData.roles || {}) as Record<string, unknown>;
    const roleAdmins = Array.isArray(roles.admins) ? (roles.admins as unknown[]) : [];
    const roleEditors = Array.isArray(roles.editors) ? (roles.editors as unknown[]) : [];
    for (const uid of [...adminIds, ...adminUids, ...roleAdmins, ...roleEditors]) {
      if (typeof uid === "string" && uid.trim()) recipients.add(uid.trim());
    }
    if (recipients.size === 0) {
      logger.warn("[overdueReceivablesNotifier] no recipients", { fedId, rowCount: rows.length });
      continue;
    }

    const totalRemaining = rows.reduce((acc, r) => acc + r.remainingAmount, 0);
    const maxOverdueDays = rows.reduce((mx, r) => Math.max(mx, daysBetween(r.expectedAt, nowIso)), 0);
    const severity = severityByDays(maxOverdueDays);
    const byTeam = new Map<string, number>();
    for (const row of rows) {
      const key = row.teamName || row.payerName || row.teamId || "미확인";
      byTeam.set(key, (byTeam.get(key) || 0) + row.remainingAmount);
    }
    const topTeams = [...byTeam.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, amount]) => ({ name, amount }));
    federationSummaries.push({
      fedId,
      federationName,
      count: rows.length,
      totalRemaining,
      maxOverdueDays,
      severity,
      topTeams,
      recipientCount: recipients.size,
    });

    if (!dryRun) {
      // 알림은 federation 단위 1건/사용자
      const writes: Array<{ type: "notification"; uid: string } | { type: "tx"; refPath: string }> = [];
      for (const uid of recipients) writes.push({ type: "notification", uid });
      for (const row of rows) writes.push({ type: "tx", refPath: row.refPath });

      for (const block of chunk(writes, 400)) {
        const batch = db.batch();
        for (const w of block) {
          if (w.type === "notification") {
            const notiRef = db.collection("notifications").doc(`overdue_${fedId}_${todayKey}_${w.uid}`);
            batch.set(notiRef, {
              userId: w.uid,
              type: "OVERDUE_RECEIVABLES",
              title: `[${federationName}] 미수금 알림`,
              message: `미수 ${rows.length}건 · 총 ${totalRemaining.toLocaleString("ko-KR")}원`,
              link: `/federations/${fedId}/admin?tab=finance&subtab=accounting&status=expected`,
              isRead: false,
              severity,
              data: {
                fedId,
                count: rows.length,
                totalRemaining,
                maxOverdueDays,
                topTeams,
              },
              createdAt: FieldValue.serverTimestamp(),
            }, { merge: true });
          } else {
            batch.update(db.doc(w.refPath), {
              lastRemindedAt: nowIso,
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
        }
        await batch.commit();
      }
    }

    notifiedFederations++;
    notifiedUsers += recipients.size;
    logger.info("[overdueReceivablesNotifier] federation notified", {
      fedId,
      recipients: recipients.size,
      count: rows.length,
      totalRemaining,
      severity,
      maxOverdueDays,
      dryRun,
    });
  }

  logger.info("[overdueReceivablesNotifier] done", {
    scanned: scannedRows.length,
    dueRows: dueRows.length,
    notifiedFederations,
    notifiedUsers,
    overdueDays,
    remindIntervalDays,
    dryRun,
  });

  // 운영 감사 로그
  await db.collection("admin_logs").add({
    type: "OVERDUE_RECEIVABLES_NOTIFIER",
    mode,
    triggeredBy,
    federationId: federationId || null,
    dryRun,
    result: {
      scanned: scannedRows.length,
      dueRows: dueRows.length,
      notifiedUsers,
      notifiedFederations,
      totalRemaining: federationSummaries.reduce((acc, f) => acc + f.totalRemaining, 0),
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  return {
    scanned: scannedRows.length,
    dueRows: dueRows.length,
    notifiedFederations,
    notifiedUsers,
    dryRun,
    federations: federationSummaries.sort((a, b) => b.totalRemaining - a.totalRemaining),
  };
}

export async function handleTriggerOverdueReceivablesNotifier(req: {
  auth?: { uid?: string };
  data?: { overdueDays?: number; remindIntervalDays?: number; dryRun?: boolean; federationId?: string };
}) {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  const db = getFirestore();
  const userSnap = await db.doc(`users/${uid}`).get();
  const userData = (userSnap.data() || {}) as Record<string, unknown>;
  const isAdmin = String(userData.role || "").toUpperCase() === "ADMIN";
  const federationId = String(req.data?.federationId || "").trim();

  if (!federationId) {
    if (!isAdmin) throw new HttpsError("permission-denied", "전체 실행은 ADMIN만 가능합니다.");
  } else if (!isAdmin) {
    const fedSnap = await db.doc(`federations/${federationId}`).get();
    if (!fedSnap.exists) throw new HttpsError("not-found", "협회를 찾을 수 없습니다.");
    const fed = (fedSnap.data() || {}) as Record<string, unknown>;
    const ownerUid = String(fed.ownerUid || fed.ownerId || "");
    const adminIds = Array.isArray(fed.adminIds) ? fed.adminIds : [];
    const adminUids = Array.isArray(fed.adminUids) ? fed.adminUids : [];
    const roles = (fed.roles || {}) as Record<string, unknown>;
    const roleAdmins = Array.isArray(roles.admins) ? (roles.admins as unknown[]) : [];
    const roleEditors = Array.isArray(roles.editors) ? (roles.editors as unknown[]) : [];
    const managers = new Set<string>(
      [ownerUid, ...adminIds, ...adminUids, ...roleAdmins, ...roleEditors]
        .filter((v): v is string => typeof v === "string")
        .map((v) => v.trim())
        .filter(Boolean)
    );
    if (!managers.has(uid)) throw new HttpsError("permission-denied", "협회 매니저 권한이 필요합니다.");
  }

  return runOverdueReceivablesNotifier({
    overdueDays: req.data?.overdueDays,
    remindIntervalDays: req.data?.remindIntervalDays,
    dryRun: req.data?.dryRun,
    federationId: federationId || undefined,
    mode: "manual",
    triggeredBy: uid,
  });
}

