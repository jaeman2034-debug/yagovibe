/**
 * RC4-5 M5 — Vision platform cross-surface navigation
 */

import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  visionCoachDashboardPath,
  visionMatchDetailPath,
  visionParentHomePath,
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
};

export function VisionPlatformNav({
  teamId,
  matchId,
  current,
  playerId,
  variant = "light",
  compact = false,
  className,
}: VisionPlatformNavProps) {
  const mid = matchId.trim();
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
      href: playerId?.trim()
        ? visionParentReportPath(teamId, playerId, mid)
        : visionParentHomePath(),
    },
    {
      id: "player-profile",
      label: "Player",
      href: playerId?.trim()
        ? visionPlayerProfilePath(teamId, playerId, { matchId: mid })
        : "#",
      hidden: !playerId?.trim(),
    },
  ].filter((item) => !item.hidden);

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
        return (
          <Link
            key={item.id}
            to={item.href}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors",
              compact && "px-2 py-0.5 text-[9px]",
              active
                ? variant === "dark"
                  ? "border-violet-400 bg-violet-600 text-white"
                  : "border-violet-600 bg-violet-600 text-white"
                : variant === "dark"
                  ? "border-violet-500/40 bg-violet-950/40 text-violet-100 hover:bg-violet-900/50"
                  : "border-violet-200 bg-white text-violet-800 hover:bg-violet-50"
            )}
            data-testid={`vision-nav-${item.id}`}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
