/**
 * P0-1 / P0-2 — Academy legacy path stabilization (no academies/* writes).
 * @see docs/YAGO_P0_STABILIZATION_SLICES.md
 */

import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { normalizeSportId } from "@/constants/sports";

function sportFromQuery(searchParams: URLSearchParams): string {
  const raw = searchParams.get("sport") ?? searchParams.get("type") ?? "soccer";
  return normalizeSportId(raw) ?? "soccer";
}

/** Canonical academy creation — teams.type=academy via existing TeamCreateForm */
export function AcademyCreateRedirect() {
  const [searchParams] = useSearchParams();
  const sport = sportFromQuery(searchParams);
  const qs = new URLSearchParams({ mode: "non-member", teamKind: "academy" });
  return (
    <Navigate
      to={`/sports/${encodeURIComponent(sport)}/team/create?${qs.toString()}`}
      replace
    />
  );
}

/** Legacy dashboard id — no academies SoT; send user to my teams */
export function AcademyDashboardLegacyRedirect() {
  return <Navigate to="/my-teams" replace />;
}

/** /academy/search etc. → sport hub team tab */
export function AcademySearchRedirect() {
  const [searchParams] = useSearchParams();
  const sport = sportFromQuery(searchParams);
  return (
    <Navigate
      to={`/sports/${encodeURIComponent(sport)}?tab=team`}
      replace
    />
  );
}

/** Sub-routes not implemented yet — placeholder, not 404 */
export function AcademyModulePlaceholder({ module }: { module: string }) {
  const labels: Record<string, string> = {
    programs: "훈련 프로그램",
    coaches: "코치 관리",
    teams: "유소년 팀",
  };
  const title = labels[module] ?? "아카데미";

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <p className="text-sm font-medium text-violet-700">아카데미 OS 준비 중</p>
      <h1 className="mt-2 text-xl font-bold text-gray-900">{title}</h1>
      <p className="mt-2 text-sm text-gray-600">
        아카데미는 별도 앱이 아니라 <strong>팀(유소년)</strong>으로 통합됩니다. 지금은 팀
        만들기·팀 찾기부터 이용해 주세요.
      </p>
      <div className="mt-6 flex flex-col gap-2">
        <Link
          to="/sports/soccer/team/create?mode=non-member&teamKind=academy"
          className="rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white"
        >
          아카데미(팀) 만들기
        </Link>
        <Link
          to="/teams/find?sport=soccer"
          className="rounded-lg border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-800"
        >
          팀 찾기
        </Link>
        <Link to="/sports/soccer?tab=team" className="text-center text-sm text-blue-600">
          종목 허브 팀 탭으로
        </Link>
      </div>
    </div>
  );
}

export function AcademyRootHubRedirect() {
  const [searchParams] = useSearchParams();
  const sport = sportFromQuery(searchParams);
  return (
    <Navigate
      to={`/sports/${encodeURIComponent(sport)}?tab=team`}
      replace
    />
  );
}

/** /academy/hub/:type legacy */
export function AcademyHubLegacyRedirect() {
  const { type } = useParams<{ type?: string }>();
  const sport = normalizeSportId(type ?? "soccer") ?? "soccer";
  const qs = new URLSearchParams({ mode: "non-member", teamKind: "academy" });
  return (
    <Navigate
      to={`/sports/${encodeURIComponent(sport)}/team/create?${qs.toString()}`}
      replace
    />
  );
}

export function AcademyProgramsPlaceholder() {
  return <AcademyModulePlaceholder module="programs" />;
}

export function AcademyCoachesPlaceholder() {
  return <AcademyModulePlaceholder module="coaches" />;
}

export function AcademyTeamsPlaceholder() {
  return <AcademyModulePlaceholder module="teams" />;
}
