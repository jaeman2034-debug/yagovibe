/**
 * 팀 멤버 일괄·직접 추가 시 동일 인물 중복 문서 방지용 키·인덱스.
 * — 전화는 숫자만 정규화해 비교
 * — 전화 키 불일치 시에도 표시 이름이 유일하면 병합 후보로 처리(resolveExistingMemberIdForBulkRow)
 */

export function digitsOnlyPhone(raw?: string): string {
  return String(raw ?? "").replace(/\D/g, "");
}

export function normalizeMemberNameForDedupe(name: string): string {
  return String(name || "").trim().toLowerCase();
}

/** 직접 추가·파일 일괄·기존 스냅샷이 동일 규칙으로 키를 맞추도록 고정 */
export function buildTeamMemberImportKey(
  teamId: string,
  name: string,
  phoneRaw?: string,
  birth?: string
): string {
  const tid = String(teamId || "").trim();
  const normalizedName = normalizeMemberNameForDedupe(name);
  const digits = digitsOnlyPhone(phoneRaw);
  const birthValue = String(birth ?? "").trim();

  if (digits.length >= 8) {
    return `${tid}|${digits}`;
  }
  if (digits.length >= 4) {
    return `${tid}|${digits}`;
  }
  if (birthValue) {
    return `${tid}|${normalizedName}|${birthValue}`;
  }
  return `${tid}|${normalizedName}`;
}

export type ExistingMemberImportIndex = {
  byImportKey: Map<string, { id: string; data: Record<string, unknown> }>;
  byNormalizedName: Map<string, Array<{ id: string; data: Record<string, unknown> }>>;
};

export function indexExistingMembersForImport(
  teamId: string,
  entries: Array<{ id: string; data: Record<string, unknown> }>
): ExistingMemberImportIndex {
  const byImportKey = new Map<string, { id: string; data: Record<string, unknown> }>();
  const byNormalizedName = new Map<string, Array<{ id: string; data: Record<string, unknown> }>>();

  for (const { id, data } of entries) {
    const status = String(data.status ?? "active");
    if (status !== "active") continue;
    if (data.isDeleted === true) continue;

    const name = String(data.name || "").trim();
    if (!name) continue;

    const key = buildTeamMemberImportKey(teamId, name, String(data.phone ?? ""), String(data.birth ?? ""));
    if (!byImportKey.has(key)) {
      byImportKey.set(key, { id, data });
    }

    const nn = normalizeMemberNameForDedupe(name);
    const arr = byNormalizedName.get(nn) ?? [];
    arr.push({ id, data });
    byNormalizedName.set(nn, arr);
  }

  return { byImportKey, byNormalizedName };
}

/**
 * 파일 행이 기존 문서와 같은 사람인 경우 docId 반환.
 * — 기본은 import 키 일치
 * — 키가 다르고 동명 활성 회원이 정확히 1명이면, 전화 충돌이 없을 때 병합(update)
 */
export function resolveExistingMemberIdForBulkRow(
  teamId: string,
  row: { name: string; phone?: string | null; birth?: string | null },
  index: ExistingMemberImportIndex
): string | null {
  const primaryKey = buildTeamMemberImportKey(
    teamId,
    row.name,
    String(row.phone ?? ""),
    String(row.birth ?? "")
  );
  const direct = index.byImportKey.get(primaryKey);
  if (direct) return direct.id;

  const nn = normalizeMemberNameForDedupe(row.name);
  const candidates = index.byNormalizedName.get(nn) ?? [];
  if (candidates.length !== 1) return null;

  const incomingDigits = digitsOnlyPhone(String(row.phone ?? ""));
  const { id, data } = candidates[0];
  const existingDigits = digitsOnlyPhone(String(data.phone ?? ""));

  if (
    incomingDigits.length >= 8 &&
    existingDigits.length >= 8 &&
    incomingDigits !== existingDigits
  ) {
    return null;
  }
  if (!incomingDigits || !existingDigits) {
    return id;
  }
  if (incomingDigits === existingDigits) {
    return id;
  }
  return null;
}

export type DuplicateNameGroup = {
  normalizedName: string;
  displayName: string;
  memberIds: string[];
};

/** 활성·미삭제 회원 중 표시 이름(정규화)이 겹치는 그룹 — 운영 화면 경고용 */
export function findActiveMemberDuplicateNameGroups(
  entries: Array<{ id: string; name: string; status?: string; isDeleted?: boolean }>
): DuplicateNameGroup[] {
  const map = new Map<string, string[]>();
  const display = new Map<string, string>();
  for (const e of entries) {
    if (e.isDeleted) continue;
    if (e.status && e.status !== "active") continue;
    const nn = normalizeMemberNameForDedupe(e.name);
    if (!nn) continue;
    const arr = map.get(nn) ?? [];
    arr.push(e.id);
    map.set(nn, arr);
    if (!display.has(nn)) display.set(nn, String(e.name || "").trim() || nn);
  }
  const out: DuplicateNameGroup[] = [];
  for (const [nn, ids] of map.entries()) {
    if (ids.length > 1) {
      out.push({ normalizedName: nn, displayName: display.get(nn) ?? nn, memberIds: ids });
    }
  }
  out.sort((a, b) => a.displayName.localeCompare(b.displayName, "ko"));
  return out;
}
