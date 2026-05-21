# 🔥 YAGO SPORTS Activity Feed 설계 (Activity Graph 기반)

> **작성일**: 2024년  
> **목적**: Activity Graph 기반의 Activity Feed 시스템 설계

---

## 📋 목차

1. [Activity Graph 개념](#1-activity-graph-개념)
2. [Activity Feed 구조](#2-activity-feed-구조)
3. [Activity 타입 정의](#3-activity-타입-정의)
4. [Firestore 구조](#4-firestore-구조)
5. [UI 컴포넌트](#5-ui-컴포넌트)
6. [실제 구현 코드](#6-실제-구현-코드)

---

## 1️⃣ Activity Graph 개념

### Activity Graph 구조

```
User
  ↓
Team
  ↓
Activity
  ↓
Event / Match / Notice
  ↓
Chat
```

### Activity 흐름

```
사용자 액션
  ↓
팀 활동 생성
  ↓
Activity Feed 업데이트
  ↓
채팅 연결 (선택적)
  ↓
알림 발송 (선택적)
```

---

## 2️⃣ Activity Feed 구조

### 2-1. Activity Feed 위치

```
1. 홈 페이지 (/home)
   └─ Activity Feed 섹션

2. 팀 페이지 (/sports/:type/team/*)
   └─ Activity Feed 탭

3. 전체 피드 (/activity)
   └─ Activity Feed 페이지
```

### 2-2. Activity Feed UI

```
┌─────────────────────────────────────────┐
│ 활동 피드                                 │
├─────────────────────────────────────────┤
│                                          │
│ 📅 노원FC가 경기를 생성했습니다           │
│    3시간 전                              │
│                                          │
│ 📅 노원FC가 이벤트를 생성했습니다         │
│    5시간 전                              │
│                                          │
│ 👥 홍길동이 노원FC에 가입했습니다         │
│    1일 전                                │
│                                          │
│ 📝 노원FC가 공지를 작성했습니다           │
│    2일 전                                │
│                                          │
└─────────────────────────────────────────┘
```

---

## 3️⃣ Activity 타입 정의

### 3-1. Activity 타입

```typescript
// src/types/activity.ts
export type ActivityType =
  | "team_created"
  | "team_notice"
  | "team_event"
  | "team_match"
  | "team_member_joined"
  | "team_member_left"
  | "match_result"
  | "player_achievement"
  | "tournament_created"
  | "tournament_match_scheduled";

export type ActivityRefType =
  | "teams"
  | "notices"
  | "events"
  | "matches"
  | "players"
  | "tournaments";
```

### 3-2. Activity 인터페이스

```typescript
// src/types/activity.ts
export interface Activity {
  id: string;
  type: ActivityType;
  refType: ActivityRefType;
  refId: string;
  authorId: string;
  teamId?: string;
  title: string;
  summary?: string;
  thumbnailUrl?: string;
  visibility: "public" | "team" | "private";
  likeCount: number;
  commentCount: number;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

---

## 4️⃣ Firestore 구조

### 4-1. Activity 컬렉션

```typescript
// activities/{activityId}
{
  id: string;
  type: "team_created" | "team_notice" | "team_event" | "team_match" | ...;
  refType: "teams" | "notices" | "events" | "matches" | ...;
  refId: string;
  authorId: string;
  teamId?: string;
  title: string;
  summary?: string;
  thumbnailUrl?: string;
  visibility: "public" | "team" | "private";
  likeCount: number;
  commentCount: number;
  createdAt: Timestamp;
}
```

### 4-2. 팀 Activity 서브컬렉션

```typescript
// teams/{teamId}/activities/{activityId}
{
  id: string;
  type: "notice" | "event" | "match" | "member_joined";
  refId: string;
  createdBy: string;
  title: string;
  summary?: string;
  createdAt: Timestamp;
}
```

---

## 5️⃣ UI 컴포넌트

### 5-1. ActivityCard 컴포넌트

```typescript
// src/components/activity/ActivityCard.tsx
import { Activity } from "@/types/activity";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface ActivityCardProps {
  activity: Activity;
}

export function ActivityCard({ activity }: ActivityCardProps) {
  const getActivityIcon = (type: ActivityType) => {
    const icons = {
      team_created: "👥",
      team_notice: "📝",
      team_event: "📅",
      team_match: "⚽",
      team_member_joined: "👤",
      match_result: "🏆",
      player_achievement: "⭐",
    };
    return icons[type] || "📌";
  };

  const timeAgo = formatDistanceToNow(activity.createdAt.toDate(), {
    addSuffix: true,
    locale: ko,
  });

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="text-2xl">{getActivityIcon(activity.type)}</div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            {activity.title}
          </h3>
          {activity.summary && (
            <p className="text-xs text-gray-500 mb-2">{activity.summary}</p>
          )}
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>{timeAgo}</span>
            {activity.likeCount > 0 && (
              <span>👍 {activity.likeCount}</span>
            )}
            {activity.commentCount > 0 && (
              <span>💬 {activity.commentCount}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 5-2. ActivityFeed 컴포넌트

```typescript
// src/components/activity/ActivityFeed.tsx
import { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Activity } from "@/types/activity";
import { ActivityCard } from "./ActivityCard";

interface ActivityFeedProps {
  teamId?: string;
  limitCount?: number;
}

export function ActivityFeed({ teamId, limitCount = 20 }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const activitiesRef = collection(db, "activities");
    
    let q;
    if (teamId) {
      // 팀별 Activity Feed
      q = query(
        activitiesRef,
        where("teamId", "==", teamId),
        where("visibility", "in", ["public", "team"]),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );
    } else {
      // 전체 Activity Feed
      q = query(
        activitiesRef,
        where("visibility", "==", "public"),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Activity[];
      setActivities(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [teamId, limitCount]);

  if (loading) {
    return <div>로딩 중...</div>;
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        활동이 없습니다
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

## 6️⃣ 실제 구현 코드

### 6-1. Activity 생성 함수

```typescript
// src/services/activityService.ts
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Activity, ActivityType, ActivityRefType } from "@/types/activity";

export async function createActivity(params: {
  type: ActivityType;
  refType: ActivityRefType;
  refId: string;
  authorId: string;
  teamId?: string;
  title: string;
  summary?: string;
  thumbnailUrl?: string;
  visibility?: "public" | "team" | "private";
}): Promise<string> {
  const {
    type,
    refType,
    refId,
    authorId,
    teamId,
    title,
    summary,
    thumbnailUrl,
    visibility = "public",
  } = params;

  // 메인 Activity 컬렉션에 생성
  const activityRef = await addDoc(collection(db, "activities"), {
    type,
    refType,
    refId,
    authorId,
    teamId,
    title: title.trim(),
    summary: summary?.trim() || undefined,
    thumbnailUrl,
    visibility,
    likeCount: 0,
    commentCount: 0,
    createdAt: serverTimestamp(),
  });

  // 팀 Activity 서브컬렉션에도 생성 (팀이 있는 경우)
  if (teamId) {
    await addDoc(
      collection(db, "teams", teamId, "activities"),
      {
        type,
        refId,
        createdBy: authorId,
        title: title.trim(),
        summary: summary?.trim() || undefined,
        createdAt: serverTimestamp(),
      }
    );
  }

  return activityRef.id;
}
```

### 6-2. Cloud Functions 트리거

```typescript
// functions/src/activity/onTeamEventCreated.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export const onTeamEventCreated = functions.firestore
  .document("teams/{teamId}/events/{eventId}")
  .onCreate(async (snap, context) => {
    const event = snap.data();
    const { teamId } = context.params;

    // 팀 정보 조회
    const teamSnap = await admin.firestore()
      .collection("teams")
      .doc(teamId)
      .get();
    const team = teamSnap.data();

    // Activity 생성
    await admin.firestore().collection("activities").add({
      type: "team_event",
      refType: "events",
      refId: snap.id,
      authorId: event.createdBy,
      teamId,
      title: `${team?.name}가 이벤트를 생성했습니다`,
      summary: event.description || undefined,
      visibility: "team",
      likeCount: 0,
      commentCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
```

---

## 7️⃣ Activity Feed 통합

### 7-1. 홈 페이지 통합

```typescript
// src/pages/hub/HubHome.tsx
import { ActivityFeed } from "@/components/activity/ActivityFeed";

export default function HubHome() {
  return (
    <div>
      {/* Quick Start 섹션 */}
      <QuickActions />
      
      {/* Activity Feed 섹션 */}
      <section className="mt-8">
        <h2 className="text-xl font-bold mb-4">최근 활동</h2>
        <ActivityFeed limitCount={10} />
      </section>
    </div>
  );
}
```

### 7-2. 팀 페이지 통합

```typescript
// src/pages/team/MyTeamPage.tsx
import { ActivityFeed } from "@/components/activity/ActivityFeed";

export default function MyTeamPage() {
  const { teamId } = useParams();
  
  return (
    <div>
      <TeamTabs />
      <div className="mt-6">
        <ActivityFeed teamId={teamId} limitCount={20} />
      </div>
    </div>
  );
}
```

---

## 8️⃣ Activity Graph 흐름

### 8-1. 이벤트 생성 흐름

```
User
  ↓
createEvent()
  ↓
teams/{teamId}/events/{eventId} 생성
  ↓
Cloud Function 트리거
  ↓
activities/{activityId} 생성
  ↓
chatRooms/team_{teamId}/messages 생성 (이벤트 카드)
  ↓
Activity Feed 업데이트
```

### 8-2. 경기 생성 흐름

```
User
  ↓
createMatch()
  ↓
matches/{matchId} 생성
  ↓
Cloud Function 트리거
  ↓
activities/{activityId} 생성 (team_match)
  ↓
Activity Feed 업데이트
```

### 8-3. 공지 작성 흐름

```
User
  ↓
createNotice()
  ↓
teams/{teamId}/notices/{noticeId} 생성
  ↓
Cloud Function 트리거
  ↓
activities/{activityId} 생성 (team_notice)
  ↓
chatRooms/team_{teamId}/messages 생성 (공지 카드)
  ↓
Activity Feed 업데이트
```

---

## 9️⃣ Activity Feed 확장

### 9-1. 필터 기능

```typescript
// Activity Feed 필터
type ActivityFilter = "all" | "events" | "matches" | "notices";

export function ActivityFeed({ 
  teamId, 
  filter = "all" 
}: { 
  teamId?: string; 
  filter?: ActivityFilter;
}) {
  // 필터에 따라 쿼리 변경
  const typeFilter = filter !== "all" ? [filter] : undefined;
  // ...
}
```

### 9-2. 무한 스크롤

```typescript
// Activity Feed 무한 스크롤
export function ActivityFeed({ teamId }: { teamId?: string }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = async () => {
    if (!hasMore) return;
    
    const q = query(
      collection(db, "activities"),
      where("teamId", "==", teamId),
      orderBy("createdAt", "desc"),
      startAfter(lastDoc),
      limit(20)
    );
    
    const snapshot = await getDocs(q);
    const newActivities = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Activity[];
    
    setActivities([...activities, ...newActivities]);
    setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
    setHasMore(snapshot.docs.length === 20);
  };

  // Intersection Observer로 무한 스크롤 구현
  // ...
}
```

---

## ✅ Activity Feed 체크리스트

### 구현 완료
- [x] Activity 타입 정의
- [x] Firestore 구조 설계
- [x] ActivityCard 컴포넌트 설계
- [x] ActivityFeed 컴포넌트 설계
- [x] Activity 생성 함수 설계
- [x] Cloud Functions 트리거 설계

### 구현 필요
- [ ] ActivityCard 컴포넌트 구현
- [ ] ActivityFeed 컴포넌트 구현
- [ ] Activity 생성 함수 구현
- [ ] Cloud Functions 트리거 구현
- [ ] 홈 페이지 통합
- [ ] 팀 페이지 통합

---

**작성일**: 2024년  
**상태**: ✅ Activity Feed 설계 완료
