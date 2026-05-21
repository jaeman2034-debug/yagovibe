# 🔥 팀 시스템 확장 설계 (천재 모드 v1)

## 🎯 목표

**팀 = 활동, 채팅, 이벤트, 거래의 중심 엔티티**

현재 팀 생성/조회는 완료됨. 이제 팀을 "서비스 핵심 도메인"으로 승격.

---

## 1️⃣ Firestore 구조 설계

### 현재 구조
```
teams/{teamId}
  name, sportType, ownerUid, plan, ...

teams/{teamId}/members/{uid}
  role, accessLevel, status, ...

teamSchedules/{scheduleId}
  teamId, ...
```

### 확장 구조 (목표)
```
teams/{teamId}
  name: string
  sportType: string
  sport: string (호환성)
  sportKey: string (호환성)
  region: string
  description?: string
  imageUrl?: string
  ownerUid: string
  owners: string[]
  plan: "free" | "pro"
  visibility: "public" | "private"
  createdAt: Timestamp
  updatedAt: Timestamp

teams/{teamId}/members/{uid}
  uid: string
  userId: string
  teamId: string
  role: "owner" | "admin" | "member"
  accessLevel: "OWNER" | "ADMIN" | "STAFF" | "MEMBER"
  status: "active" | "inactive" | "pending"
  joinedAt: Timestamp
  isDeleted: boolean

teams/{teamId}/activities/{activityId}
  type: "schedule" | "post" | "event"
  title: string
  content?: string
  createdBy: string
  createdAt: Timestamp

teams/{teamId}/posts/{postId}
  title: string
  content: string
  authorId: string
  createdAt: Timestamp

teams/{teamId}/events/{eventId}
  title: string
  dateTime: Timestamp
  location?: string
  createdBy: string
  createdAt: Timestamp

teams/{teamId}/chatRooms/{chatId}
  name: string
  type: "team" | "activity"
  createdBy: string
  createdAt: Timestamp
```

---

## 2️⃣ TypeScript 인터페이스

### 확장된 Team 인터페이스
```typescript
export interface Team {
  id: string;
  name: string;
  sportType: string;
  sport: string; // 호환성
  sportKey: string; // 호환성
  region: string;
  description?: string;
  imageUrl?: string;
  ownerUid: string;
  owners: string[];
  plan: "free" | "pro";
  visibility: "public" | "private";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TeamMember {
  uid: string;
  userId: string;
  teamId: string;
  role: "owner" | "admin" | "member";
  accessLevel: "OWNER" | "ADMIN" | "STAFF" | "MEMBER";
  status: "active" | "inactive" | "pending";
  joinedAt: Timestamp;
  isDeleted: boolean;
}

export interface TeamActivity {
  id: string;
  teamId: string;
  type: "schedule" | "post" | "event";
  title: string;
  content?: string;
  createdBy: string;
  createdAt: Timestamp;
}
```

---

## 3️⃣ Security Rules 설계

### teams/{teamId}
```javascript
match /teams/{teamId} {
  // 읽기: 공개 팀은 모두, 비공개 팀은 멤버만
  allow read: if request.auth != null && 
    (resource.data.visibility == "public" || 
     request.auth.uid in resource.data.get('owners', []) ||
     exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)));
  
  // 생성: Functions만 가능
  allow create: if false;
  
  // 수정: Owner/Admin만 가능
  allow update: if request.auth != null && 
    (request.auth.uid in resource.data.get('owners', []) ||
     exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)) &&
     get(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)).data.role in ['owner', 'admin']);
  
  // 삭제: Owner만 가능
  allow delete: if request.auth != null && 
    request.auth.uid in resource.data.get('owners', []);
}
```

### teams/{teamId}/members/{memberId}
```javascript
match /teams/{teamId}/members/{memberId} {
  // 읽기: 팀 멤버 모두 가능
  allow read: if request.auth != null && 
    exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid));
  
  // 생성: Owner/Admin만 가능
  allow create: if request.auth != null && 
    (request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.get('owners', []) ||
     get(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)).data.role in ['owner', 'admin']);
  
  // 수정: Owner/Admin만 가능
  allow update: if request.auth != null && 
    (request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.get('owners', []) ||
     get(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)).data.role in ['owner', 'admin']);
  
  // 삭제: Owner만 가능
  allow delete: if request.auth != null && 
    request.auth.uid in get(/databases/$(database)/documents/teams/$(teamId)).data.get('owners', []);
}
```

---

## 4️⃣ 권한 시스템 헬퍼 함수

### 권한 체크 함수
```typescript
export async function canEditTeam(
  userId: string,
  teamId: string
): Promise<boolean> {
  // Owner 또는 Admin만 수정 가능
  const memberRef = doc(db, "teams", teamId, "members", userId);
  const memberSnap = await getDoc(memberRef);
  
  if (!memberSnap.exists()) return false;
  
  const memberData = memberSnap.data();
  return memberData.role === "owner" || memberData.role === "admin";
}

export async function canInvite(
  userId: string,
  teamId: string
): Promise<boolean> {
  // Owner 또는 Admin만 초대 가능
  return canEditTeam(userId, teamId);
}

export async function canCreateActivity(
  userId: string,
  teamId: string
): Promise<boolean> {
  // Owner, Admin, Member 모두 활동 생성 가능
  const memberRef = doc(db, "teams", teamId, "members", userId);
  const memberSnap = await getDoc(memberRef);
  
  if (!memberSnap.exists()) return false;
  
  const memberData = memberSnap.data();
  return memberData.status === "active";
}
```

---

## 5️⃣ 개발 단계 로드맵

### Phase 1 (오늘) - 기본 설정
- [ ] TeamSettingsModal 구현
- [ ] 팀 소개 수정
- [ ] 팀 이미지 업로드
- [ ] 팀 공개 여부 변경

### Phase 2 (내일) - 초대 시스템
- [ ] 초대 링크 시스템 강화
- [ ] 권한 변경 UI
- [ ] 멤버 관리 UI

### Phase 3 (핵심) - 도메인 연결
- [ ] Activity에 teamId 필수화
- [ ] 팀 활동 피드 구현
- [ ] 팀 채팅 연결
- [ ] 팀 이벤트 연결

---

## 6️⃣ 핵심 철학

> **활동은 이벤트가 아니라 팀에서 파생되는 도메인이다.**

팀이 없으면 활동도 없다.

---

## 7️⃣ 다음 단계

1. Firestore 구조를 팀 중심으로 리팩토링
2. TeamSettingsModal 구현
3. 팀 초대 시스템 구축
4. Activity에 teamId 필수화
5. TeamContext 확장
