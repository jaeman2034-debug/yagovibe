# 🔥 협회 관리자 Custom Claims 설정 가이드

## 문제 원인 (확정)

- **클라이언트**: `useIsAssociationAdmin` → `isAdmin: true` ✅
- **Firestore Rules**: `isTournamentAdmin()` → `request.auth.token.role` 없음 ❌
- **결과**: `Missing or insufficient permissions`

## 해결 방법

### 방법 1: Firebase Console에서 실행 (가장 쉬움)

1. **Firebase Console 접속**
   - https://console.firebase.google.com/project/yago-vibe-spt/functions

2. **Functions 선택**
   - 좌측 메뉴에서 "Functions" 클릭

3. **`setAssociationAdminCallable` 선택**
   - 함수 목록에서 찾기

4. **테스트 탭에서 실행**
   ```json
   {
     "uid": "iUZB8RjKlEhb3uotZ6yqtpWtUQE2",
     "associationId": "assoc-nowon-football"
   }
   ```

5. **결과 확인**
   - 성공 메시지 확인

### 방법 2: 클라이언트에서 호출

```typescript
import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();
const setAdminFn = httpsCallable(functions, "setAssociationAdminCallable");

try {
  const result = await setAdminFn({
    uid: "iUZB8RjKlEhb3uotZ6yqtpWtUQE2",
    associationId: "assoc-nowon-football"
  });
  console.log("✅ 성공:", result.data);
} catch (error) {
  console.error("❌ 오류:", error);
}
```

## 🔥 필수 단계 (이거 안 하면 100% 실패)

### 1. 로그아웃
```typescript
await firebase.auth().signOut();
```

### 2. 다시 로그인
- 일반 로그인 진행

### 3. 확인
```typescript
const tokenResult = await firebase.auth().currentUser?.getIdTokenResult();
console.log("Custom Claims:", tokenResult?.claims);
// 예상 결과: { role: "ADMIN", associationId: "assoc-nowon-football" }
```

## ✅ 기대 결과

- ✅ `isTournamentAdmin()` 통과 (Custom Claims 기반)
- ✅ `isAssociationAdmin()` 통과 (adminUids 기반)
- ✅ 대회 게시 정상 성공
- ✅ 공지 → 대회 자동 생성 플로우 완전 종료

## 🧠 참고: 대안 (선택)

### 방법 2: Rules를 adminUids 문서 기준으로 변경

만약 Custom Claims를 사용하지 않으려면:

```javascript
// firestore.rules
function isAssociationAdmin(associationId) {
  return request.auth != null &&
    exists(/databases/$(database)/documents/associations/$(associationId)/admins/$(request.auth.uid));
}
```

하지만 **Custom Claims 방식이 더 권장**됩니다:
- ✅ 확장성
- ✅ 행정/구청 대응
- ✅ 실전 운영 최적

