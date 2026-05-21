/**
 * 매칭 리스트 카드 — 한눈에 비교 + 신청 유도
 */

import type { Match } from "@/types/match";
import type { Timestamp } from "firebase/firestore";
import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  format,
  isWithinInterval,
  startOfDay,
} from "date-fns";
import { ko } from "date-fns/locale";

function toDate(value: Match["date"]): Date | null {
  if (!value) return null;
  const v = value as Timestamp;
  if (typeof v?.toDate === "function") return v.toDate();
  return null;
}

function formatMatchDate(dt: Date | null): string {
  if (!dt) return "일정 미정";
  return format(dt, "M월 d일 (EEE)", { locale: ko });
}

function ddayLabel(dt: Date | null): { text: string; className: string } | null {
  if (!dt) return null;
  const today = startOfDay(new Date());
  const matchDay = startOfDay(dt);
  const diff = differenceInCalendarDays(matchDay, today);
  if (diff < 0) return { text: "종료", className: "text-xs text-gray-400" };
  if (diff === 0) return { text: "D-Day", className: "text-sm font-semibold text-red-600" };
  return { text: `D-${diff}`, className: "text-sm font-medium text-red-500" };
}

export interface MatchListCardProps {
  match: Match;
  onOpenDetail: () => void;
}

export function MatchListCard({ match, onOpenDetail }: MatchListCardProps) {
  const dt = toDate(match.date);
  const dday = ddayLabel(dt);
  const matchRegion = match.matchRegion || match.region;
  const locationLine = [matchRegion, match.stadium].filter(Boolean).join(" / ");

  const feeText =
    match.fee != null && match.fee > 0
      ? `${match.fee.toLocaleString()}원`
      : "협의·무료";

  const isOpen = match.status === "open";

  return (
    <article
      className="mb-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
      aria-label={`${match.teamName} 매칭`}
    >
      <button
        type="button"
        onClick={onOpenDetail}
        className="w-full text-left"
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 font-semibold text-gray-900">
            {match.teamName}
          </h3>
          {dday ? <span className={dday.className}>{dday.text}</span> : null}
        </div>

        <p className="mb-1 text-sm text-gray-700">
          <span aria-hidden>📅 </span>
          {formatMatchDate(dt)} {match.time}
        </p>
        <p className="mb-1 text-sm text-gray-600">
          <span aria-hidden>📍 </span>
          {locationLine || "위치 미입력"}
        </p>
        <p className="mb-3 text-sm text-gray-600">
          <span aria-hidden>⚽ </span>
          {match.level}
          <span className="mx-1.5 text-gray-300">|</span>
          <span aria-hidden>💰 </span>
          {feeText}
        </p>
      </button>

      <button
        type="button"
        className="h-10 w-full rounded-xl bg-gray-900 text-sm font-semibold text-white transition-colors hover:bg-gray-800 active:bg-gray-950"
        onClick={(e) => {
          e.stopPropagation();
          onOpenDetail();
        }}
      >
        {isOpen ? "👉 바로 참여하기" : match.status === "matched" ? "상세 · 채팅" : "결과 보기"}
      </button>
    </article>
  );
}

/** 클라이언트 필터용: 날짜 프리셋 */
export type MatchDatePreset = "all" | "today" | "tomorrow" | "week";

export function matchPassesDatePreset(
  match: Match,
  preset: MatchDatePreset
): boolean {
  if (preset === "all") return true;
  const dt = toDate(match.date);
  if (!dt) return false;
  const today = startOfDay(new Date());
  if (preset === "today") {
    return differenceInCalendarDays(startOfDay(dt), today) === 0;
  }
  if (preset === "tomorrow") {
    return differenceInCalendarDays(startOfDay(dt), addDays(today, 1)) === 0;
  }
  if (preset === "week") {
    return isWithinInterval(dt, {
      start: today,
      end: endOfDay(addDays(today, 7)),
    });
  }
  return true;
}
