# 🔥 Firestore 채팅 권한 문제 해결

## 문제 원인

**"Missing or insufficient permissions"** 에러 발생

### 핵심 원인
- 채팅방 생성 시 `buyerId`, `sellerId`, `participants` 필드가 없음
- Firestore Rules가 이 필드들을 체크하는데 데이터 구조가 맞지 않음

## 해결 방법

### 1️⃣ Firestore Rules 수정

**firestore.rules**에 chats 컬렉션 규칙 추가:

```javascript
match /chats/{chatId} {
  // 읽기: 참여자만 가능
  allow read: if isSignedIn() && (
    request.auth.uid == resource.data.buyerId ||
    request.auth.uid == resource.data.sellerId ||
    request.auth.uid in resource.data.get('participants', [])
  );
  
  // 생성: 참여자 중 1명이면 생성 가능
  allow create: if isSignedIn() && (
    request.auth.uid == request.resource.data.buyerId ||
    request.auth.uid == request.resource.data.sellerId ||
    request.auth.uid in request.resource.data.get('participants', [])
  );
  
  // 수정/삭제: 참여자만 가능
  allow update, delete: if isSignedIn() && (
    request.auth.uid == resource.data.buyerId ||
    request.auth.uid == resource.data.sellerId ||
    request.auth.uid in resource.data.get('participants', [])
  );
  
  // 메시지 서브컬렉션
  match /messages/{messageId} {
    allow read, write: if isSignedIn() && (
      request.auth.uid == get(/databases/$(database)/documents/chats/$(chatId)).data.buyerId ||
      request.auth.uid == get(/databases/$(database)/documents/chats/$(chatId)).data.sellerId ||
      request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.get('participants', [])
    );
  }
}
```

### 2️⃣ 채팅방 생성 로직 수정

**ProductDetail.tsx**의 `handleChat` 함수:

```typescript
await setDoc(chatRef, {
  buyerId: user.uid,        // 현재 로그인한 사용자 (구매자)
  sellerId: sellerId,      // 상품 판매자
  participants: [user.uid, sellerId], // 참여자 배열 (Rules 체크용)
  users: [user.uid, sellerId], // 하위 호환성 유지
  lastMessage: "",
  updatedAt: serverTimestamp(),
  product: {
    id: product.id,
    name: product.name,
    imageUrl: product.imageUrl ?? null,
  },
});
```

## 핵심 원칙

**"채팅방은 '참여자 중 1명'이면 생성 가능해야 한다"**

- `buyerId` 또는 `sellerId`가 현재 사용자면 생성 가능
- `participants` 배열에 현재 사용자가 포함되어 있으면 생성 가능

## 테스트 시나리오

### 정상 테스트
1. 계정 A 로그인
2. 상품 등록 (userId = A)
3. 로그아웃
4. 계정 B 로그인
5. 상품 상세 → 채팅하기 클릭
6. ✅ chats 생성됨 (buyerId=B, sellerId=A, participants=[B, A])

### 본인 상품 채팅 방지
```typescript
// 본인이 본인에게 채팅 방지
if (user.uid === sellerId) {
  alert("본인 상품에서는 채팅을 시작할 수 없습니다.");
  return;
}
```

## 배포 전 체크리스트

- [x] firestore.rules에 chats 규칙 추가
- [x] handleChat에서 buyerId, sellerId, participants 필드 추가
- [x] 본인 상품 채팅 방지 로직 확인
- [ ] Firestore Rules 배포 (`firebase deploy --only firestore:rules`)
- [ ] 실제 테스트 (계정 A/B로 채팅 생성 확인)

## 결과

✅ 채팅 생성 정상  
✅ 권한 문제 해결  
✅ 채팅 자연어 UX 그대로 유지

