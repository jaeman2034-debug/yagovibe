import { extractTextFromPdfWithMeta } from "@/lib/extractDocumentText";
import { formatPhoneDigitsForDisplay, normalizePhoneDigits } from "@/utils/phone";
import type { ParsedBulkMemberInput, TeamMemberRole } from "@/services/teamMemberService";

export type ParsedPdfMemberRow = {
  id: string;
  rawLine: string;
  name: string;
  role: TeamMemberRole;
  phone?: string;
  position?: string;
  valid: boolean;
  reason?: string;
  duplicate: boolean;
  isRoleGuessed: boolean;
};

/** 미매칭 줄 reason 접두사 — 집계·대시보드용 (`unknown_format:붙어쓰기` 등) */
export const PDF_UNKNOWN_FORMAT_PREFIX = "unknown_format";

export function isPdfUnknownFormatReason(reason?: string): boolean {
  return !!reason && reason.startsWith(PDF_UNKNOWN_FORMAT_PREFIX);
}

/** `unknown_format:붙어쓰기` → `붙어쓰기` (이벤트 `unknownReasonTails`·BQ UNNEST 집계용) */
export function getPdfUnknownFormatTail(reason?: string): string | null {
  if (!isPdfUnknownFormatReason(reason) || !reason) return null;
  const idx = reason.indexOf(":");
  if (idx === -1) return "기타";
  const tail = reason.slice(idx + 1).trim();
  return tail || "기타";
}

/**
 * 이벤트·로그용: 전화 마스킹 + 길이 제한 (PII·노이즈 완화)
 */
export function sanitizePdfUnknownSample(line: string): string {
  return line
    .replace(/01[0-9]-?\d{3,4}-?\d{4}/g, "[PHONE]")
    .replace(/01[0-9]{8,9}/g, "[PHONE]")
    .slice(0, 50);
}

/** PDF에 나오는 한글 직위 → 앱 enum (정규화 레이어) */
const ROLE_KOREAN_TO_ENUM: Record<string, TeamMemberRole> = {
  회장: "owner",
  팀장: "owner",
  동호회장: "owner",
  부회장: "manager",
  부팀장: "manager",
  총무: "manager",
  부총무: "manager",
  매니저: "manager",
  간사: "staff",
  코치: "staff",
  감독: "staff",
  감사: "staff",
  주장: "member",
  회원: "member",
  팀원: "member",
};

/** 직위 토큰 길이 내림차순 (부회장 vs 회장 충돌 방지) */
const ROLE_TOKENS_DESC = Object.keys(ROLE_KOREAN_TO_ENUM).sort((a, b) => b.length - a.length);

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * v2 패턴에 안 걸린 줄을 휴리스틱으로 분류 (v3 우선순위·대시보드용).
 * 순서: 붙어쓰기 → 역할뒤붙음 → 특수문자 → 순서뒤바뀜 → 기타
 */
export function classifyUnknownPdfLine(normalizedLine: string): string {
  const line = normalizedLine.trim();
  if (!line) return `${PDF_UNKNOWN_FORMAT_PREFIX}:기타`;

  for (const role of ROLE_TOKENS_DESC) {
    const reFront = new RegExp(`${escapeRegExp(role)}[가-힣]`);
    if (reFront.test(line)) {
      return `${PDF_UNKNOWN_FORMAT_PREFIX}:붙어쓰기`;
    }
  }
  for (const role of ROLE_TOKENS_DESC) {
    const reBack = new RegExp(`[가-힣]+${escapeRegExp(role)}$`);
    if (reBack.test(line)) {
      return `${PDF_UNKNOWN_FORMAT_PREFIX}:역할뒤붙음`;
    }
  }
  // 영문·라틴(포지션 약어 등)은 괄호 줄에서 흔함 — 여기서 특수문자로 보면 원인 분류가 틀어짐
  if (/[^가-힣0-9\s:()\-·|\p{Script=Latin}]/u.test(line)) {
    return `${PDF_UNKNOWN_FORMAT_PREFIX}:특수문자`;
  }

  const phoneTail = line.match(/^(.*?)(01[0-9]-?\d{3,4}-?\d{4})\s*$/);
  if (phoneTail) {
    const before = phoneTail[1].trim();
    const parts = before.split(/\s+/).filter(Boolean);
    if (parts.length === 2) {
      const [a, b] = parts;
      if (/^[가-힣]{1,5}$/.test(a) && ROLE_KOREAN_TO_ENUM[b]) {
        return `${PDF_UNKNOWN_FORMAT_PREFIX}:순서뒤바뀜`;
      }
    }
  }

  return `${PDF_UNKNOWN_FORMAT_PREFIX}:기타`;
}

/** 전화번호: 숫자만 (저장·검증용) — `normalizePhoneDigits`와 동일 */
export function normalizePdfPhoneDigits(phone?: string | null): string {
  return normalizePhoneDigits(phone);
}

/**
 * PDF 미리보기·표시용: 숫자만 → 휴대폰/로컬(7~8자리) 하이픈.
 */
export function formatPdfPhoneDisplay(phone?: string | null): string {
  return formatPhoneDigitsForDisplay(phone);
}

/**
 * 표시용 하이픈 (010-1234-5678, 로컬 9914-0121). 빈 값이면 null.
 */
export function normalizePdfPhoneDisplay(phone?: string | null): string | null {
  const s = formatPdfPhoneDisplay(phone);
  return s || null;
}

function resolveRoleKorean(roleKorean: string): { role: TeamMemberRole; isRoleGuessed: boolean } {
  const key = roleKorean.trim();
  const mapped = ROLE_KOREAN_TO_ENUM[key];
  if (mapped) return { role: mapped, isRoleGuessed: false };
  return { role: "member", isRoleGuessed: true };
}

function normalizeKoreanName(raw: string): string {
  return raw.replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();
}

/** 전화 탐지·추출용: 공백·전각 숫자·유니코드 하이픈 정리 (금액 전처리는 하지 않음) */
function normalizeLineForTelScan(s: string): string {
  if (!s.trim()) return "";
  return s
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-")
    .replace(/[\uFF10-\uFF19]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xff10 + 0x30))
    .trim();
}

function extractPhoneFromLine(rawLine: string): string {
  const t = normalizeLineForTelScan(rawLine);
  const m = t.match(/01[0-9](?:[\s\-]?\d){8,10}/);
  if (!m) return "";
  return normalizePdfPhoneDigits(m[0]);
}

/**
 * 정확도 높은 순: 전화 포함 → 괄호 → 콜론 → 구분자 → 역할+이름(+선택 전화)
 * 이름: 한글 1~5자 (실전 변형 대응)
 */
const LINE_PATTERNS: RegExp[] = [
  // E: 역할 이름 전화 (끝 고정)
  /^(?<role>[가-힣]+)\s+(?<name>[가-힣]{1,5})\s+(?<phone>01[0-9]-?\d{3,4}-?\d{4})\s*$/,
  // B-en: 이름(영문·포지션) — pdf.js가 ` ( G K ) ` 처럼 공백을 넣는 경우 대비 \s* 허용, 역할은 A-Za-z 1~6
  /^(?<name>[가-힣]{1,5})\s*\(\s*(?<role>[A-Za-z]{1,6})\s*\).*$/,
  // B+F: 이름(역할) [선택 전화]
  /^(?<name>[가-힣]{1,5})\s*\((?<role>[가-힣]+)\)(?:\s+(?<phone>01[0-9]-?\d{3,4}-?\d{4}))?\s*$/,
  // D: 역할: 이름 [선택 전화]
  /^(?<role>[가-힣]+)\s*:\s*(?<name>[가-힣]{1,5})(?:\s+(?<phone>01[0-9]-?\d{3,4}-?\d{4}))?\s*$/,
  // C: 이름 -|· 역할 [선택 전화]
  /^(?<name>[가-힣]{1,5})\s*[-|·]\s*(?<role>[가-힣]+)(?:\s+(?<phone>01[0-9]-?\d{3,4}-?\d{4}))?\s*$/,
  // A+E 느슨: 역할 이름 [선택 전화]
  /^(?<role>[가-힣]+)\s+(?<name>[가-힣]{1,5})(?:\s+(?<phone>01[0-9]-?\d{3,4}-?\d{4}))?\s*$/,
];

type NamedGroups = { name?: string; role?: string; phone?: string };

/**
 * 금액·단위(10만, 6만5천 등)는 표/회비 명단에 흔해 패턴 매칭·특수문자 분류를 깨므로 제거.
 * 전화번호(01x…)는 숫자+만 형태가 아니어 건드리지 않음.
 */
function preprocessPdfMemberLine(line: string): string {
  let s = normalizeLineForTelScan(line);
  // pdf.js 텍스트 런 경계로 "( G K )" 형태가 나오면 B-en이 깨짐 → 괄호 안·직전 공백 정리
  s = s.replace(/\(\s+/g, "(").replace(/\s+\)/g, ")");
  for (let k = 0; k < 6; k++) {
    s = s.replace(/(\(\s*[A-Za-z]+)\s+([A-Za-z])/g, "$1$2");
  }
  s = s.replace(/\d+만\d*천/g, "");
  s = s.replace(/\d+만/g, "");
  s = s.replace(/\d+천/g, "");
  s = s.replace(/\d+원/g, "");
  return s.replace(/\s+/g, " ").trim();
}

/** LINE_PATTERNS에 안 걸릴 때만: `이름(영문)` 꼴만 느슨히 복구 */
function tryParenEnglishFallback(normalizedLine: string): NamedGroups | null {
  const m = normalizedLine.match(/^([가-힣]{1,5})\s*\(\s*([A-Za-z]{1,6})\s*\)/);
  if (!m?.[1] || !m[2]) return null;
  return { name: m[1].trim(), role: m[2].replace(/\s+/g, "").trim() };
}

function matchStructuredLine(normalizedLine: string): { groups: NamedGroups; patternIndex: number } | null {
  for (let i = 0; i < LINE_PATTERNS.length; i++) {
    const m = normalizedLine.match(LINE_PATTERNS[i]);
    const n = m?.groups?.name != null ? String(m.groups.name).trim() : "";
    const r = m?.groups?.role != null ? String(m.groups.role).trim() : "";
    if (n && r) {
      return {
        groups: { name: n, role: r.replace(/\s+/g, ""), phone: m.groups?.phone as string | undefined },
        patternIndex: i,
      };
    }
  }
  return null;
}

function parseLine(line: string, index: number): ParsedPdfMemberRow | null {
  const normalizedLine = preprocessPdfMemberLine(line);
  if (!normalizedLine) return null;

  const debugParse =
    import.meta.env.DEV ||
    (typeof window !== "undefined" && window.localStorage?.getItem("debug:pdfParse") === "1");
  if (debugParse) {
    console.debug("[pdfMemberParser] PARSE INPUT", { index, raw: line, normalized: normalizedLine });
  }

  let matchResult = matchStructuredLine(normalizedLine);
  if (!matchResult) {
    const fb = tryParenEnglishFallback(normalizedLine);
    if (fb) matchResult = { groups: fb, patternIndex: -1 };
  }

  if (debugParse) {
    console.debug("[pdfMemberParser] MATCH RESULT", {
      index,
      matched: !!matchResult,
      patternIndex: matchResult?.patternIndex,
      groups: matchResult?.groups,
    });
  }

  if (!matchResult) {
    return {
      id: `pdf-${index}-${Math.random().toString(36).slice(2, 8)}`,
      rawLine: line,
      name: "",
      role: "member",
      phone: undefined,
      valid: false,
      reason: classifyUnknownPdfLine(normalizedLine),
      duplicate: false,
      isRoleGuessed: true,
    };
  }

  const { groups } = matchResult;
  let name = normalizeKoreanName(groups.name ?? "").trim();
  if (!name) {
    const head = normalizedLine.match(/^([가-힣]{1,5})\s*\(/);
    if (head?.[1]) name = normalizeKoreanName(head[1]).trim();
  }

  let phone = normalizePdfPhoneDigits(groups.phone);
  if (!phone) phone = extractPhoneFromLine(normalizedLine);

  const rawRoleToken = (groups.role ?? "").replace(/\s+/g, "");
  const inferredPosition = /^[A-Za-z]{1,6}$/.test(rawRoleToken) ? rawRoleToken.toUpperCase() : undefined;
  const { role, isRoleGuessed } = resolveRoleKorean(rawRoleToken);

  return {
    id: `pdf-${index}-${Math.random().toString(36).slice(2, 8)}`,
    rawLine: line,
    name,
    role,
    phone: phone || undefined,
    position: inferredPosition,
    valid: !!name,
    reason: name ? undefined : "이름을 찾지 못했습니다.",
    duplicate: false,
    isRoleGuessed,
  };
}

type PhoneSpan = { start: number; end: number };

/** 전체 텍스트에서 로컬·휴대폰 번호 구간을 모아, 각 번호 끝까지를 한 멤버 블록으로 자름 (줄바꿈으로 끊긴 `9914\\n-\\n0121` 대응) */
function collectPhoneSpans(t: string): PhoneSpan[] {
  const hits: PhoneSpan[] = [];
  let m: RegExpExecArray | null;
  const reLocal = /\d{3,4}\s*-\s*\d{4}/g;
  while ((m = reLocal.exec(t)) !== null) {
    hits.push({ start: m.index, end: m.index + m[0].length });
  }
  const re01 = /01[0-9](?:[\s\-]?\d){8,10}/g;
  while ((m = re01.exec(t)) !== null) {
    const d = normalizePdfPhoneDigits(m[0]);
    if (/^01[0-9]{8,9}$/.test(d)) hits.push({ start: m.index, end: m.index + m[0].length });
  }
  hits.sort((a, b) => a.start - b.start || a.end - b.end);
  return hits;
}

function splitIntoPhoneAnchorBlocks(merged: string): string[] {
  const t = normalizeLineForTelScan(merged.replace(/[\r\n]+/g, " "));
  if (!t) return [];
  const hits = collectPhoneSpans(t);
  if (hits.length === 0) return [];
  const blocks: string[] = [];
  let lastEnd = 0;
  for (const { end } of hits) {
    const block = t.slice(lastEnd, end).trim();
    if (block) blocks.push(block);
    lastEnd = end;
  }
  return blocks;
}

/** 표형 PDF: 전화·로컬 번호 줄까지 위 줄들을 한 블록으로 합침 */
function mergePdfLinesUntilPhoneAnchor(lines: string[]): string[] {
  const blocks: string[] = [];
  let buf = "";
  const hasTel = (s: string) => {
    const t = normalizeLineForTelScan(s);
    if (!t) return false;
    if (/01[0-9](?:[\s\-]?\d){8,10}/.test(t)) return true;
    if (/\d{3,4}\s*-\s*\d{4}/.test(t)) return true;
    return false;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const chunk = buf ? `${buf} ${line}` : line;
    if (hasTel(line) || hasTel(chunk)) {
      blocks.push(chunk.replace(/\s+/g, " ").trim());
      buf = "";
    } else if (buf.length > 320) {
      blocks.push(buf.trim());
      buf = line;
    } else {
      buf = chunk;
    }
  }
  if (buf.trim()) blocks.push(buf.trim());
  return blocks;
}

/** `황 원기 9914 - 0121` 등 공백으로 끊긴 이름 + 로컬 전화 꼴 보조 추출 */
function extractNameBeforeLocalPhone(norm: string): string | null {
  const spaced = norm.match(/([가-힣]+(?:\s+[가-힣]+)+)\s+\d{3,4}\s*-\s*\d{4}/);
  if (spaced?.[1]) {
    const n = normalizeKoreanName(spaced[1]).replace(/\s+/g, "").trim();
    if (n.length >= 2) return n;
  }
  const compact = norm.match(/([가-힣]{2,6})\s+\d{3,4}\s*-\s*\d{4}/);
  if (compact?.[1]) {
    const n = normalizeKoreanName(compact[1]).replace(/\s+/g, "").trim();
    if (n.length >= 2) return n;
  }
  return null;
}

/**
 * `수석회장 박 수복 2868 - 5723`, `황 원기 9914 - 0121` 등 전화·로컬 번호 꼬리 기준으로 이름 추출.
 * 휴대폰(01…)은 그대로, `xxxx-xxxx` 로컬은 숫자만 붙여 저장(예: 99140121) — UI·저장 후 수정 가능.
 */
function tryParsePhoneAnchoredMember(block: string, index: number): ParsedPdfMemberRow | null {
  const normalized = preprocessPdfMemberLine(block);
  if (!normalized) return null;

  let last01: { start: number; len: number; digits: string } | null = null;
  const re01 = /01[0-9](?:[\s\-]?\d){8,10}/g;
  let m: RegExpExecArray | null;
  while ((m = re01.exec(normalized)) !== null) {
    const d = normalizePdfPhoneDigits(m[0]);
    if (/^01[0-9]{8,9}$/.test(d)) last01 = { start: m.index, len: m[0].length, digits: d };
  }

  let lastLocal: { start: number; len: number } | null = null;
  const reLocal = /\d{3,4}\s*-\s*\d{4}/g;
  while ((m = reLocal.exec(normalized)) !== null) {
    lastLocal = { start: m.index, len: m[0].length };
  }

  let phoneDigits: string | undefined;
  let cut = -1;
  if (last01 && (!lastLocal || last01.start >= lastLocal.start)) {
    phoneDigits = last01.digits;
    cut = last01.start;
  } else if (lastLocal) {
    const rawLocal = normalized.slice(lastLocal.start, lastLocal.start + lastLocal.len);
    const loc = normalizePdfPhoneDigits(rawLocal);
    const isMobileLoc = /^01[0-9]{8,9}$/.test(loc);
    const isLocalLoc = /^\d{7,8}$/.test(loc) && !loc.startsWith("01");
    phoneDigits = isMobileLoc || isLocalLoc ? loc : undefined;
    cut = lastLocal.start;
  } else {
    return null;
  }

  let before = normalized.slice(0, cut);
  before = before
    .replace(/\(\s*\d+\s*\)/g, " ")
    .replace(/\b(?:19|20)\d{2}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!before) return null;

  const hang = before.match(/[가-힣]+/g) ?? [];
  if (hang.length === 0) return null;

  let name: string;
  let roleKorean: string;
  if (hang.length === 1) {
    name = hang[0];
    roleKorean = "";
  } else if (hang.length === 2) {
    // "황" + "원기" → 이름만 2토큰 (직위 아님)
    name = hang.join("");
    roleKorean = "";
  } else {
    // "수석회장" + "박" + "수복" → 앞은 직위, 뒤 두 덩어리는 이름
    name = hang.slice(-2).join("");
    roleKorean = hang.slice(0, -2).join(" ");
  }
  name = normalizeKoreanName(name).replace(/\s+/g, "").trim();
  if (name.length < 2) {
    const fb = extractNameBeforeLocalPhone(normalized);
    if (fb) name = fb;
  }
  if (name.length < 2) return null;

  const rk = roleKorean.trim();
  const { role, isRoleGuessed: roleGuessedFromMap } = resolveRoleKorean(rk);
  const isRoleGuessed = rk.length === 0 ? false : roleGuessedFromMap;

  return {
    id: `pdf-tel-${index}-${Math.random().toString(36).slice(2, 8)}`,
    rawLine: block,
    name,
    role,
    phone: phoneDigits,
    valid: true,
    reason: undefined,
    duplicate: false,
    isRoleGuessed,
  };
}

function pickPdfRowForBlock(block: string, index: number): ParsedPdfMemberRow | null {
  const primary = parseLine(block, index);
  const fb = tryParsePhoneAnchoredMember(block, index);

  if (primary?.name?.trim() && primary.name.trim().length >= 2) {
    const pDigits = (primary.phone || "").replace(/\D/g, "");
    if (pDigits.length >= 7) return primary;
    const fDigits = (fb?.phone || "").replace(/\D/g, "");
    if (fb?.phone && fDigits.length >= 7) {
      return { ...primary, phone: fb.phone };
    }
    return primary;
  }
  if (fb?.name?.trim() && fb.name.trim().length >= 2) return fb;
  return primary ?? null;
}

function markDuplicates(rows: ParsedPdfMemberRow[]): ParsedPdfMemberRow[] {
  const seen = new Map<string, number>();
  rows.forEach((row) => {
    const key = row.name.trim();
    if (!key) return;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  });
  return rows.map((row) => {
    const key = row.name.trim();
    const duplicate = !!key && (seen.get(key) ?? 0) > 1;
    return {
      ...row,
      duplicate,
      valid: row.valid && !duplicate,
      reason: duplicate ? "동일 이름이 중복되었습니다." : row.reason,
    };
  });
}

/** PDF 파싱 결과 → 팀 일괄 등록 API 입력 (유효·비중복 행만) */
export function pdfParsedRowsToBulkInputs(rows: ParsedPdfMemberRow[]): ParsedBulkMemberInput[] {
  const out: ParsedBulkMemberInput[] = [];
  const seenNames = new Set<string>();
  for (const r of rows) {
    if (!r.valid) continue;
    const displayName = r.name.trim();
    if (displayName.length < 2) continue;
    if (seenNames.has(displayName)) continue;
    seenNames.add(displayName);
    out.push({
      displayName,
      phone: r.phone,
      position: r.position,
      role: r.role,
    });
  }
  return out;
}

export async function parseMembersFromPdfFile(file: File): Promise<ParsedPdfMemberRow[]> {
  const { text, source: textSource } = await extractTextFromPdfWithMeta(await file.arrayBuffer());
  const rawLines = text
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);

  const mergedText = rawLines.join(" ");
  let mergedBlocks = splitIntoPhoneAnchorBlocks(mergedText);
  let blockSource: "phone_span" | "line_merge" = "phone_span";
  if (mergedBlocks.length === 0) {
    mergedBlocks = mergePdfLinesUntilPhoneAnchor(rawLines);
    blockSource = "line_merge";
  }
  const parsed = mergedBlocks
    .map((block, idx) => pickPdfRowForBlock(block, idx))
    .filter((row): row is ParsedPdfMemberRow => row !== null);

  if (parsed.length === 0) {
    const debugFull =
      import.meta.env.DEV ||
      (typeof window !== "undefined" && window.localStorage?.getItem("debug:pdfText") === "1");
    console.warn(
      "[pdfMemberParser] 멤버 행 0건 — 텍스트 레이어가 비었거나(스캔 PDF 등), 추출된 줄이 파서 형식에 맞지 않음",
      {
        textCharCount: text.length,
        nonemptyLineCount: rawLines.length,
        mergedBlockCount: mergedBlocks.length,
        blockSource,
        textPreview: text.slice(0, 500),
        textSource,
      }
    );
    if (debugFull) {
      console.info("[pdfMemberParser] PDF TEXT (DEV 또는 localStorage debug:pdfText=1)", text.slice(0, 2000));
    }
  }

  return markDuplicates(parsed);
}
