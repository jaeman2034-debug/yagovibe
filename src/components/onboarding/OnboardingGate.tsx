/**
 * 🔥 OnboardingGate - 온보딩 게이트 컴포넌트
 * 
 * 역할:
 * - 특정 경로(팀 관련 페이지)에서 팀 유무 확인
 * - 팀 0개 → CreateTeamIntro 표시
 * - 팀 ≥1개 → children 렌더링 (정상 진행)
 * 
 * 최적화:
 * - team_members 단일 쿼리만 사용
 * - 스켈레톤 UI로 로딩 상태 표시
 * 
 * 주의:
 * - /sports-hub 같은 허브 페이지에서는 사용하지 않음
 * - 팀 관련 페이지(/sports/:type/team 등)에서만 사용
 */

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { useMyTeams } from "@/hooks/useMyTeams";
import { AppSkeleton } from "./AppSkeleton";
import { CreateTeamIntro } from "./CreateTeamIntro";

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { teamMembers, loading: teamsLoading, hasTeams } = useMyTeams();
  const location = useLocation();

  // 인증 대기 중
  if (authLoading) {
    return <AppSkeleton />;
  }

  // 로그인 안 됨 → children 렌더링 (ProtectedRoute에서 처리되지만 안전장치)
  if (!user) {
    return <>{children}</>;
  }

  // 팀 조회 중
  if (teamsLoading) {
    return <AppSkeleton />;
  }

  // 🔥 팀 생성 경로는 항상 제외 (팀이 없어도 생성 가능해야 함)
  // /team/create, /sports/:type/team/create, /in-app/sports/:type/team/create 모두 포함
  // ⚠️ 이 체크를 가장 먼저 해야 함 (패턴 매칭 전에)
  const isTeamCreatePath = location.pathname.includes('/team/create') || 
                           /\/sports\/[^/]+\/team\/create/.test(location.pathname);

  // 🔥 팀 생성 경로는 무조건 children 렌더링 (가드 통과)
  if (isTeamCreatePath) {
    return <>{children}</>;
  }

  // 🔥 팀이 필수인 경로 패턴 정의
  // /sports/**/team/** → 팀 페이지 (팀 필수)
  // 단, /team/create는 위에서 이미 제외됨
  // /team/:teamId, /teams/:teamId → 팀 상세 (팀 필수)
  // /app/team/:id → 팀 상세 (팀 필수)
  const teamRequiredPatterns = [
    /^\/sports\/[^/]+\/team(?!\/create)/,  // /sports/:type/team (단, /create 제외)
    /^\/team\/[^/]+$/,                      // /team/:teamId (팀 상세)
    /^\/teams\/[^/]+$/,                     // /teams/:teamId (팀 상세, 단 /teams/search 제외)
    /^\/app\/team\/[^/]+$/,                 // /app/team/:id (팀 상세)
  ];

  // 🔥 팀이 필수가 아닌 경로 (명시적 제외)
  const skipOnboardingPaths = [
    "/sports-hub",
    "/hub",
    "/home",
    "/",
    "/team/create",
    "/teams/search",
    "/app/team",  // /app/team (목록 페이지)
  ];

  // 공개 블로그는 제외 (팀 멤버가 아니어도 볼 수 있음)
  const isPublicBlog = location.pathname.match(/^\/teams\/[^/]+\/blog/);

  // 현재 경로가 팀 필수 경로인지 확인
  const isTeamRequired = teamRequiredPatterns.some((pattern) =>
    pattern.test(location.pathname)
  ) && !skipOnboardingPaths.includes(location.pathname) && !isPublicBlog;

  // 팀이 필수가 아닌 경로 → children 그대로 렌더링
  if (!isTeamRequired) {
    return <>{children}</>;
  }

  // 🔥 팀 필수 경로에서 팀 없음 상태를 "정상 상태"로 취급
  // 에러 ❌ / 예외 ❌
  // "아직 팀이 없어요" = 정상
  if (!hasTeams || teamMembers.length === 0) {
    return <CreateTeamIntro />;
  }

  // 🔥 팀 있음 → 정상적으로 children 렌더링
  return <>{children}</>;
}
