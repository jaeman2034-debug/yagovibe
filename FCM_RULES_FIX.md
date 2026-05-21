# 🔥 FCM 권한 문제 해결 가이드

## ✅ 현재 상태

- ✅ 퍼널 시스템 정상 동작 (인덱스 해결됨)
- ❌ FCM 토큰 저장 권한 문제

---

## 🔍 문제 분석

### 현재 FCM 토큰 저장 방식

**`src/lib/push/registerFcmToken.ts`** (AuthProvider에서 사용):
```typescript
// users/{uid} 문서에 fcmTokens 배열 필드로 저장
const userRef = doc(db, "users", uid);
await setDoc(userRef, { fcmTokens: [] }, { merge: true });
await updateDoc(userRef, {
  fcmTokens: arrayUnion(token),
});
```

**`src/lib/fcmTokenManager.ts`** (채팅용):
```typescript
// users/{uid}/fcmTokens/{token} 서브컬렉션으로 저장
const tokenRef = doc(db, "users", uid, "fcmTokens", token);
await setDoc(tokenRef, { createdAt: serverTimestamp() }, { merge: true });
```

---

## 🚨 문제 원인

### Firestore Rules 확인

**현재 규칙 (firestore.rules 48-72줄):**
```javascript
match /users/{userId} {
  allow create: if request.auth != null && request.auth.uid == userId;
  allow update: if request.auth != null 
    && request.auth.uid == userId
    && (!resource.data.status || resource.data.status != "deleted");
  
  match /fcmTokens/{tokenId} {
    allow read, write: if request.auth != null && request.auth.uid == userId;
  }
}
```

**문제점:**
1. `setDoc` with `merge: true`는 문서가 없으면 `create`, 있으면 `update`
2. `update` 규칙에서 `resource.data.status` 체크가 있는데, 문서가 없으면 `resource`가 없어서 실패할 수 있음
3. 하지만 실제로는 `allow create` 규칙이 있어야 함

---

## ✅ 해결 방법

### 옵션 1: Firestore Rules 수정 (권장)

**`users/{uid}` 문서의 `fcmTokens` 배열 필드 업데이트 허용:**

```javascript
match /users/{userId} {
  // 읽기: 로그인 유저는 자기 문서 읽기 가능
  allow read: if request.auth != null && (
    (request.auth.uid == userId && (!resource.data.status || resource.data.status != "deleted")) ||
    isGlobalAdmin()
  );
  
  // 생성: 로그인 유저는 자기 문서 생성 가능
  allow create: if request.auth != null && request.auth.uid == userId;
  
  // 수정: 로그인 유저는 자기 문서 수정 가능
  // 🔥 fcmTokens 필드 업데이트는 항상 허용 (문서가 없어도 merge로 생성 가능)
  allow update: if request.auth != null 
    && request.auth.uid == userId
    && (
      // 케이스 1: 문서가 이미 존재하고 deleted가 아닌 경우
      (resource != null && (!resource.data.status || resource.data.status != "deleted")) ||
      // 케이스 2: 문서가 없거나 fcmTokens 필드만 업데이트하는 경우 (merge: true)
      (!resource.exists || request.resource.data.diff(resource.data).affectedKeys().hasOnly(["fcmTokens"]))
    );
  
  // FCM 토큰 서브컬렉션 (users/{uid}/fcmTokens/{token})
  match /fcmTokens/{tokenId} {
    allow read, write: if request.auth != null && request.auth.uid == userId;
  }
}
```

**더 간단한 방법 (권장):**
```javascript
match /users/{userId} {
  allow read: if request.auth != null && (
    (request.auth.uid == userId && (!resource.data.status || resource.data.status != "deleted")) ||
    isGlobalAdmin()
  );
  
  // 생성/수정: 본인 문서는 항상 가능 (fcmTokens 포함)
  allow create, update: if request.auth != null 
    && request.auth.uid == userId
    && (
      // 문서가 없거나 (create)
      !resource.exists ||
      // 문서가 있으면 deleted가 아닌 경우 (update)
      (!resource.data.status || resource.data.status != "deleted")
    );
  
  match /fcmTokens/{tokenId} {
    allow read, write: if request.auth != null && request.auth.uid == userId;
  }
}
```

---

### 옵션 2: FCM 토큰 저장 방식 통일 (더 안전)

**모든 FCM 토큰 저장을 서브컬렉션 방식으로 통일:**

`src/lib/push/registerFcmToken.ts`를 `fcmTokenManager.ts` 방식으로 변경:

```typescript
// users/{uid}/fcmTokens/{token} 서브컬렉션으로 저장
const tokenRef = doc(db, "users", uid, "fcmTokens", token);
await setDoc(
  tokenRef,
  { createdAt: serverTimestamp() },
  { merge: true }
);
```

**장점:**
- 이미 규칙이 있음 (69-72줄)
- 토큰별로 개별 관리 가능
- 중복 토큰 방지 용이

---

### 옵션 3: FCM 기능 일시 비활성화 (퍼널 우선)

**퍼널 완성 후 FCM 처리:**

```typescript
// src/context/AuthProvider.tsx
// FCM 토큰 등록 일시 비활성화
// registerFcmToken(firebaseUser.uid).catch((error) => {
//   console.error("❌ [AuthProvider] FCM 토큰 등록 실패:", error);
// });
```

---

## 🚀 추천 액션

**1단계: Firestore Rules 수정 (옵션 1 - 간단한 방법)**

`firestore.rules`의 `users/{userId}` 규칙을 위의 "더 간단한 방법"으로 수정

**2단계: Firebase Console에서 Rules 배포**

```bash
firebase deploy --only firestore:rules
```

또는 Firebase Console에서 직접 수정

**3단계: 테스트**

- 로그인 후 FCM 토큰 저장 성공 확인
- 콘솔 에러 사라짐 확인

---

## 📝 참고

- 현재 `users/{uid}/fcmTokens/{tokenId}` 서브컬렉션 규칙은 이미 정상
- 문제는 `users/{uid}` 문서의 `fcmTokens` 배열 필드 업데이트
- `setDoc` with `merge: true`는 `create` 또는 `update` 모두 가능해야 함
