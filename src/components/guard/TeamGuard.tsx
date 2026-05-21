/**
 * 🔥 TeamGuard - 팀 접근 가드 래퍼 (React Router)
 * 
 * 역할:
 * - URL의 teamId 기반으로 팀 접근 체크
 * - 권한/플랜 검증
 * - 자동 리디렉션 (needLogin, needTeam, needUpgrade)
 * 
 * ⚠️ 중요: Public 페이지에서는 절대 사용 금지
 * - Public 페이지: /market/map, /app/market, /home, /me, /team/:teamId/public 등
 * - 멤버 전용 팀 라우트에만 사용: /team/:teamId(내부), /teams/:teamId/manage 등
 * 
 * 사용:
 * <Route path="/teams/:teamId/manage" element={
 *   <ProtectedRoute>
 *     <TeamGuard>
 *       <TeamManagePage />
 *     </TeamGuard>
 *   </ProtectedRoute>
 * } />
 */

import { useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { useGuardQuery } from "@/hooks/useGuardQuery";
import { AppSkeleton } from "@/components/onboarding/AppSkeleton";
import Paywall from "@/components/Paywall";

interface TeamGuardProps {
  children: React.ReactNode;
  /** 필요한 플랜 (없으면 플랜 체크 안 함) */
  requiredPlan?: "pro" | "academy_pro";
  /** Paywall 트리거 타입 */
  trigger?: "unpaid_notification" | "payment_link" | "attendance_stats" | "multiple_admins";
}

export function TeamGuard({ 
  children, 
  requiredPlan,
  trigger = "attendance_stats",
}: TeamGuardProps) {
  const { teamId } = useParams<{ teamId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data, loading } = useGuardQuery(user?.uid, teamId, requiredPlan);

  // Guard 결과에 따른 처리
  useEffect(() => {
    if (loading || !data) return;

    switch (data.type) {
      case "needLogin":
        navigate("/login", { replace: true });
        break;
      
      case "needTeam": {
        const enc = teamId ? encodeURIComponent(teamId) : "";
        const onPlayPath = Boolean(teamId && location.pathname.includes(`/teams/${teamId}/play`));
        if (onPlayPath) {
          navigate(`/teams/${enc}?hint=playMember`, { replace: true });
          break;
        }
        const isInternalTeamPath =
          Boolean(teamId) &&
          location.pathname.startsWith(`/team/${teamId}`) &&
          !location.pathname.startsWith(`/team/${teamId}/public`);
        if (isInternalTeamPath) {
          navigate(`/team/${enc}/public`, { replace: true });
          break;
        }
        navigate("/select-team", { replace: true });
        break;
      }
      
      case "needUpgrade":
        // Paywall은 컴포넌트에서 처리
        break;
      
      case "ok":
        // 🔥 K-5: 팀 삭제 확인 (새로고침/딥링크 안전장치)
        if (data.team?.isDeleted === true) {
          if (!window.location.pathname.startsWith("/sports")) {
            console.log("🔥 NAVIGATE ROOT TRIGGERED [TeamGuard:deleted-team]", window.location.pathname);
          navigate("/", { replace: true });
          }
          return;
        }
        // 정상 접근
        break;
    }
  }, [data, loading, navigate, teamId, location.pathname]);

  // 로딩 중
  if (loading || !data) {
    return <AppSkeleton />;
  }

  // 로그인 필요
  if (data.type === "needLogin") {
    return null; // navigate가 처리함
  }

  // 팀 필요
  if (data.type === "needTeam") {
    return null; // navigate가 처리함
  }

  // 업그레이드 필요 → Upgrade 페이지로 리디렉션
  if (data.type === "needUpgrade") {
    const from = trigger || "pro";
    navigate(`/t/${teamId}/upgrade?from=${from}`, { replace: true });
    return null;
  }

  // 정상 접근
  return <>{children}</>;
}
