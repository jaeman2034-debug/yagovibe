# 🏗️ 멀티 대회/협회 SaaS 아키텍처 (v1.1)

## 📋 개요

이 시스템은 **멀티 테넌트 SaaS 구조**로 설계되어 있습니다.

**핵심 원칙:**
- Association(협회)이 최상위 엔티티
- 모든 하위 데이터는 `associationId`를 포함
- 협회 간 데이터 완전 분리
- 동일한 코드베이스로 무제한 확장 가능

---

## 🎯 아키텍처 계층

### 데이터 계층 구조

```
Association (협회) - 최상위 엔티티
 └ Tournament (대회)
    └ Application (참가 신청)
       └ Roster (선수 명단)
          └ Players (선수)
```

### Firestore 컬렉션 구조

```
associations/{associationId}
  - name: string
  - plan: "free" | "pro"
  - createdAt: Timestamp
  - adminUids: { [uid: string]: boolean }

associations/{associationId}/admins/{uid}
  - role: "admin"
  - createdAt: Timestamp

associations/{associationId}/tournaments/{tournamentId}
  - associationId: string (필수)
  - name: string
  - applyStartDate: Date
  - applyEndDate: Date
  - rosterDeadline: Date

associations/{associationId}/tournaments/{tournamentId}/applications/{applicationId}
  - associationId: string (필수)
  - tournamentId: string (필수)
  - teamManagerId: string
  - status: "pending" | "approved" | "rejected"
  - rosterStatus: "draft" | "submitted"

associations/{associationId}/tournaments/{tournamentId}/rosters/{applicationId}/players/{playerId}
  - associationId: string (필수, 상속)
  - tournamentId: string (필수, 상속)
  - applicationId: string (필수, 상속)
  - name: string
  - birthDate: Date
  - position?: string
  - phone?: string
```

**핵심 규칙:**
- 모든 하위 문서는 `associationId`를 포함해야 함
- `associationId`는 상위 컬렉션에서 상속 가능하지만, 명시적으로 포함 권장

---

## 🔐 권한 모델

### 역할 정의

```typescript
enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",        // 플랫폼 운영자 (전체 조회)
  ASSOCIATION_ADMIN = "ASSOCIATION_ADMIN", // 협회 운영자 (자기 협회만)
  USER = "USER"                      // 팀장/참가자 (자기 데이터만)
}
```

### 권한 매트릭스

| 역할 | Association | Tournament | Application | Roster/Players |
|------|-------------|------------|-------------|----------------|
| SUPER_ADMIN | 전체 CRUD | 전체 CRUD | 전체 CRUD | 전체 CRUD |
| ASSOCIATION_ADMIN | 자기 협회만 | 자기 협회만 | 자기 협회만 | 자기 협회만 |
| USER | 읽기 (자기 협회) | 읽기 | 자기 것만 CRUD | 자기 것만 CRUD |

---

## 🛡️ Firestore Rules SaaS 패턴

### 핵심 헬퍼 함수

```javascript
// 협회 관리자 확인
function isAssociationAdmin(associationId) {
  return request.auth != null &&
    exists(
      /databases/$(database)/documents/associations/$(associationId)/admins/$(request.auth.uid)
    );
}

// 플랫폼 관리자 확인
function isSuperAdmin() {
  return request.auth != null &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "SUPER_ADMIN";
}

// 데이터가 특정 협회에 속하는지 확인
function belongsToAssociation(associationId) {
  return resource.data.associationId == associationId;
}
```

### Rules 예시

```javascript
// Tournament 읽기: 협회 관리자 또는 플랫폼 관리자
match /associations/{associationId}/tournaments/{tournamentId} {
  allow read: if
    isAssociationAdmin(associationId) ||
    isSuperAdmin() ||
    isSignedIn(); // 공개 대회는 모두 읽기 가능
}

// Application 생성: 로그인한 사용자 (자기 associationId만)
match /associations/{associationId}/tournaments/{tournamentId}/applications/{applicationId} {
  allow create: if
    isSignedIn() &&
    request.resource.data.associationId == associationId &&
    request.resource.data.tournamentId == tournamentId;
}
```

---

## 🌐 URL 구조 (SaaS화)

### 사용자 경로

```
/a/{associationSlug}/competitions/{competitionId}
  → 대회 상세 (공개)

/my/applications/{applicationId}
  → 내 참가 신청 상세

/my/applications/{applicationId}/roster
  → 선수 명단 관리
```

### 관리자 경로

```
/admin/{associationId}
  → 협회 관리 대시보드

/admin/{associationId}/competitions
  → 대회 목록

/admin/{associationId}/competitions/{tournamentId}
  → 대회 관리 (탭: 신청 목록, 선수 명단, 납부 관리 등)

/admin/{associationId}/competitions/{tournamentId}/applications
  → 참가 신청 관리
```

### 플랫폼 관리자 경로

```
/platform/associations
  → 전체 협회 목록

/platform/associations/{associationId}
  → 협회 상세 (전체 데이터 조회)
```

---

## 📊 데이터 격리 보장

### 1. 쿼리 레벨 격리

**❌ 잘못된 예:**
```typescript
// 모든 대회 조회 (협회 구분 없음)
const tournaments = await getDocs(collection(db, "tournaments"));
```

**✅ 올바른 예:**
```typescript
// 특정 협회의 대회만 조회
const tournaments = await getDocs(
  collection(db, `associations/${associationId}/tournaments`)
);
```

### 2. Cloud Functions 레벨 격리

모든 Cloud Function은 `associationId`를 파라미터로 받고, 해당 협회의 데이터만 조회:

```typescript
export const approveApplicationCallable = onCall(async (request) => {
  const { associationId, tournamentId, applicationId } = request.data;
  
  // associationId 검증
  if (!associationId) {
    throw new HttpsError("invalid-argument", "associationId가 필요합니다.");
  }
  
  // 해당 협회의 데이터만 조회
  const appRef = db.doc(
    `associations/${associationId}/tournaments/${tournamentId}/applications/${applicationId}`
  );
  // ...
});
```

### 3. 프론트엔드 레벨 격리

모든 데이터 조회는 `associationId` 컨텍스트 내에서:

```typescript
// useParams 또는 props로 associationId 받기
const { associationId } = useParams();

// 해당 협회의 데이터만 조회
const tournamentsRef = collection(
  db,
  `associations/${associationId}/tournaments`
);
```

---

## 🔧 마이그레이션 가이드

### 기존 데이터 마이그레이션 (필요 시)

만약 기존에 `associationId`가 없는 데이터가 있다면:

```typescript
// 마이그레이션 스크립트 예시
async function migrateToMultiTenant() {
  const defaultAssociationId = "default-association";
  
  // 모든 tournament에 associationId 추가
  const tournamentsSnap = await db.collectionGroup("tournaments").get();
  
  for (const doc of tournamentsSnap.docs) {
    const data = doc.data();
    if (!data.associationId) {
      await doc.ref.update({
        associationId: defaultAssociationId,
      });
    }
  }
}
```

---

## 🚀 확장성

### 협회 추가 시

1. `associations/{newAssociationId}` 문서 생성
2. 관리자 추가: `associations/{newAssociationId}/admins/{uid}` 생성
3. 끝. 코드 변경 없음.

### 플랜별 기능 제한 (v2)

```typescript
// associations/{associationId}
{
  plan: "free" | "pro",
  limits: {
    maxTournaments: 5,      // free: 5, pro: 무제한
    maxApplications: 100,   // free: 100, pro: 무제한
    maxPlayers: 1000,       // free: 1000, pro: 무제한
  }
}
```

---

## ⚠️ 주의사항

1. **associationId 검증 필수:** 모든 Cloud Function과 쿼리에서 `associationId` 검증 필수
2. **Rules 테스트:** 각 협회의 데이터가 다른 협회에서 접근 불가능한지 테스트
3. **collectionGroup 주의:** `collectionGroup` 쿼리 사용 시 `associationId` 필터 필수
4. **URL 보안:** `associationId`를 URL에 노출할 때 권한 확인 필수

---

## 📝 체크리스트

SaaS 구조 완성 확인:

- [ ] 모든 문서에 `associationId` 포함
- [ ] Firestore Rules에서 `associationId` 기준 권한 체크
- [ ] Cloud Functions에서 `associationId` 검증
- [ ] 프론트엔드에서 `associationId` 컨텍스트 유지
- [ ] URL 구조 SaaS화
- [ ] 권한 모델 문서화

---

**🔥 이 구조가 완성되면 협회 1곳 → 100곳으로 선형 확장이 가능합니다.**
