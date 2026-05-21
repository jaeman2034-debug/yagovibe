/**
 * 공지 공식 기준 하단 고정 문구
 * 
 * Sprint 8: 공식 시스템화 & 첫 접속 UX
 * 
 * 모든 Public 공지 화면 하단에 강제 삽입
 * → 전화·단톡 유입 차단 장치
 */

import { OfficialSystemBadge } from "@/components/common/OfficialSystemBadge";

export function NoticeOfficialFooter() {
  return <OfficialSystemBadge variant="footer" />;
}

