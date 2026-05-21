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

  return (
    <header
      className="federation-home-header bg-white border-b border-gray-200 relative z-[20]"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-2 pb-1">
        {/* Top Bar */}
        <div className="flex items-center justify-between h-12 sm:h-14">
          {/* Logo & Name */}
          <Link 
            to={`/federations/${federation.slug}`}
            className="flex items-center gap-1 hover:opacity-80 transition-opacity"
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
              <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium mt-0.5 truncate">{federation.region}</p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {mainMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${
                      isActive(item.path)
                        ? "bg-primary-50 text-primary-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* More Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${
                    showMoreMenu
                      ? "bg-primary-50 text-primary-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }
                `}
              >
                <MoreVertical className="w-4 h-4" />
                <span>더보기</span>
              </button>

              {showMoreMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowMoreMenu(false)}
                  />
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
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
                  </div>
                </>
              )}
            </div>
          </nav>

          {/* CTA — 리그 없음 온보딩 시 Hero 단일 CTA만 사용 (중복 방지) */}
          <div className="hidden md:flex items-center gap-3">
            {!emptyLeagueOnboarding && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => (window.location.href = `/sports/teams/create?federation=${federation.id}`)}
                >
                  팀 등록
                </Button>
                <Button
                  size="sm"
                  onClick={() => (window.location.href = `/federations/${federation.slug}/leagues`)}
                >
                  리그 참가
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-gray-600"
            onClick={() => setShowMoreMenu(!showMoreMenu)}
          >
            <MoreVertical className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Menu */}
        {showMoreMenu && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="space-y-1">
              {mainMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setShowMoreMenu(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium
                      ${
                        isActive(item.path)
                          ? "bg-primary-50 text-primary-700"
                          : "text-gray-700 hover:bg-gray-50"
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              <div className="border-t border-gray-200 pt-2 mt-2">
                {moreMenuItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setShowMoreMenu(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
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
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-blue-600 hover:bg-blue-50 w-full text-left"
                  >
                    수정하기
                  </button>
                )}
              </div>
              {!emptyLeagueOnboarding && (
                <div className="border-t border-gray-200 pt-2 mt-2 space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => (window.location.href = `/sports/teams/create?federation=${federation.id}`)}
                  >
                    팀 등록
                  </Button>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => (window.location.href = `/federations/${federation.slug}/leagues`)}
                  >
                    리그 참가
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
