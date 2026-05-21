/**
 * Tournament Empty State 컴포넌트
 * 
 * 원칙:
 * - 전화/문의 유발 요소 절대 없음
 * - 공식 기준 명시
 */

import { EmptyState } from "@/components/common/EmptyState";

export function TournamentEmptyState() {
  return (
    <EmptyState
      title="현재 등록된 대회가 없습니다."
      description="대회 일정은 본 페이지 기준으로 안내됩니다."
    />
  );
}
