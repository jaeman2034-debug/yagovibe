/**
 * 🔥 경기 매칭 상세 페이지
 */

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Users,
  MapPin,
  Target,
  DollarSign,
  MessageCircle,
  Check,
  X,
  ExternalLink,
  MessagesSquare,
} from "lucide-react";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { cn } from "@/lib/utils";
import { joinMarketPost, cancelMarketJoin, getMarketJoinStatus, updateJoinStatus, type MarketJoin } from "../../services/marketJoinService";
import MarketDetailHeader from "../MarketDetailHeader";
import { Button } from "@/components/ui/button";

const MATCH_TYPE_LABELS: Record<string, string> = {
  "5v5": "5:5",
  "7v7": "7:7",
  "11v11": "11:11",
};

const LEVEL_LABELS: Record<string, string> = {
  입문: "입문",
  아마: "아마추어",
  프로지향: "프로지향",
};

const LEVEL_COLORS: Record<string, string> = {
  입문: "bg-green-100 text-green-700",
  아마: "bg-blue-100 text-blue-700",
  프로지향: "bg-purple-100 text-purple-700",
};

interface MatchDetailProps {
  post: any;
  user?: any;
  onBack?: () => void;
  sport?: string | null;
  hideMedia?: boolean;
}

function openExternalMap(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function mapsUrlsForQuery(q: string) {
  const encoded = encodeURIComponent(q.trim());
  return {
    google: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
    kakao: `https://map.kakao.com/link/search/${encoded}`,
    naver: `https://map.naver.com/p/search/${encoded}`,
    embed: `https://maps.google.com/maps?q=${encoded}&z=16&output=embed`,
  };
}

export default function MatchDetail({ post, user: propUser, onBack, sport, hideMedia = false }: MatchDetailProps) {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  // 🔥 props로 전달된 user 우선, 없으면 useAuth 사용
  const user = propUser || authUser;

  // 🔥 뒤로가기 핸들러 (sport 기반으로 종목 마켓으로 이동)
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (sport) {
      navigate(`/${sport}/market`);
    } else {
      navigate(-1);
    }
  };

  // 🔥 종목 라벨
  const SPORT_LABELS: Record<string, string> = {
    soccer: "축구",
    basketball: "농구",
    baseball: "야구",
    volleyball: "배구",
    golf: "골프",
    tennis: "테니스",
    running: "러닝",
    badminton: "배드민턴",
    fitness: "헬스/피트니스",
    yoga: "요가/필라테스",
    climbing: "클라이밍",
    etc: "기타",
  };
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [joinStatus, setJoinStatus] = useState<"none" | "pending" | "approved" | "rejected">("none");
  const [joining, setJoining] = useState(false);
  /** 참여 신청 문서 구독 대기용 — CTA 표시는 막지 않음(초기 true면 버튼이 통째로 안 보이는 문제 방지) */
  const [joinDocLoading, setJoinDocLoading] = useState(false);
  const [joinList, setJoinList] = useState<MarketJoin[]>([]);
  const [processingJoinId, setProcessingJoinId] = useState<string | null>(null);
  const [integrityStatus, setIntegrityStatus] = useState<{
    isSafe: boolean;
    currentPeople: number;
    realApproved: number;
    difference: number;
  } | null>(null);
  const [repairingIntegrity, setRepairingIntegrity] = useState(false);
  const [inquiryLoading, setInquiryLoading] = useState(false);

  const isAuthor = useMemo(() => {
    const cleanString = (str: string) =>
      String(str)
        .replace(/[\u00A1\u00BF\u200B-\u200D\uFEFF]/g, "")
        .replace(/[^\x20-\x7E]/g, "")
        .trim();

    const uid = user?.uid || authUser?.uid || propUser?.uid;
    const authorId = post?.authorId;
    if (!uid || !authorId) return false;
    return cleanString(uid) === cleanString(authorId);
  }, [user?.uid, authUser?.uid, propUser?.uid, post?.authorId]);

  const formatMatchDate = (timestamp: number | any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);

    if (days < 0) return "경기 종료";
    if (days === 0 && hours === 0) return `${minutes}분 후`;
    if (days === 0) return `오늘 ${date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`;
    if (days === 1) return `내일 ${date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`;
    return date.toLocaleDateString("ko-KR", { 
      month: "long", 
      day: "numeric", 
      weekday: "short",
      hour: "2-digit", 
      minute: "2-digit" 
    });
  };

  const formatRelativeTime = (timestamp: number | any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString("ko-KR");
  };

  const progress = post.people && post.currentPeople
    ? Math.round((post.currentPeople / post.people) * 100)
    : 0;

  const recruitmentMeta = useMemo(() => {
    const matchDateObj = post.matchDate
      ? post.matchDate.toDate
        ? post.matchDate.toDate()
        : new Date(post.matchDate)
      : null;
    const matchPast = matchDateObj ? matchDateObj.getTime() < Date.now() : false;
    const statusClosed =
      post.status === "completed" || post.status === "done" || post.status === "hidden";
    const full = !!(post.people && post.currentPeople != null && post.currentPeople >= post.people);
    const recruitingClosed = matchPast || statusClosed || full;
    const recruitingOpen =
      !recruitingClosed && (post.status === "open" || post.status === "active");

    let urgency: "none" | "soon" = "none";
    if (recruitingOpen && post.people != null && post.currentPeople != null && post.people > 0) {
      const remain = post.people - post.currentPeople;
      const pct = (post.currentPeople / post.people) * 100;
      if (remain <= 1 || pct >= 85) urgency = "soon";
    }

    const hostLabel =
      (post.teamName && String(post.teamName).trim()) ||
      (post.authorName && String(post.authorName).trim()) ||
      "";
    const rawTitle = (post.title || "").trim();
    const headline =
      rawTitle.length >= 2 ? rawTitle : hostLabel ? `${hostLabel} vs 상대팀 모집` : "경기 매칭";

    const dateTimeLong =
      matchDateObj &&
      `${matchDateObj.toLocaleDateString("ko-KR", {
        month: "long",
        day: "numeric",
        weekday: "short",
      })} ${matchDateObj.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`;

    return {
      matchDateObj,
      matchPast,
      recruitingClosed,
      recruitingOpen,
      urgency,
      headline,
      dateTimeLong,
    };
  }, [post]);

  // 참여 상태 실시간 구독 (일반 유저용, docId 고정 방식)
  useEffect(() => {
    if (!user || !post.id || isAuthor) {
      setJoinDocLoading(false);
      return;
    }

    setJoinDocLoading(true);
    const joinDocId = `${post.id}_${user.uid}`;
    const joinRef = doc(db, "marketJoins", joinDocId);

    const unsubscribe = onSnapshot(
      joinRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setJoinStatus("none");
        } else {
          const joinData = snapshot.data();
          if (!joinData) {
            setJoinStatus("none");
            setJoinDocLoading(false);
            return;
          }
          const status = (joinData.status as "pending" | "approved" | "rejected") || "none";
          setJoinStatus(status);
        }
        setJoinDocLoading(false);
      },
      (error: any) => {
        if (error.code === "permission-denied") {
          setJoinStatus("none");
        } else {
          console.error("[MatchDetail] 참여 상태 확인 실패:", error);
        }
        setJoinDocLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, post.id, isAuthor]);

  // 참여자 리스트 실시간 구독 (작성자용)
  useEffect(() => {
    if (!isAuthor || !post.id) {
      return;
    }

    const joinQuery = query(
      collection(db, "marketJoins"),
      where("postId", "==", post.id),
      where("status", "in", ["pending", "approved"])
    );

    const unsubscribe = onSnapshot(
      joinQuery,
      (snapshot) => {
        const joins = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as MarketJoin[];

        setJoinList(joins);
      },
      (error) => {
        console.error("[MatchDetail] 참여자 리스트 구독 실패:", error);
      }
    );

    return () => unsubscribe();
  }, [isAuthor, post.id]);

  useEffect(() => {
    if (!isAuthor || !post.id) {
      setIntegrityStatus(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { checkMarketIntegrity } = await import("../../services/marketIntegrityService");
        const r = await checkMarketIntegrity(post.id);
        if (cancelled) return;
        setIntegrityStatus({
          isSafe: r.isSafe,
          currentPeople: r.currentPeople,
          realApproved: r.realApproved,
          difference: r.discrepancies?.difference ?? 0,
        });
      } catch {
        if (!cancelled) setIntegrityStatus(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthor, post.id, joinList.length]);

  const handleJoin = async () => {
    console.log("🔥 [MatchDetail] 참여하기 버튼 클릭:", {
      postId: post.id,
      userId: user?.uid,
      joinStatus,
      isAuthor,
    });

    if (!user) {
      console.warn("⚠️ [MatchDetail] 로그인 필요");
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    // 🔥 재신청 가능: rejected 상태에서는 재신청 허용
    if (joinStatus === "pending" || joinStatus === "approved") {
      console.log("ℹ️ [MatchDetail] 이미 참여 중:", { joinStatus });
      return; // 이미 참여함
    }

    // 인원수 체크
    if (post.people && post.currentPeople && post.currentPeople >= post.people) {
      console.warn("⚠️ [MatchDetail] 모집 마감:", {
        currentPeople: post.currentPeople,
        maxPeople: post.people,
      });
      alert("모집 인원이 마감되었습니다.");
      return;
    }

    // 경기 날짜 체크
    if (post.matchDate) {
      const matchDate = post.matchDate.toDate ? post.matchDate.toDate() : new Date(post.matchDate);
      if (matchDate < new Date()) {
        console.warn("⚠️ [MatchDetail] 이미 지난 경기:", { matchDate });
        alert("이미 지난 경기입니다.");
        return;
      }
    }

    // 🔥 중복 클릭 방지
    if (joining) {
      console.log("ℹ️ [MatchDetail] 참여 처리 중 (중복 클릭 방지)");
      return;
    }

    setJoining(true);

    try {
      console.log("🔥 [MatchDetail] 참여 신청 시작:", {
        postId: post.id,
        userId: user.uid,
        userName: user.displayName,
      });

      const joinId = await joinMarketPost({
        postId: post.id,
        userId: user.uid,
        userName: user.displayName || undefined,
        position: post.position?.[0],
      });

      console.log("✅ [MatchDetail] 참여 성공:", { joinId });

      // 상태는 실시간 구독으로 자동 업데이트됨
      alert("참여 신청이 완료되었습니다!");
    } catch (err: any) {
      console.error("❌ [MatchDetail] 참여 실패:", {
        postId: post.id,
        userId: user.uid,
        error: err.message,
        code: err.code,
        stack: err.stack,
      });
      
      // 🔥 사용자 친화적인 에러 메시지
      let errorMessage = "참여 신청에 실패했습니다.";
      if (err.message) {
        if (err.message.includes("권한") || err.code === "permission-denied") {
          errorMessage = "참여 권한이 없습니다. 로그인 상태를 확인해주세요.";
        } else if (err.message.includes("이미 참여")) {
          errorMessage = "이미 참여 신청하셨습니다.";
        } else if (err.message.includes("마감")) {
          errorMessage = "모집 인원이 마감되었습니다.";
        } else if (err.message.includes("본인")) {
          errorMessage = "본인이 작성한 게시글에는 참여할 수 없습니다.";
        } else {
          errorMessage = err.message;
        }
      }
      alert(errorMessage);
    } finally {
      setJoining(false);
    }
  };

  const handleCancel = async () => {
    if (!user || !post.id) return;

    if (!confirm("참여를 취소하시겠습니까?")) return;

    setJoining(true);

    try {
      await cancelMarketJoin({
        postId: post.id,
        userId: user.uid,
      });

      // 상태는 실시간 구독으로 자동 업데이트됨
      alert("참여가 취소되었습니다.");
    } catch (err: any) {
      console.error("❌ [MatchDetail] 취소 실패:", err);
      alert(err.message || "취소에 실패했습니다.");
    } finally {
      setJoining(false);
    }
  };

  /** 호스트와 1:1 문의 채팅 (`chats/{postId_uid_uid}` — 승인 여부와 무관) */
  const handleHostInquiryChat = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!post?.id || !post?.authorId) {
      alert("채팅 정보가 올바르지 않습니다.");
      return;
    }
    if (user.uid === post.authorId) {
      return;
    }

    setInquiryLoading(true);
    try {
      const { getOrCreateChat, normalizeTradeChatDocumentIdForRoute } =
        await import("@/features/chat/services/chatService");
      const { chatId } = await getOrCreateChat({
        postId: post.id,
        postTitle: post.title,
        postImage: post.images?.[0],
        sport: post.sport || sport || "soccer",
        sellerId: post.authorId,
        buyerId: user.uid,
        productPrice: typeof post.fee === "number" ? post.fee : undefined,
      });
      navigate(`/app/chat/${normalizeTradeChatDocumentIdForRoute(chatId)}`);
    } catch (err: unknown) {
      console.error("[MatchDetail] 문의 채팅 열기 실패:", err);
      const msg = err instanceof Error ? err.message : "채팅방을 열 수 없습니다.";
      alert(msg);
    } finally {
      setInquiryLoading(false);
    }
  };

  /** 승인 후 매칭 단체 채팅방 (`/chat/recruit_*`) */
  const handleApprovedGroupChat = () => {
    if (joinStatus !== "approved") {
      alert("승인된 참여자만 매칭 단체 채팅방에 입장할 수 있습니다.");
      return;
    }
    if (!post?.id) return;
    const isRecruit = post.category === "recruit" || post.category === "match";
    if (isRecruit) {
      navigate(`/chat/recruit_${post.id}`);
      return;
    }
    void handleHostInquiryChat();
  };

  const handleRepairIntegrity = async () => {
    if (!post.id) return;
    setRepairingIntegrity(true);
    try {
      const { fixMarketIntegrity, checkMarketIntegrity } = await import(
        "../../services/marketIntegrityService"
      );
      const res = await fixMarketIntegrity(post.id);
      alert(res.message);
      const r = await checkMarketIntegrity(post.id);
      setIntegrityStatus({
        isSafe: r.isSafe,
        currentPeople: r.currentPeople,
        realApproved: r.realApproved,
        difference: r.discrepancies?.difference ?? 0,
      });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "복구에 실패했습니다.");
    } finally {
      setRepairingIntegrity(false);
    }
  };

  // 🔥 마감 여부 계산
  const isFull = post.people && post.currentPeople && post.currentPeople >= post.people;
  const canOpenGroupChat = joinStatus === "approved";

  // 승인/거절 처리 (작성자용)
  const handleApprove = async (joinId: string) => {
    if (!confirm("이 참여 신청을 승인하시겠습니까?")) return;

    // 🔥 중복 클릭 방지
    if (processingJoinId) {
      return;
    }

    console.log("🔥 [MatchDetail] 승인 버튼 클릭:", {
      joinId,
      postId: post.id,
      isAuthor,
      userUid: user?.uid,
    });

    setProcessingJoinId(joinId);
    try {
      await updateJoinStatus({
        joinId,
        status: "approved",
        postId: post.id,
      });
      console.log("✅ [MatchDetail] 승인 성공:", { joinId });
      alert("참여 신청을 승인했습니다.");
    } catch (err: any) {
      console.error("❌ [MatchDetail] 승인 실패:", {
        joinId,
        error: err,
        message: err.message,
        code: err.code,
      });
      
      // 🔥 사용자 친화적인 에러 메시지
      let errorMessage = "승인에 실패했습니다.";
      if (err.message) {
        if (err.message.includes("이미 처리")) {
          errorMessage = "이미 처리된 참여 신청입니다.";
        } else {
          errorMessage = err.message;
        }
      }
      alert(errorMessage);
    } finally {
      setProcessingJoinId(null);
    }
  };

  const handleReject = async (joinId: string) => {
    if (!confirm("이 참여 신청을 거절하시겠습니까?")) return;

    // 🔥 중복 클릭 방지
    if (processingJoinId) {
      return;
    }

    console.log("🔥 [MatchDetail] 거절 버튼 클릭:", {
      joinId,
      postId: post.id,
      isAuthor,
      userUid: user?.uid,
    });

    setProcessingJoinId(joinId);
    try {
      await updateJoinStatus({
        joinId,
        status: "rejected",
        postId: post.id,
      });
      console.log("✅ [MatchDetail] 거절 성공:", { joinId });
      alert("참여 신청을 거절했습니다.");
    } catch (err: any) {
      console.error("❌ [MatchDetail] 거절 실패:", {
        joinId,
        error: err,
        message: err.message,
        code: err.code,
      });
      
      // 🔥 사용자 친화적인 에러 메시지
      let errorMessage = "거절에 실패했습니다.";
      if (err.message) {
        if (err.message.includes("이미 처리")) {
          errorMessage = "이미 처리된 참여 신청입니다.";
        } else {
          errorMessage = err.message;
        }
      }
      alert(errorMessage);
    } finally {
      setProcessingJoinId(null);
    }
  };

  const joinPrimaryControl = (opts?: { className?: string }) => {
    const cls = cn("h-11 flex-1 rounded-xl font-semibold", opts?.className);
    const waitJoinDoc = joinDocLoading && !!user && !isAuthor;
    if (joinStatus === "none") {
      return (
        <Button
          type="button"
          className={cn(cls, "bg-green-600 hover:bg-green-700")}
          onClick={handleJoin}
          disabled={joining || !!isFull || waitJoinDoc}
        >
          {waitJoinDoc ? "불러오는 중..." : joining ? "신청 중..." : isFull ? "모집 마감" : "참가 신청"}
        </Button>
      );
    }
    if (joinStatus === "pending") {
      return (
        <Button type="button" variant="secondary" className={cls} onClick={handleCancel} disabled={joining}>
          {joining ? "취소 중..." : "참여 대기중 · 취소"}
        </Button>
      );
    }
    if (joinStatus === "approved") {
      return (
        <Button type="button" disabled variant="secondary" className={cls}>
          참여 승인됨
        </Button>
      );
    }
    return (
      <Button
        type="button"
        className={cn(cls, "bg-orange-600 hover:bg-orange-700")}
        onClick={handleJoin}
        disabled={joining || !!isFull || waitJoinDoc}
      >
        {waitJoinDoc ? "불러오는 중..." : joining ? "신청 중..." : isFull ? "모집 마감" : "다시 참여하기"}
      </Button>
    );
  };

  const locationQuery = (post.location && String(post.location).trim()) || "";
  const mapLinks = locationQuery ? mapsUrlsForQuery(locationQuery) : null;

  return (
    <div className="bg-white pb-44 md:pb-44">
      {/* 🔥 뒤로가기 버튼 (상단) */}
      <div className="sticky top-[56px] z-10 bg-white border-b border-gray-200 px-4 py-3">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
        >
          <span className="text-xl">←</span>
          <span className="font-medium">
            {sport ? `${SPORT_LABELS[sport] || sport} 마켓` : "뒤로가기"}
          </span>
        </button>
      </div>
      {/* 이미지 (부모에서 이미 렌더 시 숨김) */}
      {!hideMedia && post.images && post.images.length > 0 ? (
        <div className="relative">
          <div className="aspect-square bg-gray-200">
            <img
              src={post.images[activeImageIndex]}
              alt={post.title}
              className="w-full max-h-[320px] object-cover rounded-lg"
            />
          </div>
        </div>
      ) : !hideMedia ? (
        <div className="aspect-square bg-gray-200 flex items-center justify-center">
          <p className="text-gray-400">이미지 없음</p>
        </div>
      ) : null}

      {/* 경기 정보 */}
      <div className="p-4 space-y-4">
        <MarketDetailHeader
          post={post}
          titleReplacement={
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {recruitmentMeta.recruitingOpen ? (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                    모집중
                  </span>
                ) : (
                  <span className="rounded-full bg-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700">
                    모집 종료
                  </span>
                )}
                {recruitmentMeta.urgency === "soon" && recruitmentMeta.recruitingOpen ? (
                  <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800">
                    마감 임박
                  </span>
                ) : null}
                <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-800">
                  상대 모집
                </span>
                {post.matchType ? (
                  <span className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-medium text-white">
                    {MATCH_TYPE_LABELS[post.matchType] || post.matchType}
                  </span>
                ) : null}
              </div>
              <h1 className="text-xl font-bold leading-snug text-gray-900">{recruitmentMeta.headline}</h1>
              {post.matchDate ? (
                <div className="flex items-start gap-2 text-gray-800">
                  <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" aria-hidden />
                  <div>
                    <p className="font-semibold text-blue-700">{formatMatchDate(post.matchDate)}</p>
                    {recruitmentMeta.dateTimeLong ? (
                      <p className="text-sm text-gray-600">{recruitmentMeta.dateTimeLong}</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {post.location ? (
                <div className="flex items-start gap-2 text-gray-800">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-gray-600" aria-hidden />
                  <p className="text-sm leading-relaxed text-gray-700">{post.location}</p>
                </div>
              ) : null}
            </div>
          }
        />

        {!isAuthor && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            {joinPrimaryControl()}
            <Button
              type="button"
              variant="outline"
              className="h-11 shrink-0 rounded-xl border-blue-300 font-semibold text-blue-700 hover:bg-blue-50 sm:min-w-[140px]"
              onClick={() => void handleHostInquiryChat()}
              disabled={inquiryLoading}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              {inquiryLoading ? "연결 중..." : "채팅하기"}
            </Button>
          </div>
        )}

        {isAuthor && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm text-amber-900">
            내가 올린 매칭 글입니다. 참가 신청·문의는 다른 사용자에게만 표시됩니다.
          </p>
        )}

        {joinStatus === "approved" && !isAuthor && (
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full rounded-xl border-gray-300 text-gray-800"
            onClick={handleApprovedGroupChat}
          >
            <MessagesSquare className="mr-2 h-4 w-4" />
            매칭 단체 채팅방 입장
          </Button>
        )}

        {/* 인원수 & 진행률 */}
        {post.people && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-600" />
                <span className="font-semibold text-lg">
                  {post.currentPeople || 0} / {post.people}명
                </span>
              </div>
              <span className="text-sm text-gray-600">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* 포지션 */}
        {post.position && post.position.length > 0 && (
          <div>
            <h2 className="font-semibold mb-2 flex items-center gap-2">
              <Target className="w-5 h-5" />
              필요 포지션
            </h2>
            <div className="flex gap-2 flex-wrap">
              {post.position.map((pos) => (
                <span
                  key={pos}
                  className="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg"
                >
                  {pos}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 실력 레벨 */}
        {post.level && (
          <div>
            <h2 className="font-semibold mb-2">실력 레벨</h2>
            <span
              className={cn(
                "inline-block px-3 py-1 text-sm font-medium rounded",
                LEVEL_COLORS[post.level] || LEVEL_COLORS.아마
              )}
            >
              {LEVEL_LABELS[post.level] || post.level}
            </span>
          </div>
        )}

        {/* 경기 위치 · 지도 · 길찾기 */}
        {post.location && mapLinks ? (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
            <div className="border-b border-gray-200 bg-white px-4 py-3">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-gray-600" aria-hidden />
                경기 위치
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-gray-700">{post.location}</p>
            </div>
            <div className="aspect-[16/9] w-full bg-gray-200">
              <iframe
                title="경기 장소 지도"
                src={mapLinks.embed}
                className="h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="flex flex-wrap gap-2 p-3 bg-white">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="rounded-lg font-medium"
                onClick={() => openExternalMap(mapLinks.google)}
              >
                <ExternalLink className="mr-1.5 h-4 w-4" />
                길찾기 (Google)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg font-medium"
                onClick={() => openExternalMap(mapLinks.kakao)}
              >
                카카오맵
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg font-medium"
                onClick={() => openExternalMap(mapLinks.naver)}
              >
                네이버지도
              </Button>
            </div>
          </div>
        ) : null}

        {/* 참가비 */}
        {post.fee && (
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-gray-600" />
            <span className="text-lg font-semibold">
              참가비: {new Intl.NumberFormat("ko-KR").format(post.fee)}원
            </span>
          </div>
        )}

        {/* 설명 */}
        {post.description && (
          <div className="pt-4 border-t">
            <h2 className="font-semibold mb-2">경기 설명</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{post.description}</p>
          </div>
        )}

        {/* 🔥 작성자 전용: 무결성 상태 표시 */}
        {isAuthor && integrityStatus && (
          <div className={`p-3 rounded-lg mb-4 ${
            integrityStatus.isSafe 
              ? "bg-green-50 border border-green-200" 
              : "bg-red-50 border border-red-200"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={integrityStatus.isSafe ? "text-green-600" : "text-red-600"}>
                  {integrityStatus.isSafe ? "🟢 무결성 정상" : "🔴 무결성 불일치"}
                </span>
                <span className="text-sm text-gray-600">
                  (currentPeople: {integrityStatus.currentPeople}, 실제 승인: {integrityStatus.realApproved})
                </span>
              </div>
              {!integrityStatus.isSafe && (
                <button
                  onClick={handleRepairIntegrity}
                  disabled={repairingIntegrity}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded disabled:bg-gray-300"
                >
                  {repairingIntegrity ? "복구 중..." : "강제 복구"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* 🔥 작성자 전용: 참여자 리스트 */}
        {isAuthor && (
          <div className="pt-4 border-t">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <Users className="w-5 h-5" />
              참여 신청 목록 ({joinList.length}명)
            </h2>
            {joinList.length === 0 ? (
              <p className="text-gray-500 text-sm">아직 참여 신청이 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {joinList.map((join) => (
                  <div
                    key={join.id}
                    className="bg-gray-50 p-4 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {join.userName || "익명"}
                        </div>
                        {join.position && (
                          <div className="text-sm text-gray-600 mt-1">
                            포지션: {join.position}
                          </div>
                        )}
                        {join.message && (
                          <div className="text-sm text-gray-600 mt-1">
                            {join.message}
                          </div>
                        )}
                        {join.createdAt && (
                          <div className="text-xs text-gray-500 mt-1">
                            {formatRelativeTime(join.createdAt)}
                          </div>
                        )}
                      </div>
                      <div className="ml-3">
                        {join.status === "pending" ? (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                            대기중
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                            승인됨
                          </span>
                        )}
                      </div>
                    </div>
                    {join.status === "pending" && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleApprove(join.id)}
                          disabled={processingJoinId === join.id}
                          className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2 px-4 rounded-lg text-sm font-medium disabled:bg-gray-300"
                        >
                          <Check className="w-4 h-4" />
                          {processingJoinId === join.id ? "처리 중..." : "승인"}
                        </button>
                        <button
                          onClick={() => handleReject(join.id)}
                          disabled={processingJoinId === join.id}
                          className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-2 px-4 rounded-lg text-sm font-medium disabled:bg-gray-300"
                        >
                          <X className="w-4 h-4" />
                          {processingJoinId === join.id ? "처리 중..." : "거절"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 하단 고정 CTA (BottomNav 위 — PC에서도 동일 노출) */}
      {!isAuthor && (
        <div
          className="fixed left-0 right-0 z-[10001] border-t border-gray-200 bg-white p-4 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]"
          style={{ bottom: "64px" }}
        >
          <Button
            type="button"
            className="mb-3 h-12 w-full rounded-xl bg-blue-600 text-base font-semibold hover:bg-blue-700"
            onClick={() => void handleHostInquiryChat()}
            disabled={inquiryLoading}
          >
            <MessageCircle className="mr-2 h-5 w-5" />
            {inquiryLoading ? "연결 중..." : "채팅으로 문의하기"}
          </Button>
          <div className="flex gap-2">{joinPrimaryControl({ className: "flex-1" })}</div>
          {canOpenGroupChat ? (
            <Button
              type="button"
              variant="outline"
              className="mt-2 h-10 w-full rounded-xl border-gray-300 text-sm font-medium text-gray-800"
              onClick={handleApprovedGroupChat}
            >
              <MessagesSquare className="mr-2 h-4 w-4" />
              매칭 단체 채팅방
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
