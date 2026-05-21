/**
 * 🔥 Global Navigation 컴포넌트
 * 
 * 역할:
 * - 플랫폼 전역 네비게이션
 * - Events, Teams, Players, Stats 링크
 */

import { Link, useLocation } from "react-router-dom";
import { Calendar, Users, Target, BarChart3 } from "lucide-react";

export function GlobalNavigation() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const navItems = [
    {
      label: "대회",
      path: "/events",
      icon: Calendar,
    },
    {
      label: "팀",
      path: "/teams",
      icon: Users,
    },
    {
      label: "선수",
      path: "/players",
      icon: Target,
    },
    {
      label: "통계",
      path: "/stats",
      icon: BarChart3,
    },
  ];

  return (
    <nav className="hidden md:flex items-center gap-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);

        return (
          <Link
            key={item.path}
            to={item.path}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              active
                ? "bg-blue-50 text-blue-700"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
