/**
 * Sprint 2-1 — Public Home checklist completeness (owner-facing).
 * Deterministic booleans → percent. Separate from copy-quality profileScore.
 */

import { getProfileDescription, getCaptainMessage, getTeamCoverPhotoUrl, getSocialPost } from "@/lib/team/resolveTeamPublicProfile";
import { getTeamPublicStaff } from "@/lib/team/resolveTeamPublicStaff";
import { isAcademyOrganization } from "@/lib/p0/terminology";

export type PublicHomeCompletenessItemId =
  | "intro"
  | "logo"
  | "cover"
  | "staff"
  | "contact"
  | "training"
  | "sns";

export type PublicHomeCompletenessItem = {
  id: PublicHomeCompletenessItemId;
  label: string;
  hint: string;
  done: boolean;
  /** Applicable to this team (academy-only items may be skipped for normal) */
  applicable: boolean;
};

export type PublicHomeCompletenessResult = {
  score: number;
  filled: number;
  total: number;
  items: PublicHomeCompletenessItem[];
  missing: PublicHomeCompletenessItem[];
};

function isHttpUrl(v: unknown): boolean {
  if (typeof v !== "string") return false;
  const t = v.trim();
  return t.startsWith("https://") || t.startsWith("http://");
}

function readMeta(team: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const p = team?.aiProfile;
  if (!p || typeof p !== "object" || Array.isArray(p)) return {};
  const meta = (p as { meta?: unknown }).meta;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return {};
  return meta as Record<string, unknown>;
}

function hasSns(team: Record<string, unknown>): boolean {
  const meta = readMeta(team);
  const linkKeys = [
    "instagramUrl",
    "youtubeUrl",
    "facebookUrl",
    "naverBlogUrl",
    "kakaoOpenChatUrl",
    "websiteUrl",
    "snsUrl",
  ] as const;
  for (const k of linkKeys) {
    if (isHttpUrl(meta[k]) || isHttpUrl(team[k])) return true;
  }
  const socialLinks = meta.socialLinks ?? team.socialLinks;
  if (Array.isArray(socialLinks) && socialLinks.some((x) => isHttpUrl(x) || (x && typeof x === "object" && isHttpUrl((x as { url?: unknown }).url)))) {
    return true;
  }
  // Draft social post counts as SNS content presence for ops checklist
  if (getSocialPost(team).trim().length >= 20) return true;
  return false;
}

function hasContact(team: Record<string, unknown>): boolean {
  // Pure check — do not import reservationContact.ts (pulls Firebase / import.meta)
  const rc = team.reservationContact;
  if (rc && typeof rc === "object" && !Array.isArray(rc)) {
    const d = rc as Record<string, unknown>;
    for (const k of ["phone", "email", "name"] as const) {
      if (typeof d[k] === "string" && d[k].trim().length >= 3) return true;
    }
  }
  for (const k of ["contactPhone", "phone", "contactEmail", "email", "inquiryPhone"] as const) {
    const v = team[k];
    if (typeof v === "string" && v.trim().length >= 3) return true;
  }
  const meta = readMeta(team);
  for (const k of ["contactPhone", "phone", "contactEmail"] as const) {
    const v = meta[k];
    if (typeof v === "string" && v.trim().length >= 3) return true;
  }
  return false;
}

function hasStaff(team: Record<string, unknown>): boolean {
  const staff = getTeamPublicStaff(team).filter((s) => s.visible);
  if (staff.length >= 1) return true;
  const captain = getCaptainMessage(team).trim();
  if (captain.length >= 40) return true;
  const meta = readMeta(team);
  if (isHttpUrl(meta.captainPhotoUrl)) return true;
  return false;
}

function hasTraining(team: Record<string, unknown>, academyMeta?: Record<string, unknown> | null): boolean {
  const meta = academyMeta && typeof academyMeta === "object" ? academyMeta : null;
  const nested = team.academy;
  const fromNested =
    nested && typeof nested === "object" && !Array.isArray(nested)
      ? ((nested as { meta?: unknown }).meta as Record<string, unknown> | undefined) ||
        (nested as Record<string, unknown>)
      : null;
  const src = meta || fromNested;
  if (!src) return false;
  const age = typeof src.ageGroup === "string" && src.ageGroup.trim();
  const level = typeof src.trainingLevel === "string" && src.trainingLevel.trim();
  return Boolean(age && level);
}

/**
 * Compute public-home checklist completeness.
 * @param academyMeta optional `teams/{id}/academy/meta` snapshot when loaded separately
 */
export function computePublicHomeCompleteness(
  team: Record<string, unknown> | null | undefined,
  opts?: { academyMeta?: Record<string, unknown> | null }
): PublicHomeCompletenessResult {
  if (!team) {
    return { score: 0, filled: 0, total: 0, items: [], missing: [] };
  }

  const isAcademy = isAcademyOrganization(team);
  const intro = getProfileDescription(team).trim();
  const introOk = intro.length >= 40;
  const logoOk = isHttpUrl(team.logoUrl);
  const coverOk = Boolean(getTeamCoverPhotoUrl(team));
  const staffOk = hasStaff(team);
  const contactOk = hasContact(team);
  const snsOk = hasSns(team);
  const trainingOk = isAcademy ? hasTraining(team, opts?.academyMeta) : false;

  const items: PublicHomeCompletenessItem[] = [
    {
      id: "intro",
      label: "팀 소개",
      hint: "공개 소개를 40자 이상 채워 주세요.",
      done: introOk,
      applicable: true,
    },
    {
      id: "logo",
      label: "로고",
      hint: "팀 로고 이미지를 등록해 주세요.",
      done: logoOk,
      applicable: true,
    },
    {
      id: "cover",
      label: "커버 이미지",
      hint: "Hero 대표 이미지를 올려 주세요.",
      done: coverOk,
      applicable: true,
    },
    {
      id: "staff",
      label: "운영진",
      hint: "공개 운영진 또는 회장 인사·사진을 추가해 주세요.",
      done: staffOk,
      applicable: true,
    },
    {
      id: "contact",
      label: "연락처",
      hint: "예약·문의용 연락처를 등록해 주세요.",
      done: contactOk,
      applicable: true,
    },
    {
      id: "training",
      label: "훈련 정보",
      hint: "연령대·훈련 수준을 아카데미 설정에 채워 주세요.",
      done: trainingOk,
      applicable: isAcademy,
    },
    {
      id: "sns",
      label: "SNS 링크",
      hint: "인스타·오픈채팅 등 링크 또는 SNS 홍보문을 추가해 주세요.",
      done: snsOk,
      applicable: true,
    },
  ];

  const applicable = items.filter((i) => i.applicable);
  const filled = applicable.filter((i) => i.done).length;
  const total = applicable.length;
  const score = total === 0 ? 0 : Math.round((filled / total) * 100);
  const missing = applicable.filter((i) => !i.done);

  return { score, filled, total, items, missing };
}
