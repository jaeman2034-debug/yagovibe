# 🔥 YAGO VIBE SPORTS - Team Activity Feed 시스템 설계

> **작성일**: 2024년  
> **목적**: 팀 이벤트/공지/경기/채팅을 하나로 묶는 플랫폼 핵심 UX

---

## 📋 목차

1. [Activity Feed 개념](#1-activity-feed-개념)
2. [Firestore 구조](#2-firestore-구조)
3. [Activity 타입 정의](#3-activity-타입-정의)
4. [Cloud Functions 트리거](#4-cloud-functions-트리거)
5. [React 컴포넌트 구조](#5-react-컴포넌트-구조)
6. [UI 통합](#6-ui-통합)
7. [실제 구현 코드](#7-실제-구현-코드)

---

## 1️⃣ Activity Feed 개념

### Activity Feed란?

**팀에서 일어나는 모든 활동을 하나의 타임라인으로 보여주는 시스템**입니다.

예시:
```
TEAM ACTIVITY

📅 이벤트 생성
⚽ 경기 결과 등록
📢 공지 작성
👤 멤버 가입
💬 채팅 활성화
```

### 참고 서비스

- **Strava**: 활동 피드로 운동 기록 통합
- **Discord**: 서버 활동 피드
- **Slack**: 워크스페이스 활동 피드
- **TeamSnap**: 팀 활동 통합 피드

---

## 2️⃣ Firestore 구조

### Activity 컬렉션

```
teams/{teamId}/activities/{activityId}
```

### 문서 스키마

```typescript
{
  type: "event" | "notice" | "match" | "member_join" | "post";
  title: string;
  createdBy: string;
  createdAt: Timestamp;
  referenceId: string; // 이벤트/공지/경기 ID
  summary?: string; // 선택적 요약
  metadata?: {
    // 타입별 추가 정보
    eventDate?: Timestamp;
    matchScore?: string;
    memberName?: string;
  };
}
```

### 예시 문서

```json
{
  "type": "event",
  "title": "팀 훈련 이벤트 생성",
  "createdBy": "user123",
  "createdAt": "2024-03-15T10:00:00Z",
  "referenceId": "event_abc123",
  "summary": "2024-03-20 15:00 훈련",
  "metadata": {
    "eventDate": "2024-03-20T15:00:00Z"
  }
}
```

---

## 3️⃣ Activity 타입 정의

### Activity 타입

```typescript
// src/types/activity.ts
export type TeamActivityType =
  | "event"           // 이벤트 생성
  | "notice"          // 공지 작성
  | "match"           // 경기 생성/결과 등록
  | "member_join"     // 멤버 가입
  | "member_left"     // 멤버 탈퇴
  | "post";           // 게시글 작성 (향후 확장)
```

### Activity 인터페이스

```typescript
// src/types/activity.ts
import { Timestamp } from "firebase/firestore";

export interface TeamActivity {
  id: string;
  type: TeamActivityType;
  title: string;
  createdBy: string;
  createdAt: Timestamp;
  referenceId: string;
  summary?: string;
  metadata?: {
    eventDate?: Timestamp;
    matchScore?: string;
    memberName?: string;
    location?: string;
  };
}
```

---

## 4️⃣ Cloud Functions 트리거

### 4-1. 이벤트 생성 시 Activity 생성

**기존**: `onEventCreated` → 채팅방에 카드 메시지 생성  
**추가**: `onEventCreated` → Activity도 생성

```typescript
// functions/src/team/onEventCreated.ts
export const onEventCreated = onDocumentCreated(
  "teams/{teamId}/events/{eventId}",
  async (event) => {
    // ... 기존 채팅방 카드 메시지 생성 코드 ...

    // 🔥 Activity 생성 추가
    await db.collection(`teams/${teamId}/activities`).add({
      type: "event",
      title: `${teamData.name}가 이벤트를 생성했습니다`,
      createdBy: eventData.createdBy,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      referenceId: eventId,
      summary: eventData.description || undefined,
      metadata: {
        eventDate: eventData.date,
        location: eventData.location || undefined,
      },
    });
  }
);
```

### 4-2. 공지 생성 시 Activity 생성

**기존**: `onNoticeCreated` → 채팅방에 카드 메시지 생성  
**추가**: `onNoticeCreated` → Activity도 생성

```typescript
// functions/src/team/onNoticeCreated.ts
export const onNoticeCreated = onDocumentCreated(
  "teams/{teamId}/notices/{noticeId}",
  async (event) => {
    // ... 기존 채팅방 카드 메시지 생성 코드 ...

    // 🔥 Activity 생성 추가
    await db.collection(`teams/${teamId}/activities`).add({
      type: "notice",
      title: `${teamData.name}가 공지를 작성했습니다`,
      createdBy: noticeData.authorId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      referenceId: noticeId,
      summary: noticeData.content?.substring(0, 100) || undefined,
    });
  }
);
```

### 4-3. 경기 생성 시 Activity 생성 (향후)

```typescript
// functions/src/team/onMatchCreated.ts (새로 생성)
export const onMatchCreated = onDocumentCreated(
  "teams/{teamId}/matches/{matchId}",
  async (event) => {
    // Activity 생성
    await db.collection(`teams/${teamId}/activities`).add({
      type: "match",
      title: `경기 결과가 등록되었습니다`,
      createdBy: matchData.createdBy,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      referenceId: matchId,
      summary: `${matchData.homeTeam} ${matchData.homeScore} : ${matchData.awayScore} ${matchData.awayTeam}`,
      metadata: {
        matchScore: `${matchData.homeScore} : ${matchData.awayScore}`,
      },
    });
  }
);
```

### 4-4. 멤버 가입 시 Activity 생성 (향후)

```typescript
// functions/src/team/onMemberJoined.ts (새로 생성)
export const onMemberJoined = onDocumentCreated(
  "teams/{teamId}/members/{memberId}",
  async (event) => {
    const memberData = event.data?.data();
    const userRef = db.doc(`users/${memberId}`);
    const userSnap = await userRef.get();
    const userName = userSnap.data()?.displayName || "새 멤버";

    // Activity 생성
    await db.collection(`teams/${teamId}/activities`).add({
      type: "member_join",
      title: `${userName}이(가) 팀에 가입했습니다`,
      createdBy: memberId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      referenceId: memberId,
      metadata: {
        memberName: userName,
      },
    });
  }
);
```

---

## 5️⃣ React 컴포넌트 구조

### 컴포넌트 트리

```
components/team/activity/
  ├─ ActivityFeed.tsx      // 메인 피드 컴포넌트
  ├─ ActivityItem.tsx      // 개별 Activity 카드
  └─ ActivityIcon.tsx     // 타입별 아이콘
```

### ActivityFeed 컴포넌트

```typescript
// src/components/team/activity/ActivityFeed.tsx
import { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TeamActivity } from "@/types/activity";
import { ActivityItem } from "./ActivityItem";

interface ActivityFeedProps {
  teamId: string;
  limitCount?: number;
}

export function ActivityFeed({ teamId, limitCount = 20 }: ActivityFeedProps) {
  const [activities, setActivities] = useState<TeamActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) return;

    const activitiesRef = collection(db, "teams", teamId, "activities");
    const q = query(
      activitiesRef,
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TeamActivity[];
      setActivities(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [teamId, limitCount]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
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
        <ActivityItem key={activity.id} activity={activity} teamId={teamId} />
      ))}
    </div>
  );
}
```

### ActivityItem 컴포넌트

```typescript
// src/components/team/activity/ActivityItem.tsx
import { TeamActivity } from "@/types/activity";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { ActivityIcon } from "./ActivityIcon";

interface ActivityItemProps {
  activity: TeamActivity;
  teamId: string;
}

export function ActivityItem({ activity, teamId }: ActivityItemProps) {
  const navigate = useNavigate();
  const timeAgo = formatDistanceToNow(activity.createdAt.toDate(), {
    addSuffix: true,
    locale: ko,
  });

  const handleClick = () => {
    // 타입별 상세 페이지로 이동
    switch (activity.type) {
      case "event":
        navigate(`/sports/football/team/schedule/${activity.referenceId}`);
        break;
      case "notice":
        navigate(`/sports/football/team/notices/${activity.referenceId}`);
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
      className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl">
          <ActivityIcon type={activity.type} />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            {activity.title}
          </h3>
          {activity.summary && (
            <p className="text-xs text-gray-500 mb-2 line-clamp-2">
              {activity.summary}
            </p>
          )}
          {activity.metadata?.eventDate && (
            <p className="text-xs text-gray-400 mb-1">
              📅 {activity.metadata.eventDate.toDate().toLocaleDateString("ko-KR")}
            </p>
          )}
          {activity.metadata?.matchScore && (
            <p className="text-xs text-gray-400 mb-1">
              ⚽ {activity.metadata.matchScore}
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
```

### ActivityIcon 컴포넌트

```typescript
// src/components/team/activity/ActivityIcon.tsx
import { TeamActivityType } from "@/types/activity";

interface ActivityIconProps {
  type: TeamActivityType;
}

export function ActivityIcon({ type }: ActivityIconProps) {
  const icons = {
    event: "📅",
    notice: "📢",
    match: "⚽",
    member_join: "👤",
    member_left: "👋",
    post: "📝",
  };

  return <span>{icons[type] || "📌"}</span>;
}
```

---

## 6️⃣ UI 통합

### MyTeamPage에 Activity Feed 탭 추가

```typescript
// src/pages/team/MyTeamPage.tsx
import { ActivityFeed } from "@/components/team/activity/ActivityFeed";
import { Activity } from "lucide-react"; // 새 아이콘 추가

// 탭 배열에 추가
const tabs = [
  { id: "activity", label: "활동", icon: Activity, path: `/sports/${type}/team/activity` },
  { id: "schedule", label: "일정", icon: Calendar, path: `/sports/${type}/team/schedule` },
  { id: "members", label: "멤버", icon: Users, path: `/sports/${type}/team/members` },
  { id: "records", label: "기록", icon: Trophy, path: `/sports/${type}/team/records` },
  { id: "notices", label: "공지", icon: Bell, path: `/sports/${type}/team/notices` },
];

// Routes에 추가
<Route path="activity" element={<ActivityFeedTab teamId={currentTeam.teamId} />} />
```

### ActivityFeedTab 컴포넌트

```typescript
// src/components/team/ActivityFeedTab.tsx
import { ActivityFeed } from "./activity/ActivityFeed";

interface ActivityFeedTabProps {
  teamId: string;
}

export function ActivityFeedTab({ teamId }: ActivityFeedTabProps) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">팀 활동</h2>
        <p className="text-sm text-gray-500 mt-1">
          팀의 모든 활동을 한눈에 확인하세요
        </p>
      </div>
      <ActivityFeed teamId={teamId} limitCount={20} />
    </div>
  );
}
```

---

## 7️⃣ 실제 구현 코드

### 7-1. 타입 정의 파일

```typescript
// src/types/activity.ts
import { Timestamp } from "firebase/firestore";

export type TeamActivityType =
  | "event"
  | "notice"
  | "match"
  | "member_join"
  | "member_left"
  | "post";

export interface TeamActivity {
  id: string;
  type: TeamActivityType;
  title: string;
  createdBy: string;
  createdAt: Timestamp;
  referenceId: string;
  summary?: string;
  metadata?: {
    eventDate?: Timestamp;
    matchScore?: string;
    memberName?: string;
    location?: string;
  };
}
```

### 7-2. Cloud Functions 업데이트

```typescript
// functions/src/team/onEventCreated.ts (업데이트)
// 기존 코드에 Activity 생성 추가

// Activity 생성
const teamRef = db.doc(`teams/${teamId}`);
const teamSnap = await teamRef.get();
const teamData = teamSnap.data();

await db.collection(`teams/${teamId}/activities`).add({
  type: "event",
  title: `${teamData?.name || "팀"}이(가) 이벤트를 생성했습니다`,
  createdBy: eventData.createdBy,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  referenceId: eventId,
  summary: eventData.description || undefined,
  metadata: {
    eventDate: eventData.date,
    location: eventData.location || undefined,
  },
});
```

---

## 8️⃣ Activity Feed 장점

### 1. 팀 활동 가시성 향상
- 모든 활동을 한 곳에서 확인
- 실시간 업데이트

### 2. 참여율 증가
- 활동 피드를 통해 팀 동향 파악
- 이벤트/공지 놓치지 않음

### 3. 커뮤니티 활성화
- 팀 활동이 시각적으로 표현됨
- 팀원 간 소통 증가

### 4. 기능 통합
- Event, Match, Notice, Chat이 하나로 연결
- 단일 진입점 제공

---

## 9️⃣ 구현 체크리스트

### Phase 1 (즉시 구현)
- [ ] Activity 타입 정의 (`src/types/activity.ts`)
- [ ] ActivityFeed 컴포넌트 (`src/components/team/activity/ActivityFeed.tsx`)
- [ ] ActivityItem 컴포넌트 (`src/components/team/activity/ActivityItem.tsx`)
- [ ] ActivityIcon 컴포넌트 (`src/components/team/activity/ActivityIcon.tsx`)
- [ ] Cloud Functions 업데이트 (`onEventCreated`, `onNoticeCreated`)
- [ ] MyTeamPage에 Activity Feed 탭 추가

### Phase 2 (향후 확장)
- [ ] 경기 생성 시 Activity 생성
- [ ] 멤버 가입 시 Activity 생성
- [ ] Activity 필터 기능
- [ ] Activity 무한 스크롤
- [ ] Activity 상세 페이지

---

## ✅ 완료 기준

다음이 모두 충족되면 완료:

1. ✅ Activity Feed가 Team Workspace에 표시됨
2. ✅ 이벤트/공지 생성 시 Activity 자동 생성
3. ✅ 실시간 업데이트 (onSnapshot)
4. ✅ Activity 클릭 시 상세 페이지 이동
5. ✅ 타입별 아이콘 표시

---

**작성일**: 2024년  
**상태**: ✅ Activity Feed 시스템 설계 완료
