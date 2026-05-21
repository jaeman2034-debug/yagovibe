/**
 * 🧠 Movement 추론 시스템
 * 
 * 사용자가 말하지 않아도 YAGO가 기억하고 추론
 */

import type { MovementSession, MovementIntent } from "@/types/movement";
import { getRecentSessions } from "./movementSession";

interface TimeContext {
  hour: number; // 0-23
  dayOfWeek: number; // 0-6 (일요일=0)
  date: string; // YYYY-MM-DD
}

interface LocationContext {
  lat: number;
  lng: number;
}

/**
 * 시간대 기반 의도 추론
 */
function inferIntentFromTime(context: TimeContext): MovementIntent {
  const { hour, dayOfWeek } = context;

  // 평일 저녁 (18-21시) → 팀 연습 가능성 높음
  if (dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 18 && hour <= 21) {
    return "team_practice";
  }

  // 주말 오전 (8-12시) → 혼자 운동 가능성 높음
  if ((dayOfWeek === 0 || dayOfWeek === 6) && hour >= 8 && hour <= 12) {
    return "solo_play";
  }

  // 주말 오후 (14-18시) → 대회 가능성
  if ((dayOfWeek === 0 || dayOfWeek === 6) && hour >= 14 && hour <= 18) {
    return "competition";
  }

  // 저녁 (19-22시) → 일상 루틴
  if (hour >= 19 && hour <= 22) {
    return "daily_routine";
  }

  // 기본값
  return "solo_play";
}

/**
 * 최근 이동 패턴 기반 목적지 추론
 */
export async function inferDestination(
  userId: string,
  context: TimeContext & LocationContext
): Promise<{
  destination: { lat: number; lng: number; name: string; type: string; id?: string } | null;
  confidence: number; // 0-1
  reason: string;
}> {
  try {
    // 최근 세션 로드 (최근 30일)
    const recentSessions = await getRecentSessions(userId, 50);
    
    if (recentSessions.length === 0) {
      return {
        destination: null,
        confidence: 0,
        reason: "아직 이동 기록이 없어요",
      };
    }

    // 같은 요일, 비슷한 시간대의 세션 찾기
    const similarSessions = recentSessions.filter((session) => {
      const sessionDate = new Date(session.createdAt);
      const sessionDayOfWeek = sessionDate.getDay();
      const sessionHour = sessionDate.getHours();
      
      // 같은 요일이고, 시간대가 ±2시간 이내
      return (
        sessionDayOfWeek === context.dayOfWeek &&
        Math.abs(sessionHour - context.hour) <= 2
      );
    });

    if (similarSessions.length === 0) {
      // 비슷한 패턴이 없으면 가장 최근 세션 사용
      const mostRecent = recentSessions[0];
      return {
        destination: mostRecent.destination,
        confidence: 0.5,
        reason: "최근에 가신 곳이에요",
      };
    }

    // 가장 많이 반복된 목적지 찾기
    const destinationCounts = new Map<string, {
      destination: typeof similarSessions[0]["destination"];
      count: number;
    }>();

    similarSessions.forEach((session) => {
      const key = `${session.destination.lat},${session.destination.lng}`;
      const existing = destinationCounts.get(key);
      
      if (existing) {
        existing.count++;
      } else {
        destinationCounts.set(key, {
          destination: session.destination,
          count: 1,
        });
      }
    });

    // 가장 많이 반복된 목적지
    const mostFrequent = Array.from(destinationCounts.values())
      .sort((a, b) => b.count - a.count)[0];

    const confidence = Math.min(
      0.5 + (mostFrequent.count / similarSessions.length) * 0.5,
      0.95
    );

    // 추론 이유 생성
    const daysAgo = Math.floor(
      (Date.now() - new Date(similarSessions[0].createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    let reason = "";
    if (daysAgo === 0) {
      reason = "오늘 이 시간에 가셨네요";
    } else if (daysAgo === 7) {
      reason = "지난주 이 시간에 가셨네요";
    } else if (daysAgo < 7) {
      reason = `${daysAgo}일 전 이 시간에 가셨네요`;
    } else {
      reason = "이 시간대에 자주 가시는 곳이에요";
    }

    return {
      destination: mostFrequent.destination,
      confidence,
      reason,
    };
  } catch (error) {
    console.error("❌ [movementInference] 추론 실패:", error);
    return {
      destination: null,
      confidence: 0,
      reason: "추론할 수 없어요",
    };
  }
}

/**
 * 의도 추론
 */
export function inferIntent(context: TimeContext): MovementIntent {
  return inferIntentFromTime(context);
}

/**
 * 현재 시간 컨텍스트 가져오기
 */
export function getCurrentTimeContext(): TimeContext {
  const now = new Date();
  return {
    hour: now.getHours(),
    dayOfWeek: now.getDay(),
    date: now.toISOString().split("T")[0],
  };
}
