# 🔥 Firestore Rules 완전 수정 가이드

## ❌ 현재 문제 요약

### 1. FCM 토큰 저장 방식 불일치

**코드 (`registerFcmToken.ts`):**
```typescript
// users/{uid} 문서의 fcmTokens 배열 필드로 저장
const userRef = doc(db, "users", uid);
await setDoc(userRef, { fcmTokens: [] }, { merge: true });
await updateDoc(userRef, {
  fcmTokens: arrayUnion(token),
});
```

**현재 Rules:**
- `users/{uid}` 문서 update 규칙: ✅ 있음
- `users/{uid}/fcmTokens/{tokenId}` 서브컬렉션 규칙: ✅ 있음
- **하지만 배열 필드 업데이트가 제대로 작동하지 않을 수 있음**

### 2. PostLoginGate 권한 문제

**코드 (`PostLoginGate.tsx`):**
```typescript
const userRef = doc(db, "users", user.uid);
await updateDoc(userRef, {
  lastLoginAt: serverTimestamp(),
});
```

**현재 Rules:**
- `users/{uid}` update 규칙이 있지만, `resource.exists` 체크가 문제일 수 있음

### 3. activityLogs 권한

**현재 Rules:**
```javascript
match /activityLogs/{logId} {
  allow write: if false; // 🔥 서버 only
}
```

**문제:**
- 클라이언트에서 직접 쓰려고 하면 실패
- 하지만 dual write가 서버에서 이루어지므로 이건 정상

---

## ✅ 완전 수정된 Rules

### 핵심 수정 사항

1. **`users/{uid}` 문서 업데이트 규칙 개선**
   - `setDoc` with `merge: true` 완전 지원
   - `fcmTokens` 배열 필드 업데이트 허용
   - `lastLoginAt` 업데이트 허용

2. **FCM 토큰 저장 방식 통일**
   - 배열 필드 방식 지원 (현재 코드와 일치)
   - 서브컬렉션 방식도 지원 (향후 확장용)

---

## 🔧 수정된 Rules 코드

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function isGlobalAdmin() {
      return isSignedIn()
        && exists(/databases/$(database)/documents/users/$(request.auth.uid))
        && (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "ADMIN"
            || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin");
    }

    /* 🔥 Users - 핵심 수정 */
    match /users/{userId} {
      // 읽기: 본인 또는 관리자
      allow read: if request.auth != null && (
        (request.auth.uid == userId && (!resource.data.status || resource.data.status != "deleted")) ||
        isGlobalAdmin()
      );
      
      // 생성: 본인만 (setDoc with merge: true 지원)
      allow create: if request.auth != null && request.auth.uid == userId;
      
      // 수정: 본인만 (fcmTokens, lastLoginAt 등 모든 필드 업데이트 허용)
      allow update: if request.auth != null 
        && request.auth.uid == userId
        && (
          // 케이스 1: 문서가 없거나 (setDoc with merge: true로 생성)
          !resource.exists ||
          // 케이스 2: 문서가 있고 deleted가 아닌 경우
          (!resource.data.status || resource.data.status != "deleted")
        );
      
      // 🔥 FCM 토큰 서브컬렉션 (users/{uid}/fcmTokens/{token})
      // 배열 필드 방식도 지원하지만, 서브컬렉션도 허용
      match /fcmTokens/{tokenId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }

    /* 🔥 Activity Logs - 서버 전용 (클라이언트 직접 쓰기 금지) */
    match /activityLogs/{logId} {
      allow read: if isSignedIn() && (
        resource.data.userId == request.auth.uid ||
        isGlobalAdmin()
      );
      allow write: if false; // 🔥 서버 only (dual write)
    }

    /* 🔥 Event Logs - 클라이언트 쓰기 허용 */
    match /eventLogs/{logId} {
      allow read: if isGlobalAdmin();
      allow create: if isSignedIn();
      allow update, delete: if false;
    }

    // ... 나머지 규칙은 기존과 동일 ...
  }
}
```

---

## 🚀 적용 방법

### 1. Firebase Console에서 직접 수정

1. **Firebase Console → Firestore → Rules 탭**
2. **위의 수정된 `users/{userId}` 규칙으로 교체**
3. **"게시" 클릭**

### 2. 파일로 배포

```bash
# firestore.rules 파일 수정 후
firebase deploy --only firestore:rules
```

---

## ✅ 테스트 체크리스트

### FCM 토큰 저장 테스트

1. **로그인 후 콘솔 확인:**
   ```
   ✅ [registerFcmToken] FCM 토큰 발급 성공
   ✅ [registerFcmToken] FCM 토큰 저장 완료
   ```

2. **Firestore 확인:**
   - `users/{uid}` 문서의 `fcmTokens` 배열 필드에 토큰 추가됨

### PostLoginGate 테스트

1. **로그인 후 콘솔 확인:**
   ```
   ✅ [PostLoginGate] 프로필 확인 성공
   ```

2. **Firestore 확인:**
   - `users/{uid}` 문서의 `lastLoginAt` 필드 업데이트됨

---

## 📝 참고

- `setDoc` with `merge: true`는 문서가 없으면 `create`, 있으면 `update`
- `updateDoc`은 문서가 반드시 있어야 함
- 배열 필드 업데이트는 `arrayUnion`, `arrayRemove` 사용
