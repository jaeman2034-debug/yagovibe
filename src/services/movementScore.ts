/**
 * 🏃 Movement 점수 시스템
 * 
 * 이동도 운동의 일부로 인식
 */

import type { MovementSession } from "@/types/movement";

interface MovementScore {
  condition: number; // 컨디션 점수 (+12)
  persistence: number; // 지속성 점수 (+8)
  total: number;
}

/**
 * 세션 기반 점수 계산
 */
export function calculateMovementScore(session: MovementSession): MovementScore {
  let condition = 0;
  let persistence = 0;

  // 거리 기반 점수
  const distanceMatch = session.navigation.distance.match(/(\d+)/);
  const distanceMeters = distanceMatch ? parseInt(distanceMatch[1]) * (session.navigation.distance.includes("km") ? 1000 : 1) : 0;

  if (distanceMeters > 0) {
    // 1km당 +3 컨디션
    condition += Math.floor(distanceMeters / 1000) * 3;
  }

  // 시간 기반 점수
  const durationMatch = session.navigation.duration.match(/(\d+)/);
  const durationMinutes = durationMatch ? parseInt(durationMatch[1]) : 0;

  if (durationMinutes > 0) {
    // 10분당 +2 지속성
    persistence += Math.floor(durationMinutes / 10) * 2;
  }

  // 이동 수단 보너스
  if (session.navigation.travelMode === "WALKING") {
    condition += 5; // 도보 보너스
  } else if (session.navigation.travelMode === "BICYCLING") {
    condition += 8; // 자전거 보너스
  }

  // 경로 특성 보너스
  if (session.routeCharacteristics.quiet) {
    persistence += 2; // 한적한 길 보너스
  }

  if (session.routeCharacteristics.flat) {
    condition += 1; // 평지 보너스
  }

  // 컨디션 변화 보너스
  if (session.condition.end && session.condition.start !== session.condition.end) {
    if (session.condition.end === "good") {
      condition += 5; // 컨디션 개선 보너스
    }
  }

  return {
    condition: Math.min(condition, 50), // 최대 50
    persistence: Math.min(persistence, 50), // 최대 50
    total: condition + persistence,
  };
}

/**
 * 점수 표시 포맷
 */
export function formatMovementScore(score: MovementScore): {
  condition: string;
  persistence: string;
  total: string;
} {
  return {
    condition: score.condition > 0 ? `+${score.condition}` : `${score.condition}`,
    persistence: score.persistence > 0 ? `+${score.persistence}` : `${score.persistence}`,
    total: score.total > 0 ? `+${score.total}` : `${score.total}`,
  };
}
