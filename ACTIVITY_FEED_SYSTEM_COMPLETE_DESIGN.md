# 🚀 노원구 축구협회 Activity Feed 시스템 완전 설계

> **스포츠 SNS 타임라인 시스템 - 실제 서비스 수준 설계**

---

## 📋 목차

1. [Activity Feed 전체 구조](#1-activity-feed-전체-구조)
2. [Activity 타입 정의](#2-activity-타입-정의)
3. [Firestore 데이터 구조](#3-firestore-데이터-구조)
4. [Cloud Functions 트리거](#4-cloud-functions-트리거)
5. [React 컴포넌트 구조](#5-react-컴포넌트-구조)
6. [실제 구현 코드](#6-실제-구현-코드)
7. [피드 쿼리 패턴](#7-피드-쿼리-패턴)
8. [개인화 피드](#8-개인화-피드)

---

## 1️⃣ Activity Feed 전체 구조

### Activity Feed 모듈

```
Activity Feed System
 ├─ Match Activities (경기 활동)
 │   ├─ match_result (경기 결과)
 │   ├─ match_started (경기 시작)
 │   └─ match_live_update (실시간 업데이트)
 ├─ Player Activities (선수 활동)
 │   ├─ goal_scored (득점)
 │   ├─ assist_made (어시스트)
 │   ├─ hat_trick (해트트릭)
 │   └─ player_achievement (기록 달성)
 ├─ Team Activities (팀 활동)
 │   ├─ team_created (팀 창단)
 │   ├─ team_joined (선수 가입)
 │   └─ team_updated (팀 정보 업데이트)
 ├─ Media Activities (미디어 활동)
 │   ├─ media_uploaded (사진/영상 업로드)
 │   └─ highlight_created (하이라이트 생성)
 └─ Social Activities (소셜 활동)
     ├─ follow_created (팔로우)
     └─ comment_created (댓글)
```

### Activity Feed 위치

1. **협회 홈 페이지**
   - URL: `/a/[associationSlug]`
   - 섹션: "최근 활동"

2. **사용자 피드**
   - URL: `/a/[associationSlug]/feed`
   - 팔로우 기반 개인화 피드

3. **팀 페이지**
   - URL: `/a/[associationSlug]/teams/[teamId]`
   - 섹션: "팀 활동"

4. **선수 페이지**
   - URL: `/a/[associationSlug]/players/[playerId]`
   - 섹션: "선수 활동"

---

## 2️⃣ Activity 타입 정의

### ActivityType 정의

**파일**: `src/types/activity.ts`

```typescript
import { Timestamp } from "firebase/firestore";

/**
 * 노원구 축구협회 Activity 타입
 */
export type AssociationActivityType =
  // 경기 관련
  | "match_result"           // 경기 결과
  | "match_started"          // 경기 시작
  | "match_live_goal"        // 실시간 득점
  | "match_live_card"        // 실시간 경고/퇴장
  | "match_live_substitution" // 실시간 교체
  
  // 선수 기록 관련
  | "goal_scored"            // 득점
  | "assist_made"            // 어시스트
  | "hat_trick"              // 해트트릭
  | "player_achievement"      // 기록 달성 (득점왕, 어시스트왕 등)
  
  // 팀 관련
  | "team_created"           // 팀 창단
  | "team_joined"            // 선수 가입
  | "team_updated"           // 팀 정보 업데이트
  | "team_match_scheduled"  // 경기 일정 등록
  
  // 미디어 관련
  | "media_uploaded"         // 사진/영상 업로드
  | "highlight_created"      // 하이라이트 생성
  
  // 소셜 관련
  | "follow_created"         // 팔로우
  | "comment_created"        // 댓글 작성
  
  // 대회 관련
  | "tournament_started"     // 대회 시작
  | "tournament_completed"   // 대회 종료
  | "award_announced";       // 시상식

/**
 * Activity Actor 타입
 */
export type ActivityActorType = "team" | "player" | "user" | "system";

/**
 * Activity Entity 타입
 */
export type ActivityEntityType =
  | "match"
  | "player"
  | "team"
  | "media"
  | "tournament"
  | "award"
  | "user";

/**
 * Activity 인터페이스
 */
export interface AssociationActivity {
  id: string;
  
  // 기본 정보
  type: AssociationActivityType;
  associationId: string;
  
  // Actor (활동 주체)
  actorType: ActivityActorType;
  actorId: string;
  actorName: string;              // Denormalized
  actorPhotoUrl?: string;         // Denormalized
  
  // Entity (활동 대상)
  entityType: ActivityEntityType;
  entityId: string;
  entityName?: string;            // Denormalized
  
  // 메시지
  message: string;                 // "노원FC가 상계FC를 2:1로 승리했습니다"
  summary?: string;                // 추가 정보
  
  // 메타데이터
  metadata?: {
    // 경기 결과
    homeScore?: number;
    awayScore?: number;
    homeTeamId?: string;
    awayTeamId?: string;
    
    // 선수 기록
    playerId?: string;
    playerName?: string;
    goalCount?: number;
    assistCount?: number;
    
    // 미디어
    mediaType?: "photo" | "video";
    mediaCount?: number;
    
    // 기타
    [key: string]: any;
  };
  
  // 썸네일
  thumbnailUrl?: string;
  
  // 링크
  linkUrl?: string;                // 클릭 시 이동할 URL
  
  // 가시성
  visibility: "public" | "team" | "private";
  
  // 통계
  likeCount: number;
  commentCount: number;
  
  // 시간
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

---

## 3️⃣ Firestore 데이터 구조

### activities 컬렉션

**경로**: `associations/{associationId}/activities/{activityId}`

또는 전역: `activities/{activityId}` (associationId 필드 포함)

```typescript
// activities/{activityId}
{
  id: string;
  
  // 기본 정보
  type: "match_result",
  associationId: "assoc-nowon-football",
  
  // Actor
  actorType: "team",
  actorId: "team-nowon-fc",
  actorName: "노원FC",
  actorPhotoUrl: "https://...",
  
  // Entity
  entityType: "match",
  entityId: "match-123",
  entityName: "노원FC vs 상계FC",
  
  // 메시지
  message: "노원FC가 상계FC를 2:1로 승리했습니다",
  summary: "홍길동 2골, 김철수 1골",
  
  // 메타데이터
  metadata: {
    homeScore: 2,
    awayScore: 1,
    homeTeamId: "team-nowon-fc",
    awayTeamId: "team-sanggye-fc",
  },
  
  // 썸네일
  thumbnailUrl: "https://...",
  
  // 링크
  linkUrl: "/a/nowon-football/matches/match-123",
  
  // 가시성
  visibility: "public",
  
  // 통계
  likeCount: 24,
  commentCount: 5,
  
  // 시간
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

### 인덱스

```javascript
// Firestore 인덱스
{
  collectionGroup: "activities",
  fields: [
    { field: "associationId", order: "ASCENDING" },
    { field: "visibility", order: "ASCENDING" },
    { field: "createdAt", order: "DESCENDING" }
  ]
}

{
  collectionGroup: "activities",
  fields: [
    { field: "associationId", order: "ASCENDING" },
    { field: "actorType", order: "ASCENDING" },
    { field: "actorId", order: "ASCENDING" },
    { field: "createdAt", order: "DESCENDING" }
  ]
}

{
  collectionGroup: "activities",
  fields: [
    { field: "associationId", order: "ASCENDING" },
    { field: "entityType", order: "ASCENDING" },
    { field: "entityId", order: "ASCENDING" },
    { field: "createdAt", order: "DESCENDING" }
  ]
}
```

---

## 4️⃣ Cloud Functions 트리거

### 4-1. 경기 완료 시 Activity 생성

**파일**: `functions/src/activities/onMatchCompleted.ts`

```typescript
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { createActivity } from "./activityService";

const db = getFirestore();

/**
 * 경기 완료 시 Activity 생성
 */
export const onMatchCompleted = onDocumentUpdated(
  {
    document: "matches/{matchId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();
    const matchId = event.params.matchId;

    // 경기 상태가 "completed"로 변경된 경우만 처리
    if (
      beforeData?.status !== "completed" &&
      afterData?.status === "completed"
    ) {
      logger.info(`[onMatchCompleted] 경기 완료: ${matchId}`);

      try {
        const homeTeamId = afterData.homeTeamId;
        const awayTeamId = afterData.awayTeamId;
        const homeScore = afterData.homeScore || 0;
        const awayScore = afterData.awayScore || 0;
        const winnerTeamId = homeScore > awayScore ? homeTeamId : awayTeamId;
        const winnerTeamName = homeScore > awayScore
          ? afterData.homeTeamName
          : afterData.awayTeamName;

        // 팀 정보 조회
        const homeTeamDoc = await db.collection("teams").doc(homeTeamId).get();
        const awayTeamDoc = await db.collection("teams").doc(awayTeamId).get();
        const homeTeamData = homeTeamDoc.data();
        const awayTeamData = awayTeamDoc.data();

        // Activity 생성
        await createActivity({
          type: "match_result",
          associationId: afterData.associationId,
          actorType: "team",
          actorId: winnerTeamId,
          actorName: winnerTeamName,
          actorPhotoUrl: homeScore > awayScore
            ? homeTeamData?.logoUrl
            : awayTeamData?.logoUrl,
          entityType: "match",
          entityId: matchId,
          entityName: `${afterData.homeTeamName} vs ${afterData.awayTeamName}`,
          message: `${winnerTeamName}가 ${afterData.homeTeamName}를 ${homeScore}:${awayScore}로 승리했습니다`,
          summary: `${afterData.homeTeamName} ${homeScore} : ${awayScore} ${afterData.awayTeamName}`,
          metadata: {
            homeScore,
            awayScore,
            homeTeamId,
            awayTeamId,
          },
          thumbnailUrl: homeTeamData?.logoUrl || awayTeamData?.logoUrl,
          linkUrl: `/a/${afterData.associationSlug}/matches/${matchId}`,
          visibility: "public",
        });

        logger.info(`[onMatchCompleted] Activity 생성 완료: ${matchId}`);
      } catch (error: any) {
        logger.error(`[onMatchCompleted] Activity 생성 실패: ${error.message}`);
      }
    }
  }
);
```

---

### 4-2. 득점 시 Activity 생성

**파일**: `functions/src/activities/onGoalScored.ts`

```typescript
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { createActivity } from "./activityService";

const db = getFirestore();

/**
 * 득점 시 Activity 생성
 */
export const onGoalScored = onDocumentCreated(
  {
    document: "match_events/{eventId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const eventData = event.data?.data();
    if (!eventData || eventData.type !== "goal") {
      return;
    }

    const matchId = eventData.matchId;
    const playerId = eventData.playerId;
    const playerName = eventData.playerName;
    const teamId = eventData.teamId;
    const teamName = eventData.teamName;
    const minute = eventData.minute;

    logger.info(`[onGoalScored] 득점: ${playerName} (${minute}분)`);

    try {
      // 경기 정보 조회
      const matchDoc = await db.collection("matches").doc(matchId).get();
      const matchData = matchDoc.data();
      if (!matchData) {
        return;
      }

      // 선수 정보 조회
      const playerDoc = await db.collection("players").doc(playerId).get();
      const playerData = playerDoc.data();

      // 해당 경기에서의 득점 수 확인 (해트트릭 체크용)
      const eventsQuery = await db
        .collection("match_events")
        .where("matchId", "==", matchId)
        .where("type", "==", "goal")
        .where("playerId", "==", playerId)
        .get();

      const goalCount = eventsQuery.size;

      // Activity 생성
      let activityType: AssociationActivityType = "goal_scored";
      let message = `${playerName}이 ${minute}분에 득점했습니다`;

      // 해트트릭 체크
      if (goalCount === 3) {
        activityType = "hat_trick";
        message = `${playerName}이 해트트릭을 기록했습니다! 🎉`;
      }

      await createActivity({
        type: activityType,
        associationId: matchData.associationId,
        actorType: "player",
        actorId: playerId,
        actorName: playerName,
        actorPhotoUrl: playerData?.photoUrl,
        entityType: "match",
        entityId: matchId,
        entityName: `${matchData.homeTeamName} vs ${matchData.awayTeamName}`,
        message,
        summary: `${teamName} ${minute}분`,
        metadata: {
          playerId,
          playerName,
          goalCount,
          minute,
          matchId,
          teamId,
          teamName,
        },
        thumbnailUrl: playerData?.photoUrl,
        linkUrl: `/a/${matchData.associationSlug}/matches/${matchId}`,
        visibility: "public",
      });

      logger.info(`[onGoalScored] Activity 생성 완료: ${playerName}`);
    } catch (error: any) {
      logger.error(`[onGoalScored] Activity 생성 실패: ${error.message}`);
    }
  }
);
```

---

### 4-3. 미디어 업로드 시 Activity 생성

**파일**: `functions/src/activities/onMediaUploaded.ts`

```typescript
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { createActivity } from "./activityService";

const db = getFirestore();

/**
 * 미디어 업로드 시 Activity 생성
 */
export const onMediaUploaded = onDocumentCreated(
  {
    document: "media/{mediaId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const mediaData = event.data?.data();
    if (!mediaData) {
      return;
    }

    const mediaId = event.params.mediaId;
    const entityType = mediaData.entityType;
    const entityId = mediaData.entityId;
    const uploadedBy = mediaData.uploadedBy;

    logger.info(`[onMediaUploaded] 미디어 업로드: ${entityType}/${entityId}`);

    try {
      let actorType: ActivityActorType = "user";
      let actorId = uploadedBy;
      let actorName = "";
      let actorPhotoUrl = "";

      // Entity 타입에 따라 Actor 결정
      if (entityType === "team") {
        const teamDoc = await db.collection("teams").doc(entityId).get();
        const teamData = teamDoc.data();
        if (teamData) {
          actorType = "team";
          actorId = entityId;
          actorName = teamData.name;
          actorPhotoUrl = teamData.logoUrl || "";
        }
      } else if (entityType === "player") {
        const playerDoc = await db.collection("players").doc(entityId).get();
        const playerData = playerDoc.data();
        if (playerData) {
          actorType = "player";
          actorId = entityId;
          actorName = playerData.name;
          actorPhotoUrl = playerData.photoUrl || "";
        }
      } else {
        // User 정보 조회
        const userDoc = await db.collection("users").doc(uploadedBy).get();
        const userData = userDoc.data();
        actorName = userData?.displayName || userData?.name || "사용자";
        actorPhotoUrl = userData?.photoURL || "";
      }

      // Entity 정보 조회
      let entityName = "";
      let linkUrl = "";
      let associationId = "";

      if (entityType === "match") {
        const matchDoc = await db.collection("matches").doc(entityId).get();
        const matchData = matchDoc.data();
        if (matchData) {
          entityName = `${matchData.homeTeamName} vs ${matchData.awayTeamName}`;
          linkUrl = `/a/${matchData.associationSlug}/matches/${entityId}`;
          associationId = matchData.associationId;
        }
      } else if (entityType === "team") {
        const teamDoc = await db.collection("teams").doc(entityId).get();
        const teamData = teamDoc.data();
        if (teamData) {
          entityName = teamData.name;
          linkUrl = `/a/${teamData.associationSlug}/teams/${entityId}`;
          associationId = teamData.associationId;
        }
      } else if (entityType === "player") {
        const playerDoc = await db.collection("players").doc(entityId).get();
        const playerData = playerDoc.data();
        if (playerData) {
          entityName = playerData.name;
          linkUrl = `/a/${playerData.associationSlug}/players/${entityId}`;
          associationId = playerData.associationId;
        }
      }

      const mediaType = mediaData.type === "video" ? "영상" : "사진";
      const message = `${actorName}이 ${entityName} 관련 ${mediaType}을 업로드했습니다`;

      await createActivity({
        type: "media_uploaded",
        associationId,
        actorType,
        actorId,
        actorName,
        actorPhotoUrl,
        entityType: "media",
        entityId: mediaId,
        entityName,
        message,
        summary: mediaData.title || mediaData.fileName,
        metadata: {
          mediaType: mediaData.type,
          mediaCount: 1,
        },
        thumbnailUrl: mediaData.thumbnailUrl || mediaData.url,
        linkUrl,
        visibility: "public",
      });

      logger.info(`[onMediaUploaded] Activity 생성 완료: ${mediaId}`);
    } catch (error: any) {
      logger.error(`[onMediaUploaded] Activity 생성 실패: ${error.message}`);
    }
  }
);
```

---

### 4-4. Activity Service

**파일**: `functions/src/activities/activityService.ts`

```typescript
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import type { AssociationActivity, AssociationActivityType, ActivityActorType, ActivityEntityType } from "../../src/types/activity";

const db = getFirestore();

interface CreateActivityInput {
  type: AssociationActivityType;
  associationId: string;
  actorType: ActivityActorType;
  actorId: string;
  actorName: string;
  actorPhotoUrl?: string;
  entityType: ActivityEntityType;
  entityId: string;
  entityName?: string;
  message: string;
  summary?: string;
  metadata?: Record<string, any>;
  thumbnailUrl?: string;
  linkUrl?: string;
  visibility?: "public" | "team" | "private";
}

/**
 * Activity 생성
 */
export async function createActivity(input: CreateActivityInput): Promise<string> {
  try {
    const activityData: Omit<AssociationActivity, "id"> = {
      type: input.type,
      associationId: input.associationId,
      actorType: input.actorType,
      actorId: input.actorId,
      actorName: input.actorName,
      actorPhotoUrl: input.actorPhotoUrl,
      entityType: input.entityType,
      entityId: input.entityId,
      entityName: input.entityName,
      message: input.message,
      summary: input.summary,
      metadata: input.metadata || {},
      thumbnailUrl: input.thumbnailUrl,
      linkUrl: input.linkUrl,
      visibility: input.visibility || "public",
      likeCount: 0,
      commentCount: 0,
      createdAt: FieldValue.serverTimestamp() as any,
      updatedAt: FieldValue.serverTimestamp() as any,
    };

    // associations/{associationId}/activities/{activityId}에 저장
    const activityRef = db
      .collection("associations")
      .doc(input.associationId)
      .collection("activities")
      .doc();

    await activityRef.set(activityData);

    logger.info(`[createActivity] Activity 생성 완료: ${activityRef.id}`);
    return activityRef.id;
  } catch (error: any) {
    logger.error(`[createActivity] Activity 생성 실패: ${error.message}`);
    throw error;
  }
}
```

---

## 5️⃣ React 컴포넌트 구조

### 5-1. ActivityFeed 컴포넌트

**파일**: `src/components/feed/ActivityFeed.tsx`

```typescript
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ActivityCard } from "./ActivityCard";
import { LoadingState } from "@/components/common/LoadingState";
import { EmptyState } from "@/components/common/EmptyState";
import type { AssociationActivity } from "@/types/activity";

interface ActivityFeedProps {
  associationId: string;
  filter?: {
    actorType?: ActivityActorType;
    actorId?: string;
    entityType?: ActivityEntityType;
    entityId?: string;
  };
  limitCount?: number;
}

export function ActivityFeed({
  associationId,
  filter,
  limitCount = 20,
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<AssociationActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!associationId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // 쿼리 구성
    const activitiesRef = collection(
      db,
      "associations",
      associationId,
      "activities"
    );

    const conditions: any[] = [
      where("visibility", "==", "public"),
      orderBy("createdAt", "desc"),
      limit(limitCount),
    ];

    // 필터 적용
    if (filter?.actorType) {
      conditions.unshift(where("actorType", "==", filter.actorType));
    }
    if (filter?.actorId) {
      conditions.unshift(where("actorId", "==", filter.actorId));
    }
    if (filter?.entityType) {
      conditions.unshift(where("entityType", "==", filter.entityType));
    }
    if (filter?.entityId) {
      conditions.unshift(where("entityId", "==", filter.entityId));
    }

    const q = query(activitiesRef, ...conditions);

    // 실시간 구독
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as AssociationActivity[];

        setActivities(items);
        setLoading(false);
      },
      (error) => {
        console.error("Activity Feed 구독 오류:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [associationId, filter, limitCount]);

  if (loading) {
    return <LoadingState />;
  }

  if (activities.length === 0) {
    return (
      <EmptyState
        icon="📭"
        title="활동이 없습니다"
        message="아직 활동 피드가 없습니다."
      />
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <ActivityCard key={activity.id} activity={activity} />
      ))}
    </div>
  );
}
```

---

### 5-2. ActivityCard 컴포넌트

**파일**: `src/components/feed/ActivityCard.tsx`

```typescript
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { SocialBar } from "@/components/social/SocialBar";
import type { AssociationActivity, AssociationActivityType } from "@/types/activity";

interface ActivityCardProps {
  activity: AssociationActivity;
}

const activityIcons: Record<AssociationActivityType, string> = {
  match_result: "⚽",
  match_started: "🏁",
  match_live_goal: "⚽",
  match_live_card: "🟨",
  match_live_substitution: "🔄",
  goal_scored: "⚽",
  assist_made: "🎯",
  hat_trick: "🎉",
  player_achievement: "⭐",
  team_created: "🛡",
  team_joined: "👤",
  team_updated: "📝",
  team_match_scheduled: "📅",
  media_uploaded: "📷",
  highlight_created: "🎬",
  follow_created: "❤️",
  comment_created: "💬",
  tournament_started: "🏆",
  tournament_completed: "🏁",
  award_announced: "🏅",
};

export function ActivityCard({ activity }: ActivityCardProps) {
  const icon = activityIcons[activity.type] || "📌";
  const timeAgo = formatDistanceToNow(activity.createdAt.toDate(), {
    addSuffix: true,
    locale: ko,
  });

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Actor Avatar */}
          <Link
            to={
              activity.actorType === "team"
                ? `/a/${activity.associationId}/teams/${activity.actorId}`
                : activity.actorType === "player"
                ? `/a/${activity.associationId}/players/${activity.actorId}`
                : "#"
            }
            className="flex-shrink-0"
          >
            <Avatar className="h-12 w-12">
              <AvatarImage src={activity.actorPhotoUrl} />
              <AvatarFallback>
                {activity.actorName.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </Link>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Message */}
            <div className="flex items-start gap-2 mb-2">
              <span className="text-2xl flex-shrink-0">{icon}</span>
              <div className="flex-1">
                <p className="text-sm text-slate-900 leading-relaxed">
                  {activity.message}
                </p>
                {activity.summary && (
                  <p className="text-xs text-slate-500 mt-1">
                    {activity.summary}
                  </p>
                )}
              </div>
            </div>

            {/* Thumbnail */}
            {activity.thumbnailUrl && (
              <div className="mt-3 mb-3">
                <img
                  src={activity.thumbnailUrl}
                  alt={activity.entityName || ""}
                  className="rounded-lg w-full max-w-md h-auto object-cover"
                />
              </div>
            )}

            {/* Metadata */}
            {activity.type === "match_result" && activity.metadata && (
              <div className="mt-2 text-sm font-semibold text-slate-700">
                {activity.metadata.homeScore} : {activity.metadata.awayScore}
              </div>
            )}

            {/* Time & Link */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-4">
                <span className="text-xs text-slate-500">{timeAgo}</span>
                {activity.linkUrl && (
                  <Link
                    to={activity.linkUrl}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    자세히 보기 →
                  </Link>
                )}
              </div>

              {/* Social Bar */}
              <SocialBar
                entityType="activity"
                entityId={activity.id}
                likesCount={activity.likeCount}
                commentsCount={activity.commentCount}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### 5-3. 홈 페이지에 ActivityFeed 통합

**파일**: `src/pages/association/AssociationHomePage.tsx`

```typescript
import { ActivityFeed } from "@/components/feed/ActivityFeed";

export default function AssociationHomePage() {
  const { associationSlug } = useParams();
  const { data: association } = useQuery({
    queryKey: ["association", associationSlug],
    queryFn: () => getAssociationBySlug(associationSlug!),
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ... 기존 섹션들 ... */}

      {/* 최근 활동 섹션 */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900">최근 활동</h2>
          <p className="text-sm text-slate-500 mt-1">
            협회의 최신 활동을 확인하세요
          </p>
        </div>

        {association && (
          <ActivityFeed
            associationId={association.id}
            limitCount={10}
          />
        )}
      </section>
    </div>
  );
}
```

---

## 6️⃣ 실제 구현 코드

### 6-1. Activity Service (Frontend)

**파일**: `src/services/activityService.ts`

```typescript
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AssociationActivity } from "@/types/activity";

/**
 * 협회 Activity 목록 조회
 */
export async function getActivities(
  associationId: string,
  options?: {
    limitCount?: number;
    actorType?: ActivityActorType;
    actorId?: string;
    entityType?: ActivityEntityType;
    entityId?: string;
  }
): Promise<AssociationActivity[]> {
  const activitiesRef = collection(
    db,
    "associations",
    associationId,
    "activities"
  );

  const conditions: any[] = [
    where("visibility", "==", "public"),
    orderBy("createdAt", "desc"),
  ];

  if (options?.actorType) {
    conditions.unshift(where("actorType", "==", options.actorType));
  }
  if (options?.actorId) {
    conditions.unshift(where("actorId", "==", options.actorId));
  }
  if (options?.entityType) {
    conditions.unshift(where("entityType", "==", options.entityType));
  }
  if (options?.entityId) {
    conditions.unshift(where("entityId", "==", options.entityId));
  }

  if (options?.limitCount) {
    conditions.push(limit(options.limitCount));
  }

  const q = query(activitiesRef, ...conditions);
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as AssociationActivity[];
}

/**
 * Activity 단일 조회
 */
export async function getActivity(
  associationId: string,
  activityId: string
): Promise<AssociationActivity | null> {
  const activityRef = doc(
    db,
    "associations",
    associationId,
    "activities",
    activityId
  );
  const snapshot = await getDoc(activityRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as AssociationActivity;
}
```

---

## 7️⃣ 피드 쿼리 패턴

### 전체 피드 (협회 홈)

```typescript
// 협회의 모든 공개 활동
const activities = await getActivities(associationId, {
  limitCount: 20,
});
```

### 팀 피드

```typescript
// 특정 팀의 활동
const teamActivities = await getActivities(associationId, {
  actorType: "team",
  actorId: teamId,
  limitCount: 20,
});
```

### 선수 피드

```typescript
// 특정 선수의 활동
const playerActivities = await getActivities(associationId, {
  actorType: "player",
  actorId: playerId,
  limitCount: 20,
});
```

### 경기 관련 피드

```typescript
// 특정 경기의 활동
const matchActivities = await getActivities(associationId, {
  entityType: "match",
  entityId: matchId,
  limitCount: 20,
});
```

---

## 8️⃣ 개인화 피드

### 팔로우 기반 피드

**파일**: `src/components/feed/PersonalizedFeed.tsx`

```typescript
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ActivityCard } from "./ActivityCard";
import type { AssociationActivity } from "@/types/activity";

interface PersonalizedFeedProps {
  associationId: string;
}

export function PersonalizedFeed({ associationId }: PersonalizedFeedProps) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<AssociationActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid || !associationId) {
      setLoading(false);
      return;
    }

    // 팔로우 목록 조회
    const followsRef = collection(db, "follows");
    const followsQuery = query(
      followsRef,
      where("followerId", "==", user.uid),
      where("targetType", "in", ["team", "player"])
    );

    const unsubscribe = onSnapshot(followsQuery, async (followsSnapshot) => {
      const followedIds = followsSnapshot.docs.map((doc) => doc.data().targetId);

      if (followedIds.length === 0) {
        setActivities([]);
        setLoading(false);
        return;
      }

      // 팔로우한 팀/선수의 활동만 조회
      const activitiesRef = collection(
        db,
        "associations",
        associationId,
        "activities"
      );

      const activitiesQuery = query(
        activitiesRef,
        where("visibility", "==", "public"),
        where("actorId", "in", followedIds),
        orderBy("createdAt", "desc"),
        limit(20)
      );

      const activitiesUnsubscribe = onSnapshot(
        activitiesQuery,
        (activitiesSnapshot) => {
          const items = activitiesSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as AssociationActivity[];

          setActivities(items);
          setLoading(false);
        }
      );

      return () => activitiesUnsubscribe();
    });

    return () => unsubscribe();
  }, [user?.uid, associationId]);

  if (loading) {
    return <div>로딩 중...</div>;
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        팔로우한 팀이나 선수의 활동이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <ActivityCard key={activity.id} activity={activity} />
      ))}
    </div>
  );
}
```

---

## ✅ 구현 체크리스트

### Phase 1: Activity Feed 기본 (MVP)
- [ ] `AssociationActivity` 타입 정의
- [ ] `activities` Firestore 컬렉션 구조 설계
- [ ] `ActivityFeed` 컴포넌트 구현
- [ ] `ActivityCard` 컴포넌트 구현
- [ ] `activityService.ts` 작성

### Phase 2: Cloud Functions 트리거
- [ ] `onMatchCompleted` 구현
- [ ] `onGoalScored` 구현
- [ ] `onMediaUploaded` 구현
- [ ] `activityService` (Cloud Functions) 구현

### Phase 3: 확장 기능
- [ ] 팀 피드 구현
- [ ] 선수 피드 구현
- [ ] 개인화 피드 구현
- [ ] 실시간 업데이트

### Phase 4: 고급 기능
- [ ] Activity 필터링
- [ ] Activity 검색
- [ ] Activity 통계
- [ ] Activity 알림 연동

---

**작성일**: 2024년  
**상태**: ✅ 설계 완료 (개발 시작 가능)
