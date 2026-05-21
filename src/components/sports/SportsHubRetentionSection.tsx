import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppCard } from "@/components/ui/AppCard";
import { Button } from "@/components/ui/button";
import { useSportsHubUser } from "@/context/SportsHubUserContext";
import { useSportsHubRetentionSignals } from "@/hooks/useSportsHubRetentionSignals";
import { usePlatformNotifications } from "@/hooks/usePlatformNotifications";
import type { UserStage } from "@/lib/sportsHubRecommendation";
import { normalizeSportId } from "@/constants/sports";
import { resolveLastSportId } from "@/utils/sportHubHref";
import type { Notification } from "@/types/notification";

function sportSegForHub(profile: Record<string, unknown> | null | undefined): string {
  if (profile && typeof profile === "object") {
    const last = profile.lastSport;
    if (typeof last === "string" && last.trim()) {
      const n = normalizeSportId(last.trim());
      if (n) return n;
    }
  }
  const fromHub = resolveLastSportId();
  const n = normalizeSportId(fromHub);
  return n || "soccer";
}

function hrefForNotification(n: Notification): string | null {
  const t = n.target;
  if (t?.screen === "match" && t.id) return `/match/${encodeURIComponent(t.id)}`;
  if (t?.screen === "chat" && t.id) return `/chat/${encodeURIComponent(t.id)}`;
  if (t?.screen === "team" && t.id) return `/teams/${encodeURIComponent(t.id)}/play`;
  if (typeof n.link === "string" && n.link.startsWith("/")) return n.link;
  return null;
}

type TodoRow = { key: string; label: string; hint?: string; onClick: () => void };

export function SportsHubRetentionSection({ stage }: { stage: UserStage }) {
  const navigate = useNavigate();
  const { user, userState, profile, pendingApplicantRequestCount } = useSportsHubUser();
  const { chatUnreadTotal, loading: chatUnreadLoading } = useSportsHubRetentionSignals();
  const { notifications, unreadCount: platformUnreadCount, loading: notifLoading } = usePlatformNotifications({
    limitCount: 12,
  });

  const sportSeg = useMemo(() => sportSegForHub(profile ?? undefined), [profile]);
  const enc = encodeURIComponent(sportSeg);

  const todos: TodoRow[] = useMemo(() => {
    const list: TodoRow[] = [];
    if (!user?.uid) return list;

    if (!userState.hasTeam) {
      list.push({
        key: "team",
        label: "팀 만들기",
        hint: "경기·모집을 쓰려면 팀이 필요해요.",
        onClick: () => navigate("/team/create"),
      });
      return list;
    }

    if (userState.matchCount === 0) {
      list.push({
        key: "match",
        label: "첫 경기(매칭) 만들기",
        hint: "상대 팀을 찾거나 팀원과 일정을 잡을 수 있어요.",
        onClick: () => navigate("/match/create"),
      });
    }

    if (userState.teamMemberCount >= 0 && userState.teamMemberCount < 5) {
      list.push({
        key: "recruit",
        label: "팀원 모집 글 올리기",
        hint: "멤버가 늘면 매칭·연락이 쉬워져요.",
        onClick: () => navigate(`/sports/${enc}/recruit/create`),
      });
    }

    if (userState.activityCount === 0 && userState.matchCount > 0) {
      list.push({
        key: "activity",
        label: "팀 활동 한 줄 남기기",
        hint: "피드에 올리면 팀원이 다시 들어올 이유가 생겨요.",
        onClick: () => navigate("/activity"),
      });
    }

    return list;
  }, [user?.uid, userState, navigate, enc]);

  const firstUnreadNotif = useMemo(
    () => notifications.find((n) => !n.isRead) ?? null,
    [notifications]
  );

  const waitingBlocks = useMemo(() => {
    const rows: Array<{ key: string; text: string; cta: string; onClick: () => void }> = [];
    if (chatUnreadTotal > 0) {
      rows.push({
        key: "chat",
        text:
          chatUnreadTotal === 1
            ? "채팅에서 확인하지 않은 메시지가 있어요."
            : `채팅에서 확인하지 않은 메시지가 ${chatUnreadTotal}건 있어요.`,
        cta: "채팅 열기",
        onClick: () => navigate("/app/chats"),
      });
    }
    if (platformUnreadCount > 0) {
      rows.push({
        key: "notif",
        text:
          platformUnreadCount === 1
            ? "알림 1건이 아직 읽히지 않았어요."
            : `알림 ${platformUnreadCount}건이 아직 읽히지 않았어요.`,
        cta: "알림함",
        onClick: () => navigate("/notifications"),
      });
    }
    if (pendingApplicantRequestCount > 0) {
      rows.push({
        key: "match-req",
        text:
          pendingApplicantRequestCount === 1
            ? "보낸 매칭 참여 신청이 호스트의 응답을 기다리고 있어요."
            : `보낸 매칭 참여 신청 ${pendingApplicantRequestCount}건이 응답을 기다리고 있어요.`,
        cta: "매칭 보기",
        onClick: () => navigate("/match"),
      });
    }
    return rows;
  }, [chatUnreadTotal, platformUnreadCount, pendingApplicantRequestCount, navigate]);

  const retentionLoading = chatUnreadLoading || notifLoading;

  if (!user?.uid) return null;

  const showTodos = stage !== "NEW" && todos.length > 0;
  const showWaiting = waitingBlocks.length > 0;
  const showEvent = !!firstUnreadNotif;

  if (retentionLoading && !showTodos && !showWaiting && !showEvent) {
    return (
      <div className="mb-6 h-24 animate-pulse rounded-xl bg-gray-200/70 dark:bg-gray-800/70" aria-hidden />
    );
  }

  if (!showTodos && !showWaiting && !showEvent) return null;

  return (
    <div className="mb-6 space-y-4">
      {showWaiting ? (
        <AppCard className="border-rose-100 bg-rose-50/60 dark:border-rose-900/30 dark:bg-rose-950/20">
          <h3 className="text-sm font-semibold text-rose-900 dark:text-rose-100">지금 확인할 일</h3>
          <ul className="mt-3 space-y-3">
            {waitingBlocks.map((w) => (
              <li key={w.key} className="flex flex-col gap-2 rounded-lg border border-rose-100/80 bg-white/80 p-3 dark:border-rose-900/25 dark:bg-gray-900/40 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-rose-900/95 dark:text-rose-50/95">{w.text}</p>
                <Button type="button" variant="secondary" size="sm" className="shrink-0" onClick={w.onClick}>
                  {w.cta}
                </Button>
              </li>
            ))}
          </ul>
        </AppCard>
      ) : null}

      {showTodos ? (
        <AppCard>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">오늘 할 일</h3>
          <ul className="mt-3 space-y-2">
            {todos.map((t) => (
              <li key={t.key}>
                <button
                  type="button"
                  onClick={t.onClick}
                  className="flex w-full flex-col items-start gap-0.5 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2.5 text-left transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/40 dark:hover:bg-gray-800"
                >
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{t.label}</span>
                  {t.hint ? <span className="text-xs text-gray-500 dark:text-gray-400">{t.hint}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </AppCard>
      ) : null}

      {showEvent && firstUnreadNotif ? (
        <AppCard className="border-sky-100 bg-sky-50/50 dark:border-sky-900/30 dark:bg-sky-950/20">
          <h3 className="text-sm font-semibold text-sky-900 dark:text-sky-100">새로운 소식</h3>
          <p className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">{firstUnreadNotif.title}</p>
          {firstUnreadNotif.message ? (
            <p className="mt-1 line-clamp-2 text-xs text-gray-600 dark:text-gray-400">{firstUnreadNotif.message}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                const href = hrefForNotification(firstUnreadNotif);
                if (href) navigate(href);
                else navigate("/notifications");
              }}
            >
              열어보기
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => navigate("/notifications")}>
              전체 알림
            </Button>
          </div>
        </AppCard>
      ) : null}
    </div>
  );
}
