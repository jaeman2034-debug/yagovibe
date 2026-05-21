/**
 * ?뵦 ActivityCard - Activity 移대뱶 而댄룷?뚰듃
 * 
 * ??븷:
 * - ?쒕룞 移대뱶 UI ?쒖떆
 * - ??낅퀎 ?꾩씠肄??쒖떆
 * - ?대┃ ???먮낯 湲濡??대룞
 */

import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { toast } from "sonner";
import { normalizeSportId } from "@/constants/sports";
import { resolveLastSportId, sportMarketDetailUrl } from "@/utils/sportHubHref";
import { getTimeAgo, toDateWithMillisFallback } from "@/utils/timeUtils";

type Props = {
  item: {
    id: string;
    type: string;
    title: string;
    summary?: string;
    refId?: string;
    refType?: string;
    sourceId?: string;
    sourceType?: string;
    sport?: string;
    category?: string;
    authorId?: string;
    authorName?: string;
    authorPhotoUrl?: string;
    teamName?: string;
    thumbnail?: string; // ?명솚??(?덇굅??
    thumbnailUrl?: string; // v1 ?ㅽ궎留?(?곗꽑 ?ъ슜)
    createdAt?: any;
    createdAtMillis?: number;
    address?: string; // 二쇱냼 (optional, 二쇱냼 蹂???ㅽ뙣 ???놁쓣 ???덉쓬)
  };
};

const iconMap: Record<string, string> = {
  market: "🛒",
  team: "👥",
  event: "📅",
  join: "🤝",
  match_created: "⚽",
  match_join_requested: "🤝",
  match_confirmed: "✅",
  comment: "💬",
};

export default function ActivityCard({ item }: Props) {
  const navigate = useNavigate();
  const profileUid = item.authorId?.trim();
  
  // ?뵦 URL?먯꽌 sport ?뚮씪誘명꽣 ?쎄린 (UI ?쒖떆??
  const [searchParams] = useSearchParams();
  const { sport: sportParam } = useParams<{ sport?: string }>();
  const displaySport = searchParams.get("sport") || sportParam || item.sport || "";

  // ?뵦 ??낅퀎 ?쇰꺼 留ㅽ븨
  const getTypeLabel = (type: string, refTypeHint?: string) => {
    if (type === "match_created") {
      return "경기 매칭";
    }
    if (type === "match_join_requested") {
      return "참여 신청";
    }
    if (type === "match_confirmed") {
      return "매칭 확정";
    }
    switch (type) {
      case "market":
      case "market_upload":
      case "market_created":
        return "거래";
      case "equipment_created":
        return "중고 등록";
      case "recruit_created":
        return "팀원 모집";
      case "match_created":
        return "경기 매칭";
      case "team":
      case "team_created":
        return "팀";
      case "event":
      case "team_event":
        return "이벤트";
      default:
        return "활동";
    }
  };
  
  // ?뵦 醫낅ぉ ?쇰꺼 留ㅽ븨
  const getSportLabel = (sport: string) => {
    const sportLabels: Record<string, string> = {
      soccer: "축구",
      baseball: "야구",
      basketball: "농구",
      volleyball: "배구",
      golf: "골프",
      tennis: "테니스",
      running: "러닝",
      hiking: "등산",
      badminton: "배드민턴",
      "table-tennis": "탁구",
      swimming: "수영",
      fitness: "피트니스",
      yoga: "요가",
      climbing: "클라이밍",
      billiards: "당구",
      misc: "기타",
      other: "기타",
    };
    return sportLabels[sport] || sport;
  };

  const handleClick = (e?: React.MouseEvent) => {
    // ?뵦 ?대깽???꾪뙆 諛⑹? (?꾩슂??
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // ?뵦 ?붾쾭源? Activity ?곗씠???뺤씤
    console.log("?뵦 [ActivityCard] ?대┃??", {
      type: item.type,
      refId: item.refId,
      sourceId: item.sourceId,
      sport: item.sport,
      refType: item.sourceType,
      fullItem: item,
    });

    // ?뵦 postId 異붿텧 (?곗꽑?쒖쐞: postId > refId > sourceId)
    const postId = (item as any).postId ?? item.refId ?? item.sourceId;
    
    if (!postId) {
      console.error("[ActivityCard] postId 없음:", item);
      toast.error("게시글을 찾을 수 없습니다.");
      return;
    }

    /** 허브·마켓 canonical URL용 (없으면 이동하지 않음) */
    const sportSlug =
      normalizeSportId(item.sport) ?? normalizeSportId(resolveLastSportId());
    if (!sportSlug) {
      console.warn("[ActivityCard] 유효한 sport 없음 → 라우팅 중단", { item });
      toast.error("종목 정보를 확인할 수 없어 이동할 수 없습니다.");
      return;
    }

    // ?뵦 refType 異붿텧 (?곗꽑?쒖쐞: refType > sourceType)
    const refType = (item as any).refType || item.sourceType;
    const isMatchActivity =
      item.type === "match_created" ||
      item.type === "match_join_requested" ||
      item.type === "match_confirmed";

    // ?뵦 refType 湲곕컲 ?쇱슦??(1?쒖쐞)
    if (refType && postId) {
      console.log("?뵦 [ActivityCard] refType 湲곕컲 ?쇱슦??", {
        refType,
        postId,
      });

      switch (refType) {
        case "match":
          navigate(`/match/${postId}`);
          return;

        case "market":
          if (isMatchActivity) {
            navigate(`/match/${postId}`);
            return;
          }
          navigate(sportMarketDetailUrl(sportSlug, postId));
          return;
        
        case "teams":
          navigate(`/teams/${postId}/play`);
          return;
        
        case "events":
          navigate(`/events/${postId}`);
          return;
        
        default:
          console.warn("?좑툘 [ActivityCard] ?????녿뒗 refType:", refType);
          // ?ㅼ쓬 ?쇱슦??濡쒖쭅?쇰줈 fallback
          break;
      }
    }

    // ?뵦 collection 湲곕컲 ?쇱슦??(2?쒖쐞)
    const collection = (item as any).collection;
    
    if (collection && postId) {
      console.log("?뵦 [ActivityCard] collection 湲곕컲 ?쇱슦??", {
        collection,
        postId,
        sport: sportSlug,
      });

      switch (collection) {
        case "marketPosts":
          navigate(sportMarketDetailUrl(sportSlug, postId));
          return;
        case "recruitPosts":
          navigate(sportMarketDetailUrl(sportSlug, postId));
          return;
        case "matchPosts":
          navigate(`/sports/${sportSlug}/match/${postId}`);
          return;
        case "teamPosts":
        case "teams":
          navigate(`/sports/${sportSlug}/team/${postId}`);
          return;
        case "eventPosts":
        case "events":
          navigate(`/sports/${sportSlug}/event/${postId}`);
          return;
        default:
          console.warn("?좑툘 [ActivityCard] ?????녿뒗 collection:", collection);
          // ?덇굅???쇱슦?낆쑝濡?fallback
          break;
      }
    }

    // ?뵦 ?덇굅??吏?? type 湲곕컲 ?쇱슦??(2?쒖쐞, collection???놁쓣 ??
    console.log("?뵦 [ActivityCard] type 湲곕컲 ?쇱슦??(?덇굅??:", {
      type: item.type,
      postId,
      sport: sportSlug,
    });

    // ?뵦 ??낅퀎 ?쇱슦??遺꾧린
    switch (item.type) {
      case "equipment_created":
      case "market_created":
        // ?뵦 嫄곕옒 ?곹뭹? /sports/:sport/market/:postId濡??대룞
        const marketPath = sportMarketDetailUrl(sportSlug, postId);
        console.log("??[ActivityCard] Market ?곸꽭濡??대룞:", marketPath);
        navigate(marketPath);
        return;

      case "recruit_created": {
        const docRefType = (item as { refType?: string }).refType;
        const docRefCol = (item as { refCollection?: string }).refCollection;
        if (docRefType === "market" || docRefCol === "market") {
          navigate(sportMarketDetailUrl(sportSlug, postId));
          return;
        }
        navigate(`/recruit/${postId}`);
        return;
      }

      case "match_join_requested":
      case "match_confirmed":
        navigate(`/match/${postId}`);
        return;

      case "match_created":
        // ?뵦 留ㅼ묶 湲? /sports/:sport/match/:postId濡??대룞
        const docRefType = (item as { refType?: string }).refType;
        if (docRefType === "match") {
          navigate(`/match/${postId}`);
          return;
        }
        navigate(`/sports/${sportSlug}/match/${postId}`);
        return;

      case "team_created":
      case "team":
        // ?뵦 Team ?곸꽭 ?섏씠吏濡??대룞
        const teamPath = `/sports/${sportSlug}/team/${postId}`;
        console.log("??[ActivityCard] Team ?곸꽭濡??대룞:", teamPath);
        navigate(teamPath);
        return;

      case "team_event":
      case "event":
        // ?뵦 Event ?곸꽭 ?섏씠吏濡??대룞
        const eventPath = `/sports/${sportSlug}/event/${postId}`;
        console.log("??[ActivityCard] Event ?곸꽭濡??대룞:", eventPath);
        navigate(eventPath);
        return;

      default:
        console.warn("[ActivityCard] Unknown activity type, fallback to market:", {
          type: item.type,
          refType: (item as any).refType || item.sourceType,
          postId,
          sport: sportSlug,
        });
        navigate(sportMarketDetailUrl(sportSlug, postId));
    }
  };

  const typeLabel = getTypeLabel(item.type, item.refType);
  const icon = iconMap[item.type] || "📌";

  return (
    <div
      id={item.id ? `activity-card-${item.id}` : undefined}
      onClick={handleClick}
      className="bg-white border rounded-xl p-4 shadow-sm hover:shadow transition cursor-pointer"
    >
      <div className="flex items-center gap-3">
        {/* ?몃꽕??(?덈뒗 寃쎌슦) - thumbnailUrl ?곗꽑, ?놁쑝硫?thumbnail (?명솚?? */}
        {(item.thumbnailUrl || item.thumbnail) ? (
          <img
            src={item.thumbnailUrl || item.thumbnail}
            alt={item.title}
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-2xl">
            {icon}
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          {/* ???+ 醫낅ぉ ?쇰꺼 */}
          <div className="text-xs text-gray-500 mb-1">
            {typeLabel}
            {item.category && (
              <>
                {" 쨌 "}
                {item.category === "equipment" ? "?λ퉬" :
                 item.category === "recruit" ? "紐⑥쭛" :
                 item.category === "match" ? "留ㅼ묶" :
                 item.category}
              </>
            )}
            {displaySport && (
              <>
                {" 쨌 "}
                {getSportLabel(displaySport)}
              </>
            )}
          </div>
          
          {/* ?쒕ぉ */}
          <div className="font-semibold text-base text-gray-900 mb-1">
            {item.title}
          </div>

          {profileUid ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/profile/${profileUid}`);
              }}
              className="mb-1 flex max-w-full items-center gap-2 rounded-lg py-1 text-left hover:bg-gray-50"
            >
              {item.authorPhotoUrl ? (
                <img
                  src={item.authorPhotoUrl}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="h-8 w-8 shrink-0 rounded-full bg-gray-200" aria-hidden />
              )}
              <span className="truncate text-xs text-gray-600">
                {[item.authorName, item.teamName].filter(Boolean).join(" · ") ||
                  "프로필 보기"}
              </span>
            </button>
          ) : (
            (item.authorName || item.teamName) && (
              <div className="mb-1 text-xs text-gray-500">
                {[item.authorName, item.teamName].filter(Boolean).join(" · ")}
              </div>
            )
          )}
          
          {/* ?붿빟 (?덈뒗 寃쎌슦) */}
          {item.summary && (
            <div className="text-sm text-gray-600">{item.summary}</div>
          )}

          {(() => {
            const when = toDateWithMillisFallback(
              item.createdAt,
              item.createdAtMillis
            );
            const label = when ? getTimeAgo(when) : "";
            if (!label) return null;
            return (
              <div className="text-xs text-gray-400 mt-1">{label}</div>
            );
          })()}
          
          {/* 二쇱냼 (?덈뒗 寃쎌슦留??쒖떆, 二쇱냼 蹂???ㅽ뙣 ???④?) */}
          {item.address && (
            <div className="text-xs text-gray-500 mt-1">?뱧 {item.address}</div>
          )}
        </div>
      </div>
    </div>
  );
}

