/**
 * RC4-5 M5 — Vision platform cross-surface navigation
 */

import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  scrollVisionSectionIntoView,
  VISION_COACH_SECTION_ID,
  VISION_TIMELINE_SECTION_ID,
  visionCoachDashboardPath,
  visionMatchDetailPath,
  visionParentReportPath,
  visionPlayerProfilePath,
  visionTeamHubPath,
  visionTimelinePath,
  type VisionPlatformSurface,
} from "@/lib/vision/visionPlatformRoutes";

export type VisionPlatformNavProps = {
  teamId: string;
  matchId: string;
  current: VisionPlatformSurface;
  playerId?: string;
  variant?: "light" | "dark";
  compact?: boolean;
  className?: string;
};

type NavItem = {
  id: VisionPlatformSurface;
  label: string;
  href: string;
  hidden?: boolean;
  disabled?: boolean;
};

function parsePathAndHash(href: string): { pathname: string; hashId: string } {
  const hashIdx = href.indexOf("#");
  if (hashIdx < 0) {
    const q = href.indexOf("?");
    return { pathname: q >= 0 ? href.slice(0, q) : href, hashId: "" };
  }
  const before = href.slice(0, hashIdx);
  const q = before.indexOf("?");
  return {
    pathname: q >= 0 ? before.slice(0, q) : before,
    hashId: href.slice(hashIdx + 1).trim(),
  };
}

export function VisionPlatformNav({
  teamId,
  matchId,
  current,
  playerId,
  variant = "light",
  compact = false,
  className,
}: VisionPlatformNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const mid = matchId.trim();
  const pid = playerId?.trim() ?? "";
  if (!teamId.trim() || !mid) return null;

  const items: NavItem[] = [
    {
      id: "team-hub",
      label: "팀 허브",
      href: visionTeamHubPath(teamId, mid),
    },
    {
      id: "coach",
      label: "Coach",
      href: visionCoachDashboardPath(teamId, mid),
    },
    {
      id: "match-detail",
      label: "Match",
      href: visionMatchDetailPath(teamId, mid),
    },
    {
      id: "timeline",
      label: "Timeline",
      href: visionTimelinePath(teamId, mid),
    },
    {
      id: "parent-report",
      label: "Parent",
      href: pid ? visionParentReportPath(teamId, pid, mid) : "#",
      disabled: !pid,
    },
    {
      id: "player-profile",
      label: "Player",
      href: pid
        ? visionPlayerProfilePath(teamId, pid, { matchId: mid })
        : "#",
      hidden: !pid,
    },
  ].filter((item) => !item.hidden);

  const activateSamePageHash = (hashId: string) => {
    const next = `${location.pathname}${location.search}#${hashId}`;
    if (`${location.pathname}${location.search}${location.hash}` !== next) {
      navigate(next);
    }
    // Retry briefly — section may mount after data load
    const tryScroll = (attempt: number) => {
      if (scrollVisionSectionIntoView(hashId)) return;
      if (attempt >= 8) return;
      window.setTimeout(() => tryScroll(attempt + 1), 50);
    };
    requestAnimationFrame(() => tryScroll(0));
  };

  return (
    <nav
      className={cn(
        "flex flex-wrap gap-1.5",
        compact ? "gap-1" : "gap-1.5",
        className
      )}
      aria-label="Vision 플랫폼 이동"
      data-testid="vision-platform-nav"
    >
      {items.map((item) => {
        const active = item.id === current;
        const baseClass = cn(
          "rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors",
          compact && "px-2 py-0.5 text-[9px]",
          active
            ? variant === "dark"
              ? "border-violet-400 bg-violet-600 text-white"
              : "border-violet-600 bg-violet-600 text-white"
            : variant === "dark"
              ? "border-violet-500/40 bg-violet-950/40 text-violet-100 hover:bg-violet-900/50"
              : "border-violet-200 bg-white text-violet-800 hover:bg-violet-50"
        );

        if (item.disabled) {
          return (
            <span
              key={item.id}
              className={cn(
                baseClass,
                "cursor-not-allowed opacity-40 hover:bg-inherit"
              )}
              data-testid={`vision-nav-${item.id}`}
              aria-disabled="true"
              title="playerId가 없어 Parent Report로 이동할 수 없습니다"
            >
              {item.label}
            </span>
          );
        }

        return (
          <Link
            key={item.id}
            to={item.href}
            className={baseClass}
            data-testid={`vision-nav-${item.id}`}
            aria-current={active ? "page" : undefined}
            onClick={(e) => {
              const { pathname, hashId } = parsePathAndHash(item.href);
              const samePath = pathname === location.pathname;

              if (item.id === "match-detail" && samePath) {
                e.preventDefault();
                if (location.hash) {
                  navigate(`${location.pathname}${location.search}`, { replace: false });
                }
                window.scrollTo({ top: 0, behavior: "smooth" });
                return;
              }

              if (
                samePath &&
                (hashId === VISION_COACH_SECTION_ID || hashId === VISION_TIMELINE_SECTION_ID)
              ) {
                e.preventDefault();
                activateSamePageHash(hashId);
              }
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
