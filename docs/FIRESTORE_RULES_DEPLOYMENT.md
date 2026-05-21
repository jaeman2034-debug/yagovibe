# 🔥 Firestore Rules 배포 가이드

## 문제

**"Missing or insufficient permissions"** 에러가 계속 발생

## 원인

Firestore Rules가 아직 옛날 상태이거나 배포되지 않음

## 해결 방법

### 1️⃣ Rules 파일 확인

`firestore.rules` 파일이 아래 구조인지 확인:

```javascript
match /chats/{chatId} {
  // 🔥 생성: buyerId 또는 sellerId가 현재 사용자면 생성 가능
  allow create: if isSignedIn() && (
    request.auth.uid == request.resource.data.buyerId ||
    request.auth.uid == request.resource.data.sellerId
  );
  
  // 읽기/수정: 참여자만 가능
  allow read, update: if isSignedIn() && (
    request.auth.uid == resource.data.buyerId ||
    request.auth.uid == resource.data.sellerId ||
    request.auth.uid in resource.data.get('participants', [])
  );
}
```

### 2️⃣ Rules 배포 (필수!)

**로컬 개발:**
```bash
# Firebase CLI로 배포
firebase deploy --only firestore:rules
```

**또는 Firebase Console:**
1. Firebase Console → Firestore Database → Rules 탭
2. `firestore.rules` 파일 내용 복사
3. 붙여넣기 → **Publish** 클릭

⚠️ **중요:** 저장만 하면 안 됨. 반드시 **Publish** 버튼 클릭!

### 3️⃣ 채팅 생성 코드 확인

`ProductDetail.tsx`의 `handleChat` 함수에서:

```typescript
await setDoc(chatRef, {
  buyerId: user.uid,        // 🔥 현재 로그인한 사용자 (구매자)
  sellerId: sellerId,       // 🔥 상품 판매자
  participants: [user.uid, sellerId], // 🔥 필수!
  productId: product.id,    // 🔥 쿼리용
  // ...
});
```

### 4️⃣ 임시 디버그 Rules (30초 테스트용)

Rules가 문제인지 확정하려면:

```javascript
match /chats/{chatId} {
  allow create: if request.auth != null; // 🔥 임시로 모두 허용
  allow read, write: if request.auth != null;
}
```

이 상태에서 채팅 생성되면 → **100% Rules 문제 확정**

⚠️ 테스트 후 반드시 원래 Rules로 되돌리기!

## 테스트 시나리오

### 정상 테스트 (반드시 이렇게!)

1. 계정 A 로그인
2. 상품 등록 (자동으로 userId=A)
3. 로그아웃
4. 계정 B 로그인
5. 상품 상세 → 판매자와 채팅하기
6. ✅ 채팅방 생성 성공

### 잘못된 테스트 (이렇게 하면 안 됨)

❌ 같은 계정으로 상품 보고 채팅 누르기  
❌ Firestore에서 userId만 수동으로 바꾸기

## 배포 후 확인

1. Firebase Console → Firestore → Rules 탭
2. 최신 Rules가 배포되었는지 확인
3. 브라우저 새로고침 후 다시 테스트

## 결과

✅ Rules 배포 완료  
✅ 채팅 생성 정상  
✅ 권한 문제 해결

