/**
 * 🔥 마켓 게시글 카드 컴포넌트
 */

import { useNavigate } from "react-router-dom";
import { MapPin } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import type { MarketPost, Sport } from "@/types/market";
import { useAuth } from "@/context/AuthProvider";
import { toggleLike, checkIfLiked } from "@/features/market/services/likes";
import { sportMarketDetailUrl } from "@/utils/sportHubHref";
import { db } from "@/lib/firebase";
import { onSnapshot, doc } from "firebase/firestore";

interface MarketPostCardProps {
  post: MarketPost;
  contextSport: Sport;
  showSportBadge?: boolean; // view=all일 때만 true
  rank?: number; // 이벤트 트래킹용
}

const SPORT_LABELS: Record<Sport, string> = {
  soccer: "축구",
  basketball: "농구",
  running: "러닝",
  badminton: "배드민턴",
  all: "전체",
};

const STATUS_LABELS: Record<string, string> = {
  open: "판매중",
  reserved: "예약중",
  done: "완료",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-green-100 text-green-700",
  reserved: "bg-yellow-100 text-yellow-700",
  done: "bg-gray-100 text-gray-700",
};

function StatusBadge({ status }: { status?: string }) {
  const s = (status || "open").toLowerCase();
  if (s === "sold" || s === "done" || s === "completed") {
    return (
      <span className="text-xs px-2 py-1 rounded font-medium bg-gray-400 text-white">
        판매완료
      </span>
    );
  }
  if (s === "reserved" || s === "holding") {
    return (
      <span className="text-xs px-2 py-1 rounded font-medium bg-orange-400 text-white">
        예약중
      </span>
    );
  }
  return (
    <span className="text-xs px-2 py-1 rounded font-medium bg-green-500 text-white">
      판매중
    </span>
  );
}

function formatDistance(meters?: number | null) {
  if (meters === undefined || meters === null) return "";
  if (Number.isNaN(meters)) return "";
  return `${(meters / 1000).toFixed(1)}km`;
}

function normalizeDistance(distanceInput?: any): number | null {
  if (distanceInput === undefined || distanceInput === null) return null;
  if (typeof distanceInput === "number") return distanceInput;
  if (typeof distanceInput === "string") {
    const s = distanceInput.trim();
    const num = parseFloat(s.replace(/[^\d\.]/g, ""));
    if (Number.isNaN(num)) return null;
    if (s.includes("km") || s.includes("KM") || s.toLowerCase().includes("km")) {
      return num * 1000;
    }
    // 기본: 미터 단위로 간주
    return num;
  }
  return null;
}

export default function MarketPostCard({
  post,
  contextSport,
  showSportBadge = false,
  rank,
}: MarketPostCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth?.() || { user: null };
  const statusRaw = (post as any).status || (post as any).tradeStatus || (post as any).state;
  const isSold =
    typeof statusRaw === "string" &&
    ["sold", "done", "completed"].includes(statusRaw.toLowerCase());
  const [liked, setLiked] = useState<boolean>(false);
  const [likesCount, setLikesCount] = useState<number>((post as any).likesCount ?? (post as any).likes ?? 0);
  const likesUnsubRef = useRef<(() => void) | null>(null);

  // 초기 liked 상태 조회
  useEffect(() => {
    let mounted = true;
    async function init() {
      if (!user?.uid) return;
      try {
        const r = await checkIfLiked(post.id, user.uid);
        if (mounted) setLiked(r);
      } catch {}
    }
    void init();
    return () => {
      mounted = false;
    };
  }, [post.id, user?.uid]);

  // likesCount 실시간 구독 (카드 N개 = 리스너 N개 → 이전 구독 선제 해제로 WatchStream 중첩 완화)
  useEffect(() => {
    likesUnsubRef.current?.();
    likesUnsubRef.current = null;

    if (!post?.id) return;

    const unsub = onSnapshot(doc(db, "posts", post.id), (snap) => {
      const d = snap.data() as any;
      if (d && typeof d.likesCount === "number") setLikesCount(d.likesCount);
    });
    likesUnsubRef.current = unsub;
    return () => {
      unsub();
      likesUnsubRef.current = null;
    };
  }, [post?.id]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.uid) return; // 로그인 필요
    try {
      const r = await toggleLike(post.id, user.uid);
      setLiked(r);
    } catch {}
  };

  const handleClick = () => {
    // 이벤트 트래킹
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "market_post_click", {
        postId: post.id,
        postSport: post.sport,
        category: post.category,
        rank: rank || 0,
        view: showSportBadge ? "all" : "sport",
      });
    }

    // 🔥 타입 정규화: category 우선, 없으면 type 사용
    const resolveType = (p: any): string => {
      if (p?.category) return p.category; // "equipment" | "recruit" | "match" 등
      if (p?.type) return p.type;
      return "market";
    };

    const type = resolveType(post);
    const sport = (post.sport as Sport) || contextSport || "soccer";
    console.log("🔥 클릭 type:", type, post.title);

    // 🔥 타입별 라우팅
    switch (type) {
      case "market":
      case "equipment": {
        navigate(sportMarketDetailUrl(sport, post.id));
        break;
      }
      case "recruit": {
        // ✅ 모집글 클릭은 항상 "모집글 상세"로 이동 (팀 페이지 아님)
        navigate(sportMarketDetailUrl(sport, post.id));
        break;
      }
      case "match": {
        navigate(`/sports/${sport}/match/${post.id}`);
        break;
      }
      case "activity": {
        // 활동 게시글 상세 경로 (프로젝트 표준: /sports/:sport/post/:postId)
        navigate(`/sports/${sport}/post/${post.id}`);
        break;
      }
      case "event": {
        // 이벤트 상세 기본 경로
        navigate(`/events/${post.id}`);
        break;
      }
      default: {
        console.warn("⚠️ Unknown type, fallback to market:", type);
        navigate(sportMarketDetailUrl(sport, post.id));
      }
    }
  };

  const formatPrice = (price?: number) => {
    if (!price) return null;
    return new Intl.NumberFormat("ko-KR").format(price) + "원";
  };

  const formatRelativeTime = (timestamp: any) => {
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

  return (
    <div
      onClick={handleClick}
      className={cn(
        "flex gap-3 overflow-hidden rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:bg-gray-50 cursor-pointer",
        isSold && "opacity-90"
      )}
    >
      {/* 썸네일: 리스트형 좌측 고정 */}
      <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200">
        {post.images && post.images.length > 0 ? (
          <img
            src={post.images[0]}
            alt={post.title}
            className={cn(
              "pointer-events-none block h-full w-full object-cover",
              isSold && "brightness-[0.55]"
            )}
          />
        ) : (
          <div className="pointer-events-none flex h-full w-full items-center justify-center text-xs text-gray-400">
            이미지 없음
          </div>
        )}
        {isSold ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded-md bg-black/55 px-2 py-1 text-[10px] font-bold tracking-tight text-white">
              판매완료
            </span>
          </div>
        ) : null}
      </div>

      {/* 내용: 우측 정보 블록 (텍스트는 우측 정렬, 줄바꿈 안전) */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        {/* 제목 + 찜 */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-gray-900 truncate">
            {post.title}
          </p>
          <div
            onClick={handleLike}
            className="text-sm text-gray-500 flex items-center gap-1 cursor-pointer select-none"
            title="찜하기"
          >
            <span className={liked ? "text-red-500" : "text-gray-400"}>❤️</span>
            <span>{likesCount ?? 0}</span>
          </div>
        </div>

        {/* 중단: 카테고리별 핵심 정보 + 상태/가격 */}
        <div className="mt-1">
          {(() => {
            const category = (post as any).category || (post as any).type || "equipment";
            if (category === "equipment" || category === "market") {
              const condition =
                (post as any).condition ||
                (post as any).state ||
                (post as any).statusText ||
                "중고";
              const brand = (post as any).brand;
              return (
                <div>
                  {/* 가격 */}
                  {typeof post.price === "number" && (
                    <p className="text-base font-bold text-blue-600">
                      {formatPrice(post.price)}
                    </p>
                  )}
                  {/* 상태/브랜드 */}
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-700">
                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">{condition}</span>
                    {brand && <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700">{brand}</span>}
                  </div>
                </div>
              );
            }
            if (category === "recruit") {
              const current = Number((post as any).currentPeople ?? (post as any).current ?? 0);
              const total = Number((post as any).people ?? (post as any).slots ?? 0);
              const positions = Array.isArray((post as any).position)
                ? ((post as any).position as string[]).slice(0, 3).join(", ")
                : (post as any).position || undefined;
              return (
                <div className="text-sm text-gray-600">
                  <p>👥 {current}/{total || "?"}명{positions ? ` · ${positions}` : ""}</p>
                </div>
              );
            }
            if (category === "match") {
              const date = (post as any).matchDate || (post as any).date;
              const matchType = (post as any).matchType || (post as any).format;
              const fee = (post as any).fee;
              const dateLabel = (() => {
                if (!date) return null;
                const d = date.toDate ? date.toDate() : new Date(date);
                const mm = String(d.getMonth() + 1).padStart(2, "0");
                const dd = String(d.getDate()).padStart(2, "0");
                const hh = String(d.getHours()).padStart(2, "0");
                const mi = String(d.getMinutes()).padStart(2, "0");
                return `${mm}/${dd} ${hh}:${mi}`;
              })();
              return (
                <div className="text-sm text-gray-600">
                  <p>
                    {dateLabel && <>📅 {dateLabel}</>}
                    {matchType && <> · {matchType}</>}
                    {typeof fee === "number" && <> · 💵 {formatPrice(fee)}</>}
                  </p>
                </div>
              );
            }
            return null;
          })()}
        </div>

        {/* 위치 (한 줄, truncate) */}
        <div className="text-xs text-gray-500 mt-1 truncate">
          {(() => {
            const locationName =
              (post as any).location ||
              (post as any).address ||
              (post as any).dong ||
              (post as any).region ||
              (post as any).area ||
              "";
            const rawDistance =
              (post as any).distanceMeters ??
              ((post as any).distanceKm !== undefined
                ? Number((post as any).distanceKm) * 1000
                : undefined) ??
              (post as any).distance;
            const meters = normalizeDistance(rawDistance);
            const distanceLabel = meters != null ? ` · ${formatDistance(meters)}` : "";
            const label = locationName ? `📍 ${locationName}${distanceLabel}` : "📍 위치 정보 없음";
            return <span className="truncate">{label}</span>;
          })()}
        </div>

        {/* 하단: 조회/채팅/좋아요 */}
        <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
          <div className="flex gap-3">
            <span>👁 {(post as any).views ?? (post as any).viewCount ?? 0}</span>
            <span>💬 {(post as any).chats ?? (post as any).chatCount ?? 0}</span>
          </div>
          <span>❤️ {likesCount ?? 0}</span>
        </div>

      </div>
    </div>
  );
}
