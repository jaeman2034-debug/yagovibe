/**
 * 협회 운영 — 팀·회비·납부 (Firestore)
 * 회비 원장(transactions)은 클라이언트에서 생성하지 않음 → teamFeePayments 생성 시 CF.
 */

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "@/lib/firebase";
import type {
  CompetitionEntryStatus,
  CompetitionFeePayment,
  CreateCompetitionFeePaymentInput,
  CreateTeamFeePaymentInput,
  FederationOperatingCompetition,
  FederationOperatingCompetitionEntry,
  FederationOperatingCompetitionKind,
  FederationOperatingCompetitionStatus,
  FederationOperatingTeam,
  FederationOperatingTeamAgeGroup,
  FederationOperatingTeamCategory,
  TeamFeeAccount,
  TeamFeePayment,
} from "@/types/federationOperating";
import { calculateCompetitionEntryFees } from "@/types/federationOperating";

const COL = {
  teams: "teams",
  teamFeeAccounts: "teamFeeAccounts",
  teamFeePayments: "teamFeePayments",
  competitions: "competitions",
  competitionEntries: "competitionEntries",
  competitionFeePayments: "competitionFeePayments",
} as const;

function fedCol(federationSlug: string, name: string) {
  return collection(db, "federations", federationSlug, name);
}

function isoFromFirestoreValue(v: unknown): string {
  if (v && typeof v === "object" && "toDate" in v && typeof (v as { toDate?: () => Date }).toDate === "function") {
    try {
      return (v as { toDate: () => Date }).toDate().toISOString();
    } catch {
      /* ignore */
    }
  }
  if (typeof v === "string" && v.trim()) return v.trim();
  return new Date().toISOString();
}

function parseTeam(id: string, raw: Record<string, unknown>): FederationOperatingTeam {
  const age = String(raw.ageGroup || "other") as FederationOperatingTeamAgeGroup;
  const cat = String(raw.category || "club") as FederationOperatingTeamCategory;
  const ag: FederationOperatingTeamAgeGroup = ["20_30", "40", "50", "60", "other"].includes(age)
    ? age
    : "other";
  const cg: FederationOperatingTeamCategory = cat === "reserve" ? "reserve" : "club";
  return {
    id,
    name: String(raw.name || "").trim() || "이름 없음",
    ageGroup: ag,
    category: cg,
    annualFeeAmount: typeof raw.annualFeeAmount === "number" ? Math.floor(raw.annualFeeAmount) : 2_500_000,
    isActive: raw.isActive !== false,
    createdAt: isoFromFirestoreValue(raw.createdAt),
  };
}

function parseAccount(id: string, raw: Record<string, unknown>): TeamFeeAccount {
  return {
    id,
    teamId: String(raw.teamId || ""),
    year: typeof raw.year === "number" ? raw.year : parseInt(String(raw.year), 10) || 0,
    annualFeeAmount: typeof raw.annualFeeAmount === "number" ? raw.annualFeeAmount : 0,
    paymentPlan: raw.paymentPlan === "monthly" ? "monthly" : "lump_sum",
    expectedInstallments: typeof raw.expectedInstallments === "number" ? raw.expectedInstallments : 1,
    billedAmount: typeof raw.billedAmount === "number" ? raw.billedAmount : 0,
    paidAmount: typeof raw.paidAmount === "number" ? raw.paidAmount : 0,
    status: (["unpaid", "partial", "paid"].includes(String(raw.status)) ? raw.status : "unpaid") as TeamFeeAccount["status"],
  };
}

function parsePayment(id: string, raw: Record<string, unknown>): TeamFeePayment {
  return {
    id,
    teamId: String(raw.teamId || ""),
    year: typeof raw.year === "number" ? raw.year : parseInt(String(raw.year), 10) || 0,
    installmentNo: typeof raw.installmentNo === "number" ? raw.installmentNo : undefined,
    amount: typeof raw.amount === "number" ? raw.amount : 0,
    paidAt: String(raw.paidAt || ""),
    method: ["cash", "bank_transfer", "card"].includes(String(raw.method))
      ? (raw.method as TeamFeePayment["method"])
      : undefined,
    memo: raw.memo != null ? String(raw.memo) : undefined,
    createdByUid: String(raw.createdByUid || ""),
  };
}

export async function createFederationTeam(
  federationSlug: string,
  input: {
    name: string;
    ageGroup: FederationOperatingTeamAgeGroup;
    category?: FederationOperatingTeamCategory;
    annualFeeAmount?: number;
  }
): Promise<string> {
  const ref = await addDoc(fedCol(federationSlug, COL.teams), {
    name: input.name.trim(),
    ageGroup: input.ageGroup,
    category: input.category ?? "club",
    annualFeeAmount: Math.floor(input.annualFeeAmount ?? 2_500_000),
    isActive: true,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listFederationTeams(federationSlug: string): Promise<FederationOperatingTeam[]> {
  const qy = query(fedCol(federationSlug, COL.teams), orderBy("name"), limit(500));
  const snap = await getDocs(qy);
  return snap.docs.map((d) => parseTeam(d.id, d.data() as Record<string, unknown>));
}

/** 실시간 팀 목록 */
export function subscribeFederationTeams(
  federationSlug: string,
  onData: (teams: FederationOperatingTeam[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const qy = query(fedCol(federationSlug, COL.teams), orderBy("name"), limit(500));
  return onSnapshot(
    qy,
    (snap) => {
      onData(snap.docs.map((d) => parseTeam(d.id, d.data() as Record<string, unknown>)));
    },
    (e) => onError?.(e)
  );
}

export async function listTeamFeeAccounts(federationSlug: string, year: number): Promise<TeamFeeAccount[]> {
  const qy = query(fedCol(federationSlug, COL.teamFeeAccounts), where("year", "==", year), limit(500));
  const snap = await getDocs(qy);
  return snap.docs.map((d) => parseAccount(d.id, d.data() as Record<string, unknown>));
}

export function subscribeTeamFeeAccounts(
  federationSlug: string,
  year: number,
  onData: (rows: TeamFeeAccount[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const qy = query(fedCol(federationSlug, COL.teamFeeAccounts), where("year", "==", year), limit(500));
  return onSnapshot(
    qy,
    (snap) => {
      onData(snap.docs.map((d) => parseAccount(d.id, d.data() as Record<string, unknown>)));
    },
    (e) => onError?.(e)
  );
}

export async function listTeamFeePayments(
  federationSlug: string,
  teamId: string,
  year: number
): Promise<TeamFeePayment[]> {
  const qy = query(
    fedCol(federationSlug, COL.teamFeePayments),
    where("teamId", "==", teamId),
    where("year", "==", year),
    orderBy("paidAt", "desc"),
    limit(200)
  );
  const snap = await getDocs(qy);
  return snap.docs.map((d) => parsePayment(d.id, d.data() as Record<string, unknown>));
}

export function subscribeTeamFeePayments(
  federationSlug: string,
  teamId: string,
  year: number,
  onData: (rows: TeamFeePayment[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const qy = query(
    fedCol(federationSlug, COL.teamFeePayments),
    where("teamId", "==", teamId),
    where("year", "==", year),
    orderBy("paidAt", "desc"),
    limit(200)
  );
  return onSnapshot(
    qy,
    (snap) => {
      onData(snap.docs.map((d) => parsePayment(d.id, d.data() as Record<string, unknown>)));
    },
    (e) => onError?.(e)
  );
}

export async function createTeamFeePayment(
  federationSlug: string,
  input: CreateTeamFeePaymentInput
): Promise<string> {
  const auth = getAuth();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("로그인이 필요합니다.");

  const ref = await addDoc(fedCol(federationSlug, COL.teamFeePayments), {
    teamId: input.teamId,
    year: input.year,
    amount: Math.floor(input.amount),
    paidAt: input.paidAt,
    method: input.method ?? null,
    installmentNo: input.installmentNo ?? null,
    memo: input.memo?.trim() || null,
    createdByUid: uid,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** 활성 팀 기준 연도별 회비 계정 `{teamId}_{year}` 멱등 생성 (없을 때만) */
export async function createYearlyFeeAccounts(
  federationSlug: string,
  year: number,
  defaultAnnualFee = 2_500_000
): Promise<{ created: number; skipped: number }> {
  const teams = await listFederationTeams(federationSlug);
  const active = teams.filter((t) => t.isActive);
  let created = 0;
  let skipped = 0;

  for (const team of active) {
    const accountId = `${team.id}_${year}`;
    const ref = doc(db, "federations", federationSlug, COL.teamFeeAccounts, accountId);
    const ex = await getDoc(ref);
    if (ex.exists()) {
      skipped++;
      continue;
    }
    const annual = Math.floor(team.annualFeeAmount > 0 ? team.annualFeeAmount : defaultAnnualFee);
    await setDoc(ref, {
      teamId: team.id,
      year,
      annualFeeAmount: annual,
      paymentPlan: "lump_sum",
      expectedInstallments: 1,
      billedAmount: annual,
      paidAmount: 0,
      status: "unpaid",
      createdAt: serverTimestamp(),
    });
    created++;
  }

  return { created, skipped };
}

// ----- 대회 · 참가 · 참가비 납부 (원장은 competitionFeePayments → CF) -----

export function competitionEntryDocId(competitionId: string, teamId: string): string {
  return `${competitionId}__${teamId}`;
}

function parseCompetition(id: string, raw: Record<string, unknown>): FederationOperatingCompetition {
  const kind = String(raw.kind || "regular") as FederationOperatingCompetitionKind;
  const k: FederationOperatingCompetitionKind = ["regular", "league", "friendly"].includes(kind)
    ? kind
    : "regular";
  const st = String(raw.status || "planned") as FederationOperatingCompetitionStatus;
  const status: FederationOperatingCompetitionStatus = ["planned", "open", "closed", "settled"].includes(st)
    ? st
    : "planned";
  return {
    id,
    name: String(raw.name || "").trim() || "이름 없음",
    year: typeof raw.year === "number" ? raw.year : parseInt(String(raw.year), 10) || new Date().getFullYear(),
    kind: k,
    teamBaseFee: typeof raw.teamBaseFee === "number" ? Math.floor(raw.teamBaseFee) : 200_000,
    extraTeamFee: typeof raw.extraTeamFee === "number" ? Math.floor(raw.extraTeamFee) : 100_000,
    status,
  };
}

function parseCompetitionEntry(id: string, raw: Record<string, unknown>): FederationOperatingCompetitionEntry {
  const st = String(raw.status || "unpaid");
  const status = (["unpaid", "partial", "paid"].includes(st) ? st : "unpaid") as CompetitionEntryStatus;
  return {
    id,
    competitionId: String(raw.competitionId || ""),
    teamId: String(raw.teamId || ""),
    teamName: raw.teamName != null ? String(raw.teamName) : undefined,
    entryCount: typeof raw.entryCount === "number" ? Math.floor(raw.entryCount) : 1,
    baseFeeAmount: typeof raw.baseFeeAmount === "number" ? raw.baseFeeAmount : 0,
    extraFeeAmount: typeof raw.extraFeeAmount === "number" ? raw.extraFeeAmount : 0,
    totalFeeAmount: typeof raw.totalFeeAmount === "number" ? raw.totalFeeAmount : 0,
    paidAmount: typeof raw.paidAmount === "number" ? raw.paidAmount : 0,
    status,
  };
}

function parseCompetitionFeePayment(id: string, raw: Record<string, unknown>): CompetitionFeePayment {
  return {
    id,
    entryId: String(raw.entryId || ""),
    competitionId: String(raw.competitionId || ""),
    teamId: String(raw.teamId || ""),
    amount: typeof raw.amount === "number" ? raw.amount : 0,
    paidAt: String(raw.paidAt || ""),
    method: ["cash", "bank_transfer", "card"].includes(String(raw.method))
      ? (raw.method as CompetitionFeePayment["method"])
      : undefined,
    memo: raw.memo != null ? String(raw.memo) : undefined,
    createdByUid: String(raw.createdByUid || ""),
  };
}

export async function listFederationCompetitions(federationSlug: string): Promise<FederationOperatingCompetition[]> {
  const qy = query(fedCol(federationSlug, COL.competitions), orderBy("year", "desc"), limit(80));
  const snap = await getDocs(qy);
  return snap.docs.map((d) => parseCompetition(d.id, d.data() as Record<string, unknown>));
}

export function subscribeFederationCompetitions(
  federationSlug: string,
  onData: (rows: FederationOperatingCompetition[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const qy = query(fedCol(federationSlug, COL.competitions), orderBy("year", "desc"), limit(80));
  return onSnapshot(
    qy,
    (snap) => onData(snap.docs.map((d) => parseCompetition(d.id, d.data() as Record<string, unknown>))),
    (e) => onError?.(e)
  );
}

export async function createFederationCompetition(
  federationSlug: string,
  input: {
    name: string;
    year: number;
    kind?: FederationOperatingCompetitionKind;
    teamBaseFee?: number;
    extraTeamFee?: number;
    status?: FederationOperatingCompetitionStatus;
  }
): Promise<string> {
  const ref = await addDoc(fedCol(federationSlug, COL.competitions), {
    name: input.name.trim(),
    year: Math.floor(input.year),
    kind: input.kind ?? "regular",
    teamBaseFee: Math.floor(input.teamBaseFee ?? 200_000),
    extraTeamFee: Math.floor(input.extraTeamFee ?? 100_000),
    status: input.status ?? "open",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateFederationCompetition(
  federationSlug: string,
  competitionId: string,
  patch: Partial<Pick<FederationOperatingCompetition, "name" | "year" | "kind" | "teamBaseFee" | "extraTeamFee" | "status">>
): Promise<void> {
  const plain: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (patch.name != null) plain.name = String(patch.name).trim();
  if (patch.year != null) plain.year = Math.floor(patch.year);
  if (patch.kind != null) plain.kind = patch.kind;
  if (patch.teamBaseFee != null) plain.teamBaseFee = Math.floor(patch.teamBaseFee);
  if (patch.extraTeamFee != null) plain.extraTeamFee = Math.floor(patch.extraTeamFee);
  if (patch.status != null) plain.status = patch.status;
  await updateDoc(doc(db, "federations", federationSlug, COL.competitions, competitionId), plain as any);
}

export async function listCompetitionEntries(
  federationSlug: string,
  competitionId: string
): Promise<FederationOperatingCompetitionEntry[]> {
  const qy = query(
    fedCol(federationSlug, COL.competitionEntries),
    where("competitionId", "==", competitionId),
    orderBy("teamId"),
    limit(300)
  );
  const snap = await getDocs(qy);
  return snap.docs.map((d) => parseCompetitionEntry(d.id, d.data() as Record<string, unknown>));
}

export function subscribeCompetitionEntries(
  federationSlug: string,
  competitionId: string,
  onData: (rows: FederationOperatingCompetitionEntry[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const qy = query(
    fedCol(federationSlug, COL.competitionEntries),
    where("competitionId", "==", competitionId),
    orderBy("teamId"),
    limit(300)
  );
  return onSnapshot(
    qy,
    (snap) => onData(snap.docs.map((d) => parseCompetitionEntry(d.id, d.data() as Record<string, unknown>))),
    (e) => onError?.(e)
  );
}

export async function upsertCompetitionEntry(
  federationSlug: string,
  competitionId: string,
  team: FederationOperatingTeam,
  entryCount: number
): Promise<string> {
  const compRef = doc(db, "federations", federationSlug, COL.competitions, competitionId);
  const compSnap = await getDoc(compRef);
  if (!compSnap.exists()) throw new Error("대회를 찾을 수 없습니다.");
  const comp = parseCompetition(competitionId, compSnap.data() as Record<string, unknown>);
  const fees = calculateCompetitionEntryFees(entryCount, comp.teamBaseFee, comp.extraTeamFee);
  const entryId = competitionEntryDocId(competitionId, team.id);
  const ref = doc(db, "federations", federationSlug, COL.competitionEntries, entryId);
  const ex = await getDoc(ref);
  const prevPaid =
    ex.exists() && typeof (ex.data() as { paidAmount?: number }).paidAmount === "number"
      ? Math.max(0, (ex.data() as { paidAmount: number }).paidAmount)
      : 0;
  const total = fees.totalFeeAmount;
  let status: FederationOperatingCompetitionEntry["status"] = "unpaid";
  if (total > 0 && prevPaid >= total) status = "paid";
  else if (prevPaid > 0) status = "partial";

  await setDoc(
    ref,
    {
      competitionId,
      teamId: team.id,
      teamName: team.name,
      entryCount: fees.entryCount,
      baseFeeAmount: fees.baseFeeAmount,
      extraFeeAmount: fees.extraFeeAmount,
      totalFeeAmount: total,
      paidAmount: prevPaid,
      status,
      updatedAt: serverTimestamp(),
      ...(ex.exists() ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true }
  );
  return entryId;
}

export async function createCompetitionFeePayment(
  federationSlug: string,
  input: CreateCompetitionFeePaymentInput
): Promise<string> {
  const auth = getAuth();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("로그인이 필요합니다.");

  const ref = await addDoc(fedCol(federationSlug, COL.competitionFeePayments), {
    entryId: input.entryId,
    competitionId: input.competitionId,
    teamId: input.teamId,
    amount: Math.floor(input.amount),
    paidAt: input.paidAt,
    method: input.method ?? null,
    memo: input.memo?.trim() || null,
    createdByUid: uid,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export function subscribeCompetitionFeePayments(
  federationSlug: string,
  entryId: string,
  onData: (rows: CompetitionFeePayment[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const qy = query(
    fedCol(federationSlug, COL.competitionFeePayments),
    where("entryId", "==", entryId),
    orderBy("paidAt", "desc"),
    limit(100)
  );
  return onSnapshot(
    qy,
    (snap) => onData(snap.docs.map((d) => parseCompetitionFeePayment(d.id, d.data() as Record<string, unknown>))),
    (e) => onError?.(e)
  );
}
