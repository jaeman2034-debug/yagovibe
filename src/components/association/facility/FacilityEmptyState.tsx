/**
 * Facility Empty State 컴포넌트
 * 
 * 원칙:
 * - 전화/문의 유발 요소 절대 없음
 * - 공식 기준 명시
 */

import { EmptyState } from "@/components/common/EmptyState";

export function FacilityEmptyState() {
  return (
    <EmptyState
      title="현재 등록된 대관 정보가 없습니다."
      description="대관 현황은 본 페이지 기준으로 안내됩니다."
    />
  );
}
