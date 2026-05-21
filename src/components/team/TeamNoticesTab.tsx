/**
 * 🔥 공지 탭 컴포넌트
 * 
 * 기존 TeamNotificationPage로 리다이렉트
 */

import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

interface TeamNoticesTabProps {
  teamId: string;
}

export function TeamNoticesTab({ teamId }: TeamNoticesTabProps) {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    // 기존 공지 페이지로 리다이렉트
    navigate(`/sports/${type}/team/notifications`, { replace: true });
  }, [type, navigate]);

  return null;
}
