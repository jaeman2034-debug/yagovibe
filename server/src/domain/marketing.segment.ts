/**
 * 🔥 Marketing Segment - 세그먼트 필터
 * 
 * Week5 핵심: 사용자 세그먼트 매칭
 */

/**
 * 사용자가 세그먼트 조건에 맞는지 확인
 * 
 * @param user 사용자 프로필
 * @param segmentJson 세그먼트 조건 (JSON string)
 * @returns 매칭 여부
 */
export function matchSegment(user: {
  id: string;
  region: string;
  level?: string | null;
  wLeague?: number;
  wRecruit?: number;
  wGround?: number;
  wMarket?: number;
}, segmentJson: string): boolean {
  try {
    const segment = JSON.parse(segmentJson);

    // 레벨 필터
    if (segment.level && user.level !== segment.level) {
      return false;
    }

    // 지역 필터
    if (segment.region && user.region !== segment.region) {
      return false;
    }

    // 관심 가중치 필터 (예: 대회 관심도 높은 사용자)
    if (segment.minWLeague && (user.wLeague || 0) < segment.minWLeague) {
      return false;
    }

    if (segment.minWRecruit && (user.wRecruit || 0) < segment.minWRecruit) {
      return false;
    }

    return true;
  } catch (error) {
    // 파싱 실패 시 모든 사용자에게 발송 (안전장치)
    console.error("[SEGMENT] Parse error:", error);
    return true;
  }
}

/**
 * 세그먼트 조건 예시 생성
 */
export function createSegmentExample(conditions: {
  level?: string;
  region?: string;
  minWLeague?: number;
  minWRecruit?: number;
}): string {
  return JSON.stringify(conditions);
}
