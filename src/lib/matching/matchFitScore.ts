import type { Match, MatchLevel } from "@/types/match";
import { toDate } from "@/utils/timeUtils";

/** 매칭 글 `level` → 내부 실력 점수(프록시). 추후 팀 Elo로 대체 */
export function matchLevelToSkillScore(level: MatchLevel | undefined): number {
  switch (level) {
    case "초보":
      return 1000;
    case "취미":
      return 1080;
    case "중급":
      return 1200;
    case "아마추어":
      return 1320;
    case "고급":
      return 1450;
    case "상관없음":
    default:
      return 1180;
  }
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function regionOverlapScore(myRegion: string | null | undefined, matchRegion: string): number {
  if (!myRegion?.trim() || !matchRegion.trim()) return 0;
  const a = myRegion.trim();
  const b = matchRegion.trim();
  if (a === b) return 85;
  const short = a.length < b.length ? a : b;
  const long = a.length >= b.length ? a : b;
  if (long.includes(short)) return 55;
  const ap = a.split(/\s+/)[0];
  const bp = b.split(/\s+/)[0];
  if (ap && bp && (ap === bp || long.includes(ap) || long.includes(bp))) return 35;
  return 0;
}

export type MatchFitResult = {
  total: number;
  lines: string[];
  skillScore: number;
};

/**
 * 오픈 매칭 글에 대한 규칙 기반 적합도 (실력 프록시 + 지역 문자열 + 구장 거리 + 일정 근접).
 * `myTeamId`와 동일한 호스트 팀 글은 제외합니다.
 */
export function scoreOpenMatchFit(input: {
  match: Match;
  myTeamId: string;
  myRegion?: string | null;
  /** users 문서 등에 저장된 홈 좌표(선택) */
  userLat?: number | null;
  userLng?: number | null;
  /** 내 팀의 선호 수준(없으면 중급 프록시) */
  mySkillHint?: number | null;
}): MatchFitResult {
  const lines: string[] = [];
  const m = input.match;
  if (!m || m.teamId === input.myTeamId) {
    return { total: -1e9, lines: [], skillScore: 0 };
  }

  let total = 10;
  const skill = matchLevelToSkillScore(m.level);
  const mine = input.mySkillHint ?? 1200;
  const diff = Math.abs(skill - mine);
  const skillFit = Math.max(0, 55 - diff / 25);
  total += skillFit;
  if (diff <= 150) lines.push("실력 구간이 비슷해요");
  else if (m.level === "상관없음") lines.push("수준 제한이 넓은 매칭이에요");

  const reg = regionOverlapScore(input.myRegion, m.region);
  total += reg;
  if (reg >= 85) lines.push("우리 팀 지역과 동일해요");
  else if (reg >= 35) lines.push("활동 지역이 가깝게 겹쳐요");

  const ulat = input.userLat;
  const ulng = input.userLng;
  if (
    ulat != null &&
    ulng != null &&
    Number.isFinite(ulat) &&
    Number.isFinite(ulng) &&
    m.stadiumLat != null &&
    m.stadiumLng != null &&
    Number.isFinite(m.stadiumLat) &&
    Number.isFinite(m.stadiumLng)
  ) {
    const km = haversineKm(ulat, ulng, m.stadiumLat, m.stadiumLng);
    const distScore = km <= 3 ? 70 : km <= 8 ? 50 : km <= 20 ? 25 : km <= 40 ? 10 : 0;
    total += distScore;
    if (distScore > 0) lines.push(`구장까지 약 ${km < 10 ? km.toFixed(1) : Math.round(km)}km`);
  }

  const play = toDate(m.date);
  if (play) {
    const ms = play.getTime() - Date.now();
    const days = ms / 86_400_000;
    if (days >= 0 && days <= 1) {
      total += 48;
      lines.push("일정이 가까워요");
    } else if (days > 1 && days <= 7) {
      total += 32;
      lines.push("이번 주 일정이에요");
    } else if (days > 7 && days <= 21) {
      total += 12;
    }
  }

  return { total, lines: lines.slice(0, 4), skillScore: skill };
}
