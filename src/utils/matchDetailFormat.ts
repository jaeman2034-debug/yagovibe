import type { Match } from "@/types/match";
import type { Timestamp } from "firebase/firestore";
import {
  differenceInCalendarDays,
  format,
  startOfDay,
} from "date-fns";
import { ko } from "date-fns/locale";

export function getMatchEventDate(match: Match): Date | null {
  const d = match.date as Timestamp | undefined;
  if (d && typeof d.toDate === "function") return d.toDate();
  return null;
}

export function formatMatchDetailSummary(match: Match): {
  dateLine: string;
  dday: string;
  ddayClassName: string;
} {
  const dt = getMatchEventDate(match);
  if (!dt) {
    return {
      dateLine: "일정 미정",
      dday: "",
      ddayClassName: "",
    };
  }
  const dateLine = `${format(dt, "M월 d일 (EEE)", { locale: ko })} ${match.time}`;
  const today = startOfDay(new Date());
  const matchDay = startOfDay(dt);
  const diff = differenceInCalendarDays(matchDay, today);
  if (diff < 0) {
    return {
      dateLine,
      dday: "종료",
      ddayClassName: "text-sm text-gray-400",
    };
  }
  if (diff === 0) {
    return {
      dateLine,
      dday: "D-Day",
      ddayClassName: "text-sm font-semibold text-red-600",
    };
  }
  return {
    dateLine,
    dday: `D-${diff}`,
    ddayClassName: "text-sm font-medium text-red-500",
  };
}

export function googleMapsEmbedUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
}

export function googleMapsOpenUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
