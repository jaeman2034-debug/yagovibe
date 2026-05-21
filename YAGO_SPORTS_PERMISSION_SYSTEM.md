# 🔐 YAGO SPORTS 권한 시스템 (협회 / 팀 / 사용자)

> **작성일**: 2024년  
> **목적**: YAGO SPORTS 플랫폼의 완전한 권한 관리 시스템 설계

---

## 📋 목차

1. [권한 시스템 개요](#1-권한-시스템-개요)
2. [3단계 권한 구조](#2-3단계-권한-구조)
3. [플랫폼 권한](#3-플랫폼-권한)
4. [협회 권한](#4-협회-권한)
5. [팀 권한](#5-팀-권한)
6. [권한 체크 함수](#6-권한-체크-함수)
7. [Firestore 보안 규칙](#7-firestore-보안-규칙)
8. [권한 우선순위](#8-권한-우선순위)

---

## 1️⃣ 권한 시스템 개요

### YAGO SPORTS = 3단계 권한 구조

```
Platform Level (플랫폼 권한)
  ↓
Association Level (협회 권한)
  ↓
Team Level (팀 권한)
```

### 권한 우선순위

```
SUPER_ADMIN (플랫폼)
  > ORG_ADMIN (협회)
    > TEAM_OWNER (팀)
      > TEAM_ADMIN (팀)
        > TEAM_MEMBER (팀)
          > USER (플랫폼)
```

---

## 2️⃣ 3단계 권한 구조

### 2-1. 플랫폼 권한 (Platform Level)

**위치**: `users/{userId}.role`

**역할**:
- `SUPER_ADMIN`: 플랫폼 전체 관리
- `ADMIN`: 플랫폼 관리 (제한적)
- `USER`: 일반 사용자

**권한**:
- 모든 데이터 접근
- 협회 생성/삭제
- 플랫폼 설정 변경

### 2-2. 협회 권한 (Association Level)

**위치**: `associations/{associationId}.adminUids[]`

**역할**:
- `ORG_ADMIN`: 협회 관리자
- `EVENT_MANAGER`: 대회 관리자
- `STATS_MANAGER`: 통계 관리자
- `VIEWER`: 조회 전용

**권한**:
- 협회 내 모든 데이터 접근
- 대회 생성/관리
- 팀 승인/거부
- 통계 관리

### 2-3. 팀 권한 (Team Level)

**위치**: `teams/{teamId}/members/{userId}.role`

**역할**:
- `owner`: 팀장
- `admin`: 팀 관리자
- `member`: 팀원

**권한**:
- 팀 설정 변경 (owner/admin)
- 멤버 관리 (owner/admin)
- 이벤트 생성 (모든 멤버)
- 공지 작성 (owner/admin)

---

## 3️⃣ 플랫폼 권한

### 3-1. User 스키마

```typescript
// users/{userId}
{
  id: string;
  displayName: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "USER"; // 플랫폼 권한
  globalRole?: "SUPER_ADMIN" | "ADMIN" | "USER"; // 호환성
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 3-2. 플랫폼 권한 체크

```typescript
// src/utils/hasRole.ts
export function isSuperAdmin(user: UserProfile): boolean {
  return user.role?.toUpperCase() === "SUPER_ADMIN" ||
         user.globalRole?.toUpperCase() === "SUPER_ADMIN";
}

export function isAdmin(user: UserProfile): boolean {
  return user.role?.toUpperCase() === "ADMIN" ||
         user.globalRole?.toUpperCase() === "ADMIN";
}

export function isPlatformAdmin(user: UserProfile): boolean {
  return isSuperAdmin(user) || isAdmin(user);
}
```

### 3-3. 플랫폼 권한 상수

```typescript
// src/utils/platformRoleConstants.ts
export const PLATFORM_ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  USER: "USER",
} as const;

export type PlatformRole = typeof PLATFORM_ROLES[keyof typeof PLATFORM_ROLES];
```

---

## 4️⃣ 협회 권한

### 4-1. Association 스키마

```typescript
// associations/{associationId}
{
  id: string;
  name: string;
  region: string;
  adminUids: string[]; // 협회 관리자
  superAdminUids: string[]; // 협회 최고 관리자
  eventManagerUids: string[]; // 대회 관리자
  statsManagerUids: string[]; // 통계 관리자
  viewerUids: string[]; // 조회 전용
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 4-2. Organization Members 스키마

```typescript
// organization_members/{userId}_{associationId}
{
  userId: string;
  associationId: string;
  role: "super_admin" | "org_admin" | "event_manager" | "stats_manager" | "viewer";
  status: "active" | "inactive";
  joinedAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 4-3. 협회 권한 체크

```typescript
// src/utils/hasOrganizationRole.ts
export async function hasOrganizationRole(
  userId: string,
  associationId: string,
  requiredRole: OrganizationRole
): Promise<boolean> {
  const memberRef = doc(
    db,
    "organization_members",
    `${userId}_${associationId}`
  );
  const memberSnap = await getDoc(memberRef);
  
  if (!memberSnap.exists()) return false;
  
  const member = memberSnap.data();
  const roleHierarchy = {
    super_admin: 5,
    org_admin: 4,
    event_manager: 3,
    stats_manager: 2,
    viewer: 1,
  };
  
  return (
    roleHierarchy[member.role] >= roleHierarchy[requiredRole] &&
    member.status === "active"
  );
}
```

### 4-4. 협회 권한 상수

```typescript
// src/utils/organizationRoleConstants.ts
export const ORGANIZATION_ROLES = {
  SUPER_ADMIN: "super_admin",
  ORG_ADMIN: "org_admin",
  EVENT_MANAGER: "event_manager",
  STATS_MANAGER: "stats_manager",
  VIEWER: "viewer",
} as const;

export type OrganizationRole = typeof ORGANIZATION_ROLES[keyof typeof ORGANIZATION_ROLES];
```

---

## 5️⃣ 팀 권한

### 5-1. Team Member 스키마

```typescript
// teams/{teamId}/members/{userId}
{
  uid: string;
  userId: string;
  teamId: string;
  role: "owner" | "admin" | "member"; // 팀 권한
  accessLevel: "OWNER" | "ADMIN" | "STAFF" | "MEMBER"; // 호환성
  status: "active" | "inactive" | "pending";
  position?: string;
  jerseyNumber?: number;
  joinedAt: Timestamp;
  isDeleted: boolean;
}
```

### 5-2. 팀 권한 체크

```typescript
// src/lib/team/permissions.ts
export async function canEditTeam(
  userId: string,
  teamId: string
): Promise<boolean> {
  const memberRef = doc(db, "teams", teamId, "members", userId);
  const memberSnap = await getDoc(memberRef);
  
  if (!memberSnap.exists()) return false;
  
  const member = memberSnap.data();
  return (
    (member.role === "owner" || member.role === "admin") &&
    member.status === "active"
  );
}

export async function canInviteMember(
  userId: string,
  teamId: string
): Promise<boolean> {
  return canEditTeam(userId, teamId);
}

export async function canCreateEvent(
  userId: string,
  teamId: string
): Promise<boolean> {
  const memberRef = doc(db, "teams", teamId, "members", userId);
  const memberSnap = await getDoc(memberRef);
  
  if (!memberSnap.exists()) return false;
  
  const member = memberSnap.data();
  return member.status === "active";
}
```

### 5-3. 팀 권한 상수

```typescript
// src/lib/team/roleConstants.ts
export const TEAM_ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
} as const;

export type TeamRole = typeof TEAM_ROLES[keyof typeof TEAM_ROLES];
```

---

## 6️⃣ 권한 체크 함수

### 6-1. 통합 권한 체크

```typescript
// src/utils/permissions.ts
export async function hasPermission(
  userId: string,
  action: string,
  resource: {
    type: "platform" | "association" | "team";
    id?: string;
  }
): Promise<boolean> {
  // 1. 플랫폼 권한 체크
  const user = await getUser(userId);
  if (isSuperAdmin(user)) return true;
  
  // 2. 협회 권한 체크
  if (resource.type === "association" && resource.id) {
    if (await hasOrganizationRole(userId, resource.id, "org_admin")) {
      return true;
    }
  }
  
  // 3. 팀 권한 체크
  if (resource.type === "team" && resource.id) {
    if (await canEditTeam(userId, resource.id)) {
      return true;
    }
  }
  
  return false;
}
```

### 6-2. 권한 체크 훅

```typescript
// src/hooks/usePermissions.ts
export function useTeamPermissions(teamId: string) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState({
    canEdit: false,
    canInvite: false,
    canCreateEvent: false,
    canDelete: false,
  });
  
  useEffect(() => {
    if (!user || !teamId) return;
    
    const checkPermissions = async () => {
      const [canEdit, canInvite, canCreateEvent, canDelete] = await Promise.all([
        canEditTeam(user.uid, teamId),
        canInviteMember(user.uid, teamId),
        canCreateEvent(user.uid, teamId),
        canDeleteTeam(user.uid, teamId),
      ]);
      
      setPermissions({
        canEdit,
        canInvite,
        canCreateEvent,
        canDelete,
      });
    };
    
    checkPermissions();
  }, [user, teamId]);
  
  return permissions;
}
```

---

## 7️⃣ Firestore 보안 규칙

### 7-1. 플랫폼 권한 규칙

```javascript
// firestore.rules
match /users/{userId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && 
    (request.auth.uid == userId || 
     isSuperAdmin(request.auth));
}

function isSuperAdmin(user) {
  return user != null && 
    get(/databases/$(database)/documents/users/$(user.uid)).data.role == "SUPER_ADMIN";
}
```

### 7-2. 협회 권한 규칙

```javascript
match /associations/{associationId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && 
    (isSuperAdmin(request.auth) ||
     isOrgAdmin(request.auth.uid, associationId));
}

function isOrgAdmin(userId, associationId) {
  return exists(/databases/$(database)/documents/organization_members/$(userId + '_' + associationId)) &&
    get(/databases/$(database)/documents/organization_members/$(userId + '_' + associationId)).data.role in ['super_admin', 'org_admin'];
}
```

### 7-3. 팀 권한 규칙

```javascript
match /teams/{teamId} {
  allow read: if request.auth != null && 
    (resource.data.visibility == "public" || 
     request.auth.uid in resource.data.owners ||
     exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)));
  
  allow create: if false; // Functions only
  allow update: if request.auth != null && 
    (request.auth.uid in resource.data.owners ||
     get(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)).data.role in ['owner', 'admin']);
  
  allow delete: if request.auth != null && 
    request.auth.uid in resource.data.owners;
}

match /teams/{teamId}/members/{memberId} {
  allow read: if request.auth != null && 
    exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid));
  
  allow create: if request.auth != null && 
    (request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.owners ||
     get(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)).data.role in ['owner', 'admin']);
  
  allow update: if request.auth != null && 
    (request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.owners ||
     get(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)).data.role in ['owner', 'admin']);
  
  allow delete: if request.auth != null && 
    request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.owners;
}

match /teams/{teamId}/events/{eventId} {
  allow read: if request.auth != null && 
    exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid));
  
  allow create: if request.auth != null && 
    exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid));
  
  allow update: if request.auth != null && 
    (request.auth.uid == resource.data.createdBy ||
     get(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)).data.role in ['owner', 'admin']);
  
  allow delete: if request.auth != null && 
    (request.auth.uid == resource.data.createdBy ||
     get(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)).data.role in ['owner', 'admin']);
}
```

---

## 8️⃣ 권한 우선순위

### 8-1. 권한 계층 구조

```
Level 1: SUPER_ADMIN (플랫폼)
  ├─ 모든 데이터 접근
  ├─ 협회 생성/삭제
  └─ 플랫폼 설정 변경

Level 2: ORG_ADMIN (협회)
  ├─ 협회 내 모든 데이터 접근
  ├─ 대회 생성/관리
  ├─ 팀 승인/거부
  └─ 통계 관리

Level 3: TEAM_OWNER (팀)
  ├─ 팀 설정 변경
  ├─ 멤버 관리
  ├─ 팀 삭제
  └─ 모든 팀 기능

Level 4: TEAM_ADMIN (팀)
  ├─ 멤버 초대
  ├─ 이벤트 관리
  ├─ 공지 작성
  └─ 팀 설정 일부 변경

Level 5: TEAM_MEMBER (팀)
  ├─ 이벤트 생성
  ├─ 공지 조회
  ├─ 채팅 참여
  └─ 경기 기록 조회

Level 6: USER (플랫폼)
  ├─ 팀 생성
  ├─ 팀 가입 신청
  └─ 공개 데이터 조회
```

### 8-2. 권한 매트릭스

| 액션 | SUPER_ADMIN | ORG_ADMIN | TEAM_OWNER | TEAM_ADMIN | TEAM_MEMBER | USER |
|------|------------|-----------|------------|------------|-------------|------|
| 플랫폼 설정 변경 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 협회 생성 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 대회 생성 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 팀 승인 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 팀 생성 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 팀 설정 변경 | ✅ | ✅ | ✅ | ⚠️ | ❌ | ❌ |
| 멤버 초대 | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| 이벤트 생성 | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 공지 작성 | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| 채팅 참여 | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

---

## 9️⃣ 권한 체크 패턴

### 9-1. 컴포넌트 권한 체크

```typescript
// src/components/team/TeamSettingsButton.tsx
export function TeamSettingsButton({ teamId }: { teamId: string }) {
  const { user } = useAuth();
  const { canEdit } = useTeamPermissions(teamId);
  
  if (!canEdit) return null;
  
  return (
    <button onClick={() => navigate(`/team/${teamId}/settings`)}>
      팀 설정
    </button>
  );
}
```

### 9-2. 페이지 권한 가드

```typescript
// src/components/guard/TeamAdminGuard.tsx
export function TeamAdminGuard({ 
  teamId, 
  children 
}: { 
  teamId: string; 
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const { canEdit } = useTeamPermissions(teamId);
  
  if (!canEdit) {
    return <Navigate to={`/teams/${teamId}`} replace />;
  }
  
  return <>{children}</>;
}
```

### 9-3. API 권한 체크

```typescript
// src/services/teamService.ts
export async function updateTeam(
  teamId: string,
  data: Partial<Team>
): Promise<void> {
  const { user } = useAuth();
  
  if (!user) throw new Error("Unauthorized");
  
  const hasPermission = await canEditTeam(user.uid, teamId);
  if (!hasPermission) {
    throw new Error("Insufficient permissions");
  }
  
  await updateDoc(doc(db, "teams", teamId), data);
}
```

---

## 🔟 권한 상수 통합

### 10-1. 통합 권한 상수 파일

```typescript
// src/utils/roleConstants.ts
export const ROLES = {
  // 플랫폼 권한
  PLATFORM: {
    SUPER_ADMIN: "SUPER_ADMIN",
    ADMIN: "ADMIN",
    USER: "USER",
  },
  
  // 협회 권한
  ORGANIZATION: {
    SUPER_ADMIN: "super_admin",
    ORG_ADMIN: "org_admin",
    EVENT_MANAGER: "event_manager",
    STATS_MANAGER: "stats_manager",
    VIEWER: "viewer",
  },
  
  // 팀 권한
  TEAM: {
    OWNER: "owner",
    ADMIN: "admin",
    MEMBER: "member",
  },
} as const;
```

---

## ✅ 권한 시스템 체크리스트

### 구현 완료
- [x] 플랫폼 권한 구조
- [x] 협회 권한 구조
- [x] 팀 권한 구조
- [x] 권한 체크 함수
- [x] Firestore 보안 규칙
- [x] 권한 우선순위 정의

### 향후 확장
- [ ] 권한 로깅 시스템
- [ ] 권한 변경 이력
- [ ] 권한 위임 시스템
- [ ] 역할 기반 UI 표시

---

**작성일**: 2024년  
**상태**: ✅ 권한 시스템 설계 완료
