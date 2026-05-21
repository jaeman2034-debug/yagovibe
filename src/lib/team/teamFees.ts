import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { teamFeeSeoulMonthKey, teamFeeSeoulMonthTitle } from "@/lib/fees/seoulFeeMonthKey";
import { buildTeamFeePaymentDocId, normalizeTeamFeePaymentStatus } from "@/lib/fees/teamFeePaymentDocId";
import { updateTeamDocument } from "@/lib/team/updateTeamDocument";
import { fetchTeamFeePolicy } from "@/lib/team/teamFeePolicy";
import { seedPaymentsForFee } from "@/services/teamFeeService";
import type { TeamFee, TeamFeePayment } from "@/types/fee";

const MIN_FEE_WON = 1000;

function dueDateToDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (value && typeof value === "object" && "toDate" in value) {
    const maybe = value as { toDate?: () => Date };
    if (typeof maybe.toDate === "function") return maybe.toDate();
  }
  return null;
}

function mapFeeDoc(id: string, data: Record<string, unknown>): TeamFee {
  return {
    id,
    title: String(data.title ?? ""),
    amount: Number(data.amount ?? 0),
    dueDate: data.dueDate as Timestamp,
    status: data.status === "closed" ? "closed" : "open",
    reminderSent: data.reminderSent === true,
    lastReminderAt: data.lastReminderAt as Timestamp | undefined,
    createdBy: String(data.createdBy ?? ""),
    createdAt: data.createdAt as Timestamp | undefined,
    autoMonthKey:
      typeof data.autoMonthKey === "string" && data.autoMonthKey.trim()
        ? data.autoMonthKey.trim()
        : undefined,
    updatedAt: data.updatedAt as Timestamp | undefined,
    closedAt: data.closedAt as Timestamp | undefined,
  } satisfies TeamFee;
}

/**
 * 중복 생성 방지용 점유 월 키 — 문서의 `autoMonthKey`(YYYY-MM) 우선, 없으면 dueDate→`teamFeeSeoulMonthKey`.
 */
export function feeOccupancyMonthKeyFromTeamFee(fee: TeamFee): string | null {
  const fromDoc = typeof fee.autoMonthKey === "string" ? fee.autoMonthKey.trim() : "";
  if (/^\d{4}-\d{2}$/.test(fromDoc)) return fromDoc;
  const dd = dueDateToDate(fee.dueDate);
  return dd ? teamFeeSeoulMonthKey(dd) : null;
}

function addMonthsKeepingDay(base: Date, monthOffset: number): Date {
  const y = base.getFullYear();
  const m = base.getMonth() + monthOffset;
  const d = base.getDate();
  const lastDay = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(d, lastDay));
}

type CreateTeamFeeInput = {
  title: string;
  /** 생략·무효 시 `teams/…/feePolicies/default.monthlyAmount` 사용 (≥ 최소 금액) */
  amount?: number;
  dueDate: Date;
  createdBy: string;
  /** 무시됨 — 저장값은 항상 `dueDate` 기준 `teamFeeSeoulMonthKey(dueDate)` */
  autoMonthKey?: string;
};

/**
 * 금액이 없거나 유효하지 않으면 팀 정책의 월 회비를 사용한다.
 */
export async function resolveTeamFeeCreateAmountWon(teamId: string, explicit?: unknown): Promise<number> {
  const n = explicit !== undefined && explicit !== null ? Math.floor(Number(explicit)) : NaN;
  if (Number.isFinite(n) && n > 0 && n < MIN_FEE_WON) {
    throw new Error(`회비 금액은 최소 ${MIN_FEE_WON.toLocaleString("ko-KR")}원입니다.`);
  }
  if (Number.isFinite(n) && n >= MIN_FEE_WON) return n;
  const policy = await fetchTeamFeePolicy(teamId);
  const p = Math.floor(policy.monthlyAmount);
  if (Number.isFinite(p) && p >= MIN_FEE_WON) return p;
  throw new Error(
    `회비 금액을 입력해 주세요. 또는 teams/${teamId}/feePolicies/default 문서에 monthlyAmount(${MIN_FEE_WON.toLocaleString("ko-KR")}원 이상)를 설정해 주세요.`
  );
}

/**
 * 팀 회비 차수 생성.
 * - 팀 생성 시점에는 `payments` 없음.
 * - 여기서 `teams/.../fees` 문서를 만든 뒤, 활성 멤버마다 `teams/.../payments/{feeId}_{userId}` 를 시드한다 (`seedPaymentsForFee`).
 * - 서버 `onFeeCreatedSeedTeamPayments` 도 동일 규칙으로 시드(멱등) — 콘솔로 fee만 생성된 경우 백업.
 */
export async function createTeamFee(teamId: string, data: CreateTeamFeeInput): Promise<string> {
  const amount = await resolveTeamFeeCreateAmountWon(teamId, data.amount);
  const ref = collection(db, "teams", teamId, "fees");
  const dueTs = Timestamp.fromDate(data.dueDate);
  const autoMonthKey = teamFeeSeoulMonthKey(data.dueDate);
  const feeRef = await addDoc(ref, {
    title: data.title.trim(),
    amount,
    dueDate: dueTs,
    status: "open",
    reminderSent: false,
    createdBy: data.createdBy,
    autoMonthKey,
    createdAt: serverTimestamp(),
  });
  await seedPaymentsForFee(teamId, {
    id: feeRef.id,
    amount,
    dueDate: dueTs,
  });
  await updateTeamDocument(teamId, {});
  return feeRef.id;
}

export async function getTeamFees(teamId: string): Promise<TeamFee[]> {
  const q = query(collection(db, "teams", teamId, "fees"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((item) => mapFeeDoc(item.id, item.data() as Record<string, unknown>));
}

export type EnsureAnnualFeeRoundsInput = {
  teamId: string;
  startFeeId: string;
  months: number;
  createdBy: string;
};

/** 동일 팀·시작회차·개월 수로 동시에 여러 번 돌지 않도록 요청을 하나로 합침 */
const ensureAnnualFeeRoundsInflight = new Map<string, Promise<number>>();

function ensureAnnualFeeRoundsLockKey(teamId: string, startFeeId: string, months: number): string {
  return `${teamId}\0${startFeeId}\0${months}`;
}

/**
 * 연납 전 필요 회차 생성 — 트랜잭션으로 동시 클릭·레이스에서도 동일 `YYYY-MM`당 1문서만 생성.
 * `payments` 시드는 트랜잭션 커밋 후 실행(멤버 컬렉션 조회).
 */
export async function ensureAnnualFeeRounds(input: EnsureAnnualFeeRoundsInput): Promise<number> {
  const { teamId, startFeeId, months } = input;
  const nMonths = Math.floor(Number(months));
  if (!Number.isFinite(nMonths) || nMonths < 1 || nMonths > 36) {
    throw new Error("연납 개월 수가 올바르지 않습니다.");
  }

  const lockKey = ensureAnnualFeeRoundsLockKey(teamId, startFeeId, nMonths);
  const existing = ensureAnnualFeeRoundsInflight.get(lockKey);
  if (existing) return existing;

  const promise = ensureAnnualFeeRoundsImpl(input).finally(() => {
    ensureAnnualFeeRoundsInflight.delete(lockKey);
  });
  ensureAnnualFeeRoundsInflight.set(lockKey, promise);
  return promise;
}

async function ensureAnnualFeeRoundsImpl(input: EnsureAnnualFeeRoundsInput): Promise<number> {
  const { teamId, startFeeId, months, createdBy } = input;
  if (!teamId?.trim() || !startFeeId?.trim()) {
    throw new Error("연납 처리 필수값(teamId/startFeeId)이 누락되었습니다.");
  }
  const nMonths = Math.floor(Number(months));
  if (!Number.isFinite(nMonths) || nMonths < 1 || nMonths > 36) {
    throw new Error("연납 개월 수가 올바르지 않습니다.");
  }

  const previewFees = await getTeamFees(teamId);
  const openByDueAscPreview = previewFees
    .filter((fee) => fee.status !== "closed")
    .map((fee) => ({ fee, dueDate: dueDateToDate(fee.dueDate) }))
    .filter((item): item is { fee: TeamFee; dueDate: Date } => item.dueDate != null)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  const startPreview = openByDueAscPreview.find((item) => item.fee.id === startFeeId);
  if (!startPreview) {
    throw new Error("연납 시작 회차를 찾을 수 없습니다. 회비 목록을 새로고침 후 다시 시도해 주세요.");
  }

  const amountWon = await resolveTeamFeeCreateAmountWon(teamId, startPreview.fee.amount);

  const q = query(collection(db, "teams", teamId, "fees"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  const fees = snap.docs.map((item) => mapFeeDoc(item.id, item.data() as Record<string, unknown>));

  const occupiedMonthKeys = new Set<string>();
  for (const fee of fees) {
    const k = feeOccupancyMonthKeyFromTeamFee(fee);
    if (k) occupiedMonthKeys.add(k);
  }

  const openByDueAsc = fees
    .filter((fee) => fee.status !== "closed")
    .map((fee) => ({ fee, dueDate: dueDateToDate(fee.dueDate) }))
    .filter((item): item is { fee: TeamFee; dueDate: Date } => item.dueDate != null)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  const startEntry = openByDueAsc.find((item) => item.fee.id === startFeeId);
  if (!startEntry) {
    throw new Error("연납 시작 회차를 찾을 수 없습니다. 회비 목록을 새로고침 후 다시 시도해 주세요.");
  }

  if (Math.floor(Number(startEntry.fee.amount)) !== Math.floor(Number(startPreview.fee.amount))) {
    throw new Error("연납 시작 회비 정보가 변경되었습니다. 새로고침 후 다시 시도해 주세요.");
  }

  const baseAmt = startEntry.fee.amount;
  if (!Number.isFinite(baseAmt) || baseAmt <= 0) {
    throw new Error("연납 자동 생성을 위한 회비 금액을 확인할 수 없습니다.");
  }

  const startDue = startEntry.dueDate;
  const toCreate: Array<{ ref: ReturnType<typeof doc>; dueDate: Date; monthKey: string; title: string }> = [];

  for (let offset = 0; offset < nMonths; offset += 1) {
    const dueDate = addMonthsKeepingDay(startDue, offset);
    const monthKey = teamFeeSeoulMonthKey(dueDate);
    if (occupiedMonthKeys.has(monthKey)) continue;
    occupiedMonthKeys.add(monthKey);
    const monthTitle = teamFeeSeoulMonthTitle(dueDate);
    const ref = doc(collection(db, "teams", teamId, "fees"));
    toCreate.push({ ref, dueDate, monthKey, title: monthTitle });
  }

  const batch = writeBatch(db);
  for (const row of toCreate) {
    batch.set(row.ref, {
      title: row.title.trim(),
      amount: amountWon,
      dueDate: Timestamp.fromDate(row.dueDate),
      status: "open",
      reminderSent: false,
      createdBy,
      autoMonthKey: row.monthKey,
      createdAt: serverTimestamp(),
    });
  }
  if (toCreate.length > 0) {
    await batch.commit();
  }
  const created = toCreate.map((row) => ({
    id: row.ref.id,
    amount: amountWon,
    dueDate: Timestamp.fromDate(row.dueDate),
  }));

  for (const fee of created) {
    await seedPaymentsForFee(teamId, {
      id: fee.id,
      amount: fee.amount,
      dueDate: fee.dueDate,
    });
  }
  if (created.length > 0) {
    await updateTeamDocument(teamId, {});
  }

  return created.length;
}

export async function closeTeamFee(teamId: string, feeId: string): Promise<void> {
  await updateDoc(doc(db, "teams", teamId, "fees", feeId), {
    status: "closed",
    closedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await updateTeamDocument(teamId, {});
}

export async function reopenTeamFee(teamId: string, feeId: string): Promise<void> {
  await updateDoc(doc(db, "teams", teamId, "fees", feeId), {
    status: "open",
    closedAt: null,
    updatedAt: serverTimestamp(),
  });
  await updateTeamDocument(teamId, {});
}

export async function createPaymentRecord(
  teamId: string,
  feeId: string,
  userId: string,
  amount: number
): Promise<void> {
  const ref = doc(db, "teams", teamId, "payments", buildTeamFeePaymentDocId(feeId, userId));
  await setDoc(
    ref,
    {
      teamId,
      feeId,
      userId,
      amount,
      status: "pending",
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
  await updateTeamDocument(teamId, {});
}

/** `paid` → `pending` 순으로 판별 (레거시 필드만 있고 status 누락 시 과도한 pending 방지) */
export function teamFeePaymentDisplayRank(p: TeamFeePayment | null | undefined): number {
  if (!p) return 0;
  if (p.status === "paid") return 3;
  if (p.status === "failed") return 2;
  if (p.status === "pending") return 1;
  return 0;
}

/** 동일 feeId에 여러 payment 스냅이 잡힐 때(마이그레이션) UI용으로 한 건만 고름 */
export function pickPreferredTeamFeePaymentForFee(
  current: TeamFeePayment | null | undefined,
  candidate: TeamFeePayment
): TeamFeePayment {
  const a = teamFeePaymentDisplayRank(current);
  const b = teamFeePaymentDisplayRank(candidate);
  if (b > a) return candidate;
  if (b === a && (candidate.amount ?? 0) > (current?.amount ?? 0)) return candidate;
  return current ?? candidate;
}

/** `teams/.../payments` 문서 → 팀 홈·요약 카드용 (실시간 구독과 일회 조회 공통) */
export function parseTeamFeePaymentDoc(
  data: Record<string, unknown>,
  fallbackUserId: string
): TeamFeePayment {
  const normalized = normalizeTeamFeePaymentStatus(data.status);
  const status: TeamFeePayment["status"] =
    normalized === "cancelled" ? "failed" : normalized === "paid" || normalized === "failed" ? normalized : "pending";
  return {
    userId: String(data.userId ?? fallbackUserId),
    amount: Number(data.amount ?? 0),
    status,
    createdAt: data.createdAt as Timestamp | undefined,
    paidAt: data.paidAt as Timestamp | undefined,
    paymentKey: data.paymentKey ? String(data.paymentKey) : undefined,
    source:
      data.source === "autopay" ? "autopay" : data.source === "manual" ? "manual" : undefined,
    billingProfileUid: data.billingProfileUid ? String(data.billingProfileUid) : undefined,
    chargeAttemptCount:
      typeof data.chargeAttemptCount === "number" && Number.isFinite(data.chargeAttemptCount)
        ? data.chargeAttemptCount
        : undefined,
    nextRetryAt: data.nextRetryAt as Timestamp | null | undefined,
    autopayRunId: data.autopayRunId != null ? String(data.autopayRunId) : undefined,
    retryExhausted: data.retryExhausted === true,
    lastFailedAt: data.lastFailedAt as Timestamp | undefined,
    lastRetryScheduledAt: data.lastRetryScheduledAt as Timestamp | undefined,
  };
}

export async function getMyTeamFeePaymentMap(
  teamId: string,
  feeIds: string[],
  userId: string
): Promise<Record<string, TeamFeePayment | null>> {
  const pairs = await Promise.all(
    feeIds.map(async (feeId) => {
      const snap = await getDoc(doc(db, "teams", teamId, "payments", buildTeamFeePaymentDocId(feeId, userId)));
      if (!snap.exists()) return [feeId, null] as const;
      const data = snap.data() as Record<string, unknown>;
      return [feeId, parseTeamFeePaymentDoc(data, userId)] as const;
    })
  );
  return Object.fromEntries(pairs);
}
