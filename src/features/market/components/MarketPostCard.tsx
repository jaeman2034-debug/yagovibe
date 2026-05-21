/**
 * 🔥 마켓 게시글 카드 라우터
 * 카테고리별 전용 카드 컴포넌트로 분기
 */

import EquipmentCard from "./cards/EquipmentCard";
import MarketItemCard from "./cards/MarketItemCard";
import RecruitCard from "./cards/RecruitCard";
import MatchCard from "./cards/MatchCard";
import type { MarketPost, Sport } from "../types";

interface MarketPostCardProps {
  post: MarketPost;
  contextSport: Sport;
  showSportBadge?: boolean;
  rank?: number;
}

export default function MarketPostCard({
  post,
  contextSport,
  showSportBadge = false,
  rank,
}: MarketPostCardProps) {
  // 카테고리별 카드 컴포넌트로 분기
  switch (post.category) {
    case "equipment":
      // 전환율 최적화 카드로 매핑 (간단/가독성 높은 버전)
      {
        const anyPost = post as any;
        const ptype: string | undefined = anyPost.type; // used | share | lost
        const mappedType =
          ptype === "share" ? "share" : ptype === "lost" ? "lost" : "sale";
        const createdAt =
          (post.createdAt as any)?.toDate?.()?.toISOString?.() ||
          (typeof post.createdAt === "number"
            ? new Date(post.createdAt).toISOString()
            : new Date().toISOString());
        const item = {
          id: post.id,
          title: post.title,
          price: post.price,
          location: (anyPost.locationText as string) || post.location,
          thumbnail: post.thumbnailUrl || (post.images && post.images[0]),
          type: mappedType as "sale" | "share" | "lost",
          createdAt,
          sport: post.sport,
          status: (post as any).status || "active",
        };
        return <MarketItemCard item={item} />;
      }
    case "recruit":
      return (
        <RecruitCard
          post={post}
          contextSport={contextSport}
          rank={rank}
        />
      );
    case "match":
      return (
        <MatchCard
          post={post}
          contextSport={contextSport}
          rank={rank}
        />
      );
    default:
      // 기본 카드 (기존 구조 유지)
      return (
        <EquipmentCard
          post={post}
          contextSport={contextSport}
          rank={rank}
        />
      );
  }
}
