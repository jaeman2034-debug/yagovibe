/**
 * 🔥 ActivityFactory - Activity 생성 중앙화
 * 
 * 역할:
 * - 모든 Activity 생성 로직 통합
 * - refType 자동 매핑
 * - 일관된 데이터 구조 보장
 * 
 * 장점:
 * - Activity 생성 로직이 한 곳에 집중
 * - refType 실수 방지
 * - 유지보수 용이
 */

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cleanFirestoreData } from "@/utils/firestoreHelpers";
import { computeActivityHubScoreStored } from "@/utils/activityHubScore";
import { notifyTeamMembersOfWallPost } from "@/services/teamWallNotificationService";
import type {
  ActivityType,
  ActivityRefType,
  ActivityRefCollection,
} from "@/types/activity";

/** refType → 원본 컬렉션 힌트 (삭제 동기화·디버깅) */
export function activityRefCollectionForRefType(
  refType: ActivityRefType
): ActivityRefCollection {
  const map: Record<ActivityRefType, ActivityRefCollection> = {
    match: "matches",
    market: "market",
    events: "events",
    teams: "teams",
    notices: "notices",
    recruit: "recruit",
    equipment: "equipment",
  };
  return map[refType];
}

/**
 * Activity 생성 파라미터
 */
export interface CreateActivityParams {
  type: ActivityType;
  refId: string;
  authorId: string;
  authorName?: string;
  authorPhotoUrl?: string;
  title: string;
  summary?: string;
  thumbnailUrl?: string;
  sport?: string;
  teamId?: string;
  teamName?: string;
  category?: string;
  /** 미지정 시 type 기반 자동 매핑. `matches` 컬렉션 글은 "match"로 지정 */
  refType?: ActivityRefType;
  /** 미지정 시 refType 기반 */
  refCollection?: ActivityRefCollection;
  /** `team`이면 `teamId` 필수(팀 피드). 기본 `public` */
  visibility?: "public" | "team" | "private";
}

/**
 * type → refType 자동 매핑
 */
function getRefType(type: ActivityType): ActivityRefType {
  switch (type) {
    // 거래 관련
    case "equipment_created":
    case "market_created":
      return "market";
    
    case "recruit_created":
      // 기본: 마켓 허브 `market`/`marketPosts`와 동일 id. 레거시 `recruits`는 create 시 refType override.
      return "market";

    // 팀 관련
    case "team_created":
      return "teams";
    
    // 이벤트 관련
    case "team_event":
      return "events";
    
    // 공지
    case "team_notice":
      return "notices";

    // 매칭 생성
    case "match_created":
      return "match";

    case "match_join_requested":
    case "match_confirmed":
      return "match";
    
    default:
      console.warn(`⚠️ [ActivityFactory] 알 수 없는 type: ${type}, "market"으로 처리`);
      return "market";
  }
}

/**
 * 🔥 Activity 생성 (통합 함수)
 */
export async function createActivity(params: CreateActivityParams): Promise<string> {
  try {
    const {
      type,
      refId,
      authorId,
      authorName,
      authorPhotoUrl,
      title,
      summary,
      thumbnailUrl,
      sport,
      teamId,
      teamName,
      category,
      refType: refTypeOverride,
      refCollection: refCollectionOverride,
      visibility: visibilityParam,
    } = params;

    const visibility = visibilityParam ?? "public";
    if (visibility === "team" && !(teamId && String(teamId).trim())) {
      throw new Error("[ActivityFactory] visibility=team 인 경우 teamId가 필요합니다.");
    }

    // 🔥 refType: 명시 우선, 없으면 type 기반 매핑
    const refType = refTypeOverride ?? getRefType(type);
    const refCollection =
      refCollectionOverride ?? activityRefCollectionForRefType(refType);
    const createdAtMillis = Date.now();
    const hubScore = computeActivityHubScoreStored({
      createdAtMillis,
      likeCount: 0,
      commentCount: 0,
      feedbackReportCount: 0,
      feedbackHideCount: 0,
      feedbackNotInterestedCount: 0,
    });

    // 🔥 Activity 데이터 구성
    // 루트 activities: visibility가 "team"일 때만 teamId/teamName 저장 (공개·기타는 collectionGroup 쿼리·인덱스 오염 방지)
    const teamScoped =
      visibility === "team" && teamId && String(teamId).trim().length > 0
        ? {
            teamId: String(teamId).trim(),
            ...(teamName?.trim() ? { teamName: teamName.trim() } : {}),
          }
        : {};

    const activityDataRaw = {
      // v1 스키마 필수 필드
      type,
      refType,
      refId,
      refCollection,
      authorId,
      authorName: authorName?.trim() || undefined,
      authorPhotoUrl: authorPhotoUrl?.trim() || undefined,
      title: title.trim(),
      summary: summary?.trim() || undefined,
      thumbnailUrl: thumbnailUrl || undefined,
      visibility,
      likeCount: 0,
      commentCount: 0,
      feedbackReportCount: 0,
      feedbackHideCount: 0,
      feedbackNotInterestedCount: 0,
      createdAt: serverTimestamp(),
      createdAtMillis,
      hubScore,

      // 호환성 필드
      sport: sport?.toLowerCase().trim() || "soccer",
      ...teamScoped,
      category: category || undefined,
    };

    // 🔥 undefined 값 제거
    const activityData = cleanFirestoreData(activityDataRaw);

    // 🔥 Firestore에 저장
    const activityRef = await addDoc(collection(db, "activities"), activityData);

    console.log("✅ [ActivityFactory] Activity 생성 완료:", {
      activityId: activityRef.id,
      type,
      refType,
      refId,
      sport,
    });

    return activityRef.id;
  } catch (error: any) {
    console.error("❌ [ActivityFactory] Activity 생성 실패:", {
      error,
      code: error?.code,
      message: error?.message,
      params,
    });
    throw error;
  }
}

/**
 * 🔥 팀 모집 Activity 생성
 */
export async function createTeamRecruitActivity(params: {
  recruitId: string;
  authorId: string;
  teamId?: string;
  teamName: string;
  position: string[];
  slots: number;
  description?: string;
  thumbnailUrl?: string;
  sport: string;
  /**
   * `market`(기본): `market` 문서 id = `marketPosts` id → 상세 `/sports/:sport/market/:id`
   * `recruit`: `recruits` 컬렉션 전용(레거시 팀 모집)
   */
  activityEntity?: "market" | "recruit";
}): Promise<string> {
  const {
    recruitId,
    authorId,
    teamName,
    position,
    slots,
    description,
    thumbnailUrl,
    sport,
    activityEntity = "market",
  } = params;

  const refType = activityEntity === "recruit" ? "recruit" : "market";
  const refCollection = activityEntity === "recruit" ? "recruit" : "market";

  return createActivity({
    type: "recruit_created",
    refId: recruitId,
    authorId,
    title: `${teamName} - ${position.join(", ")} 모집`,
    summary: description?.trim() || `모집 인원: ${slots}명`,
    thumbnailUrl,
    sport,
    category: "recruit",
    refType,
    refCollection,
  });
}

/**
 * 🔥 장비 거래 Activity 생성
 */
export async function createEquipmentActivity(params: {
  postId: string;
  authorId: string;
  title: string;
  description?: string;
  price?: number;
  thumbnailUrl?: string;
  sport: string;
}): Promise<string> {
  const { postId, authorId, title, description, price, thumbnailUrl, sport } = params;

  return createActivity({
    type: "equipment_created",
    refId: postId,
    authorId,
    title: title.trim(),
    summary: description?.trim() || (price ? `${Number(price).toLocaleString()}원` : undefined),
    thumbnailUrl,
    sport,
    category: "equipment",
    refType: "market",
    refCollection: "market",
  });
}

/**
 * 🔥 경기 매칭 Activity 생성
 */
export async function createMatchActivity(params: {
  postId: string;
  authorId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  sport: string;
}): Promise<string> {
  const { postId, authorId, title, description, thumbnailUrl, sport } = params;

  return createActivity({
    type: "match_created",
    refId: postId,
    authorId,
    title: title.trim(),
    summary: description?.trim() || undefined,
    thumbnailUrl,
    sport,
    category: "match",
    refType: "match",
    refCollection: "matches",
  });
}

/**
 * 🔥 팀 생성 Activity 생성
 */
export async function createTeamActivity(params: {
  teamId: string;
  authorId: string;
  teamName: string;
  sport: string;
  thumbnailUrl?: string;
}): Promise<string> {
  const { teamId, authorId, teamName, sport, thumbnailUrl } = params;

  return createActivity({
    type: "team_created",
    refId: teamId,
    authorId,
    title: `${teamName} 팀이 생성되었습니다`,
    summary: `새로운 ${sport} 팀이 생성되었습니다`,
    thumbnailUrl,
    sport,
    teamId,
  });
}

/**
 * 🔥 팀 이벤트 Activity 생성
 */
export async function createTeamEventActivity(params: {
  eventId: string;
  authorId: string;
  teamId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  sport: string;
}): Promise<string> {
  const { eventId, authorId, teamId, title, description, thumbnailUrl, sport } = params;

  return createActivity({
    type: "team_event",
    refId: eventId,
    authorId,
    title: title.trim(),
    summary: description?.trim() || undefined,
    thumbnailUrl,
    sport,
    teamId,
  });
}

/**
 * 팀 내부 전용 타임라인 (공지·안내 등) — `visibility: team`
 * ref는 팀 문서를 가리키며, 상세는 팀 페이지로 연결 가능
 */
export async function createTeamWallActivity(params: {
  teamId: string;
  authorId: string;
  authorName?: string;
  title: string;
  summary?: string;
  sport: string;
}): Promise<string> {
  const { teamId, authorId, authorName, title, summary, sport } = params;
  const activityId = await createActivity({
    type: "team_notice",
    refId: teamId,
    refType: "teams",
    refCollection: "teams",
    authorId,
    authorName: authorName?.trim() || undefined,
    title: title.trim(),
    summary: summary?.trim() || undefined,
    sport,
    teamId,
    visibility: "team",
  });

  void notifyTeamMembersOfWallPost({
    teamId,
    activityId,
    authorId,
    titlePreview: title.trim(),
    authorName: authorName?.trim() || undefined,
    sport,
  }).catch((err) => {
    console.warn("[createTeamWallActivity] 팀원 알림 실패(글은 저장됨):", err);
  });

  return activityId;
}
