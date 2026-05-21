# 🔥 FCM 권한 오류 해결 가이드

## ❌ 문제 상황

```
❌ [registerFcmToken] FCM 토큰 등록 실패: 
FirebaseError: Missing or insufficient permissions
```

---

## 🔍 원인 분석

### 1. FCM 토큰 저장 과정

`registerFcmToken` 함수는 다음 순서로 동작:

```typescript
// 1. 문서 초기화 (없으면 생성)
await setDoc(userRef, { fcmTokens: [] }, { merge: true });

// 2. 토큰 추가
await updateDoc(userRef, {
  fcmTokens: arrayUnion(token),
});
```

### 2. Firestore Rules 체크 과정

#### setDoc with merge: true
- 문서가 **없으면** → `create` 규칙 체크
- 문서가 **있으면** → `update` 규칙 체크

#### updateDoc
- 문서가 **있을 때만** 호출 → `update` 규칙 체크

---

## ✅ 해결 방법

### 1. Firestore Rules 수정

#### Before (문제 있음)
```javascript
allow update: if request.auth != null 
  && request.auth.uid == userId
  && (
    // ❌ !resource.exists는 update 규칙에서 의미 없음
    !resource.exists ||
    (!resource.data.status || resource.data.status != "deleted")
  );
```

#### After (수정됨)
```javascript
allow update: if request.auth != null 
  && request.auth.uid == userId
  && (
    // ✅ 문서가 있고 deleted가 아닌 경우만 허용
    !resource.data.status || resource.data.status != "deleted")
  );
```

**이유:**
- `update` 규칙은 문서가 **존재할 때만** 호출됨
- `!resource.exists` 조건은 논리적으로 불필요
- `setDoc merge: true`는 문서가 없으면 `create` 규칙을 체크하므로 별도 처리 불필요

---

### 2. Rules 배포

```bash
# Firestore Rules만 배포
firebase deploy --only firestore:rules

# 또는 전체 배포
npm run deploy:rules
```

---

## 🧪 테스트 방법

### 1. 브라우저에서 테스트

1. **로그인**
2. **브라우저 콘솔 확인**
   - `✅ [registerFcmToken] FCM 토큰 발급 성공`
   - `✅ [registerFcmToken] FCM 토큰 저장 완료`

3. **Firebase Console 확인**
   - Firestore → `users/{uid}` 문서
   - `fcmTokens` 배열 필드에 토큰이 저장되어 있는지 확인

---

### 2. 에러 확인

**여전히 권한 오류가 발생하면:**

1. **Firebase Console → Firestore → Rules 탭**
   - Rules가 최신 버전으로 배포되었는지 확인

2. **브라우저 콘솔**
   - 정확한 에러 메시지 확인
   - `request.auth.uid`와 `userId`가 일치하는지 확인

3. **사용자 문서 상태 확인**
   - `users/{uid}` 문서가 `deleted` 상태인지 확인
   - `status` 필드가 `"deleted"`로 설정되어 있으면 권한 거부됨

---

## 📋 체크리스트

배포 전:
- [ ] `firestore.rules` 파일 수정 완료
- [ ] Rules 문법 오류 없음 확인
- [ ] `create` 규칙 정상 작동 확인
- [ ] `update` 규칙 정상 작동 확인

배포 후:
- [ ] `firebase deploy --only firestore:rules` 성공
- [ ] 브라우저에서 FCM 토큰 등록 테스트 통과
- [ ] Firebase Console에서 토큰 저장 확인
- [ ] 콘솔 에러 없음 확인

---

## 🎯 예상 결과

### 정상 동작 시

```
✅ [registerFcmToken] FCM 토큰 발급 성공: ...
✅ [registerFcmToken] FCM 토큰 저장 완료: {uid}
```

### 여전히 오류 발생 시

```
❌ [registerFcmToken] FCM 토큰 등록 실패: FirebaseError: Missing or insufficient permissions
```

**추가 확인 사항:**
1. Rules 배포 완료 여부
2. 사용자 문서 `status` 필드 확인
3. `request.auth.uid`와 `userId` 일치 여부

---

## 💡 참고

### setDoc merge: true 동작

```typescript
// 문서가 없을 때
await setDoc(userRef, { fcmTokens: [] }, { merge: true });
// → create 규칙 체크 ✅

// 문서가 있을 때
await setDoc(userRef, { fcmTokens: [] }, { merge: true });
// → update 규칙 체크 ✅
```

### updateDoc 동작

```typescript
// 문서가 있을 때만 호출
await updateDoc(userRef, {
  fcmTokens: arrayUnion(token),
});
// → update 규칙 체크 ✅
```

---

## ✅ 결론

**수정 완료:**
- ✅ `update` 규칙에서 불필요한 `!resource.exists` 조건 제거
- ✅ `create` 규칙은 이미 정상 작동
- ✅ `update` 규칙은 문서가 존재하고 `deleted`가 아닐 때만 허용

**다음 단계:**
1. Rules 배포
2. 브라우저에서 테스트
3. Firebase Console에서 확인
