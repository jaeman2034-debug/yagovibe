/**
 * ?뵦 寃쎄린 留ㅼ묶 移대뱶 (match)
 */

import { useNavigate } from "react-router-dom";
import { Calendar, Users, MapPin, Clock, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MarketPost, Sport } from "../../types";
import { sportMarketDetailUrl } from "@/utils/sportHubHref";

interface MatchCardProps {
  post: MarketPost;
  contextSport: Sport;
  rank?: number;
}

const MATCH_TYPE_LABELS: Record<string, string> = {
  "5v5": "5:5",
  "7v7": "7:7",
  "11v11": "11:11",
};

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

export default function MatchCard({
  post,
  contextSport,
  rank,
}: MatchCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "market_post_click", {
        postId: post.id,
        category: "match",
        rank: rank || 0,
      });
    }
    // ?뵦 留ㅼ묶湲 ??/sports/:sport/market/:postId 寃쎈줈濡??듭씪
    const postSport = post.sport || contextSport || "soccer";
    navigate(sportMarketDetailUrl(postSport, post.id));
  };

  const formatMatchDate = (timestamp: number | any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);

    if (days < 0) return "寃쎄린 醫낅즺";
    if (days === 0) return `?ㅻ뒛 ${date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`;
    if (days === 1) return `?댁씪 ${date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`;
    return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
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

  const progress = post.people && post.currentPeople
    ? Math.round((post.currentPeople / post.people) * 100)
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
            {post.matchType && (
              <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded whitespace-nowrap">
                {MATCH_TYPE_LABELS[post.matchType] || post.matchType}
              </span>
            )}
          </div>

          {/* 寃쎄린 ?좎쭨 媛뺤“ */}
          {post.matchDate && (
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">
                {formatMatchDate(post.matchDate)}
              </span>
            </div>
          )}

          {/* ?몄썝??& 吏꾪뻾瑜?*/}
          {post.people && (
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  {post.currentPeople || 0} / {post.people}紐?                </span>
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
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* ?ъ???*/}
          {post.position && post.position.length > 0 && (
            <div className="flex gap-1 mb-2 flex-wrap">
              {post.position.map((pos) => (
                <span
                  key={pos}
                  className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded"
                >
                  {pos}
                </span>
              ))}
            </div>
          )}

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
              {post.fee && (
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  {new Intl.NumberFormat("ko-KR").format(post.fee)}??                </span>
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

