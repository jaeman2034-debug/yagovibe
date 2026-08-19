import type { ClubIntroProfile, ClubIntroStatus } from "@/types/clubIntroProfile";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function strArr(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v.map((x) => str(x)).filter(Boolean);
  return out.length ? out : undefined;
}

function parseStatus(v: unknown): ClubIntroStatus | null {
  if (v === "DRAFT" || v === "REVIEWED" || v === "PUBLISHED") return v;
  return null;
}

/**
 * teams/{platformTeamId}.aiProfile.meta.clubIntro 파싱.
 * 팀명 재매칭 없음 — 이미 platform 문서에 저장된 SoT만 읽음.
 */
export function getTeamClubIntro(team: { aiProfile?: unknown } | null | undefined): ClubIntroProfile | null {
  if (!team?.aiProfile || typeof team.aiProfile !== "object" || Array.isArray(team.aiProfile)) return null;
  const p = team.aiProfile as Record<string, unknown>;
  const meta = p.meta;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const raw = (meta as { clubIntro?: unknown }).clubIntro;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const teamName = str(o.teamName);
  const introSummary = str(o.introSummary);
  const ceremonyIntroText = typeof o.ceremonyIntroText === "string" ? o.ceremonyIntroText.trim() : "";
  const status = parseStatus(o.status);
  if (!teamName || !introSummary || !status) return null;
  // 원문 없이 REVIEWED/PUBLISHED는 무효. DRAFT는 원문 대기 허용.
  if (!ceremonyIntroText && status !== "DRAFT") return null;
  if (o.source !== "NOWON_UNIT_CLUB_CEREMONY_SCRIPT") return null;

  const notableRaw = o.notablePeople;
  const notablePeople = Array.isArray(notableRaw)
    ? notableRaw
        .map((row) => {
          if (!row || typeof row !== "object" || Array.isArray(row)) return null;
          const r = row as Record<string, unknown>;
          const name = str(r.name);
          const title = str(r.title);
          if (!name || !title) return null;
          const note = str(r.note) || undefined;
          return note ? { name, title, note } : { name, title };
        })
        .filter(Boolean)
    : undefined;

  return {
    teamName,
    chairmanName: str(o.chairmanName) || undefined,
    foundedYear: num(o.foundedYear),
    foundedDate: str(o.foundedDate) || undefined,
    memberCount: num(o.memberCount),
    memberCountLabel: str(o.memberCountLabel) || undefined,
    homeGrounds: strArr(o.homeGrounds),
    ageRange: str(o.ageRange) || undefined,
    activityDay: str(o.activityDay) || undefined,
    introSummary,
    teamValues: strArr(o.teamValues),
    achievements: strArr(o.achievements),
    notablePeople: notablePeople?.length ? (notablePeople as ClubIntroProfile["notablePeople"]) : undefined,
    ceremonyIntroText,
    source: "NOWON_UNIT_CLUB_CEREMONY_SCRIPT",
    status,
    updatedAt: str(o.updatedAt) || undefined,
    platformTeamId: str(o.platformTeamId) || undefined,
    federationTeamId: str(o.federationTeamId) || undefined,
    sortOrder: num(o.sortOrder),
    introSummaryProvenance: (() => {
      const pr = o.introSummaryProvenance;
      if (!pr || typeof pr !== "object" || Array.isArray(pr)) return undefined;
      const r = pr as Record<string, unknown>;
      const generatedAt = str(r.generatedAt);
      const factsFingerprint = str(r.factsFingerprint);
      const source = r.source === "openai" || r.source === "template" ? r.source : null;
      if (!generatedAt || !factsFingerprint || !source) return undefined;
      const humanEditedAt = str(r.humanEditedAt) || undefined;
      return humanEditedAt
        ? { generatedAt, source, factsFingerprint, humanEditedAt }
        : { generatedAt, source, factsFingerprint };
    })(),
  };
}

/** 공개 페이지 — PUBLISHED만 */
export function getPublishedClubIntro(
  team: { aiProfile?: unknown } | null | undefined
): ClubIntroProfile | null {
  const intro = getTeamClubIntro(team);
  return intro?.status === "PUBLISHED" ? intro : null;
}

/** 관리자 미리보기 — DRAFT/REVIEWED/PUBLISHED */
export function getClubIntroForManagerPreview(
  team: { aiProfile?: unknown } | null | undefined
): ClubIntroProfile | null {
  return getTeamClubIntro(team);
}
