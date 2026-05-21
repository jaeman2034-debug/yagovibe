/**
 * Sport 허브 — 활동 탭: `activities` 통합 피드
 */

import { Link } from "react-router-dom";
import ActivityFeed from "@/components/activity/ActivityFeed";
import { OrganizationCard } from "@/components/organization/OrganizationCard";

interface SportActivityFeedProps {
  sport: string;
}

/** 활동 탭 상단 공식 협회 카드 — slug는 라우트 `/federations/:federationSlug` 와 동일 */
const OFFICIAL_SOCCER_FEDERATION = {
  slug: "nowon-football",
  title: "📢 [공식] 노원구 축구협회",
  description: "노원구 공식 축구 리그 운영",
} as const;

export default function SportActivityFeed({ sport }: SportActivityFeedProps) {
  const showSoccerOfficialCard = sport === "soccer";

  return (
    <div className="space-y-4">
      {showSoccerOfficialCard && (
        <OrganizationCard
          title={OFFICIAL_SOCCER_FEDERATION.title}
          description={OFFICIAL_SOCCER_FEDERATION.description}
          federationSlug={OFFICIAL_SOCCER_FEDERATION.slug}
        />
      )}
      <div className="flex justify-end px-1">
        <Link
          to={`/sports/${encodeURIComponent(sport)}/activity`}
          className="text-xs font-medium text-blue-600 hover:underline"
        >
          전체 피드 · 더 보기 →
        </Link>
      </div>
      <ActivityFeed sport={sport} />
    </div>
  );
}
