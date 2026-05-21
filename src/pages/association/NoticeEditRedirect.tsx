/**
 * 공지 수정 리디렉션 페이지
 * /association/:associationId/admin/notices/:noticeId/edit
 * 
 * 역할:
 * - 존재하지 않는 edit 라우트 접근 시 NoticeListPage로 리디렉션
 * - query parameter로 edit 모드 활성화
 */

import { useParams, Navigate } from "react-router-dom";

export default function NoticeEditRedirect() {
  const { associationId, noticeId } = useParams<{ associationId: string; noticeId: string }>();
  
  if (!associationId || !noticeId) {
    return <Navigate to="/" replace />;
  }
  
  // NoticeListPage로 리디렉션하며 edit 파라미터 추가
  return <Navigate to={`/association/${associationId}/notices?edit=${noticeId}`} replace />;
}

