import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthProvider";
import { db } from "@/lib/firebase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteTeamLineup,
  getTeamLineup,
  sendLineupReminders,
  setLineupViewerOnce,
  setLineupResponse,
  subscribeLineupReminders,
  subscribeLineupResponses,
  subscribeLineupViewers,
  type LineupReminderDoc,
  type LineupResponseDoc,
  type LineupViewerDoc,
  type TeamLineupDoc,
  type TeamLineupPlayer,
} from "@/services/teamLineupService";

function renderPlayer(p: TeamLineupPlayer) {
  return `${p.name}${typeof p.jerseyNumber === "number" ? ` (#${p.jerseyNumber})` : ""} · ${p.position}`;
}

function formatLineupDetailTitle(teamName: string, lineup: TeamLineupDoc): string {
  const team = teamName.trim();
  const opp = (lineup.opponentName || "").trim();
  if (team && opp) return `${team} vs ${opp}`;
  const n = (lineup.name || "").trim();
  if (team && n) return `${team} ${n}`;
  return n || "이름 없는 라인업";
}

export default function TeamLineupDetailPage() {
  const REMINDER_COOLDOWN_MS = 10 * 60 * 1000;
  const { teamId, lineupId } = useParams<{ teamId: string; lineupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [lineup, setLineup] = useState<TeamLineupDoc | null>(null);
  const [teamDisplayName, setTeamDisplayName] = useState<string>("");
  const [responses, setResponses] = useState<Record<string, LineupResponseDoc>>({});
  const [viewers, setViewers] = useState<Record<string, LineupViewerDoc>>({});
  const [reminders, setReminders] = useState<Record<string, LineupReminderDoc>>({});
  const [responseFilter, setResponseFilter] = useState<
    "all" | "attending" | "absent" | "pending" | "viewed" | "unviewed"
  >("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reminding, setReminding] = useState(false);
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const totalMembers = (lineup?.starters.length ?? 0) + (lineup?.subs.length ?? 0);
  const attendingCount = Object.values(responses).filter((r) => r.status === "attending").length;
  const absentCount = Object.values(responses).filter((r) => r.status === "absent").length;
  const pendingCount = Math.max(0, totalMembers - attendingCount - absentCount);
  const myStatus = user?.uid ? responses[user.uid]?.status : undefined;
  const lineupMembers = lineup ? [...lineup.starters, ...lineup.subs] : [];
  const viewedMemberIds = new Set(Object.keys(viewers));
  const viewedCount = lineupMembers.filter((m) => viewedMemberIds.has(m.memberId)).length;
  const unviewedCount = Math.max(0, lineupMembers.length - viewedCount);
  const responseRows = lineupMembers.map((member) => {
    const status = responses[member.memberId]?.status ?? "pending";
    const viewed = viewedMemberIds.has(member.memberId);
    const reminderRaw = reminders[member.memberId]?.sentAt as
      | { toDate?: () => Date; seconds?: number }
      | undefined;
    const lastReminderAtMs =
      typeof reminderRaw?.toDate === "function"
        ? reminderRaw.toDate().getTime()
        : typeof reminderRaw?.seconds === "number"
          ? reminderRaw.seconds * 1000
          : null;
    return {
      memberId: member.memberId,
      name: member.name,
      position: member.position,
      jerseyNumber: member.jerseyNumber,
      status,
      viewed,
      lastReminderAtMs,
    };
  });
  const filteredResponseRows = responseRows.filter((row) => {
    if (responseFilter === "all") return true;
    if (responseFilter === "viewed") return row.viewed;
    if (responseFilter === "unviewed") return !row.viewed;
    return row.status === responseFilter;
  });
  const pendingViewedTargets = responseRows.filter((row) => row.status === "pending" && row.viewed);
  const pendingUnviewedTargets = responseRows.filter((row) => row.status === "pending" && !row.viewed);

  const canSendReminder = (lastReminderAtMs: number | null) => {
    if (lastReminderAtMs == null) return true;
    return Date.now() - lastReminderAtMs >= REMINDER_COOLDOWN_MS;
  };
  const pendingViewedEligible = pendingViewedTargets.filter((row) => canSendReminder(row.lastReminderAtMs));
  const pendingUnviewedEligible = pendingUnviewedTargets.filter((row) => canSendReminder(row.lastReminderAtMs));

  const formatRelativeMinutes = (ms: number | null): string => {
    if (ms == null) return "없음";
    const diff = Date.now() - ms;
    if (diff < 0) return "방금";
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return "방금";
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}분 전`;
    const hour = Math.floor(min / 60);
    if (hour < 24) return `${hour}시간 전`;
    const day = Math.floor(hour / 24);
    return `${day}일 전`;
  };

  const handleCopyLink = async () => {
    if (!shareUrl) {
      toast.error("공유 링크를 만들지 못했습니다.");
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("링크가 복사되었습니다.");
    } catch (error) {
      console.error("[TeamLineupDetailPage] 링크 복사 실패:", error);
      toast.error("복사에 실패했습니다.");
    }
  };

  const handleShare = async () => {
    if (!shareUrl) {
      toast.error("공유 링크를 만들지 못했습니다.");
      return;
    }
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: lineup ? formatLineupDetailTitle(teamDisplayName, lineup) : "라인업 공유",
          text: lineup
            ? `${formatLineupDetailTitle(teamDisplayName, lineup)} 라인업입니다. 확인해 주세요.`
            : "출전 라인업을 확인하세요.",
          url: shareUrl,
        });
        return;
      } catch (error) {
        // 사용자가 공유 시트를 닫은 경우는 에러 토스트를 띄우지 않음
        if ((error as { name?: string } | null)?.name === "AbortError") return;
      }
    }
    await handleCopyLink();
  };

  const handleRespond = async (status: "attending" | "absent") => {
    if (!teamId || !lineupId || !user?.uid) {
      toast.error("응답하려면 로그인이 필요합니다.");
      return;
    }
    try {
      await setLineupResponse(teamId, lineupId, user.uid, status);
      toast.success(status === "attending" ? "참석으로 응답했습니다." : "불참으로 응답했습니다.");
    } catch (error) {
      console.error("[TeamLineupDetailPage] 참석 응답 실패:", error);
      toast.error("응답 저장에 실패했습니다.");
    }
  };

  const handleSendReminders = async (targetMemberIds: string[], totalTargets: number) => {
    if (!teamId || !lineupId) return;
    if (totalTargets === 0) {
      toast.message("리마인드 대상이 없습니다.");
      return;
    }
    if (targetMemberIds.length === 0) {
      toast.message("모든 대상이 최근 알림 상태입니다 (10분 이내).");
      return;
    }
    setReminding(true);
    try {
      const result = await sendLineupReminders(teamId, lineupId, targetMemberIds);
      const cooldownSkipped = totalTargets - targetMemberIds.length;
      if (result.sent > 0) {
        toast.success(`${result.sent}명에게 리마인드를 보냈습니다.`);
      } else {
        toast.message("리마인드를 보낼 대상이 없습니다.");
      }
      if (cooldownSkipped > 0) {
        toast.message(`${cooldownSkipped}명은 쿨다운(10분)으로 제외했습니다.`);
      }
      if (result.skipped > 0) {
        toast.message(`중복 정리로 ${result.skipped}명은 건너뛰었습니다.`);
      }
    } catch (error) {
      console.error("[TeamLineupDetailPage] 리마인드 전송 실패:", error);
      toast.error("리마인드 전송에 실패했습니다.");
    } finally {
      setReminding(false);
    }
  };

  useEffect(() => {
    if (!teamId || !lineupId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await getTeamLineup(teamId, lineupId);
        if (!cancelled) setLineup(data);
      } catch (error) {
        console.error("[TeamLineupDetailPage] 상세 조회 실패:", error);
        if (!cancelled) toast.error("라인업을 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [teamId, lineupId]);

  useEffect(() => {
    if (!teamId || !lineupId) return;
    const unsub = subscribeLineupResponses(teamId, lineupId, setResponses);
    return () => unsub();
  }, [teamId, lineupId]);

  useEffect(() => {
    if (!teamId || !lineupId) return;
    const unsub = subscribeLineupViewers(teamId, lineupId, setViewers);
    return () => unsub();
  }, [teamId, lineupId]);

  useEffect(() => {
    if (!teamId || !lineupId) return;
    const unsub = subscribeLineupReminders(teamId, lineupId, setReminders);
    return () => unsub();
  }, [teamId, lineupId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!teamId?.trim()) return;
      try {
        const snap = await getDoc(doc(db, "teams", teamId));
        if (cancelled) return;
        if (!snap.exists()) {
          setTeamDisplayName("");
          return;
        }
        const data = snap.data() as Record<string, unknown>;
        setTeamDisplayName(String(data.name ?? data.displayName ?? data.teamName ?? "").trim());
      } catch {
        if (!cancelled) setTeamDisplayName("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  useEffect(() => {
    if (!teamId || !lineupId || !user?.uid) return;
    void setLineupViewerOnce(teamId, lineupId, user.uid);
  }, [teamId, lineupId, user?.uid]);

  if (!teamId || !lineupId) return null;

  return (
    <div className="w-full space-y-4 py-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        뒤로
      </button>

      {loading && <p className="text-sm text-gray-500">불러오는 중...</p>}

      {!loading && !lineup && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600">
          라인업을 찾을 수 없습니다.
        </div>
      )}

      {!loading && lineup && (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h1 className="text-xl font-bold text-gray-900">{formatLineupDetailTitle(teamDisplayName, lineup)}</h1>
            <p className="mt-1 text-xs text-gray-500">저장명: {lineup.name || "-"}</p>
            <p className="mt-1 text-sm text-gray-600">
              {lineup.date || "-"} · {lineup.formation || "-"}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              출전 가능 {Object.values(lineup.availableMap).filter((v) => v !== false).length}명 · 불참{" "}
              {Object.values(lineup.availableMap).filter((v) => v === false).length}명
            </p>
            <p className="mt-1 text-sm text-gray-600">
              참석 {attendingCount}명 · 불참 {absentCount}명 · 미응답 {pendingCount}명
            </p>
            <p className="mt-1 text-sm text-gray-600">
              확인 {viewedCount}명 · 미확인 {unviewedCount}명
            </p>
            <p className="mt-1 text-xs text-amber-700">
              확인했지만 미응답 {pendingViewedTargets.length}명 · 미확인 미응답 {pendingUnviewedTargets.length}명
            </p>
            <p className="mt-1 text-xs text-gray-500">
              내 상태:{" "}
              {myStatus === "attending" ? "참석" : myStatus === "absent" ? "불참" : "미응답"}
            </p>
            <div className="mt-3 flex gap-2">
              <Button type="button" variant="outline" asChild>
                <Link to={`/team/${encodeURIComponent(teamId)}/lineup/list`}>목록으로</Link>
              </Button>
              <Button
                type="button"
                className={
                  myStatus === "attending"
                    ? "bg-green-700 ring-2 ring-green-200 hover:bg-green-800"
                    : "bg-green-600 hover:bg-green-700"
                }
                onClick={() => void handleRespond("attending")}
              >
                참석
              </Button>
              <Button
                type="button"
                className={
                  myStatus === "absent"
                    ? "bg-red-700 ring-2 ring-red-200 hover:bg-red-800"
                    : "bg-red-600 hover:bg-red-700"
                }
                onClick={() => void handleRespond("absent")}
              >
                불참
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={reminding}
                onClick={() =>
                  void handleSendReminders(
                    pendingViewedEligible.map((row) => row.memberId),
                    pendingViewedTargets.length
                  )
                }
              >
                {reminding
                  ? "전송 중..."
                  : `확인했지만 미응답 (${pendingViewedEligible.length}/${pendingViewedTargets.length})`}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={reminding}
                onClick={() =>
                  void handleSendReminders(
                    pendingUnviewedEligible.map((row) => row.memberId),
                    pendingUnviewedTargets.length
                  )
                }
              >
                {reminding
                  ? "전송 중..."
                  : `미확인 미응답 (${pendingUnviewedEligible.length}/${pendingUnviewedTargets.length})`}
              </Button>
              <Button type="button" variant="outline" onClick={() => void handleCopyLink()}>
                링크 복사
              </Button>
              <Button type="button" className="bg-purple-600 hover:bg-purple-700" onClick={() => void handleShare()}>
                공유하기
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleting}
                onClick={() => {
                  setDeleteDialogOpen(true);
                }}
              >
                {deleting ? "삭제 중..." : "삭제"}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-gray-900">선발 ({lineup.starters.length})</h2>
              <ul className="mt-2 space-y-1 text-sm text-gray-700">
                {lineup.starters.map((p) => (
                  <li key={p.memberId}>{renderPlayer(p)}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-gray-900">교체 ({lineup.subs.length})</h2>
              <ul className="mt-2 space-y-1 text-sm text-gray-700">
                {lineup.subs.map((p) => (
                  <li key={p.memberId}>{renderPlayer(p)}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-900">응답 현황</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setResponseFilter("all")}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    responseFilter === "all"
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  전체 ({responseRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setResponseFilter("attending")}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    responseFilter === "attending"
                      ? "border-green-700 bg-green-700 text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  참석 ({attendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setResponseFilter("absent")}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    responseFilter === "absent"
                      ? "border-red-700 bg-red-700 text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  불참 ({absentCount})
                </button>
                <button
                  type="button"
                  onClick={() => setResponseFilter("pending")}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    responseFilter === "pending"
                      ? "border-amber-600 bg-amber-600 text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  미응답 ({pendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setResponseFilter("viewed")}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    responseFilter === "viewed"
                      ? "border-indigo-700 bg-indigo-700 text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  확인 ({viewedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setResponseFilter("unviewed")}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    responseFilter === "unviewed"
                      ? "border-slate-700 bg-slate-700 text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  미확인 ({unviewedCount})
                </button>
              </div>
            </div>

            <ul className="mt-3 space-y-2">
              {filteredResponseRows.map((row) => (
                <li key={row.memberId} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                  <p className="text-sm text-gray-800">
                    {row.name}
                    {typeof row.jerseyNumber === "number" ? ` (#${row.jerseyNumber})` : ""} · {row.position}
                  </p>
                  <p className="text-xs text-gray-500">마지막 알림: {formatRelativeMinutes(row.lastReminderAtMs)}</p>
                  <div className="flex items-center gap-1">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        row.status === "attending"
                          ? "bg-green-50 text-green-700"
                          : row.status === "absent"
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {row.status === "attending" ? "참석" : row.status === "absent" ? "불참" : "미응답"}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        row.viewed ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {row.viewed ? "확인" : "미확인"}
                    </span>
                  </div>
                </li>
              ))}
              {filteredResponseRows.length === 0 ? (
                <li className="rounded-lg border border-dashed border-gray-300 px-3 py-4 text-center text-sm text-gray-500">
                  선택한 상태의 응답자가 없습니다.
                </li>
              ) : null}
            </ul>
          </div>
        </>
      )}

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteDialogOpen(false);
        }}
      >
        <DialogContent
          className="max-w-sm"
          onEscapeKeyDown={(e) => {
            if (deleting) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (deleting) {
              e.preventDefault();
              return;
            }
            setDeleteDialogOpen(false);
          }}
          onInteractOutside={(e) => {
            if (deleting) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-red-600">라인업 삭제</DialogTitle>
            <DialogDescription>이 라인업을 삭제하시겠습니까?</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              <strong>
                {lineup ? formatLineupDetailTitle(teamDisplayName, lineup) : "이름 없는 라인업"}
              </strong>{" "}
              라인업을 삭제합니다.
            </p>
            <p className="font-medium text-red-500">이 작업은 되돌릴 수 없습니다.</p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => setDeleteDialogOpen(false)}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting || !lineup}
              onClick={async () => {
                if (!lineup || deleting) return;
                setDeleting(true);
                try {
                  await deleteTeamLineup(teamId, lineup.id);
                  toast.success("라인업이 삭제되었습니다.");
                  navigate(`/team/${encodeURIComponent(teamId)}/lineup/list`, { replace: true });
                } catch (error) {
                  console.error("[TeamLineupDetailPage] 삭제 실패:", error);
                  toast.error("라인업 삭제에 실패했습니다.");
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? "삭제 중..." : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

