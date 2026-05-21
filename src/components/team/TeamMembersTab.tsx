/**
 * 🔥 멤버 탭 컴포넌트
 * 
 * 기존 TeamMembersPage로 리다이렉트
 */

import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

interface TeamMembersTabProps {
  teamId: string;
}

export function TeamMembersTab({ teamId }: TeamMembersTabProps) {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    // 기존 멤버 관리 페이지로 리다이렉트
    navigate(`/sports/${type}/team/members`, { replace: true });
  }, [type, navigate]);

  return null;
}
