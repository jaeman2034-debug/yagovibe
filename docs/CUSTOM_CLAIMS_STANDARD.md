# 🔥 Custom Claims 표준 구조 (확정)

## 표준 Claims 구조

```typescript
{
  role: "ADMIN",                              // 관리자 역할
  associationId: "assoc-nowon-football"      // 협회 ID
}
```

## 사용 위치

### 1. Firestore Rules

```javascript
function isAssociationAdmin(associationId) {
  return request.auth != null && (
    // 방법 1: adminUids 배열 체크 (우선)
    (exists(...) && 
     request.auth.uid in get(...).data.adminUids) ||
    // 방법 2: Custom Claims 체크 (보조)
    (request.auth.token.role != null && 
     request.auth.token.role == "ADMIN" && 
     request.auth.token.associationId == associationId)
  );
}
```

### 2. 클라이언트 코드

```typescript
const tokenResult = await currentUser.getIdTokenResult(true);
const claims = tokenResult.claims;

if (claims.role === "ADMIN" && claims.associationId === associationId) {
  // 관리자
}
```

### 3. Cloud Functions

```typescript
const user = await admin.auth().getUser(uid);
const claims = user.customClaims;

if (claims?.role === "ADMIN" && claims?.associationId === associationId) {
  // 관리자
}
```

## 설정 방법

### 방법 1: Cloud Function 호출 (권장)

```typescript
import { setAssociationAdminClaims } from "@/utils/setAdminClaims";

await setAssociationAdminClaims("USER_UID", "assoc-nowon-football");
```

### 방법 2: Firebase Console에서 직접

```typescript
// Firebase Console → Functions → setAssociationAdminCallable
// 테스트 탭에서 실행:
{
  "uid": "USER_UID",
  "associationId": "assoc-nowon-football"
}
```

## 확인 방법

### 클라이언트에서 확인

```typescript
import { checkCurrentUserClaims } from "@/utils/setAdminClaims";

const claims = await checkCurrentUserClaims();
console.log("Custom Claims:", claims);
// 예상 결과: { role: "ADMIN", associationId: "assoc-nowon-football" }
```

### 브라우저 콘솔에서 확인

```javascript
const auth = firebase.auth();
const user = auth.currentUser;
if (user) {
  const tokenResult = await user.getIdTokenResult(true);
  console.log("Claims:", tokenResult.claims);
}
```

## 중요 사항

1. **토큰 재발급 필요**: Claims 설정 후 로그아웃 → 로그인 필수
2. **표준 구조 준수**: `role: "ADMIN"`, `associationId` 필수
3. **Rules와 일치**: Rules의 Claims 체크 로직과 구조 일치 필수

