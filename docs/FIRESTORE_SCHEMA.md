# YAGO VIBE Firestore 전체 스키마

> 개발팀/CTO 기준 문서 · 프로젝트 구조의 단일 진실 소스

---

## 1. 개요

| 항목 | 설명 |
|------|------|
| 프로젝트 | YAGO VIBE (야고 바이브) |
| DB | Firestore |
| 핵심 도메인 | Team, Event, Notice, Chat, Market, Activity |

---

## 2. 팀 시스템

### 2.1 teams/{teamId}

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| name | string | ✓ | 팀 이름 |
| ownerUid | string | | 팀 대표 uid (채팅방 초기 멤버) |
| owners | string[] | | 공동 대표 uid 배열 |
| type | string | | "club" \| "hobby" (점수 정책 분기) |
| region | string | | 지역 |
| createdAt | Timestamp | | |

> ⚠️ `teamName`이 아닌 `name` 사용 (코드베이스 일관)

### 2.2 teams/{teamId}/members/{uid}

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| role | string | ✓ | "owner" \| "admin" \| "member" |
| score | number | | 활동 점수 |
| eventCount | number | | 이벤트 참석 횟수 |
| noticeCount | number | | 공지 작성 횟수 |
| badges | string[] | | 배지 (예: "event_master") |
| joinedAt | Timestamp | | |
| lastActivityAt | Timestamp | | |

### 2.3 teams/{teamId}/events/{eventId}

> Cloud Functions 트리거용 (onEventCreated, onEventAttendScore)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| title | string | ✓ | 이벤트 제목 |
| attendees | string[] | | 참석자 uid 배열 |
| createdBy | string | | 작성자 uid |
| date | Timestamp | | 일정 |
| location | string | | 장소 |
| description | string | | 상세 |
| createdAt | Timestamp | | |
| updatedAt | Timestamp | | |

### 2.4 teams/{teamId}/notices/{noticeId}

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| title | string | ✓ | 제목 |
| content | string | ✓ | 본문 |
| authorId | string | ✓ | 작성자 uid (onNoticeScore 점수 적립용) |
| status | string | | draft \| pending \| published |
| createdAt | Timestamp | | |
| updatedAt | Timestamp | | |

### 2.5 teams/{teamId}/attendance/{dateString}

| 필드 | 타입 | 설명 |
|------|------|------|
| date | string | "YYYY-MM-DD" |
| checkedInUsers | string[] | 출석 uid 목록 |
| startedBy | string | 출석 체크 시작한 운영진 uid |
| startedAt | Timestamp | |

---

## 3. 일정 (별도 컬렉션)

### 3.1 teamSchedules (최상위)

> useTeamSchedules 훅에서 조회

| 필드 | 타입 | 설명 |
|------|------|------|
| teamId | string | |
| creatorUid | string | |
| type | "training" \| "match" | |
| title | string | |
| startDateTime | Timestamp | |
| endDateTime | Timestamp | |
| locationName | string | |
| memo | string | |

---

## 4. 채팅 시스템

### 4.1 chatRooms/{roomId}

| 필드 | 타입 | 설명 |
|------|------|------|
| type | string | "team" \| "dm" \| "recruit" \| "product" |
| teamId | string | 팀 채팅 시 |
| postId | string | 마켓/모집 채팅 시 |
| name | string | 방 이름 |
| members | string[] | 멤버 uid 배열 |
| createdBy | string | |
| lastMessage | string | |
| lastMessageAt | Timestamp | |
| unreadCount | Record<uid, number> | uid별 미읽음 수 |
| createdAt | Timestamp | |

### 4.2 chatRooms/{roomId}/messages/{messageId}

| 필드 | 타입 | 설명 |
|------|------|------|
| type | string | "text" \| "event" \| "notice" \| "attendance" |
| text | string | 메시지 내용 |
| senderId | string | |
| readBy | string[] | 읽은 사람 uid |
| createdAt | Timestamp | |
| eventId | string | type=event 시 |
| noticeId | string | type=notice 시 |
| attendees | string[] | type=event 시 |
| declined | string[] | type=event 시 |

---

## 5. 마켓 시스템

### 5.1 market (또는 marketPosts)

| 필드 | 타입 | 설명 |
|------|------|------|
| sport | string | 종목 |
| category | string | equipment \| recruit \| match 등 |
| title | string | |
| description | string | |
| price | number | |
| authorId | string | |
| status | string | active \| reserved \| completed |
| views, likesCount, chatCount | number | |
| rankScore | number | 랭킹 점수 |
| createdAt | Timestamp | |

### 5.2 marketJoins

> market_postId_userId 형식 ID 가능

| 필드 | 타입 | 설명 |
|------|------|------|
| postId | string | |
| userId | string | |
| status | string | pending \| approved \| rejected |

### 5.3 marketProducts (레거시)

별도 상품형 마켓용 컬렉션.

---

## 6. 액티비티 피드

### 6.1 activities

> 커뮤니티 피드 단일 소스 (YAGO VIBE v1)

| 필드 | 타입 | 설명 |
|------|------|------|
| type | string | team_created \| team_notice \| team_event \| market_created 등 |
| refType | string | teams \| notices \| events \| market 등 |
| refId | string | 원본 문서 ID |
| authorId | string | |
| teamId | string? | |
| title | string | |
| summary | string? | |
| thumbnailUrl | string? | |
| visibility | string | public \| team \| private |
| likeCount, commentCount | number | |
| createdAt | Timestamp | |

---

## 7. 사용자 및 기타

### 7.1 users/{uid}

| 필드 | 타입 | 설명 |
|------|------|------|
| displayName | string | |
| email | string | |
| role | string | "ADMIN" \| "USER" (플랫폼 권한) |
| ... | | |

### 7.2 users/{uid}/devices/{deviceId}

FCM 디바이스 토큰 저장.

### 7.3 associations

협회/연맹. 대회(tournament) 관련.

---

## 8. 컬렉션 요약

| 컬렉션 | 용도 |
|--------|------|
| teams | 팀 |
| teamSchedules | 팀 일정 (최상위) |
| chatRooms | 채팅방 |
| market | 마켓 게시글 |
| marketProducts | 레거시 상품 |
| marketJoins | 모집 참여/승인 |
| activities | 커뮤니티 피드 |
| users | 사용자 프로필 |
| recruitPosts | 모집글 (레거시/일부) |
| notifications | 알림 |
| associations | 협회/대회 |

---

*마지막 갱신: 프로젝트 코드베이스 기준*
