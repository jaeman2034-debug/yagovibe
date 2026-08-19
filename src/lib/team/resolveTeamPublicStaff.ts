import type { TeamPublicStaffMember } from "@/types/teamPublicStaff";
import { CLUB_PUBLIC_OFFICER_TITLE_OPTIONS } from "@/types/clubRole";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

/** 회장 인사말과 중복되지 않도록 클럽 운영진 목록에서 제외 */
export function isClubChairmanPublicStaffTitle(title: string): boolean {
  const t = title.replace(/\s+/g, "").trim();
  return t === "회장";
}

export type TeamPublicStaffRoleGroup = {
  /** 그룹 키 — 직책 표기 정규화 */
  roleKey: string;
  /** 카드 제목(직책) */
  roleLabel: string;
  members: TeamPublicStaffMember[];
};

function roleSortRank(label: string): number {
  const idx = (CLUB_PUBLIC_OFFICER_TITLE_OPTIONS as readonly string[]).indexOf(label);
  return idx >= 0 ? idx : 1000;
}

/**
 * 공개 운영진을 직책(title) 기준으로 그룹화.
 * - 회장 제외
 * - 빈 직책 그룹 없음
 * - 직책이 추가되어도 코드 수정 없이 카드 생성
 */
export function groupTeamPublicStaffByRole(
  staff: TeamPublicStaffMember[]
): TeamPublicStaffRoleGroup[] {
  const map = new Map<string, TeamPublicStaffRoleGroup>();

  for (const row of staff) {
    if (!row.visible) continue;
    const roleLabel = str(row.title);
    if (!roleLabel || isClubChairmanPublicStaffTitle(roleLabel)) continue;

    const roleKey = roleLabel.replace(/\s+/g, " ").toLowerCase();
    const existing = map.get(roleKey);
    if (existing) {
      existing.members.push(row);
    } else {
      map.set(roleKey, { roleKey, roleLabel, members: [row] });
    }
  }

  const groups = [...map.values()].map((g) => ({
    ...g,
    members: [...g.members].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "ko")),
  }));

  groups.sort((a, b) => {
    const minOrder = (g: TeamPublicStaffRoleGroup) =>
      g.members.reduce((m, x) => Math.min(m, x.order), Number.POSITIVE_INFINITY);
    const byPreset = roleSortRank(a.roleLabel) - roleSortRank(b.roleLabel);
    if (byPreset !== 0) return byPreset;
    const byOrder = minOrder(a) - minOrder(b);
    if (byOrder !== 0) return byOrder;
    return a.roleLabel.localeCompare(b.roleLabel, "ko");
  });

  return groups;
}

/** Firestore teams 문서에서 공개 운영진 배열 파싱(깨진 항목 스킵) */
export function getTeamPublicStaff(team: { aiProfile?: unknown } | null | undefined): TeamPublicStaffMember[] {
  if (!team?.aiProfile || typeof team.aiProfile !== "object" || Array.isArray(team.aiProfile)) return [];
  const p = team.aiProfile as Record<string, unknown>;
  const meta = p.meta;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return [];
  const metaRec = meta as { publicStaff?: unknown; teamPublicStaff?: unknown };
  const raw = Array.isArray(metaRec.publicStaff)
    ? metaRec.publicStaff
    : metaRec.teamPublicStaff;
  if (!Array.isArray(raw)) return [];

  const out: TeamPublicStaffMember[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const row = raw[i];
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const o = row as Record<string, unknown>;
    const id = str(o.id);
    const name = str(o.name);
    const title = str(o.title);
    if (!id || !name || !title) continue;
    out.push({
      id,
      name,
      title,
      intro: str(o.intro) || undefined,
      photoUrl: str(o.photoUrl) || undefined,
      visible: bool(o.visible, true),
      order: num(o.order, i * 10),
    });
  }
  return out.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

/** 방문자용 — visible만 */
export function getVisibleTeamPublicStaff(team: { aiProfile?: unknown } | null | undefined): TeamPublicStaffMember[] {
  return getTeamPublicStaff(team).filter((s) => s.visible);
}
