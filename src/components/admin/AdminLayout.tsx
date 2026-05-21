/**
 * 🔥 Admin Layout 컴포넌트
 * 
 * 역할:
 * - Admin 페이지 공통 레이아웃
 * - Sidebar + Main Content 구조
 */

import { useState } from "react";
import { Outlet, Link, useLocation, useParams } from "react-router-dom";
import { useAuthUser } from "@/hooks/useAuthUser";
import { isAdmin } from "@/utils/hasRole";
import {
  LayoutDashboard,
  Building2,
  Calendar,
  Users,
  Target,
  Trophy,
  BarChart3,
  Settings,
  Menu,
  X,
} from "lucide-react";

export default function AdminLayout() {
  const location = useLocation();
  const { orgId } = useParams<{ orgId?: string }>();
  const { profile } = useAuthUser();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const isSuperAdmin = isAdmin(profile);

  const navigation = [
    {
      name: "대시보드",
      href: orgId ? `/admin/organizations/${orgId}` : "/admin",
      icon: LayoutDashboard,
    },
    {
      name: "조직",
      href: "/admin/organizations",
      icon: Building2,
      show: isSuperAdmin,
    },
    {
      name: "대회",
      href: orgId ? `/admin/organizations/${orgId}/events` : "/admin/events",
      icon: Calendar,
    },
    {
      name: "팀",
      href: orgId ? `/admin/organizations/${orgId}/teams` : "/admin/teams",
      icon: Users,
    },
    {
      name: "선수",
      href: orgId ? `/admin/organizations/${orgId}/players` : "/admin/players",
      icon: Target,
    },
    {
      name: "경기",
      href: orgId
        ? `/admin/organizations/${orgId}/matches`
        : "/admin/matches",
      icon: Trophy,
    },
    {
      name: "통계",
      href: orgId
        ? `/admin/organizations/${orgId}/stats`
        : "/admin/stats",
      icon: BarChart3,
    },
    {
      name: "설정",
      href: orgId
        ? `/admin/organizations/${orgId}/settings`
        : "/admin/settings",
      icon: Settings,
    },
  ].filter((item) => item.show !== false);

  const isActive = (href: string) => {
    if (href === "/admin" && location.pathname === "/admin") return true;
    if (href !== "/admin" && location.pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } fixed lg:static inset-y-0 left-0 z-50 bg-white border-r border-gray-200 transition-all duration-300 overflow-hidden`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h1 className="text-lg font-bold text-gray-900">Admin</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-xs font-medium text-blue-700">
                  {profile?.displayName?.[0] || "A"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {profile?.displayName || "Admin"}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {isSuperAdmin ? "Super Admin" : "Admin"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex-1" />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
