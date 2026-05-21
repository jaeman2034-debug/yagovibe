/**
 * 허브 홈용 — 공개 활동 미리보기
 * (`/hub` HubHome 안에 삽입)
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ActivityCard from "@/features/activity/ActivityCard";
import { normalizeSportId } from "@/constants/sports";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { resolveLastSportId, sportHubHref } from "@/utils/sportHubHref";
import { Button } from "@/components/ui/button";
import { HomeSection } from "./components/HomeSection";

export default function HomePage() {
  const navigate = useNavigate();
  const sport = useMemo(() => normalizeSportId(resolveLastSportId()) ?? "soccer", []);

  const { items: activityItems, loading: activityLoading } = useActivityFeed({
    sport,
    visibility: "public",
    pageSize: 5,
  });

  const goActivityHub = () => navigate(sportHubHref("activity", sport));

  return (
    <div className="space-y-4">
      <HomeSection title="최근 활동" actionLabel="피드로 가기 →" onAction={goActivityHub}>
        {activityLoading ? (
          <p className="py-4 text-center text-xs text-gray-500">불러오는 중…</p>
        ) : activityItems.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-gray-600">아직 공개 활동이 없어요.</p>
            <Button type="button" size="sm" variant="outline" onClick={goActivityHub}>
              활동 피드 보러가기
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {activityItems.map((row) => (
              <ActivityCard
                key={row.id}
                item={{
                  id: row.id,
                  type: row.type,
                  title: row.title,
                  summary: row.summary,
                  refId: row.refId,
                  refType: row.refType,
                  sourceId: row.refId,
                  sourceType: row.refType,
                  sport: row.sport,
                  category: row.category,
                  thumbnailUrl: row.thumbnailUrl,
                  createdAt: row.createdAt,
                  createdAtMillis: row.createdAtMillis,
                  authorId: row.authorId,
                  authorName: row.authorName,
                }}
              />
            ))}
          </div>
        )}
      </HomeSection>
    </div>
  );
}
