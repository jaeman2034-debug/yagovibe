/**
 * 매칭 상세 — 요약 카드 · 위치/지도 · 조건 · 팀 · 참가·연락 CTA
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, ExternalLink, MapPin, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthProvider";
import { useMyTeams } from "@/hooks/useMyTeams";
import { startMatchJoinPayment } from "@/lib/match/matchJoinPaymentFlow";
import {
  acceptMatchRequest,
  ensureMatchInquiryChatRoom,
  rejectMatchRequest,
  requestMatch,
  submitMatchResult,
} from "@/services/matchService";
import type { Match, MatchRequest } from "@/types/match";
import { getSportLabel, type SportType } from "@/types/sport";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { toDate } from "@/utils/timeUtils";
import {
  formatMatchDetailSummary,
  googleMapsEmbedUrl,
  googleMapsOpenUrl,
} from "@/utils/matchDetailFormat";
import {
  getMatchFlowPhase,
  isMatchKickoffInPast,
  matchFlowPhaseLabel,
  matchFlowPhaseStyle,
} from "@/utils/matchFlowPhase";
import { track } from "@/lib/eventLog";

interface TeamOption {
  id: string;
  name: string;
  role?: string;
}

const CARD =
  "mb-4 md:mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:p-6";

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { teamMembers } = useMyTeams();

  const applyRef = useRef<HTMLElement>(null);
  const requestsRef = useRef<HTMLElement>(null);
  const trackedDetailViewRef = useRef<string | null>(null);

  const [match, setMatch] = useState<Match | null>(null);
  const [requests, setRequests] = useState<MatchRequest[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [hostTeamExtra, setHostTeamExtra] = useState<{
    region?: string;
    description?: string;
  } | null>(null);

  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  /** Firestore snapshot 거부 시 문서 없음과 구분 (규칙 미배포·권한 등) */
  const [matchListenDenied, setMatchListenDenied] = useState(false);
  const [matchChatOpening, setMatchChatOpening] = useState(false);
  /** 매칭 스레드(chatRooms/match_{id}) — 상세에서 채팅 연결 UX */
  const [matchChatRoomMeta, setMatchChatRoomMeta] = useState<{
    loaded: boolean;
    exists: boolean;
    isMember: boolean;
  }>({ loaded: false, exists: false, isMember: false });

  const adminTeams = useMemo(
    () =>
      teams.filter((t) => {
        const role = (t.role || "").toLowerCase();
        return role === "owner" || role === "admin";
      }),
    [teams]
  );

  const canManageHost = useMemo(() => {
    if (!match || !user?.uid) return false;
    if (match.authorId === user.uid) return true;
    return adminTeams.some((t) => t.id === match.teamId);
  }, [match, user?.uid, adminTeams]);

  const hasAppliedWithMyTeam = useMemo(() => {
    if (!requests.length || !adminTeams.length) return false;
    const mine = new Set(adminTeams.map((t) => t.id));
    return requests.some((r) => mine.has(r.teamId));
  }, [requests, adminTeams]);

  const isParticipantInMatched = useMemo(() => {
    if (!match || match.status !== "matched" || !match.opponentTeamId) return false;
    return adminTeams.some(
      (t) => t.id === match.teamId || t.id === match.opponentTeamId
    );
  }, [match, adminTeams]);

  const canSeeContactDetail =
    canManageHost ||
    hasAppliedWithMyTeam ||
    isParticipantInMatched;

  const pendingRequestCount = useMemo(
    () => requests.filter((r) => r.status === "pending").length,
    [requests]
  );

  const flowPhase = match
    ? getMatchFlowPhase(match, pendingRequestCount)
    : null;

  useEffect(() => {
    if (!flashMessage) return;
    const t = window.setTimeout(() => setFlashMessage(null), 4200);
    return () => window.clearTimeout(t);
  }, [flashMessage]);

  /** 매칭 글 + 참가 신청 — Firestore 실시간 반영 (다른 유저 신청·호스트 수락 등) */
  useEffect(() => {
    if (!id) {
      setMatch(null);
      setRequests([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setMatchListenDenied(false);
    let cancelled = false;

    const matchRef = doc(db, "matches", id);
    const unsubMatch = onSnapshot(
      matchRef,
      (snap) => {
        if (cancelled) return;
        setMatchListenDenied(false);
        if (!snap.exists()) {
          setMatch(null);
          setLoading(false);
          return;
        }
        setMatch({ id: snap.id, ...snap.data() } as Match);
        setLoading(false);
      },
      (err) => {
        if (cancelled) return;
        const code =
          err && typeof err === "object" && "code" in err
            ? String((err as { code?: string }).code)
            : "";
        if (code === "permission-denied") {
          setMatchListenDenied(true);
        }
        setMatch(null);
        setLoading(false);
      }
    );

    const reqQ = query(
      collection(db, "match_requests"),
      where("matchId", "==", id),
      limit(120)
    );
    const unsubReq = onSnapshot(
      reqQ,
      (snap) => {
        if (cancelled) return;
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MatchRequest));
        list.sort((a, b) => {
          const ta = toDate(a.createdAt)?.getTime() ?? 0;
          const tb = toDate(b.createdAt)?.getTime() ?? 0;
          return tb - ta;
        });
        setRequests(list);
      },
      () => {
        if (cancelled) return;
        setRequests([]);
      }
    );

    return () => {
      cancelled = true;
      unsubMatch();
      unsubReq();
    };
  }, [id]);

  useEffect(() => {
    const run = async () => {
      const loaded = await Promise.all(
        teamMembers.map(async (tm) => {
          const snap = await getDoc(doc(db, "teams", tm.teamId));
          return {
            id: tm.teamId,
            name: (snap.data()?.name as string) || tm.teamId,
            role: tm.role,
          };
        })
      );
      setTeams(loaded);
    };
    void run();
  }, [teamMembers]);

  useEffect(() => {
    if (!match?.teamId) return;
    void getDoc(doc(db, "teams", match.teamId)).then((snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setHostTeamExtra({
          region: d.region as string | undefined,
          description: d.description as string | undefined,
        });
      }
    });
  }, [match?.teamId]);

  /** 연결된 협의 채팅방 문서 구독 — 매칭 상세에서 진입 경로 명확화 */
  useEffect(() => {
    if (!id || !user?.uid) {
      setMatchChatRoomMeta({ loaded: true, exists: false, isMember: false });
      return;
    }
    const roomRef = doc(db, "chatRooms", `match_${id}`);
    const unsub = onSnapshot(
      roomRef,
      (snap) => {
        if (!snap.exists()) {
          setMatchChatRoomMeta({ loaded: true, exists: false, isMember: false });
          return;
        }
        const d = snap.data() as { members?: string[]; participants?: string[] };
        const members = d.members || d.participants || [];
        setMatchChatRoomMeta({
          loaded: true,
          exists: true,
          isMember: members.includes(user.uid),
        });
      },
      () => {
        setMatchChatRoomMeta({ loaded: true, exists: false, isMember: false });
      }
    );
    return () => unsub();
  }, [id, user?.uid]);

  /** Firestore에 방 문서가 있으면 하단 중복 채팅 CTA 숨김 — 상단 카드만 사용 */
  const suppressFooterChatCta =
    Boolean(user?.uid) && matchChatRoomMeta.loaded && matchChatRoomMeta.exists;

  const matchChatStatusBadge = useMemo(() => {
    if (!user?.uid || !matchChatRoomMeta.loaded) return null;
    if (matchChatRoomMeta.exists && matchChatRoomMeta.isMember) {
      return {
        label: "채팅 진행 중",
        textClass: "text-emerald-700",
        dotClass: "bg-emerald-500",
      };
    }
    if (matchChatRoomMeta.exists) {
      return {
        label: "협의방 열림 · 참여 가능",
        textClass: "text-amber-800",
        dotClass: "bg-amber-500",
      };
    }
    return {
      label: "채팅 시작 전",
      textClass: "text-gray-500",
      dotClass: "bg-gray-300",
    };
  }, [user?.uid, matchChatRoomMeta]);

  const matchChatCardSubtitle = useMemo(() => {
    if (!user?.uid || !match) return "";
    if (!matchChatRoomMeta.loaded) return "연결 정보를 불러오는 중…";
    if (matchChatRoomMeta.exists && matchChatRoomMeta.isMember) {
      return "일정·장소 조율 내용은 채팅에 남겨 두면 나중에 확인하기 좋아요.";
    }
    if (matchChatRoomMeta.exists) {
      return "방에 들어가면 대화에 참여할 수 있어요.";
    }
    return "버튼을 누르면 이 매칭 전용 협의 채팅방이 열려요.";
  }, [user?.uid, match, matchChatRoomMeta]);

  const availableApplyTeams = useMemo(() => {
    if (!match) return [];
    const alreadyRequestedTeamIds = new Set(requests.map((r) => r.teamId));
    return adminTeams.filter(
      (t) => t.id !== match.teamId && !alreadyRequestedTeamIds.has(t.id)
    );
  }, [adminTeams, match, requests]);

  const summary = match ? formatMatchDetailSummary(match) : null;
  const matchRegion = match?.matchRegion || match?.region || "";
  const source = searchParams.get("source") || "detail";
  const sourceRank = Number(searchParams.get("rank") || "");
  const sourceDistanceKm = Number(searchParams.get("distanceKm") || "");
  const sourceRemainingSlots = Number(searchParams.get("remainingSlots") || "");
  const normalizedRank = Number.isFinite(sourceRank) && sourceRank > 0 ? sourceRank : null;
  const normalizedDistanceKm =
    Number.isFinite(sourceDistanceKm) && sourceDistanceKm >= 0 ? sourceDistanceKm : null;
  const normalizedRemainingSlots =
    Number.isFinite(sourceRemainingSlots) && sourceRemainingSlots >= 0 ? sourceRemainingSlots : null;

  const mapsSearchUrl = match
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        [match.stadium, matchRegion].filter(Boolean).join(" ") || matchRegion
      )}`
    : "";

  useEffect(() => {
    if (!id || !match) return;
    if (trackedDetailViewRef.current === id) return;
    trackedDetailViewRef.current = id;
    void track("match_detail_view", {
      matchId: id,
      source,
      rank: normalizedRank,
      distanceKm: normalizedDistanceKm,
      remainingSlots: normalizedRemainingSlots,
      sport: match.sport,
    });
  }, [id, match, source, normalizedRank, normalizedDistanceKm, normalizedRemainingSlots]);

  const handleRequest = async () => {
    if (!id || !selectedTeamId) return;
    const targetTeam = availableApplyTeams.find((t) => t.id === selectedTeamId);
    if (!targetTeam) return;
    setSubmitting(true);
    try {
      await requestMatch(
        id,
        targetTeam.id,
        targetTeam.name,
        message.trim() || undefined,
        user
          ? {
              uid: user.uid,
              displayName: user.displayName ?? user.email ?? null,
              photoURL: user.photoURL ?? null,
            }
          : undefined
      );
      setMessage("");
      setSelectedTeamId("");
      setFlashMessage("신청이 접수되었습니다. 호스트의 수락을 기다려주세요.");
      toast.success("신청이 접수되었습니다. 호스트의 수락을 기다려주세요.");
    } catch {
      toast.error("매칭 지원에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickJoin = async () => {
    if (!id || !match) return;
    if (!user) {
      navigate("/login", { state: { from: `/match/${id}` } });
      return;
    }
    if (canManageHost) {
      toast.message("내가 올린 경기입니다.");
      return;
    }
    if (hasAppliedWithMyTeam) {
      toast.message("이미 참가 신청이 완료되었습니다.");
      return;
    }
    if (availableApplyTeams.length === 0) {
      toast.error("참가 가능한 팀 권한이 없습니다.");
      return;
    }

    const targetTeam = availableApplyTeams[0];
    const fee = Number(match.fee ?? 0);
    setSubmitting(true);
    try {
      void track("match_join_click", {
        matchId: id,
        source,
        rank: normalizedRank,
        distanceKm: normalizedDistanceKm,
        remainingSlots: normalizedRemainingSlots,
        teamId: targetTeam.id,
        amount: Number.isFinite(fee) && fee > 0 ? fee : 0,
      });
      if (Number.isFinite(fee) && fee > 0) {
        await startMatchJoinPayment({
          matchId: id,
          amount: fee,
          teamId: targetTeam.id,
          teamName: targetTeam.name,
        });
        return;
      }

      await requestMatch(
        id,
        targetTeam.id,
        targetTeam.name,
        "원클릭 참가 신청",
        {
          uid: user.uid,
          displayName: user.displayName ?? user.email ?? null,
          photoURL: user.photoURL ?? null,
        }
      );
      navigate(`/match/success?matchId=${encodeURIComponent(id)}`);
    } catch (error) {
      console.error(error);
      toast.error("결제 또는 참가 처리에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async (request: MatchRequest) => {
    if (!id || !canManageHost) return;
    setSubmitting(true);
    try {
      await acceptMatchRequest({
        matchId: id,
        requestId: request.id,
        opponentTeamId: request.teamId,
        opponentTeamName: request.teamName,
      });
      setFlashMessage("매칭이 확정되었습니다 🎉 다른 신청은 자동으로 거절되었습니다.");
    } catch {
      toast.error("승인 처리에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (request: MatchRequest) => {
    if (!id || !canManageHost) return;
    if (!window.confirm(`${request.teamName} 신청을 거절할까요?`)) return;
    setSubmitting(true);
    try {
      await rejectMatchRequest({ matchId: id, requestId: request.id });
      setFlashMessage("해당 신청을 거절했습니다.");
    } catch {
      toast.error("거절 처리에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitResult = async () => {
    if (!id || !canManageHost || match!.status !== "matched") return;
    const home = Number(homeScore);
    const away = Number(awayScore);
    if (!Number.isFinite(home) || !Number.isFinite(away) || home < 0 || away < 0) {
      toast.error("점수를 올바르게 입력해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      await submitMatchResult({
        matchId: id,
        homeScore: home,
        awayScore: away,
      });
      setFlashMessage("경기 결과가 저장되었습니다. 경기가 종료되었습니다.");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "결과 저장에 실패했습니다.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDrawFinish = async () => {
    if (!id || !match || !canManageHost || match.status !== "matched") return;
    if (
      !window.confirm(
        "무승부(0:0)로 경기를 종료할까요? 양 팀 전적에 반영됩니다."
      )
    ) {
      return;
    }
    setSubmitting(true);
    try {
      await submitMatchResult({
        matchId: id,
        homeScore: 0,
        awayScore: 0,
      });
      setFlashMessage("경기가 종료되었습니다.");
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "종료 처리에 실패했습니다.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToRequests = () =>
    requestsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const openMatchThreadChat = useCallback(async () => {
    if (!match || !id) return;
    if (!user) {
      navigate("/login", { state: { from: `/match/${id}` } });
      return;
    }
    setMatchChatOpening(true);
    try {
      await ensureMatchInquiryChatRoom(match.id, user.uid);
      navigate(`/chat/match_${match.id}`);
    } catch (e) {
      console.error(e);
      toast.error(
        e instanceof Error
          ? e.message
          : "채팅방을 열 수 없습니다. 잠시 후 다시 시도해 주세요."
      );
    } finally {
      setMatchChatOpening(false);
    }
  }, [match, id, user, navigate]);

  const titleText = match
    ? match.status === "matched" && match.opponentTeamName
      ? `${match.teamName} vs ${match.opponentTeamName}`
      : `${match.teamName} · 상대 모집`
    : "";

  const contactQuickActions = () => {
    if (!match || !canSeeContactDetail || !match.contactDetail) return null;
    const raw = match.contactDetail.trim();
    const digits = raw.replace(/\D/g, "");
    if (match.contact === "전화" || match.contact === "문자") {
      if (digits.length >= 9) {
        return (
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={`tel:${digits}`}
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-sm font-medium text-gray-800"
            >
              전화 걸기
            </a>
            {match.contact === "문자" ? (
              <a
                href={`sms:${digits}`}
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-sm font-medium text-gray-800"
              >
                문자 보내기
              </a>
            ) : null}
          </div>
        );
      }
    }
    if (match.contact === "카카오톡" && /^https?:\/\//i.test(raw)) {
      return (
        <Button
          type="button"
          variant="outline"
          className="mt-3 w-full"
          onClick={() => window.open(raw, "_blank", "noopener,noreferrer")}
        >
          카카오톡 채널 열기
        </Button>
      );
    }
    return null;
  };

  if (!id) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gray-50 text-sm text-gray-600">
        잘못된 접근입니다.
      </div>
    );
  }
  if (loading) {
    return (
      <div className="min-h-dvh w-full bg-gray-50 py-8">
        <div className="w-full space-y-4 md:space-y-6">
          <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
          <div className="h-40 animate-pulse rounded-2xl bg-gray-200" />
          <div className="h-32 animate-pulse rounded-2xl bg-gray-200" />
        </div>
      </div>
    );
  }
  if (!match) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-gray-50 px-4">
        <p className="text-center text-sm text-gray-600">
          {matchListenDenied
            ? "매칭 정보를 불러올 권한이 없거나(Firestore 규칙), 네트워크 오류입니다. 관리자에게 rules 배포 여부를 확인하거나 목록에서 다시 시도해 주세요."
            : "매칭을 찾을 수 없습니다. 링크의 글 ID가 잘못되었거나 삭제되었을 수 있어요."}
        </p>
        <Button variant="outline" onClick={() => navigate("/match")}>
          목록으로
        </Button>
      </div>
    );
  }

  const lat = match.stadiumLat;
  const lng = match.stadiumLng;
  const hasPin =
    lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);

  const participateCta = (() => {
    if (match.status === "finished") {
      return (
        <div className="space-y-2">
          <Button
            variant="outline"
            className="h-12 w-full rounded-xl"
            onClick={() => navigate("/match")}
          >
            목록으로 돌아가기
          </Button>
          {!suppressFooterChatCta ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-xl border-gray-300 text-base font-semibold"
              disabled={matchChatOpening}
              onClick={() => void openMatchThreadChat()}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              {matchChatOpening ? "열리는 중…" : "채팅 시작하기"}
            </Button>
          ) : (
            <p className="text-center text-xs text-gray-500">
              종료된 매칭의 대화는 상단 <span className="font-medium text-gray-700">연결된 채팅</span>
              카드에서 이어갈 수 있어요.
            </p>
          )}
        </div>
      );
    }
    if (match.status === "matched") {
      if (suppressFooterChatCta) {
        return (
          <p className="text-sm leading-relaxed text-gray-600">
            상대 팀과 일정·장소 조율은 상단{" "}
            <span className="font-semibold text-gray-900">채팅방으로</span> 버튼에서만 이어가면
            돼요.
          </p>
        );
      }
      return (
        <Button
          className="h-12 w-full rounded-xl bg-gray-900 text-base font-semibold text-white hover:bg-gray-800"
          disabled={matchChatOpening}
          onClick={() => void openMatchThreadChat()}
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          {matchChatOpening ? "열리는 중…" : "채팅 시작하기"}
        </Button>
      );
    }
    if (!user) {
      return (
        <div className="space-y-2">
          <Button
            className="h-12 w-full rounded-xl bg-gray-900 text-base font-semibold text-white hover:bg-gray-800"
            onClick={() => navigate("/login", { state: { from: `/match/${id}` } })}
          >
            로그인 후 참가·채팅하기
          </Button>
          <p className="text-center text-xs text-gray-500">
            로그인 후 참가 신청과 매칭 채팅을 이용할 수 있어요.
          </p>
        </div>
      );
    }
    if (canManageHost) {
      return (
        <div className="space-y-2">
          <Button
            variant="outline"
            className="h-12 w-full rounded-xl border-gray-300 text-base font-semibold"
            onClick={scrollToRequests}
          >
            지원 내역 확인
          </Button>
          {!suppressFooterChatCta ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-xl border-gray-300 text-base font-semibold"
              disabled={matchChatOpening}
              onClick={() => void openMatchThreadChat()}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              {matchChatOpening ? "열리는 중…" : "채팅 시작하기"}
            </Button>
          ) : null}
        </div>
      );
    }
    if (hasAppliedWithMyTeam) {
      return (
        <div className="space-y-2">
          <Button
            className="h-12 w-full cursor-not-allowed rounded-xl border-0 bg-gray-100 text-base font-semibold text-gray-500"
            disabled
          >
            신청 완료
          </Button>
          {!suppressFooterChatCta ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-xl border-gray-300 text-base font-semibold"
              disabled={matchChatOpening}
              onClick={() => void openMatchThreadChat()}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              {matchChatOpening ? "열리는 중…" : "채팅 시작하기"}
            </Button>
          ) : (
            <p className="text-center text-xs text-gray-500">
              호스트와 소통은 상단 채팅 카드에서 이어가세요.
            </p>
          )}
        </div>
      );
    }
    if (availableApplyTeams.length > 0) {
      const fee = Number(match.fee ?? 0);
      const ctaLabel =
        Number.isFinite(fee) && fee > 0
          ? `👉 ₩${fee.toLocaleString()} 참가하고 자리 확보`
          : "👉 지금 참가하기";
      return (
        <div className="space-y-2">
          <div className="space-y-1.5">
            <Button
              className="h-12 w-full rounded-xl bg-gray-900 text-base font-semibold text-white hover:bg-gray-800"
              onClick={() => void handleQuickJoin()}
              disabled={submitting}
            >
              {submitting ? "처리 중…" : ctaLabel}
            </Button>
            <p className="text-center text-xs text-gray-500">
              결제 후 자동으로 참가 처리됩니다.
            </p>
          </div>
          {!suppressFooterChatCta ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-xl border-gray-300 text-base font-semibold"
              disabled={matchChatOpening || submitting}
              onClick={() => void openMatchThreadChat()}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              {matchChatOpening ? "열리는 중…" : "채팅 시작하기"}
            </Button>
          ) : null}
        </div>
      );
    }
    return (
      <div className="mt-1 space-y-3">
        <p className="text-sm text-gray-500">
          팀장·관리자 권한이 있는 팀이 없어 참가 신청은 불가능합니다.
        </p>
        {!suppressFooterChatCta ? (
          <Button
            type="button"
            className="h-12 w-full rounded-xl bg-blue-600 text-base font-semibold text-white hover:bg-blue-700"
            disabled={matchChatOpening}
            onClick={() => void openMatchThreadChat()}
          >
            <MessageCircle className="mr-2 h-5 w-5" />
            {matchChatOpening ? "열리는 중…" : "채팅 시작하기"}
          </Button>
        ) : (
          <p className="text-xs text-gray-500">
            문의는 상단 <span className="font-medium text-gray-700">연결된 채팅</span> 카드에서
            이어가면 돼요.
          </p>
        )}
      </div>
    );
  })();

  const kickoffPast =
    match.status === "matched" && isMatchKickoffInPast(match);

  return (
    <div className="min-h-dvh bg-gray-50 pb-24">
      {flashMessage ? (
        <div
          className="fixed left-1/2 top-4 z-[70] max-w-[min(56rem,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-900 shadow-lg md:px-6"
          role="status"
        >
          {flashMessage}
        </div>
      ) : null}

      <div className="w-full pt-3 md:pt-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="h-4 w-4" />
          목록으로
        </button>

        {/* 상단 요약 */}
        <section className={CARD}>
          <div className="mb-2 flex items-start justify-between gap-2">
            <h1 className="text-lg font-semibold leading-snug text-gray-900 md:text-xl">
              {titleText}
            </h1>
            {summary?.dday ? (
              <span className={summary.ddayClassName}>{summary.dday}</span>
            ) : null}
          </div>
          <p className="mb-1 text-sm text-gray-800">
            <span aria-hidden>📅 </span>
            {summary?.dateLine}
          </p>
          <p className="text-sm text-gray-700">
            <span aria-hidden>📍 </span>
            {matchRegion}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {flowPhase ? (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${matchFlowPhaseStyle(flowPhase)}`}
              >
                {matchFlowPhaseLabel(flowPhase)}
              </span>
            ) : null}
            {match.sport ? (
              <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-800">
                {getSportLabel(match.sport as SportType)}
              </span>
            ) : null}
          </div>
        </section>

        {/* 매칭 글 ↔ 협의 채팅 연결 (정보 흐름) */}
        {user ? (
          <section
            className="mb-4 md:mb-6 rounded-2xl border border-blue-100 bg-blue-50/95 p-4 shadow-sm md:p-5"
            aria-label="연결된 매칭 채팅"
          >
            <p className="text-xs font-semibold text-blue-700">연결된 채팅</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900">
                  {match.teamName}
                  <span className="font-normal text-gray-500"> · 매칭 협의</span>
                </p>
                {matchChatStatusBadge ? (
                  <p
                    className={`mt-2 flex items-center gap-1.5 text-xs font-semibold ${matchChatStatusBadge.textClass}`}
                  >
                    <span
                      className={`inline-block h-2 w-2 shrink-0 rounded-full ${matchChatStatusBadge.dotClass}`}
                      aria-hidden
                    />
                    {matchChatStatusBadge.label}
                  </p>
                ) : null}
                <p className="mt-1.5 text-xs leading-snug text-gray-600">
                  {matchChatCardSubtitle || "협의 채팅으로 이동할 수 있어요."}
                </p>
              </div>
              <Button
                type="button"
                className="h-11 shrink-0 rounded-xl bg-blue-600 px-4 text-base font-semibold text-white hover:bg-blue-700 sm:h-10"
                disabled={matchChatOpening}
                onClick={() => void openMatchThreadChat()}
              >
                {matchChatOpening ? (
                  "열리는 중…"
                ) : (
                  <span className="flex items-center gap-1">
                    채팅방으로
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </span>
                )}
              </Button>
            </div>
          </section>
        ) : (
          <section
            className={`${CARD} border-dashed border-gray-200 bg-gray-50/90`}
            aria-label="매칭 채팅 안내"
          >
            <p className="text-sm font-medium text-gray-800">매칭 협의 채팅</p>
            <p className="mt-1 text-xs text-gray-600">
              로그인하면 이 매칭과 연결된 채팅방으로 들어가 일정·장소를 조율할 수 있어요.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-3 h-10 w-full rounded-xl border-gray-300 text-sm font-semibold"
              onClick={() =>
                navigate("/login", { state: { from: `/match/${id}` } })
              }
            >
              로그인하고 채팅 이용하기
            </Button>
          </section>
        )}

        {/* 경기 위치 + 지도 */}
        <section className={CARD}>
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
            <MapPin className="h-4 w-4 text-purple-600" />
            경기 위치
          </h2>
          <p className="mb-3 text-sm font-medium text-gray-800">
            {match.stadium || "구장명 미입력"}
          </p>
          <p className="mb-3 text-xs text-gray-500">{matchRegion}</p>

          {hasPin ? (
            <>
              <div className="overflow-hidden rounded-xl border border-gray-100 bg-gray-100">
                <iframe
                  title="경기 장소 지도"
                  className="h-48 w-full border-0 md:h-64"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={googleMapsEmbedUrl(lat!, lng!)}
                />
              </div>
              <a
                href={googleMapsOpenUrl(lat!, lng!)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center justify-center gap-1 text-sm font-medium text-purple-700 hover:underline"
              >
                큰 지도에서 보기
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-100 py-10 text-center">
              <p className="mb-3 text-xs text-gray-500">
                등록 시 지도 핀이 없습니다. 아래에서 장소를 확인하세요.
              </p>
              <a
                href={mapsSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm ring-1 ring-gray-200"
              >
                Google 지도에서 검색
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
        </section>

        <section className={CARD} aria-label="참가 및 연락">
          <h2 className="mb-3 font-semibold text-gray-900">참가·연락</h2>
          {participateCta}
        </section>

        {/* 매칭 조건 */}
        <section className={CARD}>
          <h2 className="mb-3 font-semibold text-gray-900">매칭 조건</h2>
          <p className="mb-1 text-sm text-gray-700">
            <span aria-hidden>⚽ </span>수준: {match.level}
          </p>
          <p className="mb-1 text-sm text-gray-700">
            <span aria-hidden>💰 </span>
            참가비:{" "}
            {match.fee != null && match.fee > 0
              ? `${match.fee.toLocaleString()}원`
              : "협의·무료"}
          </p>
          <p className="text-sm text-gray-700">
            연락: {match.contact}
            {canSeeContactDetail && match.contactDetail ? (
              <span className="text-gray-900"> · {match.contactDetail}</span>
            ) : (
              <span className="text-gray-400"> · 신청 후 확인 가능</span>
            )}
          </p>
          {contactQuickActions()}
        </section>

        {/* 팀 정보 */}
        <section className={CARD}>
          <h2 className="mb-3 font-semibold text-gray-900">팀 정보</h2>
          <p className="font-medium text-gray-900">{match.teamName}</p>
          <p className="mt-1 text-sm text-gray-500">
            {match.level} · 활동 지역{" "}
            {hostTeamExtra?.region || matchRegion || "미등록"}
          </p>
          <p className="mt-2 text-xs text-gray-400">
            전적·레벨 상세는 추후 프로필과 연동 예정입니다.
          </p>
          {hostTeamExtra?.description ? (
            <p className="mt-2 text-sm text-gray-600">{hostTeamExtra.description}</p>
          ) : null}
        </section>

        {/* 상세 설명 */}
        <section className={CARD}>
          <h2 className="mb-3 font-semibold text-gray-900">상세 설명</h2>
          {match.description ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
              {match.description}
            </p>
          ) : (
            <p className="text-sm text-gray-400">작성된 설명이 없습니다.</p>
          )}
        </section>

        {match.status === "matched" && (
          <section className="mb-5 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-900">
            <h2 className="mb-1 font-semibold text-green-950">매칭 완료</h2>
            <p className="mb-2 text-green-800">상대팀이 확정되었습니다.</p>
            {match.opponentTeamName ? (
              <p className="mb-3 font-medium text-green-950">
                상대팀: {match.opponentTeamName}
              </p>
            ) : null}
            <p className="mb-3 text-xs text-green-800/90">
              상단 <strong className="font-semibold">참가·연락</strong>에서 채팅할 수 있어요.
              연락처가 공개된 경우 아래에서 전화·문자 등을 이용할 수 있습니다.
            </p>
            {canSeeContactDetail ? contactQuickActions() : null}
          </section>
        )}

        {match.status === "finished" && (
          <>
            <div className="mb-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900 md:mb-6 md:p-5">
              <p className="font-medium">경기가 종료되었습니다.</p>
              <p className="mt-1">
                최종 결과: {match.homeScore ?? 0} : {match.awayScore ?? 0}
              </p>
            </div>
            <section className={CARD}>
              <h2 className="mb-2 font-semibold text-gray-900">후기</h2>
              <p className="mb-3 text-sm text-gray-600">
                매너·경기 만족도는 추후 팀 신뢰도에 반영될 예정입니다.
              </p>
              <Button type="button" variant="outline" className="w-full" disabled>
                후기 남기기 (준비 중)
              </Button>
            </section>
          </>
        )}

        {/* 인앱 신청 */}
        {match.status === "open" && (
          <section ref={applyRef} id="match-apply" className={CARD}>
            <h2 className="mb-1 font-semibold text-gray-900">매칭 신청</h2>
            <p className="mb-3 text-xs text-gray-500">
              팀을 선택하고 요청을 내면 호스트가 수락할 수 있습니다.
            </p>
            {!user ? (
              <p className="text-sm text-gray-600">로그인 후 신청할 수 있습니다.</p>
            ) : canManageHost ? (
              <p className="text-sm text-gray-500">내가 올린 매칭입니다.</p>
            ) : availableApplyTeams.length === 0 ? (
              <p className="text-sm text-gray-500">
                {hasAppliedWithMyTeam
                  ? "이미 우리 팀에서 신청한 내역이 있습니다."
                  : "지원 가능한 팀(팀장·관리자 권한)이 없습니다."}
              </p>
            ) : (
              <>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  지원 팀 <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="mb-3 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="">팀 선택</option>
                  {availableApplyTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="한 줄 메시지 (선택)"
                  className="mb-3 rounded-xl"
                />
                <Button
                  className="h-11 w-full rounded-xl bg-gray-900 text-base font-semibold hover:bg-gray-800"
                  onClick={() => void handleRequest()}
                  disabled={submitting || !selectedTeamId}
                >
                  {submitting ? "처리 중…" : "인앱으로 신청 보내기"}
                </Button>
              </>
            )}
          </section>
        )}

        <section ref={requestsRef} className={CARD}>
          <h2 className="mb-1 font-semibold text-gray-900">신청 관리</h2>
          <p className="mb-3 text-xs text-gray-500">
            호스트는 수락 시 한 팀만 확정되고, 나머지 대기 중인 신청은 자동 거절됩니다.
          </p>
          {requests.length === 0 ? (
            <p className="text-sm text-gray-500">아직 지원이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => {
                const statusKo =
                  req.status === "pending"
                    ? "검토 중"
                    : req.status === "accepted"
                      ? "수락됨"
                      : "거절됨";
                return (
                  <div
                    key={req.id}
                    className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50/80 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-gray-900">{req.teamName}</p>
                        <span className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-600 ring-1 ring-gray-200">
                          {statusKo}
                        </span>
                      </div>
                      {req.message ? (
                        <p className="mt-1 text-sm text-gray-600">{req.message}</p>
                      ) : null}
                    </div>
                    {canManageHost && match.status === "open" && req.status === "pending" ? (
                      <div className="flex shrink-0 gap-2">
                        <Button
                          size="sm"
                          className="bg-gray-900 text-white hover:bg-gray-800"
                          onClick={() => void handleAccept(req)}
                          disabled={submitting}
                        >
                          수락
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-gray-300"
                          onClick={() => void handleReject(req)}
                          disabled={submitting}
                        >
                          거절
                        </Button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {canManageHost && match.status === "matched" && (
          <section className={CARD}>
            <h2 className="mb-3 font-semibold text-gray-900">경기 완료 처리</h2>
            {kickoffPast ? (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                경기 예정 시각이 지났습니다. 점수를 입력하거나 무승부로 빠르게
                종료할 수 있습니다.
              </div>
            ) : null}
            <p className="mb-3 text-xs text-gray-500">
              점수를 저장하면 매칭 상태가 <strong>경기 종료</strong>로 바뀌고 양 팀
              전적에 반영됩니다.
            </p>
            <div className="mb-3 grid grid-cols-2 gap-3">
              <Input
                type="number"
                min={0}
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                placeholder="홈"
                className="rounded-xl"
              />
              <Input
                type="number"
                min={0}
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                placeholder="원정"
                className="rounded-xl"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                className="flex-1 bg-gray-900 text-white hover:bg-gray-800"
                onClick={() => void handleSubmitResult()}
                disabled={submitting}
              >
                {submitting ? "저장 중…" : "결과 저장 · 경기 종료"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-gray-300"
                onClick={() => void handleQuickDrawFinish()}
                disabled={submitting}
              >
                무승부(0:0)로 종료
              </Button>
            </div>
          </section>
        )}
      </div>

    </div>
  );
}
