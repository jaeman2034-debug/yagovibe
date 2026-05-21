# YAGO VIBE 채팅 시스템 설계

> 채팅 아키텍처 · 개발팀 기준 문서

---

## 1. 개요

YAGO VIBE 채팅은 **Firestore 기반 실시간 메시징**으로, 팀 채팅, 1:1(DM), 모집/마켓 거래 채팅을 지원합니다.

---

## 2. 채팅 타입

| type | 설명 | roomId 규칙 | 연동 |
|------|------|-------------|------|
| team | 팀 채팅 | `team_{teamId}` | teams/{teamId} |
| dm | 1:1 대화 | `dm_{uid1}_{uid2}` (정렬) | - |
| recruit | 모집글 채팅 | postId 기반 | market, recruitPosts |
| product | 마켓 상품 채팅 | postId 기반 | market |

---

## 3. Firestore 구조

### 3.1 chatRooms/{roomId}

```json
{
  "type": "team",
  "teamId": "team_xxx",
  "name": "팀명 채팅",
  "members": ["uid1", "uid2"],
  "createdBy": "uid1",
  "lastMessage": "마지막 메시지 미리보기",
  "lastMessageAt": "Timestamp",
  "unreadCount": { "uid1": 0, "uid2": 3 },
  "createdAt": "Timestamp"
}
```

| 필드 | team | dm | recruit/product |
|------|------|-----|-----------------|
| type | team | dm | recruit / product |
| teamId | ✓ | - | - |
| postId | - | - | ✓ |
| members | ✓ | ✓ (2명) | ✓ |
| name | "팀명 채팅" | "상대 이름" | "게시글 제목" |

### 3.2 chatRooms/{roomId}/messages/{messageId}

```json
{
  "type": "text",
  "text": "메시지 내용",
  "senderId": "uid",
  "readBy": ["uid1"],
  "createdAt": "Timestamp"
}
```

| type | 설명 | 추가 필드 |
|------|------|-----------|
| text | 일반 텍스트 | - |
| event | 이벤트 카드 | eventId, attendees, declined |
| notice | 공지 카드 | noticeId |
| attendance | 출석 체크 | attendanceId, date, checkedInUsers |

---

## 4. 팀 채팅 생성 흐름

### 4.1 팀 생성 시 (Cloud Function)

```
createTeam() 또는 teams/{teamId} 문서 생성
        │
        ▼
onTeamCreated
        │
        ├─ roomId = team_{teamId}
        ├─ members = ownerUid 또는 owners
        └─ chatRooms/team_{teamId} 생성
```

### 4.2 클라이언트 보장 (ensureTeamChatRoom)

```
사용자가 채팅 탭 진입
        │
        ▼
ensureTeamChatRoom(teamId)
        │
        ├─ chatRooms where teamId==teamId and type=="team" 조회
        ├─ 없으면: 팀 멤버 조회 후 chatRooms 문서 생성
        └─ 있으면: 사용자가 members에 없으면 추가
```

> Cloud Function `onTeamCreated`가 먼저 채팅방을 만들 수 있음. 없을 때만 클라이언트가 생성.

---

## 5. 팀 멤버 동기화

```
teams/{teamId}/members 변경 (가입/탈퇴/역할 변경)
        │
        ▼
syncTeamChatMembers
        │
        └─ chatRooms/team_{teamId}.members = 현재 팀 멤버 uid 목록
```

- 탈퇴 시: members에서 제거 (메시지 내역은 유지)
- 가입 시: members에 추가

---

## 6. 이벤트/공지 카드 메시지

### 6.1 이벤트 카드

- **생성:** `onEventCreated` (teams/.../events onCreate)
- **저장:** chatRooms/team_{teamId}/messages
- **필드:** type="event", eventId, title, attendees, declined
- **참석 업데이트:** 클라이언트가 events 문서 수정 → onEventAttendScore 실행

### 6.2 공지 카드

- **생성:** `onNoticeCreated` (teams/.../notices onCreate)
- **저장:** chatRooms/team_{teamId}/messages
- **필드:** type="notice", noticeId

### 6.3 출석 체크

- **시작:** `startAttendanceCheck` (Callable)
- **저장:** type="attendance", attendanceId, date, checkedInUsers
- **체크인:** `checkInAttendance` 트리거로 점수 적립

---

## 7. 마켓/모집 채팅

### 7.1 채팅방 생성

- 사용자가 "채팅하기" 클릭
- postId로 기존 채팅방 검색
- 없으면 chatRooms 문서 생성 (postId, type=recruit/product)
- `onChatRoomCreated` → market 랭킹 점수 갱신

### 7.2 채팅방 ID 규칙

- postId 또는 `{postId}_{buyerId}` 등 규칙에 따라 생성
- 중복 생성 방지를 위해 postId+userId 조합 사용 가능

---

## 8. 메시지 전송

### 8.1 일반 메시지

```
sendMessage(roomId, text)
        │
        ├─ chatRooms/{roomId}/messages 에 문서 추가
        │   - type: "text", text, senderId, readBy: [senderId]
        ├─ chatRooms/{roomId} lastMessage, lastMessageAt 업데이트
        └─ onMessageCreated → 푸시 알림
```

### 8.2 읽음 처리

- readBy 배열에 uid 추가
- unreadCount는 클라이언트 또는 트리거에서 관리

---

## 9. 실시간 구독

### 9.1 메시지 목록

```
useMessagesRealtime(chatRoomId)
        │
        └─ onSnapshot(chatRooms/{roomId}/messages)
            - orderBy("createdAt", "asc")
            - limit(50) + 페이지네이션
```

### 9.2 채팅방 목록

```
query(chatRooms, where("members", "array-contains", myUid))
orderBy("lastMessageAt", "desc")
```

---

## 10. 푸시 알림

| 이벤트 | 함수 | 동작 |
|--------|------|------|
| 새 메시지 | onMessageCreated | FCM 푸시 (수신자 제외 발신자) |
| 이벤트 리마인드 | eventReminder | D-1, D-Day 푸시 |

---

## 11. 보안 고려사항

1. **members 검증:** 메시지 전송 시 발신자가 members에 있는지 확인
2. **Firestore Rules:** chatRooms, messages 읽기/쓰기 시 인증 + members 체크
3. **팀 채팅:** 팀 멤버만 접근 가능 (syncTeamChatMembers로 members 동기화)

---

## 12. 관련 파일

| 구분 | 경로 |
|------|------|
| 채팅방 보장 | src/services/chat/ensureTeamChatRoom.ts |
| 팀 채팅 생성 | src/lib/team/createTeamChatRoom.ts |
| 메시지 전송 | src/lib/chat/sendMessageCommon.ts |
| 실시간 메시지 | src/features/chat/hooks/useMessagesRealtime.ts |
| 채팅방 목록 | src/features/chat/hooks/useChatRoom.ts |
| onTeamCreated | functions/src/team/onTeamCreated.ts |
| onEventCreated | functions/src/team/onEventCreated.ts |
| onNoticeCreated | functions/src/team/onNoticeCreated.ts |
| syncTeamChatMembers | functions/src/team/syncTeamChatMembers.ts |
| onMessageCreated | functions/src/chat/onMessageCreated.ts |
| onChatRoomCreated | functions/src/market/ranking.ts |

---

*마지막 갱신: 프로젝트 코드베이스 기준*
