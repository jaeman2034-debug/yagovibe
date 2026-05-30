import { Navigate, useParams } from "react-router-dom";
import { isPlaceholderRouteParam } from "@/lib/team/teamRouteIds";

type Props = {
  children: React.ReactNode;
  /** 기본: 내 팀 목록 */
  fallbackTo?: string;
};

/**
 * `/team/:teamId` 등에서 `teamId`가 리터럴 `:teamId`일 때 Firestore 조회·권한 오류 방지.
 */
export function TeamRouteParamGuard({ children, fallbackTo = "/my-teams" }: Props) {
  const { teamId } = useParams<{ teamId: string }>();
  if (isPlaceholderRouteParam(teamId)) {
    return <Navigate to={fallbackTo} replace />;
  }
  return <>{children}</>;
}
