import type { ReactNode } from "react";
import { User, Clock, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { MarketPost } from "../types";

function formatMarketRelativeTime(timestamp: unknown): string {
  if (timestamp === undefined || timestamp === null || timestamp === "") return "";
  const date =
    typeof timestamp === "object" &&
    timestamp !== null &&
    "toDate" in (timestamp as object) &&
    typeof (timestamp as { toDate?: () => Date }).toDate === "function"
      ? (timestamp as { toDate: () => Date }).toDate()
      : new Date(timestamp as number | string);
  if (Number.isNaN(date.getTime())) return "";
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  return date.toLocaleDateString("ko-KR");
}

export interface MarketDetailHeaderProps {
  post: MarketPost;
  /** 기본 제목 줄(h1 + titleAddon) 대신 사용 (매치 상세 등 커스텀 헤더) */
  titleReplacement?: ReactNode;
  /** 제목 오른쪽 (모집 상태 배지, 매칭 형식 칩 등) */
  titleAddon?: ReactNode;
  className?: string;
  /** 이름이 없을 때 표시 (예: 장비 상세는 "판매자") */
  authorFallback?: string;
  /** false면 작성자 줄 클릭 비활성 */
  authorNavigable?: boolean;
}

/**
 * 통합 마켓 상세: 제목 / 작성자 / 등록 시각 / 조회수 (+ titleAddon)
 */
export default function MarketDetailHeader({
  post,
  titleReplacement,
  titleAddon,
  className,
  authorFallback = "작성자",
  authorNavigable = true,
}: MarketDetailHeaderProps) {
  const navigate = useNavigate();
  const title = (post.title || "").trim() || "제목 없음";
  const authorIdRaw =
    (post.authorId && String(post.authorId).trim()) ||
    String((post as { sellerId?: string }).sellerId || "").trim() ||
    String((post as { userId?: string }).userId || "").trim();
  const displayName = (post.authorName && String(post.authorName).trim()) || authorFallback;
  const timeLabel = formatMarketRelativeTime(post.createdAt);
  const views =
    typeof post.viewCount === "number" && !Number.isNaN(post.viewCount) ? post.viewCount : null;

  const goSeller = () => {
    if (!authorNavigable || !authorIdRaw) return;
    const sport = post.sport || "soccer";
    navigate(`/sports/${sport}/market/seller/${authorIdRaw}`);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {titleReplacement ? (
        titleReplacement
      ) : (
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold text-gray-900 flex-1 min-w-0 leading-snug">{title}</h1>
          {titleAddon ? <div className="flex-shrink-0 pt-0.5">{titleAddon}</div> : null}
        </div>
      )}

      {authorIdRaw || displayName ? (
        <button
          type="button"
          onClick={goSeller}
          disabled={!authorNavigable || !authorIdRaw}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-left text-sm transition-colors",
            authorNavigable && authorIdRaw && "cursor-pointer hover:bg-gray-100 active:bg-gray-200",
            (!authorNavigable || !authorIdRaw) && "cursor-default opacity-90"
          )}
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
            <User className="h-4 w-4 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-gray-900">{displayName}</div>
            <div className="text-xs text-gray-500">
              {authorNavigable && authorIdRaw ? "프로필 보기" : "작성자"}
            </div>
          </div>
          {authorNavigable && authorIdRaw ? (
            <span className="flex-shrink-0 text-gray-400" aria-hidden>
              →
            </span>
          ) : null}
        </button>
      ) : null}

      {(timeLabel || views !== null) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
          {timeLabel ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 flex-shrink-0" aria-hidden />
              <span>{timeLabel}</span>
            </span>
          ) : null}
          {views !== null ? (
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-4 w-4 flex-shrink-0" aria-hidden />
              <span>조회 {views.toLocaleString("ko-KR")}</span>
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
