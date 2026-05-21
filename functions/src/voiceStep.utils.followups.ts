/**
 * 🔄 Follow-up 자동 제안 생성기
 * Places 결과 기반으로 비서스러운 후속 질문 생성
 */

export type FollowupType =
  | 'NAVIGATE_NEAREST'
  | 'APPLY_FILTER'
  | 'RETRY'
  | 'SEARCH_ALTERNATIVE';

export interface Followup {
  id: string;
  label: string;
  type: FollowupType;
  patch?: {
    openNow?: boolean;
    parking?: boolean;
    sort?: 'NEAREST' | 'BEST_RATED' | 'DEFAULT';
  };
}

/**
 * Follow-up 생성
 */
export function buildFollowups(
  intent: 'SEARCH' | 'NAVIGATE',
  hasResults: boolean,
  hasNearest: boolean = false
): Followup[] {
  if (!hasResults) {
    return [{ id: 'RETRY', label: '다시 찾기', type: 'RETRY' }];
  }

  const base: Followup[] = [];

  // 가장 가까운 곳으로 안내 (결과가 있을 때만)
  if (hasNearest) {
    base.push({
      id: 'NAV_NEAREST',
      label: '가장 가까운 곳으로 안내',
      type: 'NAVIGATE_NEAREST',
    });
  }

  // 필터 옵션
  base.push(
    {
      id: 'FILTER_OPENNOW',
      label: '지금 영업 중만',
      type: 'APPLY_FILTER',
      patch: { openNow: true },
    },
    {
      id: 'FILTER_PARKING',
      label: '주차 가능만',
      type: 'APPLY_FILTER',
      patch: { parking: true },
    }
  );

  return base;
}
