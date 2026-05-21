/**
 * 팀 홈 — `/team/:teamId`
 * 탭: 홈 · 멤버 · 채팅 · 일정 · 관리(owner)
 * 채팅은 기존 `chatRooms` + ensureTeamChatRoom + sendMessageCommon 사용
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FirebaseError } from "firebase/app";
import { updateTeamDocument } from "@/lib/team/updateTeamDocument";
import { isCaptain } from "@/lib/team/roleConstants";
import { useAuth } from "@/context/AuthProvider";
import { useMyTeams } from "@/hooks/useMyTeams";
import { Button } from "@/components/ui/button";
import { SegmentTabs } from "@/components/ui/SegmentTabs";
import { TeamMembersPanel } from "@/components/team/TeamMembersPanel";
import TeamMemberSummaryCard from "@/components/team/TeamMemberSummaryCard";
import TeamOwnerSummarySection from "@/components/team/TeamOwnerSummarySection";
import { TeamMemberInviteBar } from "@/components/team/TeamMemberInviteBar";
import { TeamChatPanel } from "@/components/team/TeamChatPanel";
import {
  ArrowLeft,
  Users,
  Calendar,
  MessageCircle,
  UserPlus,
  Loader2,
  Settings,
  ChevronRight,
  Wallet,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";
import { useChatRoomsUnread } from "@/hooks/useChatRoomsUnread";
import { TeamOnboardingCard } from "@/components/team/TeamOnboardingCard";
import { GuestTeamOwnerBanner } from "@/components/team/GuestTeamOwnerBanner";
import TeamActivityFeed from "@/components/team/TeamActivityFeed";
import { track } from "@/lib/analytics";
import {
  getMyTeamFeePaymentMap,
  getTeamFees,
  parseTeamFeePaymentDoc,
  pickPreferredTeamFeePaymentForFee,
} from "@/lib/team/teamFees";
import { parseTeamFeePaymentDocId } from "@/lib/fees/teamFeePaymentDocId";
import {
  memberDueUrgencyLine,
  memberIsDuePast,
  memberPayPrimaryButtonLabel,
  memberPaymentStatusUi,
  memberStatusEmoji,
} from "@/lib/team/memberFeeUxCopy";
import type { TeamMember } from "@/features/fees/types";
import type { TeamFee, TeamFeePayment } from "@/types/fee";
import { toast } from "sonner";
import {
  confirmTeamFeePayment,
  startTeamFeePayment,
} from "@/lib/team/teamFeePaymentFlow";
/** 온보딩 배너 자동 종료: 멤버 2명 이상 + 아래 중 하나: 허브 `teams/.../activities` · 일정(teamSchedules) · 팀 공지(team_notice) */
const ONBOARDING_MIN_MEMBERS = 2;
const ONBOARDING_MIN_TEAM_ACTIVITIES = 1;

export type TeamHomeTab = "home" | "members" | "chat" | "schedule" | "manage";

function resolveSportSlug(team: Record<string, unknown> | null | undefined): string {
  if (!team) return "soccer";
  const raw = team.sportType ?? team.sport ?? team.type ?? "soccer";
  const s = String(raw).toLowerCase();
  if (s === "football") return "soccer";
  return s || "soccer";
}

function isValidTab(id: string, hasManage: boolean): id is TeamHomeTab {
  if (id === "manage") return hasManage;
  return id === "home" || id === "members" || id === "chat" || id === "schedule";
}

/** `features/team/hooks/useTeamMembers`와 동일 필터 — members 구독 1회로 fee 대시보드 행 생성 */
function memberDocToFeeTeamMember(
  item: QueryDocumentSnapshot<DocumentData>
): TeamMember | null {
  const data = item.data();
  if (data.isDeleted === true) return null;
  if (data.status !== "active") return null;

  const roleRaw = String(data.role ?? "member").toLowerCase();
  const role: TeamMember["role"] =
    roleRaw === "owner" || roleRaw === "manager" || roleRaw === "member"
      ? roleRaw
      : roleRaw === "admin"
        ? "manager"
        : "member";

  const authUid =
    (typeof data.userId === "string" && data.userId.trim()) ||
    (typeof data.uid === "string" && data.uid.trim()) ||
    "";

  return {
    uid: authUid || item.id,
    name: String(data.name ?? data.displayName ?? data.userName ?? "이름없음"),
    role,
    joinedAt: data.joinedAt,
  };
}

export default function TeamHome() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { getUnreadForTeamId } = useChatRoomsUnread();
  const { teamMembers, loading: myTeamsLoading } = useMyTeams();
  const [team, setTeam] = useState<(Record<string, unknown> & { id?: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberCount, setMemberCount] = useState(0);
  /** members 스냅샷 일시 오류 시 0으로 떨어지며 teams.memberCount로만 표시되는 불일치 방지 */
  const lastMembersSnapshotSize = useRef(0);
  const [teamActivitiesCount, setTeamActivitiesCount] = useState(0);
  const [hasTeamSchedule, setHasTeamSchedule] = useState(false);
  const [hasTeamNoticePost, setHasTeamNoticePost] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);
  const [chatRoomError, setChatRoomError] = useState<string | null>(null);
  const [fees, setFees] = useState<TeamFee[]>([]);
  const [myPayments, setMyPayments] = useState<Record<string, TeamFeePayment | null>>({});
  /** Auth UID + (연결된) 허브 members 문서 ID — `payments.userId`가 예전에 멤버 doc id만 쓰인 팀에서도 내 납부 행 매칭 */
  const [feePaymentIdentityIds, setFeePaymentIdentityIds] = useState<string[]>([]);
  const [feesLoading, setFeesLoading] = useState(false);
  const [payingFeeId, setPayingFeeId] = useState<string | null>(null);
  const [confirmingFeePayment, setConfirmingFeePayment] = useState(false);
  const onboardingPersisting = useRef(false);
  const guestLinkWelcomeRef = useRef(false);
  /** SoT: teams/{teamId}/members/{uid} — ownerUid·team_members와 불일치해도 UI·초대 버튼과 라우트 가드 정합 */
  const [myHubMemberSoT, setMyHubMemberSoT] = useState<{
    loaded: boolean;
    exists: boolean;
    isHubCaptain: boolean;
  }>({ loaded: false, exists: false, isHubCaptain: false });
  /** 팀장 회비 요약 — `teams/.../members` 중복 onSnapshot 방지용(부모 스냅샷에서만 채움) */
  const [feeDashMembers, setFeeDashMembers] = useState<TeamMember[]>([]);
  const [feeDashMembersLoading, setFeeDashMembersLoading] = useState(true);

  useEffect(() => {
    const status = sessionStorage.getItem("inviteAutoJoinStatus");
    if (!status) return;
    if (status === "joined") {
      toast.success("팀에 참여되었습니다.");
    } else if (status === "already_member") {
      toast.message("이미 참여한 팀입니다.");
    } else if (status === "invalid_team") {
      toast.error("유효하지 않은 팀 초대입니다.");
    }
    sessionStorage.removeItem("inviteAutoJoinStatus");
  }, []);

  useEffect(() => {
    onboardingPersisting.current = false;
    guestLinkWelcomeRef.current = false;
  }, [teamId]);

  const teamOwnerId = (team?.ownerUid ?? team?.ownerUserId) as string | undefined;

  const isMember =
    !!user &&
    !!teamId &&
    (teamOwnerId === user.uid ||
      teamMembers.some((tm) => tm.teamId === teamId) ||
      (myHubMemberSoT.loaded && myHubMemberSoT.exists));

  const isOwner =
    !!user &&
    !!team &&
    (teamOwnerId === user.uid ||
      (myHubMemberSoT.loaded && myHubMemberSoT.isHubCaptain));

  /** 팀 생성 직후 `?linkAccount=1` 로 진입한 게스트 owner — 1회 토스트 후 쿼리 제거 */
  useEffect(() => {
    if (!team || !teamId || !user?.isAnonymous || !isOwner) return;
    if (searchParams.get("linkAccount") !== "1") return;
    if (guestLinkWelcomeRef.current) return;
    guestLinkWelcomeRef.current = true;
    toast.success(
      "팀이 만들어졌어요. 계정을 연결하면 다른 기기에서도 같은 팀을 이어갈 수 있어요.",
      { duration: 5200 }
    );
    const next = new URLSearchParams(searchParams);
    next.delete("linkAccount");
    setSearchParams(next, { replace: true });
  }, [team, teamId, user?.isAnonymous, isOwner, searchParams, setSearchParams]);

  const teamChatUnread = teamId ? getUnreadForTeamId(teamId) : 0;
  const chatTabLabel =
    teamChatUnread > 0 ? `채팅 (${teamChatUnread})` : "채팅";

  const segmentItems = useMemo(() => {
    const base = [
      { id: "home", label: "홈" },
      { id: "members", label: "멤버" },
      { id: "chat", label: chatTabLabel },
      { id: "schedule", label: "일정" },
    ];
    if (isOwner) base.push({ id: "manage", label: "관리" });
    return base;
  }, [isOwner, chatTabLabel]);

  const activityIdFromLink = searchParams.get("activityId") || "";
  const focusFromLink = searchParams.get("focus") || "";

  const tabFromUrl = searchParams.get("tab") || "home";
  const activeTab: TeamHomeTab = useMemo(() => {
    if (isValidTab(tabFromUrl, isOwner)) return tabFromUrl;
    return "home";
  }, [tabFromUrl, isOwner]);

  const setTab = (id: string) => {
    const next = new URLSearchParams(searchParams);
    if (id === "home") next.delete("tab");
    else next.set("tab", id);
    setSearchParams(next, { replace: true });
  };

  const scrollToMyFees = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete("tab");
    setSearchParams(next, { replace: true });
    window.setTimeout(() => {
      document.getElementById("team-home-my-fees")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  }, [searchParams, setSearchParams]);

  const scrollToTeamFeed = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete("tab");
    setSearchParams(next, { replace: true });
    window.setTimeout(() => {
      document.getElementById("team-home-activity-feed")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  }, [searchParams, setSearchParams]);

  const openMembersTab = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", "members");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (tabFromUrl === "manage" && !isOwner) {
      const next = new URLSearchParams(searchParams);
      next.delete("tab");
      setSearchParams(next, { replace: true });
    }
  }, [tabFromUrl, isOwner, searchParams, setSearchParams]);

  /** `/team/:id?tab=fees` → 회비 대시보드는 `/teams/:id/manage`에만 마운트됨 */
  useEffect(() => {
    if (tabFromUrl !== "fees" || !teamId || loading) return;
    if (isOwner) {
      navigate(`/teams/${encodeURIComponent(teamId)}/manage?tab=fees`, { replace: true });
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.delete("tab");
    setSearchParams(next, { replace: true });
  }, [tabFromUrl, isOwner, teamId, loading, navigate, searchParams, setSearchParams]);

  useEffect(() => {
    if (!teamId) {
      setLoading(false);
      setFeeDashMembers([]);
      setFeeDashMembersLoading(false);
      return;
    }

    setLoadError(null);
    lastMembersSnapshotSize.current = 0;
    setFeeDashMembersLoading(true);
    const teamRef = doc(db, "teams", teamId);
    const uid = user?.uid;

    const unsubTeam = onSnapshot(
      teamRef,
      (snap) => {
        if (!snap.exists()) {
          setLoadError("팀을 찾을 수 없습니다.");
          setTeam(null);
          setLoading(false);
          return;
        }
        setTeam({ id: snap.id, ...snap.data() });
        setLoading(false);
      },
      () => {
        setLoadError("팀 정보를 불러오지 못했습니다.");
        setTeam(null);
        setLoading(false);
      }
    );

    const unsubMembers = onSnapshot(
      collection(db, `teams/${teamId}/members`),
      (snap) => {
        lastMembersSnapshotSize.current = snap.size;
        setMemberCount(snap.size);

        const feeMembers: TeamMember[] = [];
        for (const item of snap.docs) {
          const m = memberDocToFeeTeamMember(item);
          if (m) feeMembers.push(m);
        }
        setFeeDashMembers(feeMembers);
        setFeeDashMembersLoading(false);

        if (!uid) {
          setMyHubMemberSoT({ loaded: false, exists: false, isHubCaptain: false });
          setFeePaymentIdentityIds([]);
        } else {
          const payIds = new Set<string>([uid]);
          for (const item of snap.docs) {
            const d = item.data();
            if (d.isDeleted === true) continue;
            if (String(d.status || "active") !== "active") continue;
            const linkUid =
              (typeof d.userId === "string" && d.userId.trim()) ||
              (typeof d.uid === "string" && d.uid.trim()) ||
              "";
            if (linkUid === uid) payIds.add(item.id);
          }
          setFeePaymentIdentityIds(Array.from(payIds));

          const mine = snap.docs.find((d) => d.id === uid);
          if (!mine) {
            setMyHubMemberSoT({ loaded: true, exists: false, isHubCaptain: false });
          } else {
            const d = mine.data();
            const role = typeof d.role === "string" ? d.role : undefined;
            const accessLevel = typeof d.accessLevel === "string" ? d.accessLevel : undefined;
            const hubCaptain = isCaptain(role) || accessLevel === "OWNER";
            setMyHubMemberSoT({ loaded: true, exists: true, isHubCaptain: hubCaptain });
          }
        }
      },
      (error) => {
        console.warn("[TeamHome] members 스냅샷 구독 실패:", error);
        setMemberCount(lastMembersSnapshotSize.current);
        setFeeDashMembers([]);
        setFeeDashMembersLoading(false);
        setMyHubMemberSoT({ loaded: true, exists: false, isHubCaptain: false });
      }
    );

    const unsubActivities = onSnapshot(
      collection(db, `teams/${teamId}/activities`),
      (snap) => {
        setTeamActivitiesCount(snap.size);
      },
      (error) => {
        console.warn("[TeamHome] team activities 스냅샷 구독 실패:", error);
        setTeamActivitiesCount(0);
      }
    );

    return () => {
      unsubTeam();
      unsubMembers();
      unsubActivities();
    };
  }, [teamId, user?.uid]);

  useEffect(() => {
    if (!teamId) return;
    const q = query(collection(db, "teamSchedules"), where("teamId", "==", teamId));
    const unsub = onSnapshot(
      q,
      (snap) => setHasTeamSchedule(!snap.empty),
      (error) => {
        console.warn("[TeamHome] teamSchedules 스냅샷 구독 실패:", error);
        setHasTeamSchedule(false);
      }
    );
    return () => unsub();
  }, [teamId]);

  useEffect(() => {
    if (!teamId || !user || !isMember) {
      setFees([]);
      setMyPayments({});
      return;
    }
    let cancelled = false;
    const loadFees = async () => {
      try {
        setFeesLoading(true);
        const feeList = await getTeamFees(teamId);
        if (cancelled) return;
        setFees(feeList);
        /** 납부 상태는 아래 `payments` onSnapshot이 실시간 반영 (paid 전환 후에도 UI 갱신) */
      } catch (error) {
        if (!cancelled) {
          console.warn("[TeamHome] 회비 조회 실패:", error);
          setFees([]);
          setMyPayments({});
        }
      } finally {
        if (!cancelled) setFeesLoading(false);
      }
    };
    void loadFees();
    return () => {
      cancelled = true;
    };
  }, [teamId, user, isMember]);

  /** 내 납부 SoT — 팀 전체 payments 구독 후 본인 식별자로 필터(필드 userId·문서 ID 접미사·연결 멤버 doc id) */
  useEffect(() => {
    if (!teamId || !user?.uid || !isMember) {
      setMyPayments({});
      return;
    }
    const uid = user.uid;
    const unsub = onSnapshot(
      collection(db, "teams", teamId, "payments"),
      (snap) => {
        const idSet = new Set<string>();
        idSet.add(uid);
        feePaymentIdentityIds.forEach((x) => idSet.add(x));

        const next: Record<string, TeamFeePayment | null> = {};
        for (const d of snap.docs) {
          const data = d.data() as Record<string, unknown>;
          const parsed = parseTeamFeePaymentDocId(d.id);
          const dataUserId = String(data.userId ?? "").trim();
          const idSuffixUser = parsed?.userId?.trim() ?? "";
          const feeId =
            String(data.feeId ?? "").trim() || (parsed?.feeId ? String(parsed.feeId).trim() : "");
          if (!feeId) continue;
          const mine =
            (dataUserId && idSet.has(dataUserId)) || (idSuffixUser && idSet.has(idSuffixUser));
          if (!mine) continue;

          const row = parseTeamFeePaymentDoc(data, uid);
          const prev = next[feeId];
          next[feeId] = pickPreferredTeamFeePaymentForFee(prev ?? null, row);
        }
        setMyPayments(next);
      },
      (err) => {
        console.warn("[TeamHome] 내 회비 payments 구독 실패:", err);
        if (err instanceof FirebaseError && err.code === "permission-denied") {
          setMyPayments({});
        }
      }
    );
    return () => unsub();
  }, [teamId, user?.uid, isMember, feePaymentIdentityIds]);

  useEffect(() => {
    if (!teamId) return;
    const q = query(
      collection(db, "activities"),
      where("teamId", "==", teamId),
      where("visibility", "==", "team"),
      orderBy("createdAt", "desc"),
      limit(25)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const has = snap.docs.some((d) => (d.data().type as string | undefined) === "team_notice");
        setHasTeamNoticePost(has);
      },
      () => setHasTeamNoticePost(false)
    );
    return () => unsub();
  }, [teamId]);

  const persistOnboardingCompleted = useCallback(
    async (source: string) => {
      if (!teamId || !isMember) return;
      if (team?.onboardingCompleted === true) {
        setSearchParams((prev) => {
          if (prev.get("onboarding") !== "1") return prev;
          const next = new URLSearchParams(prev);
          next.delete("onboarding");
          return next;
        }, { replace: true });
        return;
      }
      if (!team) return;
      if (onboardingPersisting.current) return;
      onboardingPersisting.current = true;
      try {
        await updateTeamDocument(teamId, {
          onboardingCompleted: true,
          onboardingCompletedAt: serverTimestamp(),
        });
        setTeam((prev) => (prev ? { ...prev, onboardingCompleted: true } : prev));
        void track("team_onboarding_completed", { team_id: teamId, source });
        setSearchParams((prev) => {
          if (prev.get("onboarding") !== "1") return prev;
          const next = new URLSearchParams(prev);
          next.delete("onboarding");
          return next;
        }, { replace: true });
      } catch (e) {
        console.warn("[TeamHome] onboardingCompleted 저장 실패:", e);
        onboardingPersisting.current = false;
      }
    },
    [teamId, isMember, team, setSearchParams]
  );

  useEffect(() => {
    if (!teamId || !isMember || !user || !team) return;
    if (team.onboardingCompleted === true) {
      setSearchParams((prev) => {
        if (prev.get("onboarding") !== "1") return prev;
        const next = new URLSearchParams(prev);
        next.delete("onboarding");
        return next;
      }, { replace: true });
      return;
    }

    const onboardingComplete =
      memberCount >= ONBOARDING_MIN_MEMBERS &&
      (teamActivitiesCount >= ONBOARDING_MIN_TEAM_ACTIVITIES ||
        hasTeamSchedule ||
        hasTeamNoticePost);

    if (!onboardingComplete) return;

    void persistOnboardingCompleted("criteria_met");
  }, [
    teamId,
    isMember,
    user,
    team,
    memberCount,
    teamActivitiesCount,
    hasTeamSchedule,
    hasTeamNoticePost,
    persistOnboardingCompleted,
    setSearchParams,
  ]);

  useEffect(() => {
    if (!teamId || !isMember || !user) {
      setChatRoomId(null);
      setChatRoomError(null);
      return;
    }
    let cancelled = false;
    setChatRoomError(null);
    import("@/services/chat/ensureTeamChatRoom")
      .then(({ ensureTeamChatRoom }) => ensureTeamChatRoom(teamId))
      .then((id) => {
        if (!cancelled) setChatRoomId(id);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setChatRoomId(null);
          setChatRoomError(e instanceof Error ? e.message : "채팅방을 준비하지 못했습니다.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [teamId, isMember, user?.uid]);

  const sportSlug = resolveSportSlug(team);

  const goRecruit = () => {
    navigate(`/sports/${encodeURIComponent(sportSlug)}/recruit/create`);
  };

  const goPublicTeam = () => {
    if (!teamId) return;
    navigate(`/team/${encodeURIComponent(teamId)}/public?tab=players`);
  };

  const goSchedulePage = () => {
    navigate(`/activity/events`);
  };

  const goCreateSchedule = () => {
    if (!teamId) return;
    navigate(`/activity/schedule/create?teamId=${encodeURIComponent(teamId)}`);
  };

  const goLineupPage = () => {
    if (!teamId) return;
    navigate(`/team/${encodeURIComponent(teamId)}/lineup/list`);
  };

  const goTeamNoticeComposer = () => {
    setTab("home");
    window.setTimeout(() => {
      document.getElementById("team-home-activity-feed")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  };

  useEffect(() => {
    if (!teamId || !user || !isMember) return;
    const feePayment = searchParams.get("feePayment");
    if (feePayment !== "success") {
      if (feePayment === "fail") {
        const message = searchParams.get("message") || "결제에 실패했습니다.";
        window.alert(`결제 실패: ${message}`);
        const next = new URLSearchParams(searchParams);
        next.delete("feePayment");
        next.delete("feeId");
        next.delete("code");
        next.delete("message");
        setSearchParams(next, { replace: true });
      }
      return;
    }

    const feeId = searchParams.get("feeId") || "";
    const orderId = searchParams.get("orderId") || "";
    const paymentKey = searchParams.get("paymentKey") || "";
    const amount = Number(searchParams.get("amount") || 0);
    if (!feeId || !orderId || !paymentKey || amount <= 0 || confirmingFeePayment) return;

    const run = async () => {
      try {
        setConfirmingFeePayment(true);
        const result = await confirmTeamFeePayment({
          teamId,
          feeId,
          orderId,
          paymentKey,
          amount,
        });
        if (!result.success && !result.alreadyPaid) {
          throw new Error("결제 승인 실패");
        }
        const paymentMap = await getMyTeamFeePaymentMap(teamId, [feeId], user.uid);
        setMyPayments((prev) => ({ ...prev, ...paymentMap }));
        window.alert("결제가 완료되었습니다.");
      } catch (error) {
        console.warn("[TeamHome] 결제 승인 처리 실패:", error);
        window.alert("결제 승인 처리에 실패했습니다. 잠시 후 다시 확인해주세요.");
      } finally {
        const next = new URLSearchParams(searchParams);
        next.delete("feePayment");
        next.delete("feeId");
        next.delete("orderId");
        next.delete("paymentKey");
        next.delete("amount");
        setSearchParams(next, { replace: true });
        setConfirmingFeePayment(false);
      }
    };

    void run();
  }, [teamId, user, isMember, searchParams, setSearchParams, confirmingFeePayment]);

  /** 팀장은 `TeamOwnerSummarySection` 접힘 영역에 넣고, 팀원만 상단에 단독 표시 */
  const teamHomeQuickGrid = (
    <div className="grid grid-cols-2 gap-2">
      <Button
        variant="secondary"
        className="h-11 gap-1 text-sm"
        disabled={!isOwner}
        onClick={() => {
          goRecruit();
        }}
      >
        <UserPlus className="h-4 w-4 shrink-0" />
        모집
      </Button>
      <Button
        variant="secondary"
        className="h-11 gap-1 text-sm"
        onClick={() => setTab("chat")}
        disabled={!isMember}
      >
        <MessageCircle className="h-4 w-4 shrink-0" />
        {chatTabLabel}
      </Button>
      <Button variant="secondary" className="h-11 gap-1 text-sm" onClick={() => setTab("members")}>
        <Users className="h-4 w-4 shrink-0" />
        멤버
      </Button>
      <Button
        variant="secondary"
        className="h-11 gap-1 text-sm"
        onClick={() => setTab("schedule")}
        disabled={!isMember}
      >
        <Calendar className="h-4 w-4 shrink-0" />
        일정
      </Button>
      <Button
        variant="secondary"
        className="h-11 gap-1 text-sm"
        onClick={goLineupPage}
        disabled={!isMember}
      >
        <ClipboardList className="h-4 w-4 shrink-0" />
        라인업
      </Button>
    </div>
  );

  if (!user) {
    return null;
  }

  if (loading || myTeamsLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-gray-600">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm">팀 정보를 불러오는 중…</p>
      </div>
    );
  }

  if (loadError || !team || !teamId) {
    return (
      <div className="w-full py-10 text-center">
        <p className="text-gray-700">{loadError || "팀을 찾을 수 없습니다."}</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate(-1)}>
          돌아가기
        </Button>
      </div>
    );
  }

  const displayName = String(team.name || "팀");
  /** 스냅샷으로 읽힌 실제 members 문서 수 우선 — team.memberCount는 비정규화라 목록과 불일치할 수 있음 */
  const mc =
    memberCount > 0
      ? memberCount
      : typeof team.memberCount === "number"
        ? team.memberCount
        : memberCount;

  const onboardingStep = {
    inviteDone: memberCount >= ONBOARDING_MIN_MEMBERS,
    scheduleDone: hasTeamSchedule,
    noticeDone: hasTeamNoticePost,
  };

  const showOnboardingBanner =
    searchParams.get("onboarding") === "1" &&
    isMember &&
    team.onboardingCompleted !== true;

  const dismissOnboarding = () => {
    void persistOnboardingCompleted("dismissed");
  };

  const trackOnboardingCta = (action: string) => {
    void track("team_onboarding_cta", { team_id: teamId, action });
  };

  const handleCreatePendingPayment = async (fee: TeamFee) => {
    if (!teamId || !user) return;
    try {
      setPayingFeeId(fee.id);
      await startTeamFeePayment(teamId, fee.id);
    } catch (error) {
      console.warn("[TeamHome] 결제 시작 실패:", error);
      window.alert("결제 시작에 실패했습니다.");
    } finally {
      setPayingFeeId(null);
    }
  };

  return (
    <div className="w-full pb-8">
      <div className="sticky top-0 z-10 bg-gray-50/95 pb-2 pt-4 backdrop-blur">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-3 flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          뒤로
        </button>

        <Link
          to={`/team/${encodeURIComponent(teamId)}/public?tab=players`}
          aria-label={`${displayName} 팀 공개 프로필 보기`}
          className="group block rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                <Users className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                멤버 {mc}명
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-800 transition-colors group-hover:bg-gray-200">
              팀 소개 보기
              <ChevronRight className="h-4 w-4" aria-hidden />
            </span>
          </div>
          {!isMember && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              이 팀의 멤버가 아닙니다. 채팅·일정·일부 기능이 제한됩니다.
            </p>
          )}
        </Link>

        {isMember && isOwner && user?.isAnonymous ? <GuestTeamOwnerBanner /> : null}

        {isMember &&
          teamId &&
          (isOwner ? (
            <TeamOwnerSummarySection
              teamId={teamId}
              fees={fees}
              feesLoading={feesLoading}
              mc={mc}
              feeDashMembers={feeDashMembers}
              feeDashMembersLoading={feeDashMembersLoading}
              membersManageHref={`/teams/${encodeURIComponent(teamId)}/manage?tab=members`}
              quickActions={teamHomeQuickGrid}
            />
          ) : (
            <TeamMemberSummaryCard
              fees={fees}
              myPayments={myPayments}
              feesLoading={feesLoading}
              onStartPay={handleCreatePendingPayment}
              payingFeeId={payingFeeId}
              confirmingFeePayment={confirmingFeePayment}
              onScrollToMyFees={scrollToMyFees}
              onScrollToTeamFeed={scrollToTeamFeed}
              onOpenMembersTab={openMembersTab}
            />
          ))}

        {isMember && team.billingRestricted === true && (
          <div className="mt-3 rounded-xl border border-amber-400 bg-amber-50 px-3 py-3 text-sm text-amber-950 shadow-sm dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-50">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">결제 미납으로 일부 기능이 제한되었습니다.</p>
                <p className="mt-1 text-xs opacity-90">
                  회비 자동 생성 등 일부 작업이 막힐 수 있습니다. SaaS 구독 결제를 완료하면 자동으로 해제됩니다.
                </p>
                <p className="mt-1 text-xs font-medium text-amber-900/90 dark:text-amber-100/90">
                  결제를 완료하면 즉시 제한이 해제됩니다.
                </p>
                {isOwner ? (
                  <Button className="mt-2 h-9" size="sm" asChild>
                    <Link to={`/teams/${encodeURIComponent(teamId)}/manage?tab=fees`}>결제 확인</Link>
                  </Button>
                ) : (
                  <p className="mt-2 text-xs font-medium">팀 관리자에게 결제·카드 갱신을 요청해 주세요.</p>
                )}
              </div>
            </div>
          </div>
        )}
        {isMember &&
          team.billingRestricted !== true &&
          String(team.billingStatus || "").trim().toLowerCase() === "past_due" && (
            <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-950 shadow-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">결제가 실패했습니다.</p>
                  <p className="mt-1 text-xs opacity-90">
                    카드 정보를 업데이트하지 않으면 구독이 종료될 수 있습니다. 현재는 유예 기간으로 기능을 계속 이용할 수 있습니다.
                  </p>
                  {isOwner ? (
                    <Button className="mt-2 h-9" size="sm" asChild>
                      <Link to={`/teams/${encodeURIComponent(teamId)}/manage?tab=fees`}>결제 수단 확인</Link>
                    </Button>
                  ) : (
                    <p className="mt-2 text-xs font-medium">팀 관리자에게 결제 수단 업데이트를 요청해 주세요.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        {isMember && String(team.billingStatus || "").trim().toLowerCase() === "canceled" && (
          <div className="mt-3 rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-900 shadow-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">구독이 종료되었습니다.</p>
                <p className="mt-1 text-xs opacity-90">유료 기능을 다시 사용하려면 구독을 재시작해 주세요.</p>
                {isOwner ? (
                  <Button className="mt-2 h-9" size="sm" asChild>
                    <Link to={`/teams/${encodeURIComponent(teamId)}/manage?tab=fees`}>다시 구독하기</Link>
                  </Button>
                ) : (
                  <p className="mt-2 text-xs font-medium">팀 관리자에게 재구독을 요청해 주세요.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {showOnboardingBanner && (
          <TeamOnboardingCard
            step={onboardingStep}
            onInviteMembers={() => {
              trackOnboardingCta("invite_members");
              setTab("members");
            }}
            onCreateSchedule={() => {
              trackOnboardingCta("create_schedule");
              goCreateSchedule();
            }}
            onWriteNotice={() => {
              trackOnboardingCta("write_notice");
              goTeamNoticeComposer();
            }}
            onDismiss={dismissOnboarding}
          />
        )}

        {!isOwner && teamHomeQuickGrid}

        <SegmentTabs tabs={segmentItems} activeId={activeTab} onChange={setTab} className="mt-3 rounded-t-xl" />
      </div>

      <div className="w-full pt-4">
        {activeTab === "home" && (
          <div className="w-full space-y-4 rounded-b-xl border border-t-0 border-gray-200 bg-white p-4 shadow-sm">
            {isOwner && teamId && (
              <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-3 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900">팀원 초대</h3>
                <p className="mt-0.5 text-xs text-gray-600">
                  링크 복사·가입 요청 바로가기는 여기서 할 수 있어요. 멤버 탭에도 동일하게 있습니다.
                </p>
                <div className="mt-2">
                  <TeamMemberInviteBar teamId={teamId} />
                </div>
              </div>
            )}
            {activityIdFromLink && (
              <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900">
                알림에서 연 팀 활동입니다. 일정 탭에서 상세·출석을 확인하세요.
                {focusFromLink === "attendance" ? " (출석)" : ""}
                <button
                  type="button"
                  className="ml-2 font-medium underline"
                  onClick={() => setTab("schedule")}
                >
                  일정 탭으로
                </button>
              </p>
            )}
            {isMember && (
              <div id="team-home-activity-feed" className="scroll-mt-24">
                <TeamActivityFeed teamId={teamId} sport={sportSlug} focusActivityId={activityIdFromLink} />
              </div>
            )}
            {isMember && (
              <div id="team-home-my-fees" className="scroll-mt-28 rounded-xl border border-gray-200 bg-gray-50 p-3">
                <h3 className="text-sm font-semibold text-gray-900">회비 전체 목록</h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  항목별로 확인·납부할 수 있어요 · 상단 카드에서 이번에 낼 차례를 먼저 안내해요
                </p>
                {feesLoading && <p className="mt-2 text-xs text-gray-500">회비 정보를 불러오는 중...</p>}
                {!feesLoading && fees.length === 0 && (
                  <p className="text-xs text-gray-500">현재 등록된 회비가 없습니다.</p>
                )}
                <div className="space-y-2">
                  {fees.map((fee) => {
                    const payment = myPayments[fee.id];
                    const isPending = payment?.status === "pending";
                    const isPaid = payment?.status === "paid";
                    const disabled = payingFeeId === fee.id || fee.status === "closed" || isPending || isPaid;
                    const statusUi = memberPaymentStatusUi(payment);
                    const due =
                      fee.dueDate && typeof fee.dueDate.toDate === "function"
                        ? fee.dueDate.toDate()
                        : null;
                    const validDue = due && !Number.isNaN(due.getTime()) ? due : null;
                    const urgencyLine =
                      fee.status === "open" && !isPaid && validDue ? memberDueUrgencyLine(validDue) : null;
                    const duePast = Boolean(validDue && memberIsDuePast(validDue));
                    return (
                      <div key={fee.id} className="rounded-lg border border-gray-200 bg-white p-3">
                        <p className="text-sm font-medium text-gray-900">{fee.title}</p>
                        <p className="mt-1 text-xs text-gray-600">
                          {fee.amount.toLocaleString("ko-KR")}원
                          {validDue ? ` · 마감일 ${validDue.toLocaleDateString("ko-KR")}` : ""}
                        </p>
                        {urgencyLine && (
                          <p
                            className={`mt-1 text-xs font-bold ${
                              duePast ? "text-red-700" : "text-amber-900"
                            }`}
                          >
                            {urgencyLine}
                          </p>
                        )}
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className={`text-xs ${statusUi.className}`}>
                            <span aria-hidden>{memberStatusEmoji(payment)}</span>
                            {statusUi.label}
                          </p>
                          {isPaid ? null : isPending ? (
                            <Button size="sm" variant="outline" className="shrink-0 font-semibold" disabled>
                              확인 중…
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0 font-semibold"
                              disabled={disabled || confirmingFeePayment}
                              onClick={() => handleCreatePendingPayment(fee)}
                            >
                              {payingFeeId === fee.id
                                ? "요청 중…"
                                : confirmingFeePayment
                                  ? "승인 중…"
                                  : memberPayPrimaryButtonLabel(fee.amount, validDue)}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {!isMember && (
              <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                팀 멤버만 팀 전용 타임라인에 공지를 남길 수 있어요.
              </p>
            )}
            <p className="text-sm leading-relaxed text-gray-600">
              팀 소식과 일정은 아래 탭에서 확인하고, 멤버만 단톡방에서 실시간으로 이야기할 수 있어요.
            </p>
            {chatRoomError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">{chatRoomError}</p>
            )}
          </div>
        )}

        {activeTab === "members" && (
          <div className="space-y-4 rounded-b-xl border border-t-0 border-gray-200 bg-white p-4 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">멤버</h2>
              <p className="mt-1 text-xs text-gray-500">팀에 참여 중인 멤버입니다.</p>
            </div>
            {isOwner && teamId && <TeamMemberInviteBar teamId={teamId} />}
            {!isOwner && (
              <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                새 멤버는 팀장이 초대 링크로 받거나, 팀 페이지에서 가입 요청을 보낼 수 있어요.
              </p>
            )}
            <TeamMembersPanel
              teamId={teamId}
              isOwner={isOwner}
              teamDocMemberCount={typeof team.memberCount === "number" ? team.memberCount : null}
              liveMembersDocCount={memberCount}
            />
          </div>
        )}

        {activeTab === "chat" && (
          <div className="overflow-hidden rounded-b-xl border border-t-0 border-gray-200 bg-white p-4 shadow-sm">
            {chatRoomError ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">{chatRoomError}</p>
            ) : null}
            <TeamChatPanel embedded roomId={chatRoomId} canUse={isMember} />
          </div>
        )}

        {activeTab === "schedule" && (
          <div className="space-y-3 rounded-b-xl border border-t-0 border-gray-200 bg-white p-4 shadow-sm">
            {activityIdFromLink && (
              <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900">
                연결된 활동 ID: <span className="font-mono">{activityIdFromLink}</span>
                {focusFromLink === "attendance" ? " · 출석 알림으로 이동했습니다." : ""}
              </p>
            )}
            <p className="text-sm text-gray-600">팀과 연결된 일정은 활동 허브에서 모아 볼 수 있어요.</p>
            <Button className="w-full" onClick={goSchedulePage} disabled={!isMember}>
              내 일정 / 이번 주 일정
            </Button>
            <Button variant="outline" className="w-full" onClick={goCreateSchedule} disabled={!isMember}>
              일정 만들기
            </Button>
          </div>
        )}

        {activeTab === "manage" && isOwner && (
          <div className="space-y-3 rounded-b-xl border border-t-0 border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-900">
              <Settings className="h-5 w-5" />
              <span className="font-semibold">팀 관리</span>
            </div>
            <p className="text-xs text-gray-500">팀장 전용 설정과 모집·팀 페이지로 이동합니다.</p>
            <Button
              className="w-full gap-2"
              onClick={() =>
                teamId &&
                navigate(`/teams/${encodeURIComponent(teamId)}/manage?tab=fees`)
              }
            >
              <Wallet className="h-4 w-4" />
              회비·납부 관리
            </Button>
            <Button className="w-full gap-2" onClick={goRecruit}>
              <UserPlus className="h-4 w-4" />
              팀원 모집글 작성
            </Button>
            <Button variant="outline" className="w-full gap-2" onClick={goPublicTeam}>
              <Users className="h-4 w-4" />
              팀 페이지 보기 (선수·기록)
            </Button>
            <Button variant="outline" className="w-full gap-2" onClick={() => setTab("chat")}>
              <MessageCircle className="h-4 w-4" />
              {teamChatUnread > 0 ? `팀 채팅 (${teamChatUnread})` : "팀 채팅으로 이동"}
            </Button>
          </div>
        )}
      </div>

    </div>
  );
}
