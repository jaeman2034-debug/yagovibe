# 🔥 Custom Claims 디버깅 가이드

## 문제 원인 분석

### 현재 상태
- **클라이언트**: `useIsAssociationAdmin` → `isAdmin: true` ✅
- **Firestore Rules**: `isAssociationAdmin()` → 실패 ❌
- **Custom Claims**: 미설정 또는 토큰 미갱신 ❌

### Firestore Rules 구조

#### 1. `isAssociationAdmin()` (42-48줄)
```javascript
function isAssociationAdmin(associationId) {
  return request.auth != null &&
    exists(/databases/$(database)/documents/associations/$(associationId)) &&
    get(/databases/$(database)/documents/associations/$(associationId)).data.adminUids is list &&
    request.auth.uid in get(/databases/$(database)/documents/associations/$(associationId)).data.adminUids;
}
```
- `adminUids` 배열을 체크
- `get()` 호출 2회 (성능/제한 이슈 가능)

#### 2. `isTournamentAdmin()` (55-57줄)
```javascript
function isTournamentAdmin() {
  return roleIsTournament("ADMIN");
}
```
- Custom Claims의 `role` 체크
- `request.auth.token.role == "ADMIN"`

#### 3. 대회 쓰기 권한 (472줄)
```javascript
allow write: if isSignedIn() && isAssociationAdmin(associationId) && !isLocked(associationId, tournamentId);
```
- **현재**: `isAssociationAdmin()`만 체크
- Custom Claims는 사용하지 않음

## 즉시 해결 방법

### 방법 1: Custom Claims 설정 + 토큰 갱신 (권장)

#### 1-1. 콘솔에서 Claims 확인
```javascript
// 브라우저 콘솔에서 실행
import { getAuth } from "firebase/auth";
const auth = getAuth();
const u = auth.currentUser;

if (!u) {
  console.log("NO USER");
} else {
  const r1 = await u.getIdTokenResult();
  console.log("claims(before force):", r1.claims);
  
  const t = await u.getIdToken(true); // 강제 갱신
  const r2 = await u.getIdTokenResult();
  console.log("claims(after force):", r2.claims);
}
```

**기대값 (정상)**:
```javascript
{
  role: "ADMIN",
  associationId: "assoc-nowon-football"
}
```

#### 1-2. Firebase Console에서 함수 실행
1. Firebase Console → Functions
2. `setAssociationAdminCallable` 선택
3. 테스트 탭에서 실행:
```json
{
  "uid": "iUZB8RjKlEhb3uotZ6yqtpWtUQE2",
  "associationId": "assoc-nowon-football"
}
```

#### 1-3. 필수: 토큰 갱신
- **로그아웃 → 로그인** (가장 확실)
- 또는 `getIdToken(true)` 강제 갱신

### 방법 2: Rules 수정 (Custom Claims 기반으로 통일)

#### 2-1. `isAssociationAdmin()` 수정
```javascript
function isAssociationAdmin(associationId) {
  return request.auth != null && (
    // Custom Claims 우선 체크
    (request.auth.token.role == "ADMIN" && 
     request.auth.token.associationId == associationId) ||
    // 또는 adminUids 배열 체크 (하위 호환)
    (exists(/databases/$(database)/documents/associations/$(associationId)) &&
     get(/databases/$(database)/documents/associations/$(associationId)).data.adminUids is list &&
     request.auth.uid in get(/databases/$(database)/documents/associations/$(associationId)).data.adminUids)
  );
}
```

#### 2-2. 또는 `admins` 서브컬렉션 방식 (가장 안전)
```javascript
function isAssociationAdmin(associationId) {
  return request.auth != null &&
    exists(
      /databases/$(database)/documents/associations/$(associationId)/admins/$(request.auth.uid)
    );
}
```

**필수**: `associations/assoc-nowon-football/admins/{uid}` 문서 생성

## 체크리스트

### ✅ 즉시 확인
- [ ] 임시 저장(DRAFT)으로 전환 → 저장 성공 확인
- [ ] 콘솔에서 `getIdTokenResult()` 실행 → claims 확인
- [ ] claims에 `role: "ADMIN"` 있는지 확인

### ✅ Claims 없으면
- [ ] Firebase Console에서 `setAssociationAdminCallable` 테스트 실행
- [ ] 함수 실행 결과 `success: true` 확인
- [ ] 로그아웃 → 로그인 (토큰 재발급)
- [ ] 다시 `getIdTokenResult()` 확인

### ✅ Claims 있어도 막히면
- [ ] Firestore Rules의 `isAssociationAdmin()` 함수 확인
- [ ] `adminUids` 배열이 실제로 존재하는지 확인
- [ ] Rules를 Custom Claims 기반으로 수정

## 최종 권장 해결책

**옵션 A: Custom Claims + Rules 통일 (권장)**
1. `setAssociationAdminCallable` 실행
2. 로그아웃 → 로그인
3. Rules를 Custom Claims 우선으로 수정

**옵션 B: `admins` 서브컬렉션 방식 (가장 안전)**
1. Rules를 `exists()` 방식으로 수정
2. `associations/{id}/admins/{uid}` 문서 생성
3. 기존 `adminUids` 배열과 병행 사용 가능

