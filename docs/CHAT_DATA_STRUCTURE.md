# 🔥 채팅 데이터 구조 (서비스형 구조)

## 📊 컬렉션 구조

### 1. chatRooms 컬렉션

```
chatRooms/{roomId}
```

**문서 구조**:
```typescript
{
  // 🔥 참여자 배열 (필수)
  participants: string[];  // [sellerId, buyerId]
  
  // 🔥 통합 모델: members 배열 (하위 호환)
  members?: string[];  // participants와 동일 (접근 제어용)
  
  // 🔥 통합 모델: roles 객체
  roles?: {
    [uid: string]: "seller" | "buyer" | "host" | "member";
  };
  
  // 🔥 채팅방 타입
  type?: "trade" | "recruit_group";
  
  // 🔥 상품 정보 (거래 채팅방)
  productId?: string;
  buyerId?: string;
  sellerId?: string;
  
  // 🔥 모집 정보 (모집 채팅방)
  postId?: string;
  authorId?: string;
  
  // 🔥 마지막 메시지 정보
  lastMessage: string;
  lastMessageAt: Timestamp;
  lastMessageSeq?: number;  // 메시지 시퀀스 번호
  
  // 🔥 읽지 않은 메시지 수 (멤버별)
  unreadCount: {
    [uid: string]: number;
  };
  
  // 🔥 마지막 읽음 시간 (멤버별)
  lastReadAt?: {
    [uid: string]: Timestamp;
  };
  
  // 🔥 상품 스냅샷 (삭제되어도 표시 가능)
  productSnapshot?: {
    productId: string;
    title: string;
    price: number;
    imageUrl: string;
    status: "ACTIVE" | "SOLD" | "DELETED" | "RESERVED";
  };
  
  // 🔥 생성 시간
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

---

### 2. messages 서브컬렉션

```
chatRooms/{roomId}/messages/{messageId}
```

**문서 구조**:
```typescript
{
  // 🔥 메시지 시퀀스 번호
  seq: number;
  
  // 🔥 발신자 ID
  senderId: string;
  
  // 🔥 메시지 내용
  text: string;
  
  // 🔥 메시지 타입
  type: "message" | "system" | "image" | "video" | "location";
  
  // 🔥 시스템 메시지 타입 (type === "system"일 때)
  systemType?: 
    | "offer_price"      // 가격 제안
    | "accept_offer"     // 제안 수락
    | "deal_confirmed"   // 거래 확정
    | "deal_cancelled"   // 거래 취소
    | "notice"           // 공지
    | "schedule_updated" // 일정 변경
    | "member_joined"    // 멤버 입장
    | "member_approved"  // 멤버 승인
    | "role_changed";    // 역할 변경
  
  // 🔥 이미지 정보
  images?: Array<{
    url: string;
    thumbUrl: string;
    width: number;
    height: number;
  }>;
  
  // 🔥 동영상 정보
  videos?: Array<{
    url: string;
    thumbUrl: string;
    duration: number;
    size: number;
  }>;
  
  // 🔥 위치 정보
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  
  // 🔥 STT 메타데이터
  inputMode?: "typing" | "voice";
  stt?: {
    provider: "webSpeech" | "whisper";
    confidence?: number;
    language?: string;
    durationMs?: number;
  };
  
  // 🔥 Optimistic UI: 클라이언트 임시 ID
  clientId?: string;
  clientMessageId?: string;
  
  // 🔥 생성 시간
  createdAt: Timestamp;
}
```

---

## 🔧 핵심 로직

### 1. 채팅방 생성

**위치**: `src/lib/chat/room.ts`

```typescript
// 채팅방 ID 생성 (deterministic)
buildChatRoomId({
  productId: string,
  buyerId: string,
  sellerId: string,
}): string

// 채팅방 생성/재사용
ensureChatRoom({
  chatRoomId: string,
  productId: string,
  buyerId: string,
  sellerId: string,
  productSnapshot?: {...},
}): Promise<string>
```

**규칙**:
- 같은 상품 + 같은 구매자 + 같은 판매자 = 같은 채팅방
- 기존 방이 있으면 재사용 (중복 방 생성 방지)
- `participants` 배열 필수 저장

---

### 2. 메시지 전송

**위치**: `src/lib/chat/sendMessageCommon.ts`

```typescript
sendMessageCommon({
  roomId: string,
  uid: string,
  text: string,
  type?: "message" | "system" | "image" | "video" | "location",
  images?: ChatImage[],
  videos?: ChatVideo[],
  location?: {...},
}): Promise<string>
```

**동작**:
1. `chatRooms/{roomId}/messages` 서브컬렉션에 메시지 추가
2. `chatRooms/{roomId}` 문서 업데이트:
   - `lastMessage`: 마지막 메시지 텍스트
   - `lastMessageAt`: 마지막 메시지 시간
   - `lastMessageSeq`: 메시지 시퀀스 번호 증가
   - `unreadCount.{uid}`: 상대방 unreadCount 증가
   - `lastReadAt.{uid}`: 보낸 사람 읽음 처리

---

### 3. 채팅 목록 조회

**위치**: `src/pages/chat/ChatListPage.tsx`

```typescript
// participants 배열 기준 조회
query(
  collection(db, "chatRooms"),
  where("participants", "array-contains", userId),
  orderBy("lastMessageAt", "desc"),
  limit(50)
)
```

**규칙**:
- `participants` 배열에 사용자 ID가 포함된 채팅방만 조회
- `lastMessageAt` 기준 내림차순 정렬
- 최대 50개 제한

---

## 📋 Firestore 인덱스

**필수 인덱스**:
```json
{
  "collectionGroup": "chatRooms",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "participants", "arrayConfig": "CONTAINS" },
    { "fieldPath": "lastMessageAt", "order": "DESCENDING" }
  ]
}
```

---

## ✅ 구현 상태

- ✅ `chatRooms` 컬렉션 사용
- ✅ `participants` 배열 필수 저장
- ✅ 메시지는 `chatRooms/{roomId}/messages` 서브컬렉션
- ✅ 메시지 저장 시 `chatRooms`의 `lastMessage`, `lastMessageAt` 업데이트
- ✅ 채팅 목록은 `chatRooms` 기준 조회 (`participants` 배열 사용)

---

## 🔄 하위 호환성

현재 구조는 하위 호환성을 유지합니다:
- `members` 배열도 함께 저장 (접근 제어용)
- `buyerId`, `sellerId` 필드 유지 (기존 코드 호환)
- `productSnapshot` 저장 (삭제된 상품도 표시 가능)
