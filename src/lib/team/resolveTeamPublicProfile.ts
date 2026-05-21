/**
 * teams.aiProfile v2 (generated / edited / meta) + 레거시(flat) 통합 조회
 * 규칙: edited 필드가 있으면 우선, 없으면 generated, 없으면 레거시·team.description
 */

import type { TeamCaptainPublicView } from "@/types/teamCaptainMessage";

export const AI_PROFILE_SCHEMA_VERSION = 2;

export function isTeamAiProfileV2(team: { aiProfile?: unknown } | null | undefined): boolean {
  return isV2AiProfile(team?.aiProfile);
}

function isV2AiProfile(raw: unknown): boolean {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  return (raw as { schemaVersion?: unknown }).schemaVersion === AI_PROFILE_SCHEMA_VERSION;
}

export function getOnboarding(team: { aiProfile?: unknown } | null | undefined): Record<string, unknown> | undefined {
  const p = team?.aiProfile;
  if (!p || typeof p !== "object" || Array.isArray(p)) return undefined;
  if (isV2AiProfile(p)) {
    const ob = (p as { meta?: { onboarding?: unknown } }).meta?.onboarding;
    return ob && typeof ob === "object" && !Array.isArray(ob) ? (ob as Record<string, unknown>) : undefined;
  }
  const ob = (p as Record<string, unknown>).onboarding;
  return ob && typeof ob === "object" && !Array.isArray(ob) ? (ob as Record<string, unknown>) : undefined;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function shortButtonCtaFromRecruit(recruit: string, fallback: string): string {
  const t = recruit.trim();
  if (!t) return fallback;
  const chars = Array.from(t);
  if (chars.length <= 12) return t;
  return `${chars.slice(0, 10).join("")}…`;
}

/** 공개 페이지용 팀 소개 본문 */
export function getProfileDescription(team: { aiProfile?: unknown; description?: unknown } | null | undefined): string {
  if (!team) return "";
  const p = team.aiProfile;
  if (p && typeof p === "object" && !Array.isArray(p)) {
    if (isV2AiProfile(p)) {
      const v = p as {
        edited?: { description?: unknown };
        generated?: { description?: unknown };
      };
      if (v.edited && Object.prototype.hasOwnProperty.call(v.edited, "description")) {
        if (typeof v.edited.description === "string") return v.edited.description;
      }
      const g = str(v.generated?.description);
      if (g) return g;
    } else {
      const flat = p as Record<string, unknown>;
      const d = str(flat.description) || str(flat.intro);
      if (d) return d;
    }
  }
  return str(team.description);
}

/** 이런 분께 추천 불릿 */
export function getProfileHighlights(team: { aiProfile?: unknown } | null | undefined): string[] {
  if (!team?.aiProfile || typeof team.aiProfile !== "object" || Array.isArray(team.aiProfile)) return [];
  const p = team.aiProfile as Record<string, unknown>;
  if (isV2AiProfile(p)) {
    const v = p as {
      edited?: { highlights?: unknown; homeHighlights?: unknown };
      generated?: { highlights?: unknown; homeHighlights?: unknown };
    };
    if (v.edited && Object.prototype.hasOwnProperty.call(v.edited, "highlights")) {
      const fromEdited = v.edited.highlights;
      if (Array.isArray(fromEdited)) return fromEdited.map((x) => String(x).trim()).filter(Boolean);
    }
    if (v.edited && Object.prototype.hasOwnProperty.call(v.edited, "homeHighlights")) {
      const fromEdited = v.edited.homeHighlights;
      if (Array.isArray(fromEdited)) return fromEdited.map((x) => String(x).trim()).filter(Boolean);
    }
    const fromGen = v.generated?.highlights ?? v.generated?.homeHighlights;
    if (Array.isArray(fromGen)) {
      return fromGen.map((x) => String(x).trim()).filter(Boolean);
    }
    return [];
  }
  const fromHome = p.homeHighlights;
  if (Array.isArray(fromHome)) return fromHome.map((x) => String(x).trim()).filter(Boolean);
  const fromAlt = p.highlights;
  if (Array.isArray(fromAlt)) return fromAlt.map((x) => String(x).trim()).filter(Boolean);
  return [];
}

export function getRecruitMessage(team: { aiProfile?: unknown } | null | undefined): string {
  if (!team?.aiProfile || typeof team.aiProfile !== "object" || Array.isArray(team.aiProfile)) return "";
  const p = team.aiProfile as Record<string, unknown>;
  if (isV2AiProfile(p)) {
    const v = p as { edited?: { recruitMessage?: unknown }; generated?: { recruitMessage?: unknown } };
    if (v.edited && Object.prototype.hasOwnProperty.call(v.edited, "recruitMessage")) {
      if (typeof v.edited.recruitMessage === "string") return v.edited.recruitMessage.trim();
    }
    return str(v.generated?.recruitMessage);
  }
  return str(p.recruitMessage);
}

export function getPublicCtaShort(team: { aiProfile?: unknown } | null | undefined): string {
  if (!team?.aiProfile || typeof team.aiProfile !== "object" || Array.isArray(team.aiProfile)) return "";
  const p = team.aiProfile as Record<string, unknown>;
  const recruit = getRecruitMessage(team);
  if (isV2AiProfile(p)) {
    const v = p as { edited?: { recruitMessage?: unknown }; generated?: { publicCta?: unknown; recruitMessage?: unknown } };
    if (
      v.edited &&
      Object.prototype.hasOwnProperty.call(v.edited, "recruitMessage") &&
      typeof v.edited.recruitMessage === "string" &&
      v.edited.recruitMessage.trim()
    ) {
      return shortButtonCtaFromRecruit(
        v.edited.recruitMessage.trim(),
        str(v.generated?.publicCta) || "클럽 합류하기"
      );
    }
    const gCta = str(v.generated?.publicCta);
    if (gCta) return gCta;
    return shortButtonCtaFromRecruit(str(v.generated?.recruitMessage) || recruit, "클럽 합류하기");
  }
  return str(p.publicCta) || shortButtonCtaFromRecruit(recruit, "클럽 합류하기");
}

export function getSlogan(team: { aiProfile?: unknown } | null | undefined): string {
  if (!team?.aiProfile || typeof team.aiProfile !== "object" || Array.isArray(team.aiProfile)) return "";
  const p = team.aiProfile as Record<string, unknown>;
  if (isV2AiProfile(p)) {
    return str((p as { generated?: { slogan?: unknown } }).generated?.slogan);
  }
  return str(p.slogan);
}

export function getPlayStyle(team: { aiProfile?: unknown } | null | undefined): string {
  if (!team?.aiProfile || typeof team.aiProfile !== "object" || Array.isArray(team.aiProfile)) return "";
  const p = team.aiProfile as Record<string, unknown>;
  if (isV2AiProfile(p)) {
    return str((p as { generated?: { playStyle?: unknown } }).generated?.playStyle);
  }
  return str(p.playStyle);
}

export function getThemePreset(team: { aiProfile?: unknown } | null | undefined): "light" | "dark" {
  if (!team?.aiProfile || typeof team.aiProfile !== "object" || Array.isArray(team.aiProfile)) return "light";
  const p = team.aiProfile as Record<string, unknown>;
  if (isV2AiProfile(p)) {
    const t = (p as { generated?: { themePreset?: unknown } }).generated?.themePreset;
    return t === "dark" ? "dark" : "light";
  }
  return p.themePreset === "dark" ? "dark" : "light";
}

export function getAiSkipped(team: { aiProfile?: unknown } | null | undefined): boolean {
  if (!team?.aiProfile || typeof team.aiProfile !== "object" || Array.isArray(team.aiProfile)) return false;
  const p = team.aiProfile as Record<string, unknown>;
  if (isV2AiProfile(p)) {
    return (p as { meta?: { aiSkipped?: unknown } }).meta?.aiSkipped === true;
  }
  return p.aiSkipped === true;
}

export function getBrandingSource(team: { aiProfile?: unknown } | null | undefined): string {
  if (!team?.aiProfile || typeof team.aiProfile !== "object" || Array.isArray(team.aiProfile)) return "";
  const p = team.aiProfile as Record<string, unknown>;
  if (isV2AiProfile(p)) {
    return str((p as { meta?: { source?: unknown } }).meta?.source);
  }
  return str(p.source);
}

export function getBrandStyleId(team: { aiProfile?: unknown } | null | undefined): string | undefined {
  if (!team?.aiProfile || typeof team.aiProfile !== "object" || Array.isArray(team.aiProfile)) return undefined;
  const p = team.aiProfile as Record<string, unknown>;
  if (isV2AiProfile(p)) {
    const b = (p as { meta?: { brandStyle?: unknown } }).meta?.brandStyle;
    return typeof b === "string" ? b : undefined;
  }
  const b = p.brandStyle;
  return typeof b === "string" ? b : undefined;
}

/** 완성도 점수 등 — 본문만 (빈 문자열 가능) */
export function getCaptainMessage(team: { aiProfile?: unknown } | null | undefined): string {
  if (!team?.aiProfile || typeof team.aiProfile !== "object" || Array.isArray(team.aiProfile)) return "";
  const p = team.aiProfile as Record<string, unknown>;
  if (isV2AiProfile(p)) {
    const v = p as { edited?: { captainMessage?: unknown }; generated?: { captainMessage?: unknown } };
    if (v.edited && Object.prototype.hasOwnProperty.call(v.edited, "captainMessage")) {
      if (typeof v.edited.captainMessage === "string") return str(v.edited.captainMessage);
    }
    return str(v.generated?.captainMessage);
  }
  return str(p.captainMessage);
}

/** 공개 허브 — 팀명 표기(인사 카드 기본 호칭용) */
export function getTeamDisplayNameForCaptain(team: { name?: unknown } | null | undefined): string {
  const n = team && typeof team.name === "string" ? team.name.trim() : "";
  return n || "우리 팀";
}

/**
 * 저장된 captainMessage가 없을 때 신뢰 블록용 기본 인사(팀 메타만 사용, 한 줄 슬로건 금지).
 * Firestore에 쓰지 않고 표시용으로만 사용한다.
 */
export function buildTemplateCaptainMessage(
  team: { name?: unknown; sportType?: unknown; primarySport?: unknown; sport?: unknown; region?: unknown; baseRegion?: unknown } | null | undefined
): string {
  const teamName = getTeamDisplayNameForCaptain(team);
  const sport =
    (team && typeof team.sportType === "string" && team.sportType.trim()) ||
    (team && typeof team.primarySport === "string" && team.primarySport.trim()) ||
    (team && typeof team.sport === "string" && team.sport.trim()) ||
    "축구";
  const region =
    (team && typeof team.region === "string" && team.region.trim()) ||
    (team && typeof team.baseRegion === "string" && team.baseRegion.trim()) ||
    "";
  const regionLine = region ? `저희는 주로 ${region}에서 함께하고 있습니다.\n` : "";
  return `안녕하세요.\n저는 ${teamName}의 회장입니다.\n\n저희는 ${sport}를 즐기는 생활체육 클럽으로, 실력보다 꾸준함과 함께하는 분위기를 더 중요하게 생각합니다.\n처음 오시는 분도 부담 없이 함께하실 수 있도록 하고 있습니다.\n${regionLine}함께하실 분을 기다리고 있습니다.`;
}

/** 회장·대표 신뢰 카드 섹션 제목 (공개 팀 허브) */
export function captainTrustSectionTitle(roleLabel: string | undefined | null | unknown): string {
  const r = String(roleLabel ?? "").trim();
  if (r.includes("회장")) return "회장 인사말";
  if (r.includes("대표") || r.includes("리더")) return "대표 인사말";
  if (r.includes("팀장")) return "회장 인사말";
  return "대표 인사말";
}

/**
 * 공개 팀 홈 — 회장 신뢰 카드(단일 인물).
 * 저장된 인사가 없으면 팀 메타 기반 템플릿 본문을 채운다. 브랜딩 슬로건(tagline)은 넣지 않는다.
 */
export function getTeamCaptainPublicView(team: { aiProfile?: unknown; name?: unknown } | null | undefined): TeamCaptainPublicView | null {
  if (!team) return null;
  const stored = getCaptainMessage(team);
  let nickname = "";
  let roleLabel = "";
  let photoUrl: string | null = null;

  const p = team?.aiProfile;
  if (p && typeof p === "object" && !Array.isArray(p)) {
    if (isV2AiProfile(p)) {
      const meta = (p as { meta?: Record<string, unknown> }).meta;
      if (meta && typeof meta === "object") {
        nickname = str(meta.captainNickname);
        roleLabel = str(meta.captainRole);
        const ph = meta.captainPhotoUrl;
        photoUrl = typeof ph === "string" && ph.trim() ? ph.trim() : null;
      }
    } else {
      const flat = p as Record<string, unknown>;
      nickname = str(flat.captainNickname);
      roleLabel = str(flat.captainRole);
      const ph = flat.captainPhotoUrl;
      photoUrl = typeof ph === "string" && ph.trim() ? ph.trim() : null;
    }
  }

  const teamName = getTeamDisplayNameForCaptain(team);
  const namedTeam = Boolean(typeof team.name === "string" && team.name.trim());
  const hasIdentity =
    stored.length > 0 || nickname.length > 0 || Boolean(photoUrl) || namedTeam;
  if (!hasIdentity) return null;

  const nicknameOut = nickname || `${teamName} 대표`;
  const roleOut = roleLabel || "회장";
  const messageOut = stored.trim() ? stored : buildTemplateCaptainMessage(team);

  return {
    message: messageOut,
    nickname: nicknameOut,
    roleLabel: roleOut,
    photoUrl,
  };
}

/**
 * 운영진 편집용 — 공개 뷰가 null일 때도 동일 카드로 진입(템플릿 인사 포함).
 */
export function getTeamCaptainManagementView(
  team: { aiProfile?: unknown; name?: unknown; sportType?: unknown; primarySport?: unknown; sport?: unknown; region?: unknown; baseRegion?: unknown } | null | undefined
): TeamCaptainPublicView | null {
  if (!team) return null;
  const stored = getCaptainMessage(team);
  let nickname = "";
  let roleLabel = "";
  let photoUrl: string | null = null;

  const p = team.aiProfile;
  if (p && typeof p === "object" && !Array.isArray(p)) {
    if (isV2AiProfile(p)) {
      const meta = (p as { meta?: Record<string, unknown> }).meta;
      if (meta && typeof meta === "object") {
        nickname = str(meta.captainNickname);
        roleLabel = str(meta.captainRole);
        const ph = meta.captainPhotoUrl;
        photoUrl = typeof ph === "string" && ph.trim() ? ph.trim() : null;
      }
    } else {
      const flat = p as Record<string, unknown>;
      nickname = str(flat.captainNickname);
      roleLabel = str(flat.captainRole);
      const ph = flat.captainPhotoUrl;
      photoUrl = typeof ph === "string" && ph.trim() ? ph.trim() : null;
    }
  }

  const teamName = getTeamDisplayNameForCaptain(team);
  const nicknameOut = nickname || `${teamName} 대표`;
  const roleOut = roleLabel || "회장";
  const messageOut = stored.trim() ? stored : buildTemplateCaptainMessage(team);

  return {
    message: messageOut,
    nickname: nicknameOut,
    roleLabel: roleOut,
    photoUrl,
  };
}

/** 팀 공개 허브 히어로 커버 — v2 `meta.coverPhotoUrl` 우선, 레거시·teamBranding 폴백 */
export function getTeamCoverPhotoUrl(
  team: { aiProfile?: unknown; teamBranding?: unknown } | null | undefined
): string | null {
  if (!team) return null;
  const p = team.aiProfile;
  if (p && typeof p === "object" && !Array.isArray(p)) {
    if (isV2AiProfile(p)) {
      const meta = (p as { meta?: Record<string, unknown> }).meta;
      if (meta && typeof meta === "object") {
        const u = meta.coverPhotoUrl;
        if (typeof u === "string" && u.trim()) return u.trim();
      }
    } else {
      const flat = p as Record<string, unknown>;
      const u = flat.coverPhotoUrl;
      if (typeof u === "string" && u.trim()) return u.trim();
    }
  }
  const b = team.teamBranding;
  if (b && typeof b === "object" && !Array.isArray(b)) {
    const u = (b as Record<string, unknown>).coverPhotoUrl;
    if (typeof u === "string" && u.trim()) return u.trim();
  }
  return null;
}

/** v2 `generated` 전용 — diff·되돌리기 UI용 */
export function getGeneratedDescription(team: { aiProfile?: unknown } | null | undefined): string {
  if (!team?.aiProfile || typeof team.aiProfile !== "object" || Array.isArray(team.aiProfile)) return "";
  const p = team.aiProfile as Record<string, unknown>;
  if (!isV2AiProfile(p)) return "";
  const g = (p as { generated?: { description?: unknown } }).generated;
  return str(g?.description);
}

export function getGeneratedHighlights(team: { aiProfile?: unknown } | null | undefined): string[] {
  if (!team?.aiProfile || typeof team.aiProfile !== "object" || Array.isArray(team.aiProfile)) return [];
  const p = team.aiProfile as Record<string, unknown>;
  if (!isV2AiProfile(p)) return [];
  const g = (p as { generated?: { highlights?: unknown; homeHighlights?: unknown } }).generated;
  if (!g || typeof g !== "object") return [];
  const raw = Array.isArray(g.highlights) ? g.highlights : Array.isArray(g.homeHighlights) ? g.homeHighlights : [];
  return raw.map((x) => String(x).trim()).filter(Boolean);
}

export function getGeneratedRecruitMessage(team: { aiProfile?: unknown } | null | undefined): string {
  if (!team?.aiProfile || typeof team.aiProfile !== "object" || Array.isArray(team.aiProfile)) return "";
  const p = team.aiProfile as Record<string, unknown>;
  if (!isV2AiProfile(p)) return "";
  const g = (p as { generated?: { recruitMessage?: unknown } }).generated;
  return str(g?.recruitMessage);
}

/** v2 `generated` 전용 — 운영진 인사 diff·재생성 UI용 */
export function getGeneratedCaptainMessage(team: { aiProfile?: unknown } | null | undefined): string {
  if (!team?.aiProfile || typeof team.aiProfile !== "object" || Array.isArray(team.aiProfile)) return "";
  const p = team.aiProfile as Record<string, unknown>;
  if (!isV2AiProfile(p)) return "";
  const g = (p as { generated?: { captainMessage?: unknown } }).generated;
  return str(g?.captainMessage);
}

function highlightsFingerprint(lines: string[]): string {
  return JSON.stringify(lines.map((x) => x.trim()).filter(Boolean));
}

export type PublicProfileDiffFlags = {
  description: boolean;
  highlights: boolean;
  recruitMessage: boolean;
  captainMessage: boolean;
};

/** `edited`에 해당 키가 있고 값이 `generated`와 다를 때만 true (빈 문자열 포함 비교) */
export function getPublicProfileDiffFlags(
  team: { aiProfile?: unknown; description?: unknown } | null | undefined
): PublicProfileDiffFlags {
  const out: PublicProfileDiffFlags = {
    description: false,
    highlights: false,
    recruitMessage: false,
    captainMessage: false,
  };
  if (!team?.aiProfile || typeof team.aiProfile !== "object" || Array.isArray(team.aiProfile)) return out;
  const p = team.aiProfile as Record<string, unknown>;
  if (!isV2AiProfile(p)) return out;
  const gen = (p.generated && typeof p.generated === "object" && !Array.isArray(p.generated)
    ? (p.generated as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const ed = (p.edited && typeof p.edited === "object" && !Array.isArray(p.edited)
    ? (p.edited as Record<string, unknown>)
    : {}) as Record<string, unknown>;

  const genDesc = str(gen.description);
  const genHl = getGeneratedHighlights(team);
  const genRec = str(gen.recruitMessage);
  const genCap = str(gen.captainMessage);

  if (Object.prototype.hasOwnProperty.call(ed, "description") && typeof ed.description === "string") {
    if (ed.description.trim() !== genDesc.trim()) out.description = true;
  }
  const edHlRaw = Object.prototype.hasOwnProperty.call(ed, "highlights")
    ? ed.highlights
    : Object.prototype.hasOwnProperty.call(ed, "homeHighlights")
      ? ed.homeHighlights
      : null;
  if (Array.isArray(edHlRaw)) {
    const edHl = edHlRaw.map((x) => String(x).trim()).filter(Boolean);
    if (highlightsFingerprint(edHl) !== highlightsFingerprint(genHl)) out.highlights = true;
  }
  if (Object.prototype.hasOwnProperty.call(ed, "recruitMessage") && typeof ed.recruitMessage === "string") {
    if (ed.recruitMessage.trim() !== genRec.trim()) out.recruitMessage = true;
  }
  if (Object.prototype.hasOwnProperty.call(ed, "captainMessage") && typeof ed.captainMessage === "string") {
    if (ed.captainMessage.trim() !== genCap.trim()) out.captainMessage = true;
  }
  return out;
}

export function hasAnyPublicProfileDiff(team: { aiProfile?: unknown; description?: unknown } | null | undefined): boolean {
  const f = getPublicProfileDiffFlags(team);
  return f.description || f.highlights || f.recruitMessage || f.captainMessage;
}
