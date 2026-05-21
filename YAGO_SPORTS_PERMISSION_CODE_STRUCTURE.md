# 🔐 YAGO SPORTS 권한 시스템 코드 구조 (실제 구현)

> **작성일**: 2024년  
> **목적**: 개발자가 바로 사용할 수 있는 권한 시스템 코드 구조

---

## 📋 목차

1. [권한 시스템 구조](#1-권한-시스템-구조)
2. [권한 상수 정의](#2-권한-상수-정의)
3. [권한 체크 함수](#3-권한-체크-함수)
4. [권한 체크 훅](#4-권한-체크-훅)
5. [권한 가드 컴포넌트](#5-권한-가드-컴포넌트)
6. [Firestore 보안 규칙](#6-firestore-보안-규칙)
7. [실제 사용 예시](#7-실제-사용-예시)

---

## 1️⃣ 권한 시스템 구조

### 3단계 권한 구조

```
Platform Level (플랫폼)
  ↓
Association Level (협회)
  ↓
Team Level (팀)
```

### 파일 구조

```
src/
├─ utils/
│   ├─ platformRoleConstants.ts    # 플랫폼 권한 상수
│   ├─ organizationRoleConstants.ts # 협회 권한 상수
│   ├─ hasRole.ts                   # 플랫폼 권한 체크
│   └─ hasOrganizationRole.ts       # 협회 권한 체크
│
├─ lib/
│   └─ team/
│       ├─ roleConstants.ts         # 팀 권한 상수
│       └─ permissions.ts           # 팀 권한 체크
│
└─ components/
    └─ guard/
        ├─ TeamAdminGuard.tsx       # 팀 관리자 가드
        └─ OrganizationAdminGuard.tsx # 협회 관리자 가드
```

---

## 2️⃣ 권한 상수 정의

### 2-1. 플랫폼 권한 상수

```typescript
// src/utils/platformRoleConstants.ts
export const PLATFORM_ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  USER: "USER",
} as const;

export type PlatformRole = typeof PLATFORM_ROLES[keyof typeof PLATFORM_ROLES];

export const PLATFORM_ROLE_HIERARCHY = {
  SUPER_ADMIN: 3,
  ADMIN: 2,
  USER: 1,
} as const;
```

### 2-2. 협회 권한 상수

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

export const ORGANIZATION_ROLE_HIERARCHY = {
  super_admin: 5,
  org_admin: 4,
  event_manager: 3,
  stats_manager: 2,
  viewer: 1,
} as const;
```

### 2-3. 팀 권한 상수

```typescript
// src/lib/team/roleConstants.ts
export const TEAM_ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
} as const;

export type TeamRole = typeof TEAM_ROLES[keyof typeof TEAM_ROLES];

export const TEAM_ROLE_HIERARCHY = {
  owner: 3,
  admin: 2,
  member: 1,
} as const;
```

---

## 3️⃣ 권한 체크 함수

### 3-1. 플랫폼 권한 체크

```typescript
// src/utils/hasRole.ts
import { UserProfile } from "@/types/user";
import { PLATFORM_ROLES, PLATFORM_ROLE_HIERARCHY } from "./platformRoleConstants";

export function isSuperAdmin(user: UserProfile | null): boolean {
  if (!user) return false;
  const role = user.role?.toUpperCase() || user.globalRole?.toUpperCase();
  return role === PLATFORM_ROLES.SUPER_ADMIN;
}

export function isAdmin(user: UserProfile | null): boolean {
  if (!user) return false;
  const role = user.role?.toUpperCase() || user.globalRole?.toUpperCase();
  return role === PLATFORM_ROLES.ADMIN || isSuperAdmin(user);
}

export function isPlatformAdmin(user: UserProfile | null): boolean {
  return isSuperAdmin(user) || isAdmin(user);
}

export function hasPlatformRole(
  user: UserProfile | null,
  requiredRole: PlatformRole
): boolean {
  if (!user) return false;
  const userRole = user.role?.toUpperCase() || user.globalRole?.toUpperCase();
  const userLevel = PLATFORM_ROLE_HIERARCHY[userRole as PlatformRole] || 0;
  const requiredLevel = PLATFORM_ROLE_HIERARCHY[requiredRole];
  return userLevel >= requiredLevel;
}
```

### 3-2. 협회 권한 체크

```typescript
// src/utils/hasOrganizationRole.ts
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ORGANIZATION_ROLES, ORGANIZATION_ROLE_HIERARCHY, type OrganizationRole } from "./organizationRoleConstants";

export async function hasOrganizationRole(
  userId: string,
  associationId: string,
  requiredRole: OrganizationRole
): Promise<boolean> {
  try {
    const memberRef = doc(
      db,
      "organization_members",
      `${userId}_${associationId}`
    );
    const memberSnap = await getDoc(memberRef);
    
    if (!memberSnap.exists()) return false;
    
    const member = memberSnap.data();
    if (member.status !== "active") return false;
    
    const userLevel = ORGANIZATION_ROLE_HIERARCHY[member.role as OrganizationRole] || 0;
    const requiredLevel = ORGANIZATION_ROLE_HIERARCHY[requiredRole];
    
    return userLevel >= requiredLevel;
  } catch (error) {
    console.error("협회 권한 체크 실패:", error);
    return false;
  }
}

export async function isOrgAdmin(
  userId: string,
  associationId: string
): Promise<boolean> {
  return hasOrganizationRole(
    userId,
    associationId,
    ORGANIZATION_ROLES.ORG_ADMIN
  );
}
```

### 3-3. 팀 권한 체크

```typescript
// src/lib/team/permissions.ts
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TEAM_ROLES, TEAM_ROLE_HIERARCHY, type TeamRole } from "./roleConstants";

export async function getTeamMember(
  userId: string,
  teamId: string
): Promise<{ role: TeamRole; status: string } | null> {
  try {
    const memberRef = doc(db, "teams", teamId, "members", userId);
    const memberSnap = await getDoc(memberRef);
    
    if (!memberSnap.exists()) return null;
    
    const member = memberSnap.data();
    return {
      role: member.role as TeamRole,
      status: member.status as string,
    };
  } catch (error) {
    console.error("팀 멤버 조회 실패:", error);
    return null;
  }
}

export async function hasTeamRole(
  userId: string,
  teamId: string,
  requiredRole: TeamRole
): Promise<boolean> {
  const member = await getTeamMember(userId, teamId);
  if (!member || member.status !== "active") return false;
  
  const userLevel = TEAM_ROLE_HIERARCHY[member.role] || 0;
  const requiredLevel = TEAM_ROLE_HIERARCHY[requiredRole];
  
  return userLevel >= requiredLevel;
}

export async function canEditTeam(
  userId: string,
  teamId: string
): Promise<boolean> {
  return hasTeamRole(userId, teamId, TEAM_ROLES.ADMIN);
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
  const member = await getTeamMember(userId, teamId);
  return member?.status === "active";
}

export async function canDeleteTeam(
  userId: string,
  teamId: string
): Promise<boolean> {
  return hasTeamRole(userId, teamId, TEAM_ROLES.OWNER);
}
```

---

## 4️⃣ 권한 체크 훅

### 4-1. 팀 권한 훅

```typescript
// src/hooks/useTeamPermissions.ts
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import {
  canEditTeam,
  canInviteMember,
  canCreateEvent,
  canDeleteTeam,
  getTeamMember,
} from "@/lib/team/permissions";
import { TeamRole } from "@/lib/team/roleConstants";

export function useTeamPermissions(teamId: string) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState({
    canEdit: false,
    canInvite: false,
    canCreateEvent: false,
    canDelete: false,
    role: null as TeamRole | null,
    loading: true,
  });

  useEffect(() => {
    if (!user || !teamId) {
      setPermissions({
        canEdit: false,
        canInvite: false,
        canCreateEvent: false,
        canDelete: false,
        role: null,
        loading: false,
      });
      return;
    }

    const checkPermissions = async () => {
      try {
        const [canEdit, canInvite, canCreateEvent, canDelete, member] =
          await Promise.all([
            canEditTeam(user.uid, teamId),
            canInviteMember(user.uid, teamId),
            canCreateEvent(user.uid, teamId),
            canDeleteTeam(user.uid, teamId),
            getTeamMember(user.uid, teamId),
          ]);

        setPermissions({
          canEdit,
          canInvite,
          canCreateEvent,
          canDelete,
          role: member?.role || null,
          loading: false,
        });
      } catch (error) {
        console.error("권한 체크 실패:", error);
        setPermissions({
          canEdit: false,
          canInvite: false,
          canCreateEvent: false,
          canDelete: false,
          role: null,
          loading: false,
        });
      }
    };

    checkPermissions();
  }, [user, teamId]);

  return permissions;
}
```

### 4-2. 협회 권한 훅

```typescript
// src/hooks/useOrganizationPermissions.ts
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { hasOrganizationRole, isOrgAdmin } from "@/utils/hasOrganizationRole";
import { OrganizationRole } from "@/utils/organizationRoleConstants";

export function useOrganizationPermissions(associationId: string) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState({
    isOrgAdmin: false,
    canManageEvents: false,
    canManageStats: false,
    loading: true,
  });

  useEffect(() => {
    if (!user || !associationId) {
      setPermissions({
        isOrgAdmin: false,
        canManageEvents: false,
        canManageStats: false,
        loading: false,
      });
      return;
    }

    const checkPermissions = async () => {
      try {
        const [isAdmin, canManageEvents, canManageStats] = await Promise.all([
          isOrgAdmin(user.uid, associationId),
          hasOrganizationRole(
            user.uid,
            associationId,
            "event_manager" as OrganizationRole
          ),
          hasOrganizationRole(
            user.uid,
            associationId,
            "stats_manager" as OrganizationRole
          ),
        ]);

        setPermissions({
          isOrgAdmin: isAdmin,
          canManageEvents,
          canManageStats,
          loading: false,
        });
      } catch (error) {
        console.error("협회 권한 체크 실패:", error);
        setPermissions({
          isOrgAdmin: false,
          canManageEvents: false,
          canManageStats: false,
          loading: false,
        });
      }
    };

    checkPermissions();
  }, [user, associationId]);

  return permissions;
}
```

---

## 5️⃣ 권한 가드 컴포넌트

### 5-1. 팀 관리자 가드

```typescript
// src/components/guard/TeamAdminGuard.tsx
import { Navigate } from "react-router-dom";
import { useTeamPermissions } from "@/hooks/useTeamPermissions";

interface TeamAdminGuardProps {
  teamId: string;
  children: React.ReactNode;
}

export function TeamAdminGuard({ teamId, children }: TeamAdminGuardProps) {
  const { canEdit, loading } = useTeamPermissions(teamId);

  if (loading) {
    return <div>로딩 중...</div>;
  }

  if (!canEdit) {
    return <Navigate to={`/teams/${teamId}`} replace />;
  }

  return <>{children}</>;
}
```

### 5-2. 협회 관리자 가드

```typescript
// src/components/guard/OrganizationAdminGuard.tsx
import { Navigate } from "react-router-dom";
import { useOrganizationPermissions } from "@/hooks/useOrganizationPermissions";

interface OrganizationAdminGuardProps {
  associationId: string;
  children: React.ReactNode;
}

export function OrganizationAdminGuard({
  associationId,
  children,
}: OrganizationAdminGuardProps) {
  const { isOrgAdmin, loading } = useOrganizationPermissions(associationId);

  if (loading) {
    return <div>로딩 중...</div>;
  }

  if (!isOrgAdmin) {
    return <Navigate to={`/associations/${associationId}`} replace />;
  }

  return <>{children}</>;
}
```

---

## 6️⃣ Firestore 보안 규칙

### 6-1. 팀 보안 규칙

```javascript
// firestore.rules
match /teams/{teamId} {
  // 읽기: 공개 팀은 모두, 비공개 팀은 멤버만
  allow read: if request.auth != null && 
    (resource.data.visibility == "public" || 
     request.auth.uid in resource.data.owners ||
     exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)));
  
  // 생성: Functions만 가능
  allow create: if false;
  
  // 수정: Owner/Admin만 가능
  allow update: if request.auth != null && 
    (request.auth.uid in resource.data.owners ||
     get(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)).data.role in ['owner', 'admin']);
  
  // 삭제: Owner만 가능
  allow delete: if request.auth != null && 
    request.auth.uid in resource.data.owners;
}

match /teams/{teamId}/members/{memberId} {
  // 읽기: 팀 멤버 모두 가능
  allow read: if request.auth != null && 
    exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid));
  
  // 생성: Owner/Admin만 가능
  allow create: if request.auth != null && 
    (request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.owners ||
     get(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)).data.role in ['owner', 'admin']);
  
  // 수정: Owner/Admin만 가능
  allow update: if request.auth != null && 
    (request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.owners ||
     get(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)).data.role in ['owner', 'admin']);
  
  // 삭제: Owner만 가능
  allow delete: if request.auth != null && 
    request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.owners;
}

match /teams/{teamId}/events/{eventId} {
  // 읽기: 팀 멤버 모두 가능
  allow read: if request.auth != null && 
    exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid));
  
  // 생성: 팀 멤버 모두 가능
  allow create: if request.auth != null && 
    exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid));
  
  // 수정: 작성자 또는 Owner/Admin만 가능
  allow update: if request.auth != null && 
    (request.auth.uid == resource.data.createdBy ||
     get(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)).data.role in ['owner', 'admin']);
  
  // 삭제: 작성자 또는 Owner/Admin만 가능
  allow delete: if request.auth != null && 
    (request.auth.uid == resource.data.createdBy ||
     get(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)).data.role in ['owner', 'admin']);
}
```

---

## 7️⃣ 실제 사용 예시

### 7-1. 컴포넌트에서 권한 체크

```typescript
// src/components/team/TeamSettingsButton.tsx
import { useTeamPermissions } from "@/hooks/useTeamPermissions";

export function TeamSettingsButton({ teamId }: { teamId: string }) {
  const { canEdit, loading } = useTeamPermissions(teamId);
  const navigate = useNavigate();

  if (loading) return null;
  if (!canEdit) return null;

  return (
    <button
      onClick={() => navigate(`/team/${teamId}/settings`)}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg"
    >
      팀 설정
    </button>
  );
}
```

### 7-2. 페이지에서 권한 가드

```typescript
// src/pages/team/TeamManagePage.tsx
import { TeamAdminGuard } from "@/components/guard/TeamAdminGuard";

export default function TeamManagePage() {
  const { teamId } = useParams<{ teamId: string }>();

  if (!teamId) return <Navigate to="/teams" replace />;

  return (
    <TeamAdminGuard teamId={teamId}>
      <div>
        <h1>팀 관리</h1>
        {/* 관리자만 볼 수 있는 내용 */}
      </div>
    </TeamAdminGuard>
  );
}
```

### 7-3. API에서 권한 체크

```typescript
// src/services/teamService.ts
import { canEditTeam } from "@/lib/team/permissions";
import { useAuth } from "@/context/AuthProvider";

export async function updateTeam(
  teamId: string,
  data: Partial<Team>
): Promise<void> {
  const { user } = useAuth();
  
  if (!user) {
    throw new Error("Unauthorized");
  }
  
  const hasPermission = await canEditTeam(user.uid, teamId);
  if (!hasPermission) {
    throw new Error("Insufficient permissions");
  }
  
  await updateDoc(doc(db, "teams", teamId), data);
}
```

---

## 8️⃣ 권한 체크 패턴 요약

### 패턴 1: 훅 사용 (권장)

```typescript
const { canEdit } = useTeamPermissions(teamId);
if (!canEdit) return null;
```

### 패턴 2: 가드 컴포넌트 사용

```typescript
<TeamAdminGuard teamId={teamId}>
  <AdminContent />
</TeamAdminGuard>
```

### 패턴 3: 직접 함수 호출

```typescript
const canEdit = await canEditTeam(userId, teamId);
if (!canEdit) throw new Error("Insufficient permissions");
```

---

## ✅ 권한 시스템 체크리스트

### 구현 완료
- [x] 플랫폼 권한 상수
- [x] 협회 권한 상수
- [x] 팀 권한 상수
- [x] 권한 체크 함수
- [x] 권한 체크 훅
- [x] 권한 가드 컴포넌트
- [x] Firestore 보안 규칙

### 파일 위치
- `src/utils/platformRoleConstants.ts`
- `src/utils/organizationRoleConstants.ts`
- `src/lib/team/roleConstants.ts`
- `src/utils/hasRole.ts`
- `src/utils/hasOrganizationRole.ts`
- `src/lib/team/permissions.ts`
- `src/hooks/useTeamPermissions.ts`
- `src/components/guard/TeamAdminGuard.tsx`

---

**작성일**: 2024년  
**상태**: ✅ 권한 시스템 코드 구조 완료
