/**
 * 🔥 Activity Item 컴포넌트
 * 
 * 개별 Activity 카드를 표시하는 컴포넌트
 */

import { TeamActivity } from "@/types/activity";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { ActivityIcon } from "./ActivityIcon";
import { Calendar, MapPin } from "lucide-react";

interface ActivityItemProps {
  activity: TeamActivity;
  teamId: string;
  sportType?: string;
}

export function ActivityItem({ activity, teamId, sportType = "football" }: ActivityItemProps) {
  const navigate = useNavigate();
  const timeAgo = formatDistanceToNow(activity.createdAt.toDate(), {
    addSuffix: true,
    locale: ko,
  });

  const handleClick = () => {
    // 타입별 상세 페이지로 이동
    switch (activity.type) {
      case "event":
        navigate(`/sports/${sportType}/team/schedule/${activity.referenceId}`);
        break;
      case "notice":
        navigate(`/sports/${sportType}/team/notices/${activity.referenceId}`);
        break;
      case "match":
        navigate(`/matches/${activity.referenceId}`);
        break;
      default:
        break;
    }
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0">
          <ActivityIcon type={activity.type} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            {activity.title}
          </h3>
          {activity.summary && (
            <p className="text-xs text-gray-500 mb-2 line-clamp-2">
              {activity.summary}
            </p>
          )}
          {activity.metadata?.eventDate && (
            <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
              <Calendar className="w-3 h-3" />
              <span>
                {activity.metadata.eventDate.toDate().toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}
          {activity.metadata?.location && (
            <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
              <MapPin className="w-3 h-3" />
              <span>{activity.metadata.location}</span>
            </div>
          )}
          {activity.metadata?.matchScore && (
            <p className="text-xs text-gray-400 mb-1">
              ⚽ {activity.metadata.matchScore}
            </p>
          )}
          {activity.metadata?.memberName && (
            <p className="text-xs text-gray-400 mb-1">
              👤 {activity.metadata.memberName}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
            <span>{timeAgo}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
