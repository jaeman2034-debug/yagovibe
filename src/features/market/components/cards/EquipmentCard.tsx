/**
 * ?뵦 以묎퀬 嫄곕옒 移대뱶 (equipment)
 */

import { useNavigate } from "react-router-dom";
import { MapPin, Clock, Tag, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MarketPost, Sport } from "../../types";
import { sportMarketDetailUrl } from "@/utils/sportHubHref";
import BoostBadge from "@/components/market/BoostBadge";
import VerificationBadge from "@/components/market/VerificationBadge";

interface EquipmentCardProps {
  post: MarketPost;
  contextSport: Sport;
  rank?: number;
}

const CONDITION_LABELS: Record<string, string> = {
  new: "?덉긽??,
  like_new: "嫄곗쓽 ?덇쾬",
  used: "以묎퀬",
  poor: "?섏옄?덉쓬",
};

const CONDITION_COLORS: Record<string, string> = {
  new: "bg-green-100 text-green-700",
  like_new: "bg-blue-100 text-blue-700",
  used: "bg-gray-100 text-gray-700",
  poor: "bg-orange-100 text-orange-700",
};

export default function EquipmentCard({
  post,
  contextSport,
  rank,
}: EquipmentCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "market_post_click", {
        postId: post.id,
        category: "equipment",
        rank: rank || 0,
      });
    }
    // ?뵦 ?곸꽭 ?섏씠吏??/sports/:sport/market/:postId 寃쎈줈濡??듭씪
    const postSport = post.sport || contextSport || "soccer";
    navigate(sportMarketDetailUrl(postSport, post.id));
  };

  const formatPrice = (price?: number) => {
    if (!price) return null;
    return new Intl.NumberFormat("ko-KR").format(price) + "??;
  };

  const formatRelativeTime = (timestamp: number | any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "諛⑷툑 ??;
    if (minutes < 60) return `${minutes}遺???;
    if (hours < 24) return `${hours}?쒓컙 ??;
    if (days < 7) return `${days}????;
    return date.toLocaleDateString("ko-KR");
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white border-b border-gray-200 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
    >
      <div className="flex gap-3">
        {/* ?몃꽕??*/}
        <div className="flex-shrink-0 w-24 h-24 bg-gray-200 rounded-lg overflow-hidden relative">
          {/* 遺?ㅽ듃 諛곗? */}
          {post.boostActive && (
            <div className="absolute top-1 right-1 z-10">
              <BoostBadge
                boostActive={post.boostActive}
                boostEndTime={post.boostEndTime?.toDate?.() || 
                  (post.boostEndTime?.seconds ? 
                    new Date(post.boostEndTime.seconds * 1000) : undefined)}
                boostChatCount={post.boostChatCount || 0}
              />
            </div>
          )}
          {(post.thumbnailUrl || (post.images && post.images[0])) ? (
            <img
              src={post.thumbnailUrl || post.images![0]}
              alt={post.title}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
              ?대?吏 ?놁쓬
            </div>
          )}
        </div>

        {/* ?댁슜 */}
        <div className="flex-1 min-w-0">
          {/* ?뵦 ?몄쬆 諭껋? (移대뱶 ?곷떒) */}
          {(post.authorFaceToFaceVerified || post.authorRealNameVerified || 
            (post.authorTrustTier && (post.authorTrustTier === "verified" || post.authorTrustTier === "host"))) && (
            <div className="mb-2">
              <VerificationBadge
                faceToFaceVerified={post.authorFaceToFaceVerified}
                realNameVerified={post.authorRealNameVerified}
                trustTier={post.authorTrustTier}
              />
            </div>
          )}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 truncate flex-1">
              {post.title}
            </h3>
            {/* ?뵦 Top Seller 諭껋? */}
            {post.authorTrustTier === "top" && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold flex-shrink-0">
                <Award className="w-3 h-3" />
                Top Seller
              </span>
            )}
          </div>

          {/* 媛寃?媛뺤“ */}
          {post.price && (
            <div className="text-lg font-bold text-blue-600 mb-2">
              {formatPrice(post.price)}
            </div>
          )}

          {/* ?곹깭 & 釉뚮옖??*/}
          <div className="flex items-center gap-2 mb-2">
            {post.condition && (
              <span
                className={cn(
                  "px-2 py-0.5 text-xs font-medium rounded",
                  CONDITION_COLORS[post.condition] || CONDITION_COLORS.used
                )}
              >
                {CONDITION_LABELS[post.condition] || post.condition}
              </span>
            )}
            {post.brand && (
              <span className="flex items-center gap-1 text-xs text-gray-600">
                <Tag className="w-3 h-3" />
                {post.brand}
              </span>
            )}
          </div>

          {post.description && (
            <p className="text-sm text-gray-600 line-clamp-1 mb-2">
              {post.description}
            </p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {post.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {post.location}
                </span>
              )}
              {post.createdAt && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatRelativeTime(post.createdAt)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

