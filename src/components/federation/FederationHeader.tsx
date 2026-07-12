"use client";

import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Trophy,
  Calendar,
  Users,
  BarChart3,
  Bell,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface FederationHeaderProps {
  federation: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
    region: string;
  };
  /** 리그 없음 온보딩: 헤더도 단일 CTA만 */
  emptyLeagueOnboarding?: boolean;
  canEdit?: boolean;
  onRequestEdit?: () => void;
}

export function FederationHeader({
  federation,
  emptyLeagueOnboarding = false,
  canEdit = false,
  onRequestEdit,
}: FederationHeaderProps) {
  const location = useLocation();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const mainMenuItems = [
    { path: `/federations/${federation.slug}`, label: "홈", icon: Home },
    { path: `/federations/${federation.slug}/leagues`, label: "리그", icon: Trophy },
    { path: `/federations/${federation.slug}/matches`, label: "경기", icon: Calendar },
    { path: `/federations/${federation.slug}/teams`, label: "팀", icon: Users },
    { path: `/federations/${federation.slug}/standings`, label: "순위", icon: BarChart3 },
    { path: `/federations/${federation.slug}/announcements`, label: "공지", icon: Bell },
  ];

  const moreMenuItems = [
    { path: `/federations/${federation.slug}?tab=about`, label: "협회소개" },
    { path: `/federations/${federation.slug}?tab=regulations`, label: "자료실" },
    { path: `/federations/${federation.slug}?tab=youth`, label: "유소년" },
    { path: `/federations/${federation.slug}?tab=contact`, label: "문의" },
  ];

  const isActive = (path: string) => {
    if (path === `/federations/${federation.slug}`) {
      return location.pathname === path && !location.search;
    }
    return location.pathname.startsWith(path);
  };

  const nameParts = federation.name.trim().split(/\s+/).filter(Boolean);
  const nameTop = nameParts[0] || federation.name || "협회";
  const nameBottom = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

  const navLinkClass = (path: string) =>
    `
      inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg
      text-xs sm:text-sm font-medium transition-colors
      ${
        isActive(path)
          ? "bg-primary-50 text-primary-700"
          : "text-gray-700 hover:bg-gray-50"
      }
    `;

  return (
    <header className="federation-home-header bg-white border-b border-gray-200 relative z-[20]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-2 pb-1">
        {/* Top Bar — logo + desktop CTAs */}
        <div className="flex items-center justify-between gap-2 h-12 sm:h-14">
          <Link
            to={`/federations/${federation.slug}`}
            className="flex items-center gap-1 hover:opacity-80 transition-opacity min-w-0"
          >
            {federation.logoUrl ? (
              <img
                src={federation.logoUrl}
                alt={federation.name}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-md object-contain shadow-sm border border-gray-200 bg-white shrink-0"
              />
            ) : (
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary-600 to-primary-800 rounded-md flex items-center justify-center shadow-md shrink-0">
                <Trophy className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
            )}
            <div className="min-w-0 flex flex-col justify-center">
              <h1 className="text-sm sm:text-lg font-semibold leading-tight text-gray-900">
                <span className="block text-gray-900">{nameTop}</span>
                {nameBottom ? <span className="block text-gray-500">{nameBottom}</span> : null}
              </h1>
              <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium mt-0.5 truncate">
                {federation.region}
              </p>
            </div>
          </Link>

          {/* Desktop CTAs only — not primary nav */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {!emptyLeagueOnboarding && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    (window.location.href = `/sports/teams/create?federation=${federation.id}`)
                  }
                >
                  팀 등록
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    (window.location.href = `/federations/${federation.slug}/leagues`)
                  }
                >
                  리그 참가
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Primary top nav — same 7 items on mobile & desktop (wrap, no page-level scroll) */}
        <nav
          className="flex flex-wrap items-center gap-0.5 sm:gap-1 justify-start md:justify-center py-1.5 sm:py-2"
          aria-label="협회 주요 메뉴"
        >
          {mainMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.path} to={item.path} className={navLinkClass(item.path)}>
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={`
                inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg
                text-xs sm:text-sm font-medium transition-colors
                ${
                  showMoreMenu
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-700 hover:bg-gray-50"
                }
              `}
            >
              <MoreVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>더보기</span>
            </button>

            {showMoreMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMoreMenu(false)}
                  aria-hidden
                />
                <div className="absolute top-full left-0 md:left-auto md:right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  {moreMenuItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setShowMoreMenu(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {item.label}
                    </Link>
                  ))}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreMenu(false);
                        onRequestEdit?.();
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50"
                    >
                      수정하기
                    </button>
                  )}
                  {!emptyLeagueOnboarding && (
                    <div className="md:hidden border-t border-gray-200 mt-1 pt-1 px-2 space-y-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setShowMoreMenu(false);
                          window.location.href = `/sports/teams/create?federation=${federation.id}`;
                        }}
                      >
                        팀 등록
                      </Button>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setShowMoreMenu(false);
                          window.location.href = `/federations/${federation.slug}/leagues`;
                        }}
                      >
                        리그 참가
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
