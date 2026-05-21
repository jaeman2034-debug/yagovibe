# 🔥 채팅방 중복 생성 방지 + 기존 방 재사용

## 문제

같은 상품에 대해 채팅방이 중복 생성되는 문제

## 해결 전략

**"productId + buyerId + sellerId 조합으로 기존 채팅방 검색 → 있으면 재사용"**

## 구현

### 1️⃣ 기존 채팅방 검색

```typescript
// 🔥 기존 채팅방 검색 (productId + buyerId + sellerId 조합)
const existingChatsQuery = query(
  collection(db, "chats"),
  where("product.id", "==", product.id),
  where("buyerId", "==", user.uid),
  where("sellerId", "==", sellerId)
);

const existingChatsSnap = await getDocs(existingChatsQuery);

let chatId: string;

// 기존 채팅방이 있으면 재사용
if (!existingChatsSnap.empty) {
  chatId = existingChatsSnap.docs[0].id;
  console.log("✅ 기존 채팅방 재사용:", chatId);
} else {
  // 새 채팅방 생성
  chatId = [user.uid, sellerId].sort().join("_");
  // ...
}
```

### 2️⃣ 채팅방 문서 구조

```typescript
{
  buyerId: string,        // 구매자 UID
  sellerId: string,       // 판매자 UID
  participants: [buyerId, sellerId], // 참여자 배열
  productId: string,      // 🔥 쿼리용 필드 (중요!)
  product: {
    id: string,
    name: string,
    imageUrl: string | null,
  },
  lastMessage: string,
  updatedAt: Timestamp,
  createdAt: Timestamp,
}
```

### 3️⃣ 판매자 본인 채팅 방지 (UX)

```typescript
// UI에서 아예 버튼 비활성화
const canChat = currentUser.uid !== product.userId;

{canChat ? (
  <Button onClick={handleChat}>
    💬 판매자와 채팅하기
  </Button>
) : (
  <Button disabled>
    본인 상품입니다
  </Button>
)}
```

## Firestore 인덱스 필요

다음 쿼리를 위해 복합 인덱스 필요:

```
chats 컬렉션:
- product.id (오름차순)
- buyerId (오름차순)
- sellerId (오름차순)
```

Firebase Console에서 인덱스 생성 요청이 뜨면 클릭해서 생성.

## 테스트 시나리오

### 정상 플로우
1. 계정 A 로그인 → 상품 등록 (userId = A)
2. 로그아웃
3. 계정 B 로그인 → 상품 상세 → 채팅하기
4. ✅ 새 채팅방 생성 (chatId = A_B)
5. 다시 채팅하기 클릭
6. ✅ 기존 채팅방 재사용 (중복 생성 안 됨)

### 본인 상품
1. 계정 A 로그인 → 상품 등록 (userId = A)
2. 상품 상세 페이지
3. ❌ "본인 상품입니다" 버튼 (비활성화)

## 결과

✅ 채팅방 중복 생성 방지  
✅ 기존 채팅방 자동 재사용  
✅ 판매자 본인 채팅 방지  
✅ Firestore Rules 호환

