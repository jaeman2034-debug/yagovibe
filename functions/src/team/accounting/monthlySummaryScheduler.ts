import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const PAGE = 500;

const LOCAL_MEMBER_PREFIX = "local_";

function addBillingLookupKey(keys: Set<string>, raw: string) {
  const t = raw.trim();
  if (!t) return;
  keys.add(t);
  if (t.startsWith(LOCAL_MEMBER_PREFIX)) {
    const rest = t.slice(LOCAL_MEMBER_PREFIX.length);
    if (rest) keys.add(rest);
  }
}

function billingKeysForMemberDoc(m: FirebaseFirestore.QueryDocumentSnapshot): string[] {
  const ks = new Set<string>();
  const d = m.data() as Record<string, unknown>;
  const auth =
    (typeof d.userId === "string" && d.userId.trim()) ||
    (typeof d.uid === "string" && d.uid.trim()) ||
    "";
  const memberDocumentId = m.id;
  const billingUid = auth || memberDocumentId;
  addBillingLookupKey(ks, billingUid);
  addBillingLookupKey(ks, memberDocumentId);
  if (auth) addBillingLookupKey(ks, auth);
  return [...ks];
}

/** 클라 `memberBillingLookupKeys`와 동일 — cashBook `counterpartyUid`가 활성 멤버인지 판별 */
function collectActiveMemberBillingKeys(membersSnap: FirebaseFirestore.QuerySnapshot): Set<string> {
  const keys = new Set<string>();
  for (const m of membersSnap.docs) {
    for (const k of billingKeysForMemberDoc(m)) keys.add(k);
  }
  return keys;
}

function seoulMonthInfo(nowMs: number): { monthId: string; startMs: number; endMs: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(nowMs));
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const monthId = `${y}-${String(m).padStart(2, "0")}`;
  // 서울 자정 기준 월 범위
  const startMs = Date.UTC(y, m - 1, 1, -9, 0, 0, 0);
  const endMs = Date.UTC(y, m, 1, -9, 0, 0, 0) - 1;
  return { monthId, startMs, endMs };
}

type Contribution = {
  uid: string;
  name: string;
  total: number;
  membership: number;
  donation: number;
};

export const teamMonthlySummaryScheduler = onSchedule(
  {
    schedule: "25 3 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async () => {
    const { monthId, startMs, endMs } = seoulMonthInfo(Date.now());
    const startTs = admin.firestore.Timestamp.fromMillis(startMs);
    const endTs = admin.firestore.Timestamp.fromMillis(endMs);

    const teamsSnap = await db.collection("teams").get();
    let processed = 0;
    let failed = 0;

    for (const t of teamsSnap.docs) {
      const teamId = t.id;
      try {
        const memberNameByBillingKey = new Map<string, string>();
        const membersSnap = await db.collection(`teams/${teamId}/members`).where("status", "==", "active").get();
        const activeBillingKeys = collectActiveMemberBillingKeys(membersSnap);
        for (const m of membersSnap.docs) {
          const d = m.data() as Record<string, unknown>;
          const display =
            typeof d.name === "string" ? d.name : typeof d.displayName === "string" ? d.displayName : "이름없음";
          for (const k of billingKeysForMemberDoc(m)) {
            memberNameByBillingKey.set(k, display);
          }
        }

        const incomeByCategory = new Map<string, number>();
        const expenseByCategory = new Map<string, number>();
        const contribution = new Map<string, Contribution>();

        let totalIncome = 0;
        let totalExpense = 0;
        let last: FirebaseFirestore.QueryDocumentSnapshot | undefined;

        for (;;) {
          let q = db
            .collection(`teams/${teamId}/cashBook`)
            .where("occurredAt", ">=", startTs)
            .where("occurredAt", "<=", endTs)
            .orderBy("occurredAt", "desc")
            .limit(PAGE);
          if (last) q = q.startAfter(last);
          const snap = await q.get();
          if (snap.empty) break;

          for (const doc of snap.docs) {
            const x = doc.data() as Record<string, unknown>;
            if (x.isDeleted === true) continue;
            const kind = x.kind;
            const cat = typeof x.category === "string" ? x.category : "etc";
            const amount = Math.floor(Number(x.amount || 0));
            if (!Number.isFinite(amount) || amount <= 0) continue;

            if (kind === "income") {
              totalIncome += amount;
              incomeByCategory.set(cat, (incomeByCategory.get(cat) ?? 0) + amount);
              const uid = typeof x.counterpartyUid === "string" ? x.counterpartyUid : "";
              if (uid && (cat === "membership" || cat === "donation" || cat === "after_meal")) {
                const row = contribution.get(uid) ?? {
                  uid,
                  name:
                    memberNameByBillingKey.get(uid) ||
                    (typeof x.counterpartyName === "string" ? x.counterpartyName : "이름없음"),
                  total: 0,
                  membership: 0,
                  donation: 0,
                };
                row.total += amount;
                if (cat === "membership") row.membership += amount;
                else row.donation += amount;
                contribution.set(uid, row);
              }
            } else if (kind === "expense") {
              totalExpense += amount;
              expenseByCategory.set(cat, (expenseByCategory.get(cat) ?? 0) + amount);
            }
          }

          if (snap.size < PAGE) break;
          last = snap.docs[snap.docs.length - 1];
        }

        const topIncomeCategory = [...incomeByCategory.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
        const topExpenseCategory = [...expenseByCategory.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
        const memberContributionTop = [...contribution.values()]
          .filter((r) => activeBillingKeys.has(r.uid))
          .sort((a, b) => b.total - a.total)
          .slice(0, 20)
          .map((r) => ({
            uid: r.uid,
            name: r.name,
            total: r.total,
            membership: r.membership,
            donation: r.donation,
          }));

        await db.doc(`teams/${teamId}/monthlySummary/${monthId}`).set(
          {
            monthId,
            totalIncome,
            totalExpense,
            net: totalIncome - totalExpense,
            topIncomeCategory,
            topExpenseCategory,
            memberContributionTop,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        processed += 1;
      } catch (e) {
        failed += 1;
        logger.error("[teamMonthlySummaryScheduler] failed", { teamId, error: String(e) });
      }
    }

    logger.info("[teamMonthlySummaryScheduler] done", { monthId, processed, failed });
  }
);

