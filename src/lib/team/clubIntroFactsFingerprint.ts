/**
 * ClubIntro 구조화 필드 지문 — AI 초안 생성 시점과 현재 폼 비교용.
 * 공개 SoT 키는 건드리지 않음.
 */
export type ClubIntroFactsForAi = {
  teamName: string;
  chairmanName?: string;
  foundedYear?: number;
  foundedDate?: string;
  memberCountLabel?: string;
  homeGrounds?: string[];
  ageRange?: string;
  activityDay?: string;
  teamValues?: string[];
  achievements?: string[];
};

export function clubIntroFactsFingerprint(f: ClubIntroFactsForAi): string {
  return JSON.stringify({
    teamName: (f.teamName ?? "").trim(),
    chairmanName: (f.chairmanName ?? "").trim(),
    foundedYear: f.foundedYear ?? null,
    foundedDate: (f.foundedDate ?? "").trim(),
    memberCountLabel: (f.memberCountLabel ?? "").trim(),
    homeGrounds: [...(f.homeGrounds ?? [])].map((x) => x.trim()).filter(Boolean),
    ageRange: (f.ageRange ?? "").trim(),
    activityDay: (f.activityDay ?? "").trim(),
    teamValues: [...(f.teamValues ?? [])].map((x) => x.trim()).filter(Boolean),
    achievements: [...(f.achievements ?? [])].map((x) => x.trim()).filter(Boolean),
  });
}

export function formatAiMetaTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
