# Chat Firestore Schema (채팅 Firestore DB 설계)

> **역할**: 실제 DB 구조·필드 정의 문서 (실서비스 설계 기준)  
> **참고**: `src/lib/chat/room.ts`, `sendMessageCommon.ts`, `CHAT_ARCHITECTURE_VERIFICATION.md`

---

## 1. 컬렉션 구조 요약

| 경로 | 용도 |
|------|------|
| `chatRooms/{roomId}` | 채팅방 메타 (거래 1:1 / 모집 단체방) |
| `chatRooms/{roomId}/messages/{messageId}` | 메시지 (서브컬렉션) |
| `users/{uid}/devices/{deviceId}` | FCM 토큰 (푸시) |
| `users/{uid}/drafts/{roomId}` | **(확장)** 작성 중인 메시지 초안 |

**roomId 규칙**

- 거래: `trade_${productId}_${sortedUserIds}` (buyerId, sellerId 정렬)
- 모집: `teamRecruit_${postId}`

---

## 2. chatRooms/{roomId}

### 2.1 Trade (거래 채팅) — 현재 구현

```json
{
  "productId": "string",
  "buyerId": "string",
  "sellerId": "string",
  "type": "trade",
  "members": ["uid1", "uid2"],
  "participants": ["uid1", "uid2"],
  "roles": { "uid1": "seller", "uid2": "buyer" },
  "lastMessage": "string",
  "lastMessageAt": "Timestamp",
  "lastReadAt": { "uid1": "Timestamp", "uid2": "Timestamp" },
  "unreadCount": { "uid1": 0, "uid2": 1 },
  "createdAt": "Timestamp",
  "status": "open",
  "productSnapshot": {
    "productId": "string",
    "title": "string",
    "price": 0,
    "imageUrl": "string",
    "location": "",
    "category": "",
    "status": "ACTIVE"
  }
}
```

### 2.2 Recruit (모집 단체방) — 현재 구현

- `roomId`: `teamRecruit_{postId}`
- `type`: `"recruit_group"`
- `postId`, `members`, `participants`, `lastMessage`, `lastMessageAt`, `lastReadAt`, `unreadCount` 등 동일 패턴

### 2.3 확장 시 추가 필드 (권장)

```json
{
  "lastMessageSeq": 123,
  "pinnedMessageId": "msg_123",
  "name": "Team Chat",
  "createdBy": "uid_1",
  "membersCount": 4
}
```

- `lastMessageSeq`: 방 내 단조 증가, unread/읽음 계산용 (현재는 메시지 문서의 `seq` 사용)
- `pinnedMessageId`: 상단 고정 메시지
- `name`, `createdBy`, `membersCount`: 그룹방 메타

---

## 3. chatRooms/{roomId}/messages/{messageId}

### 3.1 현재 구현 필드

```json
{
  "seq": 1,
  "senderId": "uid_1",
  "text": "안녕하세요",
  "type": "message",
  "createdAt": "Timestamp",
  "readBy": ["uid_1"],
  "clientId": "client_temp_xxx",
  "clientMessageId": "client_temp_xxx"
}
```

**type**: `"message"` | `"image"` | `"video"` | `"location"` | `"system"`  
**systemType** (시스템 메시지일 때): `"offer_price"` | `"accept_offer"` | `"deal_confirmed"` | `"deal_cancelled"` | `"notice"` | `"schedule_updated"` | `"member_joined"` 등

**미디어**

- `images`: `[{ url, thumbUrl, width, height }]`
- `videos`: `[{ url, thumbUrl, duration, size }]`
- `location`: `{ lat, lng, address? }`

**메타**

- `inputMode`: `"typing"` | `"voice"`
- `stt`: `{ provider, confidence?, language?, durationMs? }`

### 3.2 확장 시 추가 필드 (권장)

```json
{
  "status": "sent",
  "editedAt": null,
  "editVersion": 1,
  "editHistory": [
    { "text": "이전 내용", "editedAt": "Timestamp" }
  ],
  "forwarded": false,
  "originalMessageId": null,
  "originalRoomId": null,
  "reactions": { "👍": ["uid1"], "❤️": ["uid2"] }
}
```

---

## 4. members (참여자·읽음 상태)

### 4.1 현재: room 문서 내 배열

- 참여자 목록: `chatRooms/{roomId}.members` (배열)
- 읽음: `lastReadAt.{uid}`, `unreadCount.{uid}` (room 문서 필드)

### 4.2 확장 권장: 서브컬렉션

경로: `chatRooms/{roomId}/members/{uid}`

```json
{
  "role": "member",
  "joinedAt": "Timestamp",
  "lastReadMessageId": "msg_999"
}
```

- UI: `✓ sent` / `✓✓ read` 표시 시 `lastReadMessageId`로 비교 가능
- 현재 구조와 병행 가능: 기존 `lastReadAt` 유지하고, 확장 시 `members/{uid}` 추가

---

## 5. users/{uid}/drafts/{roomId} (확장)

```json
{
  "text": "안녕하세요..."
}
```

- 작성 중인 메시지 저장, 방별 1개
- `updatedAt` 추가 시 TTL/정리 정책에 활용 가능

---

## 6. Firestore 인덱스

### 6.1 메시지 목록 (필수)

- **컬렉션**: `chatRooms/{roomId}/messages`
- **정렬**: `createdAt` DESC (또는 `seq` DESC)
- **쿼리**: `orderBy("createdAt", "desc").limit(50)` (최신), pagination 시 `startAfter(lastDoc).limit(30)`

`firestore.indexes.json` 예시 (복합 인덱스가 필요하면 에러 로그 기준으로 추가):

```json
{
  "indexes": [
    {
      "collectionGroup": "messages",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

- 서브컬렉션 단일 필드 정렬은 인덱스 없이 동작할 수 있으나, 필터 추가 시 복합 인덱스 필요.

---

## 7. Security Rules 기본 구조

**현재**: `firestore.rules`에 `chatRooms` 규칙이 없음 → **실서비스 전 추가 필수**.

### 7.1 권장 규칙 (members 배열 기준)

```javascript
function isAuthenticated() {
  return request.auth != null;
}

function isChatMember(roomId) {
  return isAuthenticated() &&
    exists(/databases/$(database)/documents/chatRooms/$(roomId)) &&
    request.auth.uid in get(/databases/$(database)/documents/chatRooms/$(roomId)).data.members;
}

match /chatRooms/{roomId} {
  allow read, write: if isChatMember(roomId);
  match /messages/{messageId} {
    allow read: if isChatMember(roomId);
    allow create: if isChatMember(roomId) &&
      request.resource.data.senderId == request.auth.uid;
    allow update, delete: if isChatMember(roomId) &&
      resource.data.senderId == request.auth.uid;
  }
}
```

### 7.2 members 서브컬렉션 도입 시

```javascript
function isMember(roomId) {
  return exists(
    /databases/$(database)/documents/chatRooms/$(roomId)/members/$(request.auth.uid)
  );
}
```

- 방 접근: `isMember(roomId)` 또는 기존 `members` 배열 `get()` 조합으로 통일.

---

## 8. 확장 고려 필드 체크리스트

| 분류 | 필드 | 비고 |
|------|------|------|
| 수정 | `editedAt`, `editVersion`, `editHistory` | 메시지 수정·히스토리 |
| 고정 | `pinnedMessageId` | room 문서 |
| 전달 | `forwarded`, `originalMessageId`, `originalRoomId` | 전달 메시지 |
| 반응 | `reactions` | 이모지 리액션 |
| 상태 | `status`, `lastReadMessageId` (member) | sent / read |
| 첨부 | `attachments` | 파일 등 (구조는 별도 정의) |

---

## 9. 관련 문서

- **개요·로드맵**: `CHAT_SYSTEM_FINAL_SUMMARY.md`
- **검증·CF·푸시·UI**: `CHAT_ARCHITECTURE_VERIFICATION.md`
