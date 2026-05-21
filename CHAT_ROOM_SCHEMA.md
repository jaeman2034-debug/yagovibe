# 🔥 Chat Room 문서 스키마 최종본

## 📋 공통 필드 (Trade + Recruit 공통)

```typescript
{
  // 🔥 타입 구분 (필수)
  type: "trade" | "recruit_group";
  
  // 🔥 참여자 관리 (필수)
  participants: string[]; // 참여자 UID 배열
  members: string[]; // participants와 동일 (하위 호환)
  roles: { [uid: string]: string }; // 역할 매핑
  
  // 🔥 방 상태 (P1-2: 통일)
  status: "active" | "closed" | "archived" | "blocked";
  
  // 🔥 메시지 관리
  lastMessage: string; // 마지막 메시지 텍스트
  lastMessageAt: Timestamp; // 마지막 메시지 시간
  lastMessageSeq: number; // 마지막 메시지 seq (읽음 상태 계산용)
  
  // 🔥 읽음 상태
  unreadCount: { [uid: string]: number }; // 사용자별 읽지 않은 메시지 수
  read: { [uid: string]: { lastReadSeq: number; lastReadAt: Timestamp } }; // 읽음 상태 상세
  
  // 🔥 타임스탬프
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

---

## 🔵 Trade 방 전용 필드

```typescript
{
  // 🔥 Trade 식별자
  productId: string; // 상품 ID
  buyerId: string; // 구매자 UID
  sellerId: string; // 판매자 UID
  
  // 🔥 상품 스냅샷 (모집글 삭제되어도 표시 가능)
  productSnapshot: {
    productId: string;
    title: string;
    price: number;
    imageUrl: string;
    location: string;
    category: string;
    status: "ACTIVE" | "RESERVED" | "SOLD" | "DELETED";
  } | null;
}
```

### Trade Room ID 형식
```
trade_${productId}_${sortedUserIds}
```
예: `trade_abc123_buyerId_sellerId` (user ID 정렬)

---

## 🟢 Recruit 방 전용 필드

```typescript
{
  // 🔥 Recruit 식별자
  postId: string; // 모집글 ID
  authorId: string; // 작성자 UID (host)
  
  // 🔥 모집글 스냅샷 (모집글 삭제되어도 표시 가능)
  postSnapshot: {
    postId: string;
    authorId: string;
    title: string;
    category: string;
    location: string;
    time: string;
    maxPeople: number;
    currentPeople: number;
    status: "OPEN" | "CLOSED";
    imageUrl: string;
    postDeletedAt: Timestamp | null; // 모집글 삭제 시 업데이트
  } | null;
}
```

### Recruit Room ID 형식
```
recruit_${postId}
```
예: `recruit_xyz789`

---

## 🔥 Roles 매핑

### Trade 방
```typescript
roles: {
  [sellerId]: "seller",
  [buyerId]: "buyer"
}
```

### Recruit 방
```typescript
roles: {
  [authorId]: "host", // 작성자
  [adminUid]: "admin", // 관리자 (선택)
  [memberUid]: "member" // 일반 멤버
}
```

---

## 📝 생성 규칙

### Trade 방
- **생성 위치**: 클라이언트 (`src/lib/chat/room.ts`)
- **생성 함수**: `ensureChatRoom()`
- **Rules**: 클라이언트 생성 허용 (검증 포함)

### Recruit 방
- **생성 위치**: 서버 (`functions/src/market/chatRoomService.ts`)
- **생성 함수**: `connectRecruitGroup()` (트랜잭션 기반)
- **Rules**: 클라이언트 생성 차단 (`allow create: if false`)

---

## 🔒 보안 규칙 요약

### 읽기
- 로그인 사용자 모두 허용 (`request.auth != null`)

### 생성
- **Trade**: 클라이언트 허용 (검증 포함)
- **Recruit**: 서버만 (`allow create: if false`)

### 업데이트
- **Trade**: 참여자만, 불변 필드 보호
- **Recruit**: 
  - participants 변경: host/admin만
  - roles 변경: host만
  - 일반 필드: 참여자면 가능

### 삭제
- 금지 (`allow delete: if false`)

---

## 🎯 마이그레이션 체크리스트

- [ ] 기존 Trade 방에 `type: "trade"` 추가
- [ ] 기존 Recruit 방에 `type: "recruit_group"` 추가
- [ ] 기존 Recruit 방에 `postSnapshot` backfill
- [ ] 기존 방에 `status` 필드 추가 (기본값: "active")
- [ ] 기존 방에 `members` 필드 추가 (participants 복사)

---

## 📚 참고 파일

- **서버 생성**: `functions/src/market/chatRoomService.ts`
- **클라이언트 생성**: `src/lib/chat/room.ts`
- **Rules**: `firestore.rules` (394-413줄)
- **타입 정의**: `src/pages/chat/chat.types.ts`
