/**
 * 🔥 Activity Feed 컴포넌트
 * 
 * 팀 활동 피드를 표시하는 메인 컴포넌트
 * 실시간 업데이트 지원 (onSnapshot)
 */

import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthForFirestore } from "@/hooks/useAuthForFirestore";
import { TeamActivity } from "@/types/activity";
import { ActivityItem } from "./ActivityItem";

interface ActivityFeedProps {
  teamId: string;
  limitCount?: number;
  sportType?: string;
}

export function ActivityFeed({ teamId, limitCount = 20, sportType = "football" }: ActivityFeedProps) {
  const { canQuery } = useAuthForFirestore();
  const [activities, setActivities] = useState<TeamActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canQuery || !teamId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    try {
      const activitiesRef = collection(db, "teams", teamId, "activities");
      const q = query(
        activitiesRef,
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as TeamActivity[];
          setActivities(data);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error("Activity Feed 구독 오류:", err);
          setError("활동 피드를 불러오는 중 오류가 발생했습니다");
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error("Activity Feed 초기화 오류:", err);
      setError("활동 피드를 불러오는 중 오류가 발생했습니다");
      setLoading(false);
    }
  }, [teamId, limitCount, canQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">활동을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📭</div>
        <p className="text-sm font-medium text-gray-900 mb-1">활동이 없습니다</p>
        <p className="text-xs text-gray-500">팀 활동이 생기면 여기에 표시됩니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <ActivityItem
          key={activity.id}
          activity={activity}
          teamId={teamId}
          sportType={sportType}
        />
      ))}
    </div>
  );
}
