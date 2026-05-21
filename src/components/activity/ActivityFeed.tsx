/**
 * 종목 허브용 통합 활동 피드 — `activities` 단일 소스
 * (match / market / event 등 v1 type·refType·refId)
 */

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import ActivityCard from "@/features/activity/ActivityCard";
import FeedSkeletonGrid from "@/components/sports/FeedSkeletonGrid";
import FeedEmptyState from "@/components/sports/FeedEmptyState";
import { normalizeSportId } from "@/constants/sports";
import { isSportTypeSlug } from "@/types/sport";
import type { Activity } from "@/types/activity";
import { sportHubHref } from "@/utils/sportHubHref";

export interface ActivityFeedProps {
  sport: string;
}

function docToActivity(id: string, data: Record<string, unknown>): Activity {
  return {
    id,
    type: (data.type as Activity["type"]) || "market_created",
    refType: (data.refType as Activity["refType"]) || "market",
    refId: (data.refId as string) || id,
    refCollection: data.refCollection as Activity["refCollection"] | undefined,
    authorId: (data.authorId as string) || "",
    teamId: data.teamId as string | undefined,
    title: (data.title as string) || "",
    summary: data.summary as string | undefined,
    thumbnailUrl: data.thumbnailUrl as string | undefined,
    visibility: (data.visibility as Activity["visibility"]) || "public",
    likeCount: typeof data.likeCount === "number" ? data.likeCount : 0,
    commentCount: typeof data.commentCount === "number" ? data.commentCount : 0,
    createdAt: data.createdAt as Activity["createdAt"],
    createdAtMillis:
      typeof data.createdAtMillis === "number" ? data.createdAtMillis : undefined,
    sport: (data.sport as string) || "",
    category: data.category as string | undefined,
    price: typeof data.price === "number" ? data.price : undefined,
  };
}

export default function ActivityFeed({ sport }: ActivityFeedProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sportFilter = useMemo(() => {
    if (sport === "all") return null;
    if (isSportTypeSlug(sport)) return sport;
    return null;
  }, [sport]);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!user?.uid) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const cond: QueryConstraint[] = [where("visibility", "==", "public")];
    if (sportFilter) {
      cond.push(where("sport", "==", sportFilter));
    }
    cond.push(orderBy("createdAt", "desc"));
    cond.push(limit(sportFilter ? 25 : 50));

    const q = query(collection(db, "activities"), ...cond);

    const unsub = onSnapshot(
      q,
      (snap) => {
        let list = snap.docs.map((d) => docToActivity(d.id, d.data()));

        if (sport !== "all" && !sportFilter) {
          const n = normalizeSportId(sport);
          list = list.filter((row) => {
            const rs = row.sport || "";
            return rs === sport || normalizeSportId(rs) === n;
          });
        }

        setItems(list);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("[ActivityFeed] activities 구독 실패:", err);
        setError(err.message || "load failed");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [sport, sportFilter, user?.uid, authLoading]);

  if (authLoading || loading) {
    return <FeedSkeletonGrid />;
  }

  if (!user?.uid) {
    const next = `${location.pathname}${location.search || ""}`;
    return (
      <FeedEmptyState
        title="로그인이 필요해요"
        description="종목 허브 활동 피드는 로그인 후 볼 수 있어요."
        ctaText="로그인하기"
        onClick={() => navigate(`/login?next=${encodeURIComponent(next)}`)}
      />
    );
  }

  if (error) {
    return (
      <FeedEmptyState
        title="활동을 불러올 수 없어요"
        description="잠시 후 다시 시도해주세요."
        ctaText="새로고침"
        onClick={() => window.location.reload()}
      />
    );
  }

  if (items.length === 0) {
    return (
      <FeedEmptyState
        title="아직 활동이 없어요"
        description="경기·거래·이벤트가 올라오면 여기에 모여요."
        ctaText="거래 보러가기"
        onClick={() =>
          navigate(
            sport === "all"
              ? sportHubHref("market")
              : sportHubHref("market", sport)
          )
        }
      />
    );
  }

  return (
    <div className="px-4 py-4 space-y-3">
      {items.map((row) => (
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
          }}
        />
      ))}
    </div>
  );
}
