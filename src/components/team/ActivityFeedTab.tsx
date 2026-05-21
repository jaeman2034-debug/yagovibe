/**
 * 🔥 Activity Feed Tab 컴포넌트
 * 
 * MyTeamPage의 Activity Feed 탭 컨텐츠
 */

import { ActivityFeed } from "./activity/ActivityFeed";

interface ActivityFeedTabProps {
  teamId: string;
  sportType?: string;
}

export function ActivityFeedTab({ teamId, sportType = "football" }: ActivityFeedTabProps) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">팀 활동</h2>
        <p className="text-sm text-gray-500 mt-1">
          팀의 모든 활동을 한눈에 확인하세요
        </p>
      </div>
      <ActivityFeed teamId={teamId} limitCount={20} sportType={sportType} />
    </div>
  );
}
