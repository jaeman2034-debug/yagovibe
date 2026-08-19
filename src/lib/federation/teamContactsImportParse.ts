/**
 * Federation contact roster parser.
 * - Track B simple CSV/xlsx: 팀명,회장,회장전화,...
 * - Official Nowon-style: title row + 2-row headers (회장/성명·연락처) + merged cells
 */

import { normalizePhoneDigits } from "@/utils/phone";

export type TeamContactImportRow = {
  teamName: string;
  chairman: { name: string; phone: string };
  manager: { name: string; phone: string };
  coach: { name: string; phone: string };
  /** Sheets SoT — preferred when present */
  platformTeamId?: string;
  note?: string;
};

/** SheetJS-compatible merge range (0-based). */
export type SheetMergeRange = {
  s: { r: number; c: number };
  e: { r: number; c: number };
};

function cell(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  const entries = Object.entries(row);
  for (const want of keys) {
    const w = want.replace(/\s/g, "").toLowerCase();
    for (const [k, v] of entries) {
      if (String(k).replace(/\s/g, "").toLowerCase() === w && v != null && String(v).trim()) {
        return String(v).trim();
      }
    }
  }
  return "";
}

function normTeamName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/축구회$/g, "")
    .replace(/축구클럽$/g, "")
    .replace(/footballclub$/gi, "")
    .replace(/클럽$/g, "")
    .replace(/fc$/gi, "")
    .replace(/풋살$/g, "")
    .replace(/풋볼$/g, "");
}

export function normalizeTeamNameKey(name: string): string {
  return normTeamName(name);
}

function cellText(v: unknown): string {
  if (v == null) return "";
  return String(v).replace(/\s+/g, " ").trim();
}

function compact(s: string): string {
  return s.replace(/\s/g, "").toLowerCase();
}

/** Fill SheetJS merged ranges so every cell in a merge holds the top-left value. */
export function applySheetMerges(
  matrix: unknown[][],
  merges?: SheetMergeRange[] | null
): string[][] {
  const maxR = Math.max(
    matrix.length,
    ...(merges || []).map((m) => m.e.r + 1)
  );
  let maxC = 0;
  for (const row of matrix) {
    if (Array.isArray(row)) maxC = Math.max(maxC, row.length);
  }
  for (const m of merges || []) {
    maxC = Math.max(maxC, m.e.c + 1);
  }

  const out: string[][] = [];
  for (let r = 0; r < maxR; r++) {
    const src = matrix[r] || [];
    const line: string[] = [];
    for (let c = 0; c < maxC; c++) {
      line.push(cellText(src[c]));
    }
    out.push(line);
  }

  for (const m of merges || []) {
    const v = out[m.s.r]?.[m.s.c] ?? "";
    if (!v) continue;
    for (let r = m.s.r; r <= m.e.r; r++) {
      for (let c = m.s.c; c <= m.e.c; c++) {
        if (!out[r][c]) out[r][c] = v;
      }
    }
  }
  return out;
}

/** Horizontal forward-fill for role group headers (회장 spanning 성명+연락처). */
export function forwardFillRow(row: string[]): string[] {
  const out = [...row];
  let last = "";
  for (let i = 0; i < out.length; i++) {
    const v = out[i];
    if (v) last = v;
    else if (last) out[i] = last;
  }
  return out;
}

function isTitleRow(row: string[]): boolean {
  const joined = row.map(cellText).filter(Boolean).join(" ");
  if (!joined) return true;
  const c = compact(joined);
  // Official title examples
  if (c.includes("임원연락처") || c.includes("연락처명부")) return true;
  if (c.includes("축구협회") && c.includes("연락처")) return true;
  if (c.includes("단위축구회") && c.includes("연락처")) return true;
  // Single long title cell, no role columns
  const nonEmpty = row.filter((x) => cellText(x));
  if (nonEmpty.length <= 2 && joined.length >= 12 && !c.includes("회장") && !c.includes("총무")) {
    if (c.includes("연락처") || c.includes("명단") || c.includes("임원")) return true;
  }
  return false;
}

function looksLikeSimpleHeader(row: string[]): boolean {
  const keys = new Set(row.map((x) => compact(x)).filter(Boolean));
  const hasTeam =
    keys.has("팀명") ||
    keys.has("팀") ||
    keys.has("클럽") ||
    keys.has("클럽명") ||
    keys.has("축구회") ||
    keys.has("team") ||
    keys.has("teamname");
  const hasRole =
    keys.has("회장") ||
    keys.has("회장전화") ||
    keys.has("총무") ||
    keys.has("감독") ||
    keys.has("chairman");
  return hasTeam && hasRole;
}

function looksLikeRoleGroupHeader(row: string[]): boolean {
  const keys = row.map((x) => compact(x));
  const hasClub = keys.some((k) => k === "축구회" || k === "팀명" || k === "클럽");
  const hasChair = keys.some((k) => k === "회장");
  const hasMgr = keys.some((k) => k === "총무");
  const hasCoach = keys.some((k) => k === "감독");
  return hasClub && (hasChair || hasMgr || hasCoach);
}

function looksLikeSubHeader(row: string[]): boolean {
  const keys = row.map((x) => compact(x));
  const nameCount = keys.filter((k) => k === "성명" || k === "이름" || k === "name").length;
  const phoneCount = keys.filter(
    (k) => k === "연락처" || k === "전화" || k === "휴대폰" || k === "전화번호" || k === "phone"
  ).length;
  return nameCount >= 1 && phoneCount >= 1;
}

/**
 * Combine parent (role) + child (성명/연락처) into flat logical headers.
 * 회장+성명→회장, 회장+연락처→회장전화, 축구회→팀명
 */
export function combineDualHeaders(groupRow: string[], subRow: string[]): string[] {
  const groups = forwardFillRow(groupRow.map(cellText));
  const subs = subRow.map(cellText);
  const width = Math.max(groups.length, subs.length);
  const headers: string[] = [];

  for (let c = 0; c < width; c++) {
    const g = compact(groups[c] || "");
    const s = compact(subs[c] || "");

    if (g === "축구회" || g === "팀명" || g === "클럽" || g === "클럽명" || s === "축구회") {
      headers.push("팀명");
      continue;
    }
    if (g === "순번" || g === "번호" || g === "no" || s === "순번" || s === "번호") {
      headers.push("");
      continue;
    }
    if (g === "비고" || s === "비고") {
      headers.push("비고");
      continue;
    }
    if (g === "platformteamid" || g === "플랫폼팀id") {
      headers.push("PlatformTeamId");
      continue;
    }

    const isName = s === "성명" || s === "이름" || s === "name" || s === "";
    const isPhone =
      s === "연락처" || s === "전화" || s === "휴대폰" || s === "전화번호" || s === "phone";

    if (g === "회장" || g === "chairman") {
      if (isPhone) headers.push("회장전화");
      else if (isName || s === "성명") headers.push("회장");
      else headers.push("회장");
      continue;
    }
    if (g === "총무" || g === "manager") {
      if (isPhone) headers.push("총무전화");
      else headers.push("총무");
      continue;
    }
    if (g === "감독" || g === "coach" || g === "코치") {
      if (isPhone) headers.push("감독전화");
      else headers.push("감독");
      continue;
    }

    // Fallback: already-flat header in group or sub
    const flat = groups[c] || subs[c] || "";
    headers.push(flat);
  }

  return headers;
}

function rowToObject(headers: string[], line: unknown[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  let any = false;
  for (let c = 0; c < headers.length; c++) {
    const key = headers[c];
    if (!key) continue;
    const val = line[c];
    const text = cellText(val);
    if (text) any = true;
    // Prefer first non-empty if duplicate logical keys (rare)
    if (obj[key] == null || !cellText(obj[key])) obj[key] = val;
  }
  return any ? obj : {};
}

/** Convert sheet.js AOA (first row = simple header) into objects. */
export function sheetRowsToObjects(
  matrix: unknown[][]
): Array<Record<string, unknown>> {
  if (!Array.isArray(matrix) || matrix.length < 2) return [];
  const header = (matrix[0] || []).map((h) => cellText(h));
  const objects: Array<Record<string, unknown>> = [];
  for (let i = 1; i < matrix.length; i++) {
    const obj = rowToObject(header, matrix[i] || []);
    if (Object.keys(obj).length > 0) objects.push(obj);
  }
  return objects;
}

/**
 * Detect official dual-header layout and return objects, or null to use simple path.
 * Title rows skipped; data starts after the sub-header row.
 */
export function sheetRowsToObjectsDualHeader(
  matrix: string[][]
): Array<Record<string, unknown>> | null {
  if (!Array.isArray(matrix) || matrix.length < 3) return null;

  let i = 0;
  while (i < matrix.length && isTitleRow(matrix[i])) i += 1;
  if (i >= matrix.length - 1) return null;

  // Prefer: role-group row followed by 성명/연락처 sub-header
  for (let r = i; r < Math.min(i + 5, matrix.length - 1); r++) {
    const group = matrix[r] || [];
    const sub = matrix[r + 1] || [];
    if (looksLikeRoleGroupHeader(group) && looksLikeSubHeader(sub)) {
      const headers = combineDualHeaders(group, sub);
      const objects: Array<Record<string, unknown>> = [];
      for (let d = r + 2; d < matrix.length; d++) {
        const obj = rowToObject(headers, matrix[d] || []);
        if (Object.keys(obj).length > 0) objects.push(obj);
      }
      return objects;
    }
  }

  return null;
}

/** Convert AOA (with optional merges) → row objects (dual-header or simple). */
export function matrixToContactObjects(
  matrix: unknown[][],
  merges?: SheetMergeRange[] | null
): Array<Record<string, unknown>> {
  const filled = applySheetMerges(matrix, merges);
  const dual = sheetRowsToObjectsDualHeader(filled);
  if (dual) return dual;

  // Skip leading title rows for simple headers too
  let start = 0;
  while (start < filled.length && isTitleRow(filled[start]) && !looksLikeSimpleHeader(filled[start])) {
    start += 1;
  }
  const sliced = filled.slice(start);
  if (sliced.length >= 2 && looksLikeSimpleHeader(sliced[0])) {
    return sheetRowsToObjects(sliced);
  }
  return sheetRowsToObjects(filled);
}

/** Convert sheet objects into import rows. */
export function parseTeamContactImportRows(
  rows: Array<Record<string, unknown>>
): TeamContactImportRow[] {
  const out: TeamContactImportRow[] = [];
  for (const raw of rows) {
    const teamName = cell(raw, [
      "팀명",
      "팀",
      "클럽",
      "클럽명",
      "축구회",
      "단위축구회",
      "team",
      "teamName",
      "name",
    ]);
    if (!teamName) continue;
    // Skip leftover header-like rows
    if (compact(teamName) === "축구회" || compact(teamName) === "팀명") continue;

    const chairmanName = cell(raw, ["회장", "회장명", "chairman", "chairmanName"]);
    const chairmanPhone = normalizePhoneDigits(
      cell(raw, ["회장전화", "회장 연락처", "회장휴대폰", "chairmanPhone", "회장번호"])
    );
    const managerName = cell(raw, ["총무", "총무명", "manager", "managerName"]);
    const managerPhone = normalizePhoneDigits(
      cell(raw, ["총무전화", "총무 연락처", "총무휴대폰", "managerPhone", "총무번호"])
    );
    const coachName = cell(raw, ["감독", "감독명", "coach", "coachName"]);
    const coachPhone = normalizePhoneDigits(
      cell(raw, ["감독전화", "감독 연락처", "감독휴대폰", "coachPhone", "감독번호"])
    );
    const platformTeamId = cell(raw, [
      "PlatformTeamId",
      "platformTeamId",
      "플랫폼팀ID",
      "teamId",
    ]);
    const note = cell(raw, ["비고", "note", "memo"]);

    if (
      !chairmanName &&
      !managerName &&
      !coachName &&
      !chairmanPhone &&
      !managerPhone &&
      !coachPhone
    ) {
      continue;
    }

    out.push({
      teamName,
      chairman: { name: chairmanName, phone: chairmanPhone },
      manager: { name: managerName, phone: managerPhone },
      coach: { name: coachName, phone: coachPhone },
      ...(platformTeamId ? { platformTeamId } : {}),
      ...(note ? { note } : {}),
    });
  }
  return out;
}

/** Full matrix → import rows (official dual-header + simple CSV). */
export function parseContactRosterMatrix(
  matrix: unknown[][],
  merges?: SheetMergeRange[] | null
): TeamContactImportRow[] {
  return parseTeamContactImportRows(matrixToContactObjects(matrix, merges));
}
