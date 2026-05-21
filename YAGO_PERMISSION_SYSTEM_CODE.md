# 🔐 YAGO VIBE SPORTS - 권한 시스템 코드 구조

> **작성일**: 2024년  
> **목적**: 실제 개발에 바로 쓰는 권한 체크 코드

---

## 📋 권한 구조 (4단계)

```
USER
  ↓
TEAM_MEMBER
  ↓
TEAM_ADMIN
  ↓
ASSOCIATION_ADMIN
  ↓
FEDERATION_ADMIN
```

---

## 🎯 권한 정의

### 1. USER (기본 사용자)

**권한**:
- 팀 찾기
- 팀 가입 신청
- 경기 보기
- 이벤트 참석

**코드**:
```typescript
// 모든 인증된 사용자
const isUser = (user: User | null): boolean => {
  return user !== null;
};
```

---

### 2. TEAM_MEMBER (팀원)

**권한**:
- 팀 공지 읽기
- 이벤트 응답
- 팀 채팅 참여
- 경기 기록 보기

**코드**:
```typescript
// src/utils/permissions.ts
export async function isTeamMember(
  userId: string,
  teamId: string
): Promise<boolean> {
  const memberRef = doc(db, "teams", teamId, "members", userId);
  const memberSnap = await getDoc(memberRef);
  return memberSnap.exists();
}
```

---

### 3. TEAM_ADMIN (팀 관리자)

**권한**:
- 팀 수정
- 멤버 승인
- 공지 작성
- 이벤트 생성
- 경기 생성

**코드**:
```typescript
// src/utils/permissions.ts
export async function isTeamAdmin(
  userId: string,
  teamId: string
): Promise<boolean> {
  const memberRef = doc(db, "teams", teamId, "members", userId);
  const memberSnap = await getDoc(memberRef);
  
  if (!memberSnap.exists()) {
    return false;
  }
  
  const memberData = memberSnap.data();
  const role = memberData?.role;
  
  return role === "owner" || role === "admin";
}

export async function isTeamOwner(
  userId: string,
  teamId: string
): Promise<boolean> {
  const memberRef = doc(db, "teams", teamId, "members", userId);
  const memberSnap = await getDoc(memberRef);
  
  if (!memberSnap.exists()) {
    return false;
  }
  
  const memberData = memberSnap.data();
  return memberData?.role === "owner";
}
```

---

### 4. ASSOCIATION_ADMIN (협회 관리자)

**권한**:
- 대회 생성
- 팀 승인
- 경기 일정 관리
- 통계/순위 관리

**코드**:
```typescript
// src/utils/permissions.ts
export async function isAssociationAdmin(
  userId: string,
  associationId: string
): Promise<boolean> {
  const associationRef = doc(db, "associations", associationId);
  const associationSnap = await getDoc(associationRef);
  
  if (!associationSnap.exists()) {
    return false;
  }
  
  const associationData = associationSnap.data();
  const adminIds = associationData?.adminIds || [];
  const ownerId = associationData?.ownerId;
  
  return adminIds.includes(userId) || ownerId === userId;
}
```

---

### 5. FEDERATION_ADMIN (협회 연맹 관리자)

**권한**:
- 협회 생성
- 리그 운영
- 종목/지역 관리

**코드**:
```typescript
// src/utils/permissions.ts
export async function isFederationAdmin(
  userId: string,
  federationId: string
): Promise<boolean> {
  const federationRef = doc(db, "federations", federationId);
  const federationSnap = await getDoc(federationRef);
  
  if (!federationSnap.exists()) {
    return false;
  }
  
  const federationData = federationSnap.data();
  const adminIds = federationData?.adminIds || [];
  const ownerId = federationData?.ownerId;
  
  return adminIds.includes(userId) || ownerId === userId;
}
```

---

## 🛡️ 권한 체크 훅

### useTeamPermission

```typescript
// src/hooks/useTeamPermission.ts
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthProvider";
import { isTeamMember, isTeamAdmin, isTeamOwner } from "@/utils/permissions";

export function useTeamPermission(teamId: string) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState({
    isMember: false,
    isAdmin: false,
    isOwner: false,
    loading: true,
  });
  
  useEffect(() => {
    if (!user || !teamId) {
      setPermissions({
        isMember: false,
        isAdmin: false,
        isOwner: false,
        loading: false,
      });
      return;
    }
    
    const checkPermissions = async () => {
      const [member, admin, owner] = await Promise.all([
        isTeamMember(user.uid, teamId),
        isTeamAdmin(user.uid, teamId),
        isTeamOwner(user.uid, teamId),
      ]);
      
      setPermissions({
        isMember: member,
        isAdmin: admin,
        isOwner: owner,
        loading: false,
      });
    };
    
    checkPermissions();
  }, [user, teamId]);
  
  return permissions;
}
```

**사용 예**:
```typescript
// src/components/team/TeamActions.tsx
export function TeamActions({ teamId }: { teamId: string }) {
  const { isMember, isAdmin, loading } = useTeamPermission(teamId);
  
  if (loading) return <div>로딩 중...</div>;
  
  return (
    <div>
      {isMember && <button>채팅 참여</button>}
      {isAdmin && <button>공지 작성</button>}
      {isAdmin && <button>이벤트 생성</button>}
    </div>
  );
}
```

---

## 🚧 Guard 컴포넌트

### TeamMemberGuard

```typescript
// src/components/guards/TeamMemberGuard.tsx
import { useParams } from "react-router-dom";
import { useTeamPermission } from "@/hooks/useTeamPermission";
import { Navigate } from "react-router-dom";

interface TeamMemberGuardProps {
  children: React.ReactNode;
}

export function TeamMemberGuard({ children }: TeamMemberGuardProps) {
  const { teamId } = useParams<{ teamId: string }>();
  const { isMember, loading } = useTeamPermission(teamId || "");
  
  if (loading) {
    return <div>로딩 중...</div>;
  }
  
  if (!isMember) {
    return <Navigate to={`/teams/${teamId}`} replace />;
  }
  
  return <>{children}</>;
}
```

**사용 예**:
```typescript
// src/App.tsx
<Route
  path="/teams/:teamId/chat"
  element={
    <TeamMemberGuard>
      <TeamChatPage />
    </TeamMemberGuard>
  }
/>
```

---

### TeamAdminGuard

```typescript
// src/components/guards/TeamAdminGuard.tsx
import { useParams } from "react-router-dom";
import { useTeamPermission } from "@/hooks/useTeamPermission";
import { Navigate } from "react-router-dom";

interface TeamAdminGuardProps {
  children: React.ReactNode;
}

export function TeamAdminGuard({ children }: TeamAdminGuardProps) {
  const { teamId } = useParams<{ teamId: string }>();
  const { isAdmin, loading } = useTeamPermission(teamId || "");
  
  if (loading) {
    return <div>로딩 중...</div>;
  }
  
  if (!isAdmin) {
    return (
      <div className="p-4">
        <p className="text-red-600">권한이 없습니다.</p>
        <Navigate to={`/teams/${teamId}`} replace />
      </div>
    );
  }
  
  return <>{children}</>;
}
```

---

## 🔒 Firestore Security Rules

### Teams Rules

```javascript
// firestore.rules
match /teams/{teamId} {
  // 팀 정보 읽기: 팀원만
  allow read: if request.auth != null && 
    request.auth.uid in resource.data.members;
  
  // 팀 정보 수정: 팀 관리자만
  allow update: if request.auth != null && 
    (request.auth.uid == resource.data.ownerId ||
     request.auth.uid in resource.data.admins);
  
  // 팀 삭제: 팀장만
  allow delete: if request.auth != null && 
    request.auth.uid == resource.data.ownerId;
  
  // 멤버 서브컬렉션
  match /members/{memberId} {
    // 멤버 읽기: 팀원만
    allow read: if request.auth != null && 
      request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.members;
    
    // 멤버 추가: 팀 관리자만
    allow create: if request.auth != null && 
      (request.auth.uid == get(/databases/$(database)/documents/teams/$(teamId)).data.ownerId ||
       request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.admins);
    
    // 멤버 수정: 본인 또는 팀 관리자
    allow update: if request.auth != null && 
      (request.auth.uid == memberId ||
       request.auth.uid == get(/databases/$(database)/documents/teams/$(teamId)).data.ownerId);
    
    // 멤버 삭제: 본인 또는 팀 관리자
    allow delete: if request.auth != null && 
      (request.auth.uid == memberId ||
       request.auth.uid == get(/databases/$(database)/documents/teams/$(teamId)).data.ownerId);
  }
  
  // 공지 서브컬렉션
  match /notices/{noticeId} {
    // 공지 읽기: 팀원만
    allow read: if request.auth != null && 
      request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.members;
    
    // 공지 작성: 팀 관리자만
    allow create: if request.auth != null && 
      (request.auth.uid == get(/databases/$(database)/documents/teams/$(teamId)).data.ownerId ||
       request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.admins);
    
    // 공지 수정/삭제: 작성자 또는 팀 관리자
    allow update, delete: if request.auth != null && 
      (request.auth.uid == resource.data.authorId ||
       request.auth.uid == get(/databases/$(database)/documents/teams/$(teamId)).data.ownerId);
  }
  
  // 이벤트 서브컬렉션
  match /events/{eventId} {
    // 이벤트 읽기: 팀원만
    allow read: if request.auth != null && 
      request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.members;
    
    // 이벤트 작성: 팀 관리자만
    allow create: if request.auth != null && 
      (request.auth.uid == get(/databases/$(database)/documents/teams/$(teamId)).data.ownerId ||
       request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.admins);
    
    // 이벤트 수정/삭제: 작성자 또는 팀 관리자
    allow update, delete: if request.auth != null && 
      (request.auth.uid == resource.data.createdBy ||
       request.auth.uid == get(/databases/$(database)/documents/teams/$(teamId)).data.ownerId);
  }
}
```

---

## 📝 권한 체크 유틸 함수

### 완전한 권한 체크 함수

```typescript
// src/utils/permissions.ts
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface PermissionResult {
  isMember: boolean;
  isAdmin: boolean;
  isOwner: boolean;
}

export async function checkTeamPermission(
  userId: string,
  teamId: string
): Promise<PermissionResult> {
  const memberRef = doc(db, "teams", teamId, "members", userId);
  const memberSnap = await getDoc(memberRef);
  
  if (!memberSnap.exists()) {
    return {
      isMember: false,
      isAdmin: false,
      isOwner: false,
    };
  }
  
  const memberData = memberSnap.data();
  const role = memberData?.role;
  
  return {
    isMember: true,
    isAdmin: role === "owner" || role === "admin",
    isOwner: role === "owner",
  };
}

export async function canCreateNotice(
  userId: string,
  teamId: string
): Promise<boolean> {
  const permission = await checkTeamPermission(userId, teamId);
  return permission.isAdmin;
}

export async function canCreateEvent(
  userId: string,
  teamId: string
): Promise<boolean> {
  const permission = await checkTeamPermission(userId, teamId);
  return permission.isAdmin;
}

export async function canManageMembers(
  userId: string,
  teamId: string
): Promise<boolean> {
  const permission = await checkTeamPermission(userId, teamId);
  return permission.isAdmin;
}
```

---

**작성일**: 2024년  
**상태**: ✅ 권한 시스템 코드 구조 완료
