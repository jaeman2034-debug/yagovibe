# 🔔 Notification System 설계

## 📋 목차

1. [개요](#1-개요)
2. [알림 타입 확장](#2-알림-타입-확장)
3. [알림 생성 트리거](#3-알림-생성-트리거)
4. [알림 전송 채널](#4-알림-전송-채널)
5. [알림 UI](#5-알림-ui)
6. [구현 패턴](#6-구현-패턴)

---

## 1️⃣ 개요

### 목표

```text
운영툴 → 스포츠 플랫폼
```

### 핵심 기능

1. **경기 결과 알림**: 경기 결과 업데이트 시 알림
2. **순위 변화 알림**: 리더보드 순위 변화 시 알림
3. **대회 알림**: 대회 시작/종료 알림
4. **수상 알림**: 수상 발표 알림
5. **팀 알림**: 팀 관련 알림

### 기술 스택

- **Firebase Cloud Messaging (FCM)**: 푸시 알림
- **Email (SendGrid)**: 이메일 알림
- **In-app Notifications**: 앱 내 알림
- **Cloud Functions**: 알림 생성 트리거

---

## 2️⃣ 알림 타입 확장

### 스포츠 플랫폼 알림 타입

```typescript
export type NotificationType =
  // 기존 타입...
  
  // 🔥 스포츠 플랫폼 알림
  | "MATCH_RESULT_UPDATED"      // 경기 결과 업데이트
  | "MATCH_STARTED"              // 경기 시작
  | "MATCH_COMPLETED"            // 경기 완료
  | "PLAYER_STATS_UPDATED"       // 선수 기록 업데이트
  | "LEADERBOARD_RANK_CHANGED"   // 리더보드 순위 변화
  | "EVENT_STARTED"              // 대회 시작
  | "EVENT_COMPLETED"            // 대회 완료
  | "AWARD_ANNOUNCED"            // 수상 발표
  | "TEAM_MATCH_SCHEDULED"       // 팀 경기 일정
  | "TEAM_MATCH_REMINDER"        // 경기 리마인더
  | "PLAYER_ACHIEVEMENT"         // 선수 기록 달성
  | "TEAM_RANKING_UPDATED";      // 팀 순위 업데이트
```

---

## 3️⃣ 알림 생성 트리거

### Cloud Functions 트리거

#### 1. 경기 결과 업데이트

```typescript
// functions/src/events/onMatchResultUpdated.ts
export const onMatchResultUpdated = functions.firestore
  .document("event_matches/{matchId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    // 점수 변경 감지
    if (before.score?.home !== after.score?.home || 
        before.score?.away !== after.score?.away) {
      
      // 홈 팀 선수들에게 알림
      await notifyTeamMembers(after.homeTeamId, {
        type: "MATCH_RESULT_UPDATED",
        title: "경기 결과 업데이트",
        message: `${after.homeTeamName} ${after.score.home} : ${after.score.away} ${after.awayTeamName}`,
        target: {
          screen: "match",
          id: context.params.matchId,
        },
      });
      
      // 원정 팀 선수들에게 알림
      await notifyTeamMembers(after.awayTeamId, {
        type: "MATCH_RESULT_UPDATED",
        title: "경기 결과 업데이트",
        message: `${after.homeTeamName} ${after.score.home} : ${after.score.away} ${after.awayTeamName}`,
        target: {
          screen: "match",
          id: context.params.matchId,
        },
      });
    }
  });
```

#### 2. 리더보드 순위 변화

```typescript
// functions/src/leaderboards/onLeaderboardUpdated.ts
export const onLeaderboardUpdated = functions.firestore
  .document("leaderboards/{leaderboardId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    // 순위 변화 감지
    const beforeRank = before.rows.findIndex(r => r.playerId === playerId);
    const afterRank = after.rows.findIndex(r => r.playerId === playerId);
    
    if (beforeRank !== afterRank && afterRank <= 3) {
      // Top 3 진입 시 알림
      await createNotification({
        userId: playerId,
        type: "LEADERBOARD_RANK_CHANGED",
        title: "리더보드 순위 변화",
        message: `득점 순위 ${afterRank + 1}위로 상승했습니다!`,
        target: {
          screen: "leaderboard",
          id: context.params.leaderboardId,
        },
      });
    }
  });
```

#### 3. 수상 발표

```typescript
// functions/src/awards/onAwardCreated.ts
export const onAwardCreated = functions.firestore
  .document("event_awards/{awardId}")
  .onCreate(async (snap, context) => {
    const award = snap.data();
    
    if (award.targetType === "player") {
      await createNotification({
        userId: award.targetId,
        type: "AWARD_ANNOUNCED",
        title: "수상 발표",
        message: `${award.title}을(를) 수상했습니다!`,
        target: {
          screen: "event",
          id: award.eventId,
        },
        payload: {
          awardId: context.params.awardId,
        },
      });
    }
  });
```

---

## 4️⃣ 알림 전송 채널

### 1. In-app Notification

```typescript
// Firestore에 알림 저장
await addDoc(collection(db, "notifications"), {
  userId,
  type,
  title,
  message,
  target,
  isRead: false,
  createdAt: serverTimestamp(),
});
```

### 2. Push Notification (FCM)

```typescript
// Firebase Cloud Messaging
await messaging.send({
  token: fcmToken,
  notification: {
    title,
    body: message,
  },
  data: {
    type,
    targetScreen: target.screen,
    targetId: target.id,
  },
});
```

### 3. Email (SendGrid)

```typescript
// 중요 알림만 이메일 발송
if (priority === "high") {
  await sendEmail({
    to: userEmail,
    subject: title,
    html: generateEmailTemplate(notification),
  });
}
```

---

## 5️⃣ 알림 UI

### Notification Bell

```tsx
<NotificationBell>
  <BellIcon />
  {unreadCount > 0 && (
    <Badge>{unreadCount}</Badge>
  )}
</NotificationBell>
```

### Notification List

```tsx
<NotificationList>
  {notifications.map(noti => (
    <NotificationItem
      key={noti.id}
      notification={noti}
      onClick={() => handleNotificationClick(noti)}
    />
  ))}
</NotificationList>
```

### Notification Item

```tsx
<NotificationItem>
  <Icon type={noti.type} />
  <Content>
    <Title>{noti.title}</Title>
    <Message>{noti.message}</Message>
    <Time>{formatTime(noti.createdAt)}</Time>
  </Content>
  {!noti.isRead && <UnreadIndicator />}
</NotificationItem>
```

---

## 6️⃣ 구현 패턴

### 알림 생성 유틸리티

```typescript
// src/services/notificationService.ts
export async function createNotification({
  userId,
  type,
  title,
  message,
  target,
  priority = "normal",
  payload,
}: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  target?: NotificationTarget;
  priority?: "high" | "normal" | "low";
  payload?: Record<string, any>;
}): Promise<void> {
  // 1. Firestore에 알림 저장
  await addDoc(collection(db, "notifications"), {
    userId,
    type,
    title,
    message,
    target,
    priority,
    payload,
    isRead: false,
    createdAt: serverTimestamp(),
  });
  
  // 2. FCM 푸시 발송 (선택적)
  if (priority === "high") {
    await sendPushNotification(userId, {
      title,
      body: message,
      data: {
        type,
        targetScreen: target?.screen,
        targetId: target?.id,
      },
    });
  }
}
```

### 팀 멤버 일괄 알림

```typescript
export async function notifyTeamMembers(
  teamId: string,
  notification: {
    type: NotificationType;
    title: string;
    message: string;
    target?: NotificationTarget;
  }
): Promise<void> {
  // 팀 멤버 조회
  const membersSnapshot = await getDocs(
    collection(db, `teams/${teamId}/members`)
  );
  
  // 각 멤버에게 알림 생성
  const promises = membersSnapshot.docs.map(doc =>
    createNotification({
      userId: doc.id,
      ...notification,
    })
  );
  
  await Promise.all(promises);
}
```

---

## 📁 파일 구조

```
src/
├── services/
│   └── notificationService.ts
├── components/
│   └── notifications/
│       ├── NotificationBell.tsx
│       ├── NotificationList.tsx
│       └── NotificationItem.tsx
└── hooks/
    └── useNotifications.ts

functions/
└── src/
    ├── events/
    │   └── onMatchResultUpdated.ts
    ├── leaderboards/
    │   └── onLeaderboardUpdated.ts
    └── awards/
        └── onAwardCreated.ts
```

---

## 🚀 사용 예시

### 경기 결과 알림

```typescript
// 경기 결과 저장 시 자동 알림
await updateMatchResult(matchId, {
  homeScore: 3,
  awayScore: 1,
});

// Cloud Function에서 자동으로 알림 생성
```

### 리더보드 순위 변화 알림

```typescript
// 리더보드 업데이트 시 자동 알림
await updateLeaderboards(eventId);

// Top 3 진입 시 선수에게 알림
```

---

## 📚 참고

- 전체 시스템 아키텍처: [PLATFORM_ARCHITECTURE.md](PLATFORM_ARCHITECTURE.md)
- Realtime System: [REALTIME_SYSTEM.md](REALTIME_SYSTEM.md)
