import { useMemo, useCallback, useState, useEffect, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { RecommendedTeamRow } from "@/services/sportHubTeamDiscovery";
import { getSportIcon, normalizeSportId } from "@/constants/sports";
import { markTeamPlayEntryFromAppNav, teamPlayEntryPath } from "@/lib/team/teamPlayRoutes";
import { cn } from "@/lib/utils";

export interface RecommendedTeamCardProps {
  team: RecommendedTeamRow;
  sport: string;
  /** 목록 첫 번째 — 글로우·스케일·배지 */
  featured?: boolean;
}

function heroGradientForTeamId(teamId: string): string {
  let h = 0;
  for (let i = 0; i < teamId.length; i++) h = (h * 31 + teamId.charCodeAt(i)) >>> 0;
  const hue1 = h % 360;
  const hue2 = (hue1 + 48) % 360;
  return `linear-gradient(135deg, hsl(${hue1} 72% 46% / 0.55), hsl(${hue2} 68% 38% / 0.42))`;
}

export function RecommendedTeamCard({ team, sport, featured }: RecommendedTeamCardProps) {
  const navigate = useNavigate();
  const sid = normalizeSportId(sport) ?? "soccer";
  const fallbackIcon = getSportIcon(sid);

  const coverTrimmed = team.coverPhotoUrl?.trim() || null;
  const [coverFailed, setCoverFailed] = useState(false);
  useEffect(() => {
    setCoverFailed(false);
  }, [coverTrimmed]);

  const showBrandedCover = Boolean(coverTrimmed && !coverFailed);
  const logoTrimmed = team.logoUrl?.trim() || null;
  const [logoFailed, setLogoFailed] = useState(false);
  useEffect(() => {
    setLogoFailed(false);
  }, [logoTrimmed]);

  const heroStyle = useMemo(() => ({ background: heroGradientForTeamId(team.id) }), [team.id]);

  const goTeam = useCallback(() => {
    markTeamPlayEntryFromAppNav();
    navigate(teamPlayEntryPath(team.id));
  }, [navigate, team.id]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        goTeam();
      }
    },
    [goTeam]
  );

  return (
    <article
      tabIndex={0}
      role="link"
      aria-label={`${team.name}, 클럽으로 이동`}
      className={cn(
        "group flex cursor-pointer flex-col overflow-hidden rounded-2xl border-2 bg-white shadow-lg ring-1 ring-violet-500/10 outline-none",
        "transition-[transform,box-shadow,border-color,ring-color] duration-200 ease-out will-change-transform",
        "hover:scale-[1.02] hover:shadow-xl hover:ring-violet-500/30",
        "active:scale-[0.98] active:shadow-md",
        "focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:bg-gray-950 dark:ring-violet-400/10",
        "border-violet-300/90 hover:border-violet-500 dark:border-violet-800/80",
        featured &&
          cn(
            "z-[1] scale-[1.02] border-amber-400 shadow-2xl ring-2 ring-amber-400/40",
            "shadow-[0_0_0_1px_rgba(251,191,36,0.25),0_12px_40px_-10px_rgba(245,158,11,0.5)]",
            "hover:scale-[1.03] hover:border-amber-500 hover:shadow-[0_0_0_1px_rgba(251,191,36,0.35),0_16px_48px_-8px_rgba(245,158,11,0.55)]",
            "hover:ring-amber-400/50 active:scale-[1.01]",
            "dark:border-amber-500/85 dark:ring-amber-500/30"
          )
      )}
      onClick={goTeam}
      onKeyDown={onKeyDown}
    >
      <div className="relative h-32 w-full shrink-0 overflow-hidden bg-slate-900">
        {showBrandedCover ? (
          <>
            <img
              src={coverTrimmed!}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
              onError={() => setCoverFailed(true)}
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"
              aria-hidden
            />
          </>
        ) : logoTrimmed && !logoFailed ? (
          <img
            src={logoTrimmed}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <div
            className="relative flex h-full w-full items-center justify-center"
            style={heroStyle}
            aria-hidden
          >
            <span className="select-none text-5xl drop-shadow-md filter">{fallbackIcon}</span>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_55%)]" />
          </div>
        )}
        {featured ? (
          <span className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-amber-950 shadow-md">
            🔥 오늘의 추천
          </span>
        ) : null}
        {team.badgeLabel ? (
          <span className="absolute right-2 top-2 z-10 rounded-full bg-amber-400/95 px-2 py-0.5 text-[10px] font-bold text-amber-950 shadow">
            {team.badgeLabel}
          </span>
        ) : null}
        <span className="absolute left-2 top-2 z-10 rounded-md bg-black/45 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
          {team.tierLabel}
        </span>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div>
          <h3 className="line-clamp-2 pr-1 text-base font-bold text-gray-900 dark:text-white">{team.name}</h3>
          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-gray-600 dark:text-gray-400">
            <span>👥 {team.memberCount}명</span>
            {team.region ? (
              <>
                <span aria-hidden>·</span>
                <span>📍 {team.region}</span>
              </>
            ) : null}
            {team.matches != null && team.matches > 0 ? (
              <>
                <span aria-hidden>·</span>
                <span>⚽ 시즌 {team.matches}경기</span>
              </>
            ) : null}
          </div>
        </div>

        {/* 보조 힌트: 카드 전체가 주 CTA — 중복 강한 버튼 제거 */}
        <p
          className={cn(
            "pointer-events-none flex items-center gap-0.5 text-sm font-semibold text-violet-600 opacity-90 transition group-hover:opacity-100 dark:text-violet-400",
            featured && "text-amber-800 dark:text-amber-300"
          )}
          aria-hidden
        >
          <span>클럽 합류하기</span>
          <span className="transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden>
            →
          </span>
        </p>

        <div className="border-t border-gray-100 pt-1 dark:border-gray-800">
          <p className="text-xs font-medium leading-snug text-violet-700 dark:text-violet-300">{team.recommendReason}</p>
          {team.hasRecentMatch ? (
            <p className="mt-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              🏆 최근 2주 안에 경기 기록이 있어요
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
