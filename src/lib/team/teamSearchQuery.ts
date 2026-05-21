import type { SportId } from "@/constants/sports";
import { normalizeSportId } from "@/constants/sports";
import { TEAM_SEARCH_SPORT_OPTIONS } from "@/data/teamSearchSportOptions";

const VALID_TEAM_SEARCH_TYPES = new Set(TEAM_SEARCH_SPORT_OPTIONS.map((o) => o.value));

/** FilterBar value → 종목 허브·추천 팀 API용 슬러그 */
const FILTER_TO_HUB_SLUG: Record<string, SportId> = {
  football: "soccer",
  futsal: "soccer",
  basketball: "basketball",
  baseball: "baseball",
  volleyball: "volleyball",
  badminton: "badminton",
  tennis: "tennis",
  "table-tennis": "table-tennis",
  golf: "golf",
  swimming: "swimming",
  running: "running",
  cycling: "cycling",
  fitness: "fitness",
  climbing: "climbing",
  /** 허브에 전용 탭이 없으면 기타 허브로 안내 */
  bowling: "misc",
  esports: "misc",
};

/** FilterBar·Firestore teams.sportType 값 (축구는 football) */
export function resolveTeamSearchFilterSportType(searchParams: URLSearchParams): string {
  const t = searchParams.get("type");
  if (t && t.trim() && VALID_TEAM_SEARCH_TYPES.has(t.trim())) {
    return t.trim();
  }
  const raw = searchParams.get("sport")?.trim();
  if (!raw) return "football";
  const lower = raw.toLowerCase();
  /** normalize 전에 풋살 등 레거시 맵으로 축구와 구분 */
  if (lower === "futsal") return "futsal";

  const sid = normalizeSportId(raw);
  if (sid === "soccer") return "football";
  if (sid === "basketball") return "basketball";
  if (sid === "baseball") return "baseball";
  if (sid === "volleyball") return "volleyball";
  if (sid === "badminton") return "badminton";
  if (sid === "tennis") return "tennis";
  if (sid === "table-tennis") return "table-tennis";
  if (sid === "golf") return "golf";
  if (sid === "swimming") return "swimming";
  if (sid === "running") return "running";
  if (sid === "cycling") return "cycling";
  if (sid === "fitness") return "fitness";
  if (sid === "climbing") return "climbing";
  return "football";
}

/** 종목 허브·추천 팀 API용 슬러그 (축구·풋살 → soccer) */
export function canonicalSportSlugFromFilterSportType(filterSportType: string): string {
  const mapped = FILTER_TO_HUB_SLUG[filterSportType];
  if (mapped) return mapped;
  const sid = normalizeSportId(filterSportType);
  return sid ?? "soccer";
}
