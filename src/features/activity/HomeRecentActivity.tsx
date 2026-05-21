/**
 * ?뵦 HomeRecentActivity - ???붾㈃ 理쒓렐 ?쒕룞 而댄룷?뚰듃
 * 
 * ??븷:
 * - activityLogs 而щ젆??理쒖떊 3媛쒕쭔 議고쉶
 * - ?ㅼ떆媛?遺덊븘??(珥덇린 MVP??getDocs ?ъ슜)
 * - ?대┃ ???먮낯 湲濡??대룞
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { resolveLastSportId, sportMarketDetailUrl } from "@/utils/sportHubHref";

type Activity = {
  id: string;
  type: string;
  title: string;
  summary?: string;
  sourceId?: string;
  sourceType?: string;
  refId?: string; // ?명솚??  sport?: string;
  category?: string;
  thumbnail?: string;
  createdAt?: any;
};

export default function HomeRecentActivity() {
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const q = query(
          collection(db, "activityLogs"),
          orderBy("createdAt", "desc"),
          limit(3)
        );
        const snap = await getDocs(q);
        setItems(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          }))
        );
      } catch (error: any) {
        console.error("??[HomeRecentActivity] ?쒕룞 濡쒕뱶 ?ㅽ뙣:", error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const go = (item: Activity) => {
    // ?뵦 sourceId ?곗꽑, ?놁쑝硫?refId ?ъ슜
    const sourceId = item.sourceId || item.refId;
    const sourceType = item.sourceType;

    if (!sourceId) {
      console.warn("?좑툘 [HomeRecentActivity] sourceId媛 ?놁뒿?덈떎:", item);
      return;
    }

    // ?뵦 sourceType???곕씪 ?쇱슦??    if (sourceType === "marketPosts" || item.type === "market") {
      // ?뵦 marketPosts??sport ?뺣낫 ?꾩슂
      const sport = item.sport || "soccer";
      navigate(sportMarketDetailUrl(sport || resolveLastSportId(), sourceId));
    } else if (sourceType === "teams" || item.type === "team") {
      navigate(`/teams/${sourceId}/play`);
    } else if (sourceType === "events" || item.type === "event") {
      navigate(`/events/${sourceId}`);
    } else {
      // ?뵦 sourceType???놁쑝硫?type?쇰줈 ?먮떒
      if (item.type === "market") {
        const sport = item.sport || "soccer";
        navigate(sportMarketDetailUrl(sport || resolveLastSportId(), sourceId));
      } else if (item.type === "team") {
        navigate(`/teams/${sourceId}/play`);
      } else if (item.type === "event") {
        navigate(`/events/${sourceId}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-4 shadow">
        <div className="font-semibold mb-3">理쒓렐 ?쒕룞</div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="py-2 border-b">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-1 animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow">
      <div className="font-semibold mb-3">理쒓렐 ?쒕룞</div>

      {items.length === 0 ? (
        <div className="text-sm text-gray-400 py-4">
          ?꾩쭅 ?쒕룞???놁뒿?덈떎
        </div>
      ) : (
        <div className="space-y-0">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => go(item)}
              className="py-2 border-b cursor-pointer hover:bg-gray-50 transition-colors last:border-b-0"
            >
              <div className="font-medium text-gray-900">{item.title}</div>
              {item.summary && (
                <div className="text-sm text-gray-500 mt-0.5">{item.summary}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

