# 🔄 SaaS 구조 마이그레이션 체크리스트

## 📋 현재 상태 점검

### ✅ 이미 구현된 부분

1. **Firestore 구조**
   - ✅ `associations/{associationId}/tournaments/{tournamentId}` 구조 사용 중
   - ✅ `applications` 컬렉션이 `tournaments` 하위에 위치
   - ✅ `rosters/{applicationId}/players` 구조 사용 중

2. **권한 모델**
   - ✅ `isAssociationAdmin(associationId)` 함수 존재
   - ✅ `associations/{associationId}/admins/{uid}` 구조 사용 중
   - ✅ `adminUids` 맵 구조 사용 중

3. **데이터 모델**
   - ✅ `TournamentApplication`에 `associationId`, `tournamentId` 포함
   - ✅ Cloud Functions에서 `associationId` 파라미터 사용

### ⚠️ 보완 필요한 부분

1. **Firestore Rules**
   - ⚠️ `associationId` 일치 검증 강화 필요
   - ⚠️ `collectionGroup` 쿼리 시 `associationId` 필터 추가 필요

2. **URL 구조**
   - ⚠️ 현재: `/association/{associationId}/admin/tournaments/{tournamentId}`
   - ✅ 권장: `/admin/{associationId}/competitions/{tournamentId}` (더 SaaS스럽게)

3. **권한 모델**
   - ⚠️ SUPER_ADMIN 역할 정의 필요
   - ⚠️ Custom Claims에 역할 정보 포함 필요

---

## 🔧 마이그레이션 작업

### 1. Firestore Rules 보강

**현재:**
```javascript
function isAssociationAdmin(associationId) {
  return request.auth != null && (
    exists(/databases/$(database)/documents/associations/$(associationId)/admins/$(request.auth.uid)) ||
    // adminUids 체크
  );
}
```

**보강:**
```javascript
// 플랫폼 관리자 확인
function isSuperAdmin() {
  return request.auth != null &&
    exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "SUPER_ADMIN";
}

// associationId 일치 검증
function hasMatchingAssociationId(associationId) {
  return request.resource.data.associationId == associationId;
}
```

### 2. collectionGroup 쿼리 보강

**현재:**
```typescript
// 모든 applications 조회 (협회 구분 없음)
const applicationsSnap = await db
  .collectionGroup("applications")
  .where("status", "==", "approved")
  .get();
```

**보강:**
```typescript
// 특정 협회의 applications만 조회 (가능하면)
// 또는 collectionGroup 사용 시 associationId 필터 추가
const applicationsSnap = await db
  .collectionGroup("applications")
  .where("status", "==", "approved")
  .where("associationId", "==", associationId) // 필터 추가
  .get();
```

### 3. URL 구조 개선 (선택)

**현재:**
```
/association/{associationId}/admin/tournaments/{tournamentId}
```

**권장:**
```
/admin/{associationId}/competitions/{tournamentId}
```

**이유:**
- 더 SaaS스러운 구조
- `/admin`으로 관리자 영역 명확히 구분
- `competitions`가 `tournaments`보다 일반적인 용어

---

## ✅ 검증 체크리스트

### 데이터 격리 검증

- [ ] 협회 A의 관리자가 협회 B의 데이터에 접근 불가능한지 확인
- [ ] 일반 사용자가 다른 협회의 데이터에 접근 불가능한지 확인
- [ ] `collectionGroup` 쿼리 시 `associationId` 필터가 적용되는지 확인

### 권한 검증

- [ ] `isAssociationAdmin` 함수가 정확히 동작하는지 확인
- [ ] SUPER_ADMIN 역할이 전체 데이터에 접근 가능한지 확인
- [ ] Custom Claims에 역할 정보가 포함되는지 확인

### 코드 검증

- [ ] 모든 Cloud Function에서 `associationId` 검증하는지 확인
- [ ] 모든 프론트엔드 쿼리에서 `associationId` 컨텍스트 유지하는지 확인
- [ ] URL에서 `associationId`를 추출할 때 권한 확인하는지 확인

---

## 🚀 다음 단계

1. **Firestore Rules 보강** (우선순위: 높음)
2. **collectionGroup 쿼리 보강** (우선순위: 높음)
3. **SUPER_ADMIN 역할 추가** (우선순위: 중간)
4. **URL 구조 개선** (우선순위: 낮음, 선택)

---

**🔥 이 체크리스트를 완료하면 멀티 테넌트 SaaS 구조가 완성됩니다.**
