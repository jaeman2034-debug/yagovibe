# YAGO VIBE Cloud Functions 이벤트 흐름도

> Firestore 트리거 및 Callable 함수의 실행 순서 · 개발팀 기준 문서

---

## 1. 전체 흐름 개요

```
Firestore 문서 변경
        │
        ▼
Cloud Functions 트리거
        │
 ┌──────┼──────┬──────────┬──────────┐
 ▼      ▼      ▼          ▼          ▼
Team   Event  Notice   ChatRoom   Market
```

---

## 2. 팀(Team) 관련

### 2.1 팀 생성

```
Client: createTeam() 호출
        │
        ▼
Firestore: teams/{teamId} 문서 생성
        │
        ▼
onTeamCreated (teams/{teamId} onCreate)
        │
        ├─ 채팅방 생성: chatRooms/team_{teamId}
        ├─ members: ownerUid 또는 owners 기준
        └─ 로그: "🔥 [onTeamCreated] 팀 생성 감지"
```

**경로:** `teams/{teamId}` **onCreate**  
**함수:** `onTeamCreated`  
**역할:** 팀 채팅방 자동 생성, 초기 멤버 설정

---

### 2.2 이벤트 생성

```
Client: teams/{teamId}/events/{eventId} 문서 생성
        │
        ▼
onEventCreated (teams/{teamId}/events/{eventId} onCreate)
        │
        ├─ chatRooms/team_{teamId} 존재 확인
        ├─ 이벤트 카드 메시지 추가 (messages 서브컬렉션)
        └─ 로그: "📅 [onEventCreated] 이벤트 생성 감지"
```

**경로:** `teams/{teamId}/events/{eventId}` **onCreate**  
**함수:** `onEventCreated`  
**역할:** 팀 채팅방에 이벤트 카드 메시지 자동 생성

---

### 2.3 이벤트 참석 업데이트

```
Client: teams/{teamId}/events/{eventId} 문서의 attendees 수정
        │
        ▼
onEventAttendScore (teams/{teamId}/events/{eventId} onUpdate)
        │
        ├─ before.attendees vs after.attendees 비교
        ├─ 새 참석자(uid)에 대해 teams/{teamId}/members/{uid} 점수 적립
        ├─ club: +10점, hobby: +15점
        └─ 로그: "🎟️ [onEventAttendScore] 이벤트 업데이트 감지"
```

**경로:** `teams/{teamId}/events/{eventId}` **onUpdate**  
**함수:** `onEventAttendScore`  
**역할:** 참석자 활동 점수 자동 적립

---

### 2.4 공지 생성

```
Client: teams/{teamId}/notices/{noticeId} 문서 생성
        │
        ▼
onNoticeCreated (teams/{teamId}/notices/{noticeId} onCreate)
        │
        └─ 채팅방에 공지 카드 메시지 추가

onNoticeScore (teams/{teamId}/notices/{noticeId} onCreate)
        │
        ├─ authorId로 teams/{teamId}/members/{authorId} 조회
        ├─ score +3, noticeCount +1
        └─ 로그: "📌 [onNoticeScore] 공지 생성 감지"
```

**경로:** `teams/{teamId}/notices/{noticeId}` **onCreate**  
**함수:** `onNoticeCreated`, `onNoticeScore`  
**역할:** 공지 카드 메시지 생성, 작성자 점수 적립

---

### 2.5 메시지 점수

```
Client: chatRooms/{roomId}/messages/{msgId} 생성 (팀 채팅)
        │
        ▼
onMessageScore (teams/{teamId}/members/{uid} 관련)
        │
        └─ 메시지 작성자에게 활동 점수 적립
```

---

## 3. 채팅(Chat) 관련

### 3.1 채팅방 생성 (마켓/모집)

```
Client: chatRooms/{roomId} 문서 생성 (postId 포함)
        │
        ▼
onChatRoomCreated (chatRooms/{chatRoomId} onCreate)
        │
        ├─ postId로 marketPosts 문서 조회
        ├─ chatCount 증가, rankScore 재계산
        └─ 랭킹 점수 갱신
```

**경로:** `chatRooms/{chatRoomId}` **onCreate**  
**함수:** `onChatRoomCreated`  
**역할:** 마켓 게시글 랭킹 점수 갱신

---

### 3.2 채팅 메시지 생성

```
Client: chatRooms/{roomId}/messages 문서 추가
        │
        ▼
onMessageCreated (chatRooms/{roomId}/messages onCreate)
        │
        └─ 푸시 알림 전송 (FCM)
```

**경로:** `chatRooms/{roomId}/messages` **onCreate**  
**함수:** `onMessageCreated`  
**역할:** 새 메시지 푸시 알림

---

### 3.3 팀 멤버 동기화

```
Client: teams/{teamId}/members 변경 (가입/탈퇴)
        │
        ▼
syncTeamChatMembers (teams/{teamId}/members onWrite)
        │
        └─ chatRooms/team_{teamId}.members 배열 동기화
```

**경로:** `teams/{teamId}/members` **onWrite**  
**함수:** `syncTeamChatMembers`  
**역할:** 팀 채팅방 멤버 목록 자동 동기화

---

## 4. 마켓(Market) 관련

### 4.1 마켓 게시글 생성/수정

```
Client: market/{postId} 문서 생성
        │
        ▼
onMarketPostCreated (market/{postId} onCreate)
        │
        ├─ 부스트 계산
        ├─ 가격 규율 체크
        └─ activities 컬렉션 항목 생성

Client: market/{postId} 문서 수정
        │
        ▼
onMarketPostUpdated (market/{postId} onUpdate)
```

**경로:** `market/{postId}` **onCreate** / **onUpdate**  
**함수:** `onMarketPostCreated`, `onMarketPostUpdated`  
**역할:** 게시물 검증, 피드 연동

---

### 4.2 모집 참여 상태 변경

```
Client: marketJoins 문서 상태 변경 (승인/취소)
        │
        ▼
onMarketJoinStatusChanged (marketJoins/{joinId} onUpdate)
        │
        └─ market 문서의 currentPeople 자동 업데이트
```

**경로:** `marketJoins/{joinId}` **onUpdate**  
**함수:** `onMarketJoinStatusChanged`  
**역할:** 모집 참여 인원 자동 반영

---

## 5. Cron / Callable

### 5.1 출석 체크 (Callable)

| 함수 | 유형 | 역할 |
|------|------|------|
| startAttendanceCheck | Callable | 운영진이 출석 체크 시작 → 채팅방에 출석 메시지 발행 |
| checkInAttendance | Firestore Trigger | 출석 체크인 시 점수 적립 |

### 5.2 스케줄 Cron

| 함수 | 주기 | 역할 |
|------|------|------|
| dailyChatSummary | Cron | 일일 채팅 요약 |
| monthlyReport | Cron | 팀 활동 월간 리포트 |
| eventReminder | Cron | 이벤트 D-1 / D-Day 리마인드 푸시 |

### 5.3 마이그레이션

| 함수 | 유형 | 역할 |
|------|------|------|
| migrateActivityLogsToActivities | Callable/수동 | activityLogs → activities 마이그레이션 |

---

## 6. 트리거 경로 요약

| 트리거 | 경로 | 이벤트 |
|--------|------|--------|
| onTeamCreated | teams/{teamId} | onCreate |
| onEventCreated | teams/{teamId}/events/{eventId} | onCreate |
| onEventAttendScore | teams/{teamId}/events/{eventId} | onUpdate |
| onNoticeCreated | teams/{teamId}/notices/{noticeId} | onCreate |
| onNoticeScore | teams/{teamId}/notices/{noticeId} | onCreate |
| onChatRoomCreated | chatRooms/{chatRoomId} | onCreate |
| onMessageCreated | chatRooms/{roomId}/messages | onCreate |
| syncTeamChatMembers | teams/{teamId}/members | onWrite |
| onMarketPostCreated | market/{postId} | onCreate |
| onMarketPostUpdated | market/{postId} | onUpdate |
| onMarketJoinStatusChanged | marketJoins/{joinId} | onUpdate |

---

*마지막 갱신: functions/src/index.ts 및 실제 구현 기준*
