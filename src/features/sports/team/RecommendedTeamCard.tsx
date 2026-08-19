import {
  useMemo,
  useCallback,
  useState,
  useEffect,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { MoreVertical } from "lucide-react";
import type { RecommendedTeamRow } from "@/services/sportHubTeamDiscovery";
import { getSportIcon, normalizeSportId } from "@/constants/sports";
import { markTeamPlayEntryFromAppNav, teamPlayEntryPath } from "@/lib/team/teamPlayRoutes";
import { sharePublicTeamHubKakaoOrWebShare } from "@/services/kakaoShare";
import { isTeamAdmin } from "@/lib/team/roleConstants";
import { useAuth } from "@/context/AuthProvider";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export interface RecommendedTeamCardProps {
  team: RecommendedTeamRow;
  sport: string;
  /** 목록 첫 번째 — 미세 강조만 (레이아웃 동일) */
  featured?: boolean;
}

function heroGradientForTeamId(teamId: string): string {
  let h = 0;
  for (let i = 0; i < teamId.length; i++) h = (h * 31 + teamId.charCodeAt(i)) >>> 0;
  const hue1 = h % 360;
  const hue2 = (hue1 + 48) % 360;
  return `linear-gradient(135deg, hsl(${hue1} 72% 46% / 0.55), hsl(${hue2} 68% 38% / 0.42))`;
}

function useIsNarrowViewport(breakpointPx = 640): boolean {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(`(max-width: ${breakpointPx - 1}px)`).matches : true
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const onChange = () => setNarrow(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [breakpointPx]);
  return narrow;
}

export function RecommendedTeamCard({ team, sport, featured }: RecommendedTeamCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const sid = normalizeSportId(sport) ?? "soccer";
  const fallbackIcon = getSportIcon(sid);
  const isNarrow = useIsNarrowViewport();

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

  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  /** Canonical 팀 홈 — 카드 클릭 / 메뉴「팀 홈」 */
  const teamHomePath = `/team/${encodeURIComponent(team.id)}/public`;
  /** Play Lounge — 메뉴「팀 라운지」·팀 홈 PLAY NOW */
  const teamLoungePath = teamPlayEntryPath(team.id);

  const goTeamHome = useCallback(() => {
    navigate(teamHomePath);
  }, [navigate, teamHomePath]);

  const goTeamLounge = useCallback(() => {
    markTeamPlayEntryFromAppNav();
    navigate(teamLoungePath);
  }, [navigate, teamLoungePath]);

  /** 협회 공개 페이지 slug — 연결된 협회만 (없으면 협회 메뉴 숨김) */
  const federationSlug =
    team.federationSlug?.trim() ||
    (team.source === "federation" ? "nowon-football" : "");
  const federationPublicPath = federationSlug
    ? `/federations/${encodeURIComponent(federationSlug)}`
    : null;
  const federationCmsLinkPath = federationSlug
    ? `/federations/${encodeURIComponent(federationSlug)}/admin?section=teams`
    : null;

  const goFederationHome = useCallback(() => {
    if (!federationPublicPath) return;
    navigate(federationPublicPath);
  }, [navigate, federationPublicPath]);

  const goFederationCmsLinkManage = useCallback(() => {
    if (!federationCmsLinkPath) return;
    navigate(federationCmsLinkPath);
  }, [navigate, federationCmsLinkPath]);

  const onCardKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        goTeamHome();
      }
    },
    [goTeamHome]
  );

  /** 메뉴 열릴 때만 관리자 여부 조회 (N+1 최소화, UI-only) */
  useEffect(() => {
    if (!menuOpen || !user?.uid) {
      if (!menuOpen) setIsAdmin(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const snap = await getDoc(doc(db, "teams", team.id, "members", user.uid));
        if (cancelled) return;
        const role = snap.exists() ? String((snap.data() as { role?: unknown }).role ?? "") : "";
        setIsAdmin(isTeamAdmin(role));
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [menuOpen, team.id, user?.uid]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const handleShare = useCallback(async () => {
    closeMenu();
    try {
      await sharePublicTeamHubKakaoOrWebShare({
        teamId: team.id,
        teamName: team.name,
        imageUrl: coverTrimmed || logoTrimmed,
      });
    } catch {
      try {
        const url = `${window.location.origin}${teamHomePath}`;
        await navigator.clipboard.writeText(url);
        window.alert("팀 링크를 복사했어요.");
      } catch {
        window.alert("공유를 완료하지 못했어요. 잠시 후 다시 시도해 주세요.");
      }
    }
  }, [closeMenu, team.id, team.name, coverTrimmed, logoTrimmed, teamHomePath]);

  const handleReport = useCallback(() => {
    closeMenu();
    window.alert("신고 기능은 준비 중입니다.");
  }, [closeMenu]);

  const openMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(true);
  }, []);

  const isFederation = team.source === "federation";
  const showNewTeam = !team.tierLabel && team.isNewTeam !== false;
  const homepageHint = isFederation
    ? "홈페이지 연결"
    : team.recommendReason?.includes("홈페이지")
      ? "홈페이지 연결"
      : null;

  const menuActions = (
    <>
      <button
        type="button"
        className="flex w-full items-center px-4 py-3 text-left text-sm text-gray-900 hover:bg-gray-50 active:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800"
        onClick={(e) => {
          e.stopPropagation();
          closeMenu();
          goTeamHome();
        }}
      >
        팀 홈
      </button>
      <button
        type="button"
        className="flex w-full items-center px-4 py-3 text-left text-sm font-medium text-violet-700 hover:bg-violet-50 active:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-950/40"
        onClick={(e) => {
          e.stopPropagation();
          closeMenu();
          goTeamLounge();
        }}
      >
        팀 라운지
      </button>
      <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
      {federationPublicPath ? (
        <button
          type="button"
          className="flex w-full items-center px-4 py-3 text-left text-sm text-gray-900 hover:bg-gray-50 active:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800"
          onClick={(e) => {
            e.stopPropagation();
            closeMenu();
            goFederationHome();
          }}
        >
          협회 홈페이지
          {team.federationName ? (
            <span className="ml-1 truncate text-xs font-normal text-gray-400">
              · {team.federationName}
            </span>
          ) : null}
        </button>
      ) : null}
      <button
        type="button"
        className="flex w-full items-center px-4 py-3 text-left text-sm text-gray-900 hover:bg-gray-50 active:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800"
        onClick={(e) => {
          e.stopPropagation();
          void handleShare();
        }}
      >
        공유하기
      </button>
      <button
        type="button"
        className="flex w-full items-center px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 active:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
        onClick={(e) => {
          e.stopPropagation();
          handleReport();
        }}
      >
        신고하기
      </button>
      {isAdmin ? (
        <>
          <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
          <button
            type="button"
            className="flex w-full items-center px-4 py-3 text-left text-sm text-gray-900 hover:bg-gray-50 active:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800"
            onClick={(e) => {
              e.stopPropagation();
              closeMenu();
              navigate(`/teams/${encodeURIComponent(team.id)}/manage?tab=settings`);
            }}
          >
            팀 정보 수정
          </button>
          {federationCmsLinkPath ? (
            <button
              type="button"
              className="flex w-full items-center px-4 py-3 text-left text-sm text-gray-900 hover:bg-gray-50 active:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800"
              onClick={(e) => {
                e.stopPropagation();
                closeMenu();
                goFederationCmsLinkManage();
              }}
            >
              협회 공개 홈페이지 연결 관리
            </button>
          ) : null}
        </>
      ) : null}
    </>
  );

  const bottomSheet =
    menuOpen && isNarrow && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[100060] flex items-end justify-center bg-black/40 sm:hidden"
            role="presentation"
            onClick={(e) => {
              e.stopPropagation();
              closeMenu();
            }}
          >
            <div
              role="menu"
              aria-label={`${team.name} 추가 메뉴`}
              className="w-full max-w-lg animate-in slide-in-from-bottom rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-xl dark:bg-gray-950"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center py-2">
                <span className="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
              </div>
              <p className="truncate px-4 pb-1 text-xs font-medium text-gray-500">{team.name}</p>
              <div className="pb-2">{menuActions}</div>
              <button
                type="button"
                className="w-full border-t border-gray-100 px-4 py-3.5 text-sm font-medium text-gray-600 dark:border-gray-800 dark:text-gray-300"
                onClick={(e) => {
                  e.stopPropagation();
                  closeMenu();
                }}
              >
                닫기
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <article
      tabIndex={0}
      role="link"
      aria-label={`${team.name}, 팀 홈으로 이동`}
      className={cn(
        "group relative flex h-[110px] cursor-pointer items-center gap-3 overflow-visible rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none sm:h-[120px]",
        "transition-[background-color,border-color,box-shadow,transform] duration-150",
        "hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm",
        "active:scale-[0.99] active:bg-gray-100",
        "focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1",
        "dark:border-gray-800 dark:bg-gray-950 dark:hover:border-gray-700 dark:hover:bg-gray-900",
        featured && "border-amber-300/80 bg-amber-50/40 dark:border-amber-700/50 dark:bg-amber-950/20"
      )}
      onClick={goTeamHome}
      onKeyDown={onCardKeyDown}
    >
      {/* 우측 상단 ⋮ — 부가 기능만 */}
      <div
        className="absolute right-1.5 top-1.5 z-20"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {isNarrow ? (
          <button
            type="button"
            aria-label={`${team.name} 더보기`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 active:bg-gray-200 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            onClick={openMenu}
          >
            <MoreVertical className="h-5 w-5" aria-hidden />
          </button>
        ) : (
          <DropdownMenu portal open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`${team.name} 더보기`}
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 active:bg-gray-200 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-5 w-5" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 py-1">
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  goTeamHome();
                }}
              >
                팀 홈
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer font-medium text-violet-700 focus:text-violet-700"
                onClick={(e) => {
                  e.stopPropagation();
                  goTeamLounge();
                }}
              >
                팀 라운지
              </DropdownMenuItem>
              <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
              {federationPublicPath ? (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    goFederationHome();
                  }}
                >
                  협회 홈페이지
                  {team.federationName ? (
                    <span className="ml-1 truncate text-xs text-gray-400">· {team.federationName}</span>
                  ) : null}
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleShare();
                }}
              >
                공유하기
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-red-600 focus:text-red-600"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReport();
                }}
              >
                신고하기
              </DropdownMenuItem>
              {isAdmin ? (
                <>
                  <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/teams/${encodeURIComponent(team.id)}/manage?tab=settings`);
                    }}
                  >
                    팀 정보 수정
                  </DropdownMenuItem>
                  {federationCmsLinkPath ? (
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        goFederationCmsLinkManage();
                      }}
                    >
                      협회 공개 홈페이지 연결 관리
                    </DropdownMenuItem>
                  ) : null}
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {bottomSheet}

      {/* 좌측 커버 4:3 — mobile 100×75 / desktop 120×90 */}
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-lg bg-slate-800",
          "h-[75px] w-[100px] sm:h-[90px] sm:w-[120px]"
        )}
      >
        {showBrandedCover ? (
          <img
            src={coverTrimmed!}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
            onError={() => setCoverFailed(true)}
          />
        ) : logoTrimmed && !logoFailed ? (
          <img
            src={logoTrimmed}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <div
            className="relative flex h-full w-full items-center justify-center"
            style={heroStyle}
            aria-hidden
          >
            <span className="select-none text-2xl drop-shadow-md filter sm:text-3xl">{fallbackIcon}</span>
          </div>
        )}
      </div>

      {/* 우측 텍스트 스택 */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-px pr-7">
        <div className="flex items-center gap-2">
          <h3 className="line-clamp-1 text-[18px] font-bold leading-snug text-gray-900 dark:text-white">
            {team.name}
          </h3>
          {featured ? (
            <span className="shrink-0 rounded bg-amber-400/90 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">
              추천
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {team.tierLabel ? (
            <span className="rounded bg-violet-100 px-1.5 py-px text-[10px] font-semibold text-violet-800 dark:bg-violet-950 dark:text-violet-200">
              {team.tierLabel}
            </span>
          ) : showNewTeam ? (
            <span className="rounded bg-emerald-100 px-1.5 py-px text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              신규팀
            </span>
          ) : null}
          {team.badgeLabel ? (
            <span
              className={cn(
                "rounded px-1.5 py-px text-[10px] font-semibold",
                isFederation || team.badgeLabel === "협회 연결"
                  ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
              )}
            >
              {team.badgeLabel}
            </span>
          ) : null}
        </div>

        <p className="truncate text-xs leading-snug text-gray-500 dark:text-gray-400">
          {team.region ? <span>{team.region}</span> : null}
          {team.region ? <span aria-hidden> · </span> : null}
          <span>회원 {team.memberCount}명</span>
        </p>

        {/* 상태 힌트(비클릭) — 홈페이지 보기는 ⋮ 메뉴로 */}
        {homepageHint ? (
          <p className="pointer-events-none truncate text-[11px] font-medium leading-snug text-sky-700 dark:text-sky-400">
            {homepageHint}
          </p>
        ) : null}

        <p
          className={cn(
            "pointer-events-none text-xs font-semibold leading-snug text-violet-600 transition group-hover:text-violet-700 dark:text-violet-400",
            featured && "text-amber-800 dark:text-amber-300"
          )}
          aria-hidden
        >
          클럽 합류하기 →
        </p>
      </div>
    </article>
  );
}
