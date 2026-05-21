import { useAuth } from "@/context/AuthProvider";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, QrCode, UserCircle } from "lucide-react";
import InstallAppButton from "@/components/InstallAppButton";
import { NotificationBell } from "@/components/platform/NotificationBell";
import { sportsCategories } from "@/data/sportsCategories";
import { getSportIcon, getSportLabel, normalizeSportId } from "@/constants/sports";

/** `/sports/:sport/market/...` — 홈과 동일 종목 아이콘·이름, Quick 진입 시 접두 표시 */
function resolveSportMarketHeaderLine(pathname: string, search: string): string | null {
  const match = pathname.match(/^\/sports\/([^/]+)\/market(?:\/|$)/);
  if (!match) return null;

  const raw = decodeURIComponent(match[1]);
  const sportId = normalizeSportId(raw);
  if (!sportId) return null;

  const row = sportsCategories.find((r) => r.sportId === sportId);
  const icon = row?.icon ?? getSportIcon(sportId);
  const label = row?.name ?? getSportLabel(sportId);

  const isQuick = new URLSearchParams(search).get("source") === "quick";
  if (isQuick) {
    return `⚡ 빠른 거래 · ${icon} ${label}`;
  }
  return `${icon} ${label} 거래`;
}

/** `/sports/:sport/recruit/create` — 종목·모집 (중복 문구 "팀원 모집" 제거) */
function resolveSportRecruitCreateHeaderLine(pathname: string): string | null {
  const m = pathname.match(/^\/sports\/([^/]+)\/recruit\/create$/);
  if (!m) return null;
  const raw = decodeURIComponent(m[1]);
  const sportId = normalizeSportId(raw);
  if (!sportId) return "모집";
  const row = sportsCategories.find((r) => r.sportId === sportId);
  const icon = row?.icon ?? getSportIcon(sportId);
  const label = row?.name ?? getSportLabel(sportId);
  return `${icon} ${label} · 모집`;
}

/** `/sports/:sport/match/create` */
function resolveSportMatchCreateHeaderLine(pathname: string): string | null {
  const m = pathname.match(/^\/sports\/([^/]+)\/match\/create$/);
  if (!m) return null;
  const raw = decodeURIComponent(m[1]);
  const sportId = normalizeSportId(raw);
  if (!sportId) return "매칭";
  const row = sportsCategories.find((r) => r.sportId === sportId);
  const icon = row?.icon ?? getSportIcon(sportId);
  const label = row?.name ?? getSportLabel(sportId);
  return `${icon} ${label} · 매칭`;
}

/** `/sports/:sport/team/create` 및 next/complete */
function resolveSportTeamCreateHeaderLine(pathname: string): string | null {
  const m = pathname.match(/^\/sports\/([^/]+)\/team\/create(?:\/|$)/);
  if (!m) return null;
  const raw = decodeURIComponent(m[1]);
  const sportId = normalizeSportId(raw);
  if (!sportId) return "팀";
  const row = sportsCategories.find((r) => r.sportId === sportId);
  const icon = row?.icon ?? getSportIcon(sportId);
  const label = row?.name ?? getSportLabel(sportId);
  return `${icon} ${label} · 팀`;
}

function resolveHeaderTitle(pathname: string): string {
  if (pathname === "/hub") return "허브";
  if (pathname === "/home") return "활동";
  if (pathname.startsWith("/voice-map") || pathname.startsWith("/voice")) return "지도";
  if (pathname.startsWith("/app/chats") || pathname.startsWith("/app/chat/")) return "채팅";
  if (pathname.startsWith("/me")) return "마이";
  if (pathname.startsWith("/market/map")) return "마켓";
  if (pathname.startsWith("/app/market")) return "마켓";
  if (pathname.startsWith("/match")) return "매칭";
  if (pathname.startsWith("/app/team")) return "팀";
  if (pathname.startsWith("/app/facility")) return "시설";
  return "YAGO SPORTS";
}

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const isRootPage = pathname === "/hub" || pathname === "/home";
  const title =
    resolveSportMarketHeaderLine(pathname, location.search) ??
    resolveSportRecruitCreateHeaderLine(pathname) ??
    resolveSportMatchCreateHeaderLine(pathname) ??
    resolveSportTeamCreateHeaderLine(pathname) ??
    resolveHeaderTitle(pathname);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("❌ 로그아웃 실패:", err);
      alert("로그아웃 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
  };

  return (
    <header
      className="sticky top-0 z-40 w-full shrink-0 border-b bg-white shadow-sm dark:bg-gray-800/90"
      data-app-shell-header
    >
      {/* 전체 가로폭 — 본문 max-w와 분리 (상단 바만 풀블리드) */}
      <div className="flex h-12 w-full min-w-0 items-center gap-2 px-4 sm:px-6 lg:px-8">
          {/* 좌측: 브랜딩 / 뒤로 + 타이틀 */}
          <div className="flex min-w-0 flex-1 items-center justify-start gap-2">
            {!isRootPage && (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="mr-0.5 shrink-0 rounded-full p-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                aria-label="뒤로가기"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {isRootPage ? (
              <>
                <UserCircle className="h-5 w-5 shrink-0 text-gray-700" aria-hidden />
                <span className="min-w-0 truncate text-sm font-semibold text-gray-800">YAGO SPORTS</span>
              </>
            ) : (
              <span className="min-w-0 truncate text-sm font-semibold text-gray-900">{title}</span>
            )}
          </div>

          {/* 우측: 알림 · QR · 설치 · 계정 (ml-auto로 행 끝 고정) */}
          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <NotificationBell variant="header" />
            <button
              type="button"
              onClick={() => navigate("/login/qr-phone")}
              className="rounded-full p-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              aria-label="QR 전화번호 로그인"
            >
              <QrCode className="h-5 w-5" />
            </button>
            <InstallAppButton variant="icon" />

            {user ? (
              <div className="flex items-center gap-2 whitespace-nowrap text-sm text-gray-600">
                <span className="hidden max-w-[120px] truncate text-xs text-gray-500 sm:block">
                  {user.displayName || user.email?.split("@")[0] || "사용자"}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                로그인
              </button>
            )}
          </div>
      </div>
    </header>
  );
}
