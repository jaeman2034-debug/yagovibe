import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalizePhoneDigits } from "@/utils/phone";
import type { MemberDuesType } from "@/types/memberDues";

export type CreateDirectTeamMemberInput = {
  displayName: string;
  phone?: string;
  userId?: string;
  jerseyNumber?: number;
  birthYear?: number | null;
  uniformSize?: string;
  position?: string;
  roleDetail?: string;
  note?: string;
  role?: TeamMemberRole;
};

export type TeamMemberRole = "owner" | "manager" | "staff" | "member";

/** 일괄 추가 실패 시 UI·로그용 사유 코드 (쓰기 전 검증 + Firestore) */
export type BulkMemberWriteFailureReason =
  | "missing_name"
  | "missing_phone"
  | "invalid_phone"
  | "duplicate_phone"
  | "duplicate_phone_db"
  | "invalid_role"
  | "permission_denied"
  | "unauthenticated"
  | "invalid_data"
  | "already_exists"
  | "resource_exhausted"
  | "unknown";

export type BulkMemberWriteFailure = {
  displayName: string;
  reason: BulkMemberWriteFailureReason;
  /** 원본 메시지 일부 */
  detail?: string;
};

/** DB에 이미 같은 전화가 있을 때 UI·이벤트용(실패 배열에는 넣지 않음) */
export type BulkMemberDbDuplicateWarning = {
  displayName: string;
  reason: "duplicate_phone_db";
  existingDisplayName?: string;
};

function extractErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  const o = e as { message?: string };
  return typeof o?.message === "string" ? o.message : String(e);
}

function categorizeBulkMemberWriteError(e: unknown): BulkMemberWriteFailureReason {
  const msg = extractErrorMessage(e);
  const code = (e as { code?: string }).code;
  if (code === "permission-denied") return "permission_denied";
  if (code === "unauthenticated") return "unauthenticated";
  if (code === "resource-exhausted") return "resource_exhausted";
  if (code === "already-exists") return "already_exists";
  if (
    code === "invalid-argument" ||
    /invalid data|Unsupported field value/i.test(msg)
  ) {
    return "invalid_data";
  }
  return "unknown";
}

/** 토스트·다이얼로그용 한글 라벨 */
export function bulkMemberWriteFailureLabel(reason: BulkMemberWriteFailureReason): string {
  switch (reason) {
    case "missing_name":
      return "이름 없음";
    case "missing_phone":
      return "전화번호 없음";
    case "invalid_phone":
      return "전화번호 형식 오류";
    case "duplicate_phone":
      return "중복 전화번호";
    case "duplicate_phone_db":
      return "이미 등록된 전화번호";
    case "invalid_role":
      return "직위 형식 오류";
    case "permission_denied":
      return "권한 없음";
    case "unauthenticated":
      return "로그인 만료";
    case "invalid_data":
      return "데이터 형식 오류";
    case "already_exists":
      return "이미 존재";
    case "resource_exhausted":
      return "요청 한도 초과";
    default:
      return "알 수 없음";
  }
}

/** 멤버별 실패 줄 (최대 maxLines) */
export function formatBulkMemberFailuresLines(
  failures: BulkMemberWriteFailure[],
  maxLines = 15
): string {
  const slice = failures.slice(0, maxLines);
  const lines = slice.map((f) => `${f.displayName} – ${bulkMemberWriteFailureLabel(f.reason)}`);
  if (failures.length > maxLines) {
    lines.push(`… 외 ${failures.length - maxLines}명`);
  }
  return lines.join("\n");
}

/** DB 전화 중복 안내 줄(다이얼로그·토스트) */
export function formatBulkMemberDbDuplicateLines(
  warnings: BulkMemberDbDuplicateWarning[],
  maxLines = 20
): string {
  const slice = warnings.slice(0, maxLines);
  const lines = slice.map((w) => {
    const existing = w.existingDisplayName?.trim();
    return existing
      ? `${w.displayName} – 이미 등록된 번호 (기존: ${existing})`
      : `${w.displayName} – 이미 등록된 번호`;
  });
  if (warnings.length > maxLines) {
    lines.push(`… 외 ${warnings.length - maxLines}명`);
  }
  return lines.join("\n");
}

/** Promise.allSettled 전부 실패 시 throw — MembersTab에서 instanceof로 상세 토스트 */
export class BulkTeamMemberAddError extends Error {
  readonly failures: BulkMemberWriteFailure[];
  readonly successCount: number;
  readonly failCount: number;

  constructor(params: { failures: BulkMemberWriteFailure[]; successCount: number }) {
    const { failures, successCount } = params;
    const failCount = failures.length;
    super(
      failCount > 0
        ? `멤버 추가에 실패했습니다 (${failCount}명).` +
            (successCount > 0 ? ` (${successCount}명은 이미 저장되었을 수 있습니다)` : "")
        : "멤버 추가에 실패했습니다."
    );
    this.name = "BulkTeamMemberAddError";
    this.failures = failures;
    this.successCount = successCount;
    this.failCount = failCount;
    Object.setPrototypeOf(this, BulkTeamMemberAddError.prototype);
  }
}

const LOCAL_MEMBER_ID_PREFIX = "local_";
const ALLOWED_UNIFORM_SIZES = new Set(["S", "M", "L", "XL", "2XL"]);
const ALLOWED_MEMBER_ROLES = new Set<TeamMemberRole>(["owner", "manager", "staff", "member"]);

function cleanName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function cleanPhone(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const next = raw.trim();
  return next ? next : undefined;
}

function buildLocalMemberId(firestore: Firestore): string {
  const autoId = doc(collection(firestore, "_tmp")).id;
  return `${LOCAL_MEMBER_ID_PREFIX}${autoId}`;
}

export function parseBulkMemberNames(input: string): string[] {
  const rows = input
    .split(/\r?\n/g)
    .map((line) => cleanName(line))
    .filter(Boolean);
  return [...new Set(rows)];
}

export type ParsedBulkMemberInput = {
  displayName: string;
  phone?: string;
  jerseyNumber?: number;
  birthYear?: number;
  uniformSize?: string;
  position?: string;
  roleDetail?: string;
  role?: TeamMemberRole;
};

function cleanRole(raw: string | undefined): TeamMemberRole {
  if (!raw) return "member";
  const next = raw.trim().toLowerCase();
  if (!next) return "member";

  const mapped = (() => {
    if (next === "회장" || next === "팀장" || next === "owner") return "owner";
    if (next === "총무" || next === "manager" || next === "매니저") return "manager";
    if (next === "코치" || next === "감독" || next === "감사" || next === "staff") return "staff";
    if (next === "회원" || next === "팀원" || next === "member") return "member";
    return next as TeamMemberRole;
  })();

  return ALLOWED_MEMBER_ROLES.has(mapped) ? mapped : "member";
}

function cleanUniformSize(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const next = raw.trim().toUpperCase();
  if (!next) return undefined;
  return ALLOWED_UNIFORM_SIZES.has(next) ? next : undefined;
}

function cleanNote(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const next = raw.trim();
  return next ? next : undefined;
}

function cleanPosition(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const next = raw.trim().toUpperCase();
  return next ? next : undefined;
}

function cleanRoleDetail(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const next = raw.trim();
  return next ? next : undefined;
}

function cleanJerseyNumber(raw: number | string | undefined): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n)) return undefined;
  const v = Math.trunc(n);
  if (v <= 0 || v > 999) return undefined;
  return v;
}

function cleanBirthYear(raw: number | string | null | undefined): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n)) return undefined;
  const v = Math.trunc(n);
  const nowYear = new Date().getFullYear();
  if (v < 1900 || v > nowYear) return undefined;
  return v;
}

/** `createDirectTeamMembersBulk` 옵션 */
export type CreateDirectTeamMembersBulkOptions = {
  /** true면 전화(숫자) 없으면 Firestore 호출 전 제외 */
  requirePhone?: boolean;
  /**
   * false면 `teams/{teamId}/members` 기존 전화와의 DB 중복 검사 생략(대량 마이그레이션 등).
   * 기본(미지정)은 검사함.
   */
  checkExistingTeamPhoneDuplicates?: boolean;
  /**
   * true면 DB에 이미 있는 전화번호 행도 쓰기 대상에 포함(사용자가 "그래도 추가"를 확정한 경우).
   * 기본은 false → 해당 행은 쓰지 않고 `dbDuplicateWarnings`에만 담김.
   */
  allowDuplicatePhones?: boolean;
};

/** 선검증 + DB 중복 제외 후 실제로 쓸 행 */
export type BulkTeamMemberWritePlan = {
  rowsToWrite: ParsedBulkMemberInput[];
  preFailures: BulkMemberWriteFailure[];
  dbDuplicateWarnings: BulkMemberDbDuplicateWarning[];
};

export type CreateDirectTeamMembersBulkResult = {
  successCount: number;
  failCount: number;
  failedNames: string[];
  /** `allowDuplicatePhones`가 아닐 때, DB 중복으로 쓰기에서 제외된 행 수 */
  skippedDbDuplicateCount: number;
  dbDuplicateWarnings: BulkMemberDbDuplicateWarning[];
};

export type UpdateTeamMemberProfileInput = {
  teamId: string;
  memberId: string;
  jerseyNumber?: number | null;
  birthYear?: number | null;
  uniformSize?: string | null;
  position?: string | null;
  roleDetail?: string | null;
  /** 회비 정책 유형 — 미전달 시 기존 값 유지 */
  duesType?: MemberDuesType;
  /** 연납 처리 시각(회비 마감 연도와 같은 연도면 월 회비 0원) — null이면 삭제 */
  yearlyPaidAt?: Timestamp | Date | null;
  annualPaid?: boolean;
  annualBatchId?: string | null;
  annualAmount?: number | null;
  annualBaseAmount?: number | null;
  annualDiscountAmount?: number | null;
  annualFinalAmount?: number | null;
  annualDiscountMonths?: number | null;
  annualDiscountType?: "NONE" | "EARLY_BIRD" | "MANUAL" | null;
  annualDiscountLabel?: string | null;
  annualOverride?: boolean;
  feeType?: "MONTHLY" | "ANNUAL" | "FREE" | "DISCOUNT";
  discountAmount?: number | null;
  discountLabel?: string | null;
};

export async function isDuplicateJerseyNumber(
  teamId: string,
  jerseyNumber: number,
  excludeMemberId?: string
): Promise<boolean> {
  const normalized = cleanJerseyNumber(jerseyNumber);
  if (!teamId.trim() || normalized == null) return false;

  const q = query(
    collection(db, "teams", teamId, "members"),
    where("jerseyNumber", "==", normalized)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.some((d) => {
    if (excludeMemberId && d.id === excludeMemberId) return false;
    return true;
  });
}

/** PDF 미리보기 `revalidatePdfRows`와 동일: 전화 없음 허용, 있으면 휴대폰 또는 7~8자리 로컬 */
function isValidOptionalBulkPhoneDigits(digits: string): boolean {
  if (!digits) return true;
  const isMobile = /^01[0-9]{8,9}$/.test(digits);
  const isLocal = /^\d{7,8}$/.test(digits) && !digits.startsWith("01");
  return isMobile || isLocal;
}

/** 팀 멤버 SoT에서 전화(숫자) → 표시 이름 — DB 중복 안내 1회 조회용 */
async function fetchExistingTeamMemberPhoneToDisplayNameMap(teamId: string): Promise<Map<string, string>> {
  const snap = await getDocs(collection(db, "teams", teamId, "members"));
  const map = new Map<string, string>();
  for (const d of snap.docs) {
    const data = d.data() as Record<string, unknown>;
    const p = data.phone;
    if (typeof p !== "string") continue;
    const digits = normalizePhoneDigits(p);
    if (digits.length === 0) continue;
    if (map.has(digits)) continue;
    const existingDisplayName =
      (typeof data.displayName === "string" && data.displayName.trim()) ||
      (typeof data.name === "string" && data.name.trim()) ||
      (typeof data.userName === "string" && data.userName.trim()) ||
      "등록된 멤버";
    map.set(digits, existingDisplayName);
  }
  return map;
}

/** Firestore 쓰기 전 검증 — 실패 행은 valid에서 제외, DB 전화 중복은 경고만(기본은 valid 제외) */
function partitionBulkMembersForWrite(
  rows: ParsedBulkMemberInput[],
  options: CreateDirectTeamMembersBulkOptions | undefined,
  existingPhoneToDisplayName: Map<string, string> | undefined
): {
  valid: ParsedBulkMemberInput[];
  preFailures: BulkMemberWriteFailure[];
  dbDuplicateWarnings: BulkMemberDbDuplicateWarning[];
} {
  const preFailures: BulkMemberWriteFailure[] = [];
  const dbDuplicateWarnings: BulkMemberDbDuplicateWarning[] = [];
  const valid: ParsedBulkMemberInput[] = [];
  const requirePhone = options?.requirePhone === true;
  const allowDuplicatePhones = options?.allowDuplicatePhones === true;
  /** 이번 요청 안에서만: 동일 번호 두 번째 행부터 제외 */
  const seenPhones = new Set<string>();

  for (const m of rows) {
    const displayName = cleanName(m.displayName);
    const labelForError =
      displayName ||
      (typeof m.displayName === "string" ? m.displayName.trim() : "") ||
      "(이름 없음)";
    if (!displayName) {
      preFailures.push({ displayName: labelForError, reason: "missing_name" });
      continue;
    }

    const digits = normalizePhoneDigits(m.phone);
    if (requirePhone && !digits) {
      preFailures.push({ displayName, reason: "missing_phone" });
      continue;
    }
    if (digits.length > 0 && !isValidOptionalBulkPhoneDigits(digits)) {
      preFailures.push({ displayName, reason: "invalid_phone" });
      continue;
    }
    if (digits.length > 0 && existingPhoneToDisplayName?.has(digits)) {
      if (!allowDuplicatePhones) {
        dbDuplicateWarnings.push({
          displayName,
          reason: "duplicate_phone_db",
          existingDisplayName: existingPhoneToDisplayName.get(digits),
        });
        continue;
      }
    }
    if (digits.length > 0) {
      if (seenPhones.has(digits)) {
        preFailures.push({ displayName, reason: "duplicate_phone" });
        continue;
      }
      seenPhones.add(digits);
    }

    valid.push({
      ...m,
      displayName,
      role: m.role != null ? cleanRole(String(m.role)) : cleanRole(undefined),
    });
  }

  return { valid, preFailures, dbDuplicateWarnings };
}

function buildMemberPayload(input: CreateDirectTeamMemberInput, source: "manual" | "bulk_manual") {
  const displayName = cleanName(input.displayName);
  const phone = cleanPhone(input.phone);
  const userId = cleanPhone(input.userId);
  const jerseyNumber = cleanJerseyNumber(input.jerseyNumber);
  const birthYear = cleanBirthYear(input.birthYear);
  const uniformSize = cleanUniformSize(input.uniformSize);
  const position = cleanPosition(input.position);
  const roleDetail = cleanRoleDetail(input.roleDetail);
  const note = cleanNote(input.note);
  const role = cleanRole(input.role);

  const payload: Record<string, unknown> = {
    displayName,
    name: displayName,
    userName: displayName,
    role,
    status: "active",
    createdAt: serverTimestamp(),
    joinedAt: serverTimestamp(),
    source,
    memberType: "local",
  };
  if (phone) payload.phone = phone;
  if (userId) payload.userId = userId;
  if (jerseyNumber != null) payload.jerseyNumber = jerseyNumber;
  if (birthYear != null) payload.birthYear = birthYear;
  if (uniformSize) payload.uniformSize = uniformSize;
  if (position) payload.position = position;
  if (roleDetail) payload.roleDetail = roleDetail;
  if (note) payload.note = note;
  return { payload, userId, displayName, phone, jerseyNumber, birthYear, uniformSize, position, roleDetail, role };
}

export function parseBulkMembers(input: string): ParsedBulkMemberInput[] {
  const lines = input.split(/\r?\n/g).map((line) => line.trim()).filter(Boolean);
  const out: ParsedBulkMemberInput[] = [];
  const seen = new Set<string>();
  lines.forEach((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const hasRoleFirst =
      cols.length >= 2 &&
      cleanRole(cols[0]) !== "member" &&
      cols[0].trim().toLowerCase() !== "member";
    const displayName = cleanName(hasRoleFirst ? cols[1] ?? "" : cols[0] ?? "");
    if (!displayName) return;
    if (seen.has(displayName)) return;
    seen.add(displayName);
    out.push({
      displayName,
      role: cleanRole(hasRoleFirst ? cols[0] : (cols[8] ?? cols[4])),
      phone: cleanPhone(hasRoleFirst ? cols[2] : cols[1]),
      jerseyNumber: cleanJerseyNumber(hasRoleFirst ? cols[3] : cols[2]),
      birthYear: cleanBirthYear(cols[7]),
      uniformSize: cleanUniformSize(hasRoleFirst ? cols[4] : cols[3]),
      position: cleanPosition(cols[5]),
      roleDetail: cleanRoleDetail(cols[6]),
    });
  });
  return out;
}

/**
 * Firestore 쓰기 없이 일괄 추가 계획만 계산(미리보기·DB 중복 다이얼로그용).
 * `rowsToWrite`는 DB 전화 중복 행을 기본 제외한 뒤의 쓰기 대상이다.
 */
export async function getBulkTeamMemberWritePlan(
  teamId: string,
  members: ParsedBulkMemberInput[],
  options?: CreateDirectTeamMembersBulkOptions
): Promise<BulkTeamMemberWritePlan> {
  const cleaned = [...new Set(members.map((m) => cleanName(m.displayName)).filter(Boolean))];
  if (!teamId.trim()) {
    throw new Error("teamId가 필요합니다.");
  }
  if (cleaned.length === 0) {
    return { rowsToWrite: [], preFailures: [], dbDuplicateWarnings: [] };
  }
  const target = members.filter((m) => cleaned.includes(cleanName(m.displayName)));
  const checkDbDupes = options?.checkExistingTeamPhoneDuplicates !== false;
  const existingPhoneToDisplayName = checkDbDupes
    ? await fetchExistingTeamMemberPhoneToDisplayNameMap(teamId)
    : undefined;
  const planOptions: CreateDirectTeamMembersBulkOptions = {
    ...options,
    allowDuplicatePhones: false,
  };
  const { valid, preFailures, dbDuplicateWarnings } = partitionBulkMembersForWrite(
    target,
    planOptions,
    existingPhoneToDisplayName
  );
  return { rowsToWrite: valid, preFailures, dbDuplicateWarnings };
}

export async function createDirectTeamMember(
  teamId: string,
  input: CreateDirectTeamMemberInput
): Promise<void> {
  if (!teamId.trim()) {
    throw new Error("teamId가 필요합니다.");
  }
  if (!cleanName(input.displayName)) {
    throw new Error("이름은 필수입니다.");
  }

  const { payload, userId, displayName, phone, jerseyNumber, birthYear, uniformSize, position, roleDetail, role } = buildMemberPayload(
    input,
    "manual"
  );
  const memberId = buildLocalMemberId(db);
  const memberRef = doc(db, "teams", teamId, "members", memberId);
  const teamMembersDocId = `${teamId}_${memberId}`;
  const teamMembersUserId = userId ?? memberId;

  // Firestore: undefined 필드 금지 → teams/members와 동일하게 값 있을 때만 넣음
  const teamMembersMirror: Record<string, unknown> = {
    teamId,
    uid: memberId,
    userId: teamMembersUserId,
    role,
    status: "active",
    name: displayName,
    displayName,
    createdAt: serverTimestamp(),
    source: "manual",
  };
  if (phone) teamMembersMirror.phone = phone;
  if (jerseyNumber != null) teamMembersMirror.jerseyNumber = jerseyNumber;
  if (birthYear != null) teamMembersMirror.birthYear = birthYear;
  if (uniformSize) teamMembersMirror.uniformSize = uniformSize;
  if (position) teamMembersMirror.position = position;
  if (roleDetail) teamMembersMirror.roleDetail = roleDetail;

  const rulesDebug = {
    teamMembersDocId,
    teamId,
    memberId,
    mirrorUid: memberId,
    mirrorUserId: teamMembersUserId,
    role,
    roleType: typeof role,
    membersSoT: {
      path: `teams/${teamId}/members/${memberId}`,
      role: payload.role,
      status: payload.status,
      memberType: payload.memberType,
      source: payload.source,
    },
  };

  if (import.meta.env.DEV) {
    console.debug("[teamMemberService] WRITE team_members (rules 대조)", rulesDebug);
  }

  const batch = writeBatch(db);
  batch.set(memberRef, payload);
  batch.set(doc(db, "team_members", teamMembersDocId), teamMembersMirror);
  try {
    await batch.commit();
    if (import.meta.env.DEV) {
      console.debug("[teamMemberService] writeBatch OK", { teamMembersDocId, teamId, memberId });
    }
  } catch (e) {
    const err = e as { code?: string; message?: string };
    console.error("[teamMemberService] 멤버 writeBatch 실패 (teams/members + team_members 원자적 롤백)", {
      ...rulesDebug,
      code: err?.code,
      message: err?.message,
    });
    throw e;
  }
}

export async function createDirectTeamMembersBulk(
  teamId: string,
  members: ParsedBulkMemberInput[],
  options?: CreateDirectTeamMembersBulkOptions
): Promise<CreateDirectTeamMembersBulkResult> {
  const cleaned = [...new Set(members.map((m) => cleanName(m.displayName)).filter(Boolean))];
  if (!teamId.trim()) throw new Error("teamId가 필요합니다.");
  if (cleaned.length === 0) {
    return {
      successCount: 0,
      failCount: 0,
      failedNames: [],
      skippedDbDuplicateCount: 0,
      dbDuplicateWarnings: [],
    };
  }

  const target = members.filter((m) => cleaned.includes(cleanName(m.displayName)));
  const checkDbDupes = options?.checkExistingTeamPhoneDuplicates !== false;
  const existingPhoneToDisplayName = checkDbDupes
    ? await fetchExistingTeamMemberPhoneToDisplayNameMap(teamId)
    : undefined;
  const { valid: validTarget, preFailures, dbDuplicateWarnings } = partitionBulkMembersForWrite(
    target,
    options,
    existingPhoneToDisplayName
  );

  if (validTarget.length === 0) {
    if (preFailures.length > 0) {
      throw new BulkTeamMemberAddError({ failures: preFailures, successCount: 0 });
    }
    return {
      successCount: 0,
      failCount: 0,
      failedNames: [],
      skippedDbDuplicateCount: dbDuplicateWarnings.length,
      dbDuplicateWarnings,
    };
  }

  const settled = await Promise.allSettled(
    validTarget.map(async (member) => {
      await createDirectTeamMember(teamId, {
        displayName: member.displayName,
        phone: member.phone,
        jerseyNumber: member.jerseyNumber,
        birthYear: member.birthYear,
        uniformSize: member.uniformSize,
        position: member.position,
        roleDetail: member.roleDetail,
        role: member.role,
      });
      return cleanName(member.displayName);
    })
  );
  const writeFailures: BulkMemberWriteFailure[] = [];
  settled.forEach((result, idx) => {
    if (result.status === "rejected") {
      const name = cleanName(validTarget[idx]?.displayName ?? "알 수 없음");
      const reasonObj = result.reason;
      const msg =
        (reasonObj as { message?: string } | undefined)?.message ??
        (reasonObj instanceof Error ? reasonObj.message : String(reasonObj));
      const cat = categorizeBulkMemberWriteError(reasonObj);
      writeFailures.push({
        displayName: name,
        reason: cat,
        detail: msg.slice(0, 240),
      });
      console.error("[teamMemberService] 일괄 추가 1건 rejected (Promise.allSettled)", {
        teamId,
        displayName: name,
        reason: cat,
        code: (reasonObj as { code?: string }).code,
        message: msg,
        reasonObj,
      });
    }
  });
  const successCount = settled.filter((s) => s.status === "fulfilled").length;
  const allFailures = [...preFailures, ...writeFailures];
  const failCount = allFailures.length;
  if (failCount > 0) {
    console.error(`[teamMemberService] 멤버 일괄 추가 실패 ${failCount}건 (선검증 ${preFailures.length}, 쓰기 ${writeFailures.length})`, {
      teamId,
      failures: allFailures.slice(0, 50),
    });
    throw new BulkTeamMemberAddError({ failures: allFailures, successCount });
  }
  const allowDup = options?.allowDuplicatePhones === true;
  return {
    successCount,
    failCount: 0,
    failedNames: [],
    skippedDbDuplicateCount: allowDup ? 0 : dbDuplicateWarnings.length,
    dbDuplicateWarnings: allowDup ? [] : dbDuplicateWarnings,
  };
}

export async function updateTeamMemberProfile(input: UpdateTeamMemberProfileInput): Promise<void> {
  const teamId = input.teamId.trim();
  const memberId = input.memberId.trim();
  if (!teamId) throw new Error("teamId가 필요합니다.");
  if (!memberId) throw new Error("memberId가 필요합니다.");

  const jerseyNumber =
    input.jerseyNumber == null ? null : cleanJerseyNumber(input.jerseyNumber) ?? null;
  const birthYear =
    input.birthYear == null ? null : cleanBirthYear(input.birthYear) ?? null;
  const uniformSize =
    input.uniformSize == null ? null : cleanUniformSize(input.uniformSize) ?? null;
  const position =
    input.position == null ? "" : cleanPosition(input.position) ?? "";
  const roleDetail =
    input.roleDetail == null ? "" : cleanRoleDetail(input.roleDetail) ?? "";

  const updateData: Record<string, unknown> = {
    jerseyNumber,
    birthYear,
    uniformSize,
    position,
    roleDetail,
    updatedAt: serverTimestamp(),
  };
  const withoutUndefined = Object.fromEntries(
    Object.entries(updateData).filter(([, v]) => v !== undefined)
  ) as Record<string, unknown>;

  if (input.duesType !== undefined) {
    withoutUndefined.duesType = input.duesType;
    // 레거시 `teamRules` / 기존 데이터 호환
    withoutUndefined.feePlan = input.duesType === "yearly" ? "annual" : input.duesType;
  }
  if (input.yearlyPaidAt !== undefined) {
    if (input.yearlyPaidAt === null) {
      withoutUndefined.yearlyPaidAt = null;
      withoutUndefined.annualPaidAt = null;
    } else if (input.yearlyPaidAt instanceof Timestamp) {
      withoutUndefined.yearlyPaidAt = input.yearlyPaidAt;
      withoutUndefined.annualPaidAt = input.yearlyPaidAt;
    } else {
      const ts = Timestamp.fromDate(input.yearlyPaidAt as Date);
      withoutUndefined.yearlyPaidAt = ts;
      withoutUndefined.annualPaidAt = ts;
    }
  }
  if (input.annualPaid !== undefined) withoutUndefined.annualPaid = input.annualPaid;
  if (input.annualBatchId !== undefined) withoutUndefined.annualBatchId = input.annualBatchId;
  if (input.annualAmount !== undefined) withoutUndefined.annualAmount = input.annualAmount;
  if (input.annualBaseAmount !== undefined) withoutUndefined.annualBaseAmount = input.annualBaseAmount;
  if (input.annualDiscountAmount !== undefined) withoutUndefined.annualDiscountAmount = input.annualDiscountAmount;
  if (input.annualFinalAmount !== undefined) withoutUndefined.annualFinalAmount = input.annualFinalAmount;
  if (input.annualDiscountMonths !== undefined) withoutUndefined.annualDiscountMonths = input.annualDiscountMonths;
  if (input.annualDiscountType !== undefined) withoutUndefined.annualDiscountType = input.annualDiscountType;
  if (input.annualDiscountLabel !== undefined) withoutUndefined.annualDiscountLabel = input.annualDiscountLabel;
  if (input.annualOverride !== undefined) withoutUndefined.annualOverride = input.annualOverride;
  if (input.feeType !== undefined) withoutUndefined.feeType = input.feeType;
  if (input.discountAmount !== undefined) withoutUndefined.discountAmount = input.discountAmount;
  if (input.discountLabel !== undefined) withoutUndefined.discountLabel = input.discountLabel;

  const sotRef = doc(db, "teams", teamId, "members", memberId);
  const mirrorRef = doc(db, "team_members", `${teamId}_${memberId}`);
  const withTimeout = async <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} 요청이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.`)), ms);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  await withTimeout(updateDoc(sotRef, withoutUndefined), 15000, "팀원 정보 저장");

  const mirrorResult = await Promise.allSettled([
    withTimeout(updateDoc(mirrorRef, withoutUndefined), 10000, "팀원 미러 저장"),
  ]);
  if (mirrorResult[0]?.status === "rejected") {
    console.warn("[teamMemberService] team_members 미러 업데이트 실패(무시)", {
      teamId,
      memberId,
      reason: mirrorResult[0].reason,
    });
  }
}

export async function deleteTeamMember(teamId: string, memberId: string): Promise<void> {
  const normalizedTeamId = teamId.trim();
  const normalizedMemberId = memberId.trim();
  if (!normalizedTeamId) throw new Error("teamId가 필요합니다.");
  if (!normalizedMemberId) throw new Error("memberId가 필요합니다.");

  const sotRef = doc(db, "teams", normalizedTeamId, "members", normalizedMemberId);
  const mirrorRef = doc(db, "team_members", `${normalizedTeamId}_${normalizedMemberId}`);

  await deleteDoc(sotRef);
  const mirrorResult = await Promise.allSettled([deleteDoc(mirrorRef)]);
  if (mirrorResult[0]?.status === "rejected") {
    console.warn("[teamMemberService] team_members 미러 삭제 실패(무시)", {
      teamId: normalizedTeamId,
      memberId: normalizedMemberId,
      reason: mirrorResult[0].reason,
    });
  }
}
