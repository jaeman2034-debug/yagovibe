/**
 * ?뵦 ? 紐⑥쭛 移대뱶 (recruit)
 */

import { useNavigate } from "react-router-dom";
import { Users, MapPin, Clock, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MarketPost, Sport } from "../../types";
import { sportMarketDetailUrl } from "@/utils/sportHubHref";

interface RecruitCardProps {
  post: MarketPost;
  contextSport: Sport;
  rank?: number;
}

const LEVEL_LABELS: Record<string, string> = {
  ?낅Ц: "?낅Ц",
  ?꾨쭏: "?꾨쭏異붿뼱",
  ?꾨줈吏?? "?꾨줈吏??,
};

const LEVEL_COLORS: Record<string, string> = {
  ?낅Ц: "bg-green-100 text-green-700",
  ?꾨쭏: "bg-blue-100 text-blue-700",
  ?꾨줈吏?? "bg-purple-100 text-purple-700",
};

export default function RecruitCard({
  post,
  contextSport,
  rank,
}: RecruitCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "market_post_click", {
        postId: post.id,
        category: "recruit",
        rank: rank || 0,
      });
    }
    // ?뵦 紐⑥쭛湲 ??/sports/:sport/market/:postId 寃쎈줈濡??듭씪
    const postSport = post.sport || contextSport || "soccer";
    navigate(sportMarketDetailUrl(postSport, post.id));
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

  // ?뵦 Progress 怨꾩궛 (100% 珥덇낵 諛⑹? + ?덉쟾?μ튂)
  const progress = post.people && post.currentPeople && post.people > 0
    ? Math.min(100, Math.round((post.currentPeople / post.people) * 100))
    : 0;

  return (
    <div
      onClick={handleClick}
      className="bg-white border-b border-gray-200 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
    >
      <div className="flex gap-3">
        {/* ?몃꽕??*/}
        <div className="flex-shrink-0 w-24 h-24 bg-gray-200 rounded-lg overflow-hidden">
          {(post.thumbnailUrl || (post.images && post.images[0])) ? (
            <img
              src={post.thumbnailUrl || post.images![0]}
              loading="lazy"
              alt={post.title}
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
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 truncate flex-1">
              {post.title}
            </h3>
          </div>

          {/* ?몄썝??& 吏꾪뻾瑜?*/}
          {post.people && (
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-gray-900">
                    {post.currentPeople || 0} / {post.people}紐?                  </span>
                  {post.level && (
                    <span
                      className={cn(
                        "px-2 py-0.5 text-xs font-medium rounded",
                        LEVEL_COLORS[post.level] || LEVEL_COLORS.?꾨쭏
                      )}
                    >
                      {LEVEL_LABELS[post.level] || post.level}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium text-blue-600">
                  {progress}%
                </span>
              </div>
              {/* ?뵦 Progress Bar 而⑦뀒?대꼫 (overflow 諛⑹? + 洹좏삎?≫엺 ?붿옄?? */}
              <div className="w-full overflow-hidden rounded-full bg-gray-200 h-2 shadow-inner">
                <div
                  className="h-2 rounded-full transition-all duration-300 bg-gradient-to-r from-blue-500 to-blue-600"
                  style={{ 
                    width: `${progress}%`,
                    maxWidth: "100%" // ?뵦 100% 珥덇낵 諛⑹?
                  }}
                />
              </div>
            </div>
          )}

          {/* ?ъ???*/}
          {post.position && post.position.length > 0 && (
            <div className="flex items-center gap-1 mb-2">
              <Target className="w-3 h-3 text-gray-500" />
              <div className="flex gap-1 flex-wrap">
                {post.position.map((pos) => (
                  <span
                    key={pos}
                    className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded"
                  >
                    {pos}
                  </span>
                ))}
              </div>
            </div>
          )}

          {post.description && (
            <p className="text-sm text-gray-600 line-clamp-1 mb-2">
              {post.description}
            </p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {post.practiceLocation && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {post.practiceLocation}
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

