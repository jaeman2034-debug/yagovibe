# 🔥 협회 관리자 Custom Claims 설정 가이드

## 문제 상황
- 클라이언트: `isAdmin: true` ✅
- Firestore Rules: 권한 오류 ❌
- 원인: Custom Claims 미설정

## 해결 방법

### 1. Cloud Function 호출 (권장)

#### 클라이언트에서 호출
```typescript
import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();
const setAdminFn = httpsCallable(functions, "setAssociationAdminCallable");

await setAdminFn({
  uid: "iUZB8RjKlEhb3uotZ6yqtpWtUQE2",
  associationId: "assoc-nowon-football"
});
```

#### Firebase Console에서 직접 실행
1. Firebase Console > Functions
2. `setAssociationAdminCallable` 선택
3. 테스트 탭에서 실행:
```json
{
  "uid": "iUZB8RjKlEhb3uotZ6yqtpWtUQE2",
  "associationId": "assoc-nowon-football"
}
```

### 2. 필수 단계 (권한 부여 후)

1. **로그아웃** (중요!)
2. **다시 로그인** (토큰 재발급 필수)
3. **확인**:
```typescript
const tokenResult = await firebase.auth().currentUser?.getIdTokenResult();
console.log(tokenResult?.claims); 
// { role: "ADMIN", associationId: "assoc-nowon-football" }
```

### 3. 결과

이제 다음이 모두 통과합니다:
- ✅ `isTournamentAdmin()` (Custom Claims 기반)
- ✅ `isAssociationAdmin()` (adminUids 기반)
- ✅ 대회 게시 정상 작동

## 대안: Firestore Rules 수정 (선택)

만약 Custom Claims를 사용하지 않으려면, Rules를 수정할 수 있습니다:

```javascript
// 현재 (adminUids 배열 체크)
function isAssociationAdmin(associationId) {
  return request.auth != null &&
    exists(/databases/$(database)/documents/associations/$(associationId)) &&
    get(/databases/$(database)/documents/associations/$(associationId)).data.adminUids is list &&
    request.auth.uid in get(/databases/$(database)/documents/associations/$(associationId)).data.adminUids;
}

// 대안 (admins 서브컬렉션 체크)
function isAssociationAdmin(associationId) {
  return request.auth != null &&
    exists(/databases/$(database)/documents/associations/$(associationId)/admins/$(request.auth.uid));
}
```

하지만 **Custom Claims 방식이 더 권장**됩니다.

