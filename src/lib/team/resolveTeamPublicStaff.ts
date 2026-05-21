import type { TeamPublicStaffMember } from "@/types/teamPublicStaff";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
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
