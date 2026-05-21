# 🔥 채팅방 분기 구조 문서

## 📋 개요

채팅방은 **타입 기반 분기 구조**로 설계되어 있으며, `type` 필드로 `trade`(중고거래)와 `recruit_group`(모집 단체방)을 구분합니다.

---

## 🏗️ 1. 채팅방 타입 분기

### 1.1 타입 정의

```typescript
type ChatRoomType = "trade" | "recruit_group";
```

### 1.2 타입 판별 로직

**위치:** `src/pages/chat/ChatPage.tsx:302-308`

```typescript
const roomType = useMemo(() => {
  if (!room) return null;
  return room.type || (room.postId ? "recruit_group" : "trade");
}, [room]);

const isRecruitGroup = roomType === "recruit_group";
const isTrade = roomType === "trade";
```

**판별 우선순위:**
1. `room.type` 필드 직접 확인
2. `room.postId` 존재 여부로 판별 (있으면 `recruit_group`)
3. 기본값: `trade`

---

## 🔀 2. 채팅방 생성 분기

### 2.1 통합 진입점

**위치:** `src/lib/chat/connectChatRoom.ts:59-95`

```typescript
export async function connectChatRoom(
  params:
    | {
        type: "trade";
        productId: string;
        buyerId: string;
        sellerId: string;
        productSnapshot?: {...};
      }
    | {
        type: "recruit_group";
        postId: string;
        userId: string;
        authorId: string;
      }
): Promise<string>
```

### 2.2 Trade 채팅방 생성

**위치:** `src/lib/chat/connectChatRoom.ts:15-41`

**특징:**
- **타입:** `"trade"`
- **참여자:** 2명 고정 (buyer + seller)
- **Room ID 형식:** `buildChatRoomId({ productId, buyerId, sellerId })`
- **생성 함수:** `ensureChatRoom()`

**데이터 구조:**
```typescript
{
  type: "trade",
  productId: string,
  buyerId: string,
  sellerId: string,
  participants: [buyerId, sellerId],
  members: [buyerId, sellerId],
  roles: {
    [sellerId]: "seller",
    [buyerId]: "buyer"
  },
  productSnapshot: {...}
}
```

### 2.3 Recruit Group 채팅방 생성

**위치:** `src/lib/chat/connectChatRoom.ts:46-54`

**특징:**
- **타입:** `"recruit_group"`
- **참여자:** 2명 이상 (host + members)
- **Room ID 형식:** `recruit_${postId}`
- **생성 위치:** 서버 트리거 또는 클라이언트 직접 생성

**데이터 구조:**
```typescript
{
  type: "recruit_group",
  postId: string,
  authorId: string,
  participants: string[],
  members: string[],
  roles: {
    [authorId]: "host",
    [userId]: "member"
  },
  status?: "closed" | "active"
}
```

---

## 📍 3. 채팅방 ID 생성 규칙

### 3.1 Trade 채팅방 ID

**위치:** `src/lib/chat/room.ts:buildChatRoomId()`

```typescript
// 형식: ${productId}_${buyerId}_${sellerId}
// 또는 정렬된 형식으로 생성
```

### 3.2 Recruit Group 채팅방 ID

**위치:** `src/lib/chat/connectChatRoom.ts:53`

```typescript
// 형식: recruit_${postId}
const roomId = `recruit_${params.postId}`;
```

---

## 🎯 4. UI 분기 처리

### 4.1 ChatPage 분기

**위치:** `src/pages/chat/ChatPage.tsx`

**주요 분기:**
- `isRecruitGroup`: 모집 단체방 전용 UI
- `isTrade`: 중고거래 전용 UI
- `otherUid`: 중고거래에서 상대방 UID (모집 단체방에서는 사용 안 함)

### 4.2 HostPanel 표시 조건

**위치:** `src/pages/chat/components/HostPanel.tsx:24`

```typescript
if (room.type !== "recruit_group") {
  return null; // 중고거래 방에서는 숨김
}
```

**표시 조건:**
- `room.type === "recruit_group"`
- `room.roles[myUid] === "host"` (호스트만 표시)

---

## 🔐 5. Firestore Rules 분기

**위치:** `firestore.rules:356-388`

### 5.1 공통 규칙

```javascript
match /chatRooms/{roomId} {
  allow read: if request.auth != null;
  
  allow update: if request.auth != null
    && request.auth.uid in resource.data.participants
    && request.resource.data.type == resource.data.type // 타입 변경 금지
    && (
      // Trade 분기
      (resource.data.type == "trade" && ...)
      ||
      // Recruit Group 분기
      (resource.data.type == "recruit_group" && ...)
    );
}
```

### 5.2 Trade 타입 규칙

- `participants`, `buyerId`, `sellerId`, `productId` 변경 금지
- 일반 필드만 업데이트 가능

### 5.3 Recruit Group 타입 규칙

- `participants` 변경: `host` 또는 `admin`만 가능
- `roles` 변경: `host`만 가능
- 일반 필드 업데이트: 참여자면 가능

---

## 🔄 6. 모집 단체방 생성 트리거

### 6.1 승인 시 자동 생성

**위치:** `src/features/market/services/marketJoinService.ts:720-868`

**트리거 조건:**
- `status === "approved"`
- `category === "recruit"` 또는 `type === "recruit"`

**생성 로직:**
1. `roomId = recruit_${postId}` 확인
2. 방이 없으면 생성
3. 방이 있으면 타입 확인:
   - `trade` 또는 `null` → `recruit_group`으로 변환
   - `recruit_group` → 멤버만 추가

### 6.2 클라이언트 응급 생성

**위치:** `src/pages/chat/ChatPage.tsx:414-457`

**조건:**
- 채팅방이 존재하지 않음
- `marketJoins`에서 승인 상태 확인
- `status === "approved"`인데 방이 없으면 즉시 생성

---

## 📊 7. 데이터 필드 비교

| 필드 | Trade | Recruit Group |
|------|-------|---------------|
| `type` | `"trade"` | `"recruit_group"` |
| `productId` | ✅ 필수 | ❌ 없음 |
| `postId` | ❌ 없음 | ✅ 필수 |
| `buyerId` | ✅ 필수 | ❌ 없음 |
| `sellerId` | ✅ 필수 | ❌ 없음 |
| `authorId` | ❌ 없음 | ✅ 필수 |
| `participants` | `[buyerId, sellerId]` | `[authorId, ...members]` |
| `members` | `[buyerId, sellerId]` | `[authorId, ...members]` |
| `roles` | `{seller: "seller", buyer: "buyer"}` | `{authorId: "host", ...: "member"}` |
| `productSnapshot` | ✅ 있음 | ❌ 없음 |
| `status` | ❌ 없음 | `"closed" \| "active"` |

---

## 🚀 8. 주요 사용 위치

### 8.1 채팅방 연결

- **중고거래:** `ProductDetail.tsx` → `connectChatRoom({ type: "trade", ... })`
- **모집:** `MarketPostDetailPage.tsx` → `connectChatRoom({ type: "recruit_group", ... })`

### 8.2 채팅방 목록

**위치:** `src/pages/chat/ChatListPage.tsx`

- `type` 필드로 필터링 가능
- 두 타입 모두 동일한 목록에 표시

### 8.3 채팅방 관리

**위치:** `src/lib/chat/roomManagement.ts`

- `kickMember()`: 모집 단체방 전용
- `closeRecruit()`: 모집 단체방 전용
- `reopenRecruit()`: 모집 단체방 전용
- `transferHost()`: 모집 단체방 전용

---

## ⚠️ 9. 주의사항

1. **타입 변경 금지:** Firestore Rules에서 `type` 필드 변경 차단
2. **하위 호환성:** `participants`와 `members` 필드 모두 유지
3. **Room ID 충돌 방지:** Trade는 `productId` 기반, Recruit는 `recruit_` 접두사 사용
4. **권한 체크:** 모집 단체방은 `roles` 기반, 중고거래는 `participants` 기반

---

## 📝 10. 마이그레이션 가이드

### 기존 Trade 방 → Recruit Group 변환

**위치:** `src/features/market/services/marketJoinService.ts:813-842`

```typescript
if (existingType === "trade" || !existingType) {
  await updateDoc(roomRef, {
    type: "recruit_group",
    postId: String(postId),
    authorId: String(postAfter.authorId),
    participants: newMembers,
    members: newMembers,
    roles: {
      ...(existingData?.roles || {}),
      [String(postAfter.authorId)]: "host",
      [String(joinData.userId)]: "member",
    },
  });
}
```

---

## ✅ 체크리스트

- [x] 타입 분기 로직 (`ChatPage.tsx`)
- [x] 채팅방 생성 분기 (`connectChatRoom.ts`)
- [x] Room ID 생성 규칙
- [x] UI 분기 처리 (`HostPanel.tsx`)
- [x] Firestore Rules 분기
- [x] 모집 단체방 자동 생성 트리거
- [x] 데이터 필드 비교표
- [x] 주요 사용 위치 정리
