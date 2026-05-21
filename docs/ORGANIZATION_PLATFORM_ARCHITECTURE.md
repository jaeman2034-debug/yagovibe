# 🔥 전국 생활체육 플랫폼 아키텍처

## 목표

노원구 앱 → 서울 플랫폼 → 전국 플랫폼으로 확장 가능한 계층 구조

---

## 1️⃣ 전체 플랫폼 구조 (Top Level)

```
Platform (전국)
   ↓
Organizations (시/도/구 협회)
   ↓
Seasons (연도별)
   ↓
Events (행사)
   ↓
Divisions (부문)
   ↓
Entries (참가)
   ↓
Matches (경기)
   ↓
Stats (통계)
```

---

## 2️⃣ Organization 계층 구조

### 계층 레벨

```
Level 1: Country (전국)
   ↓
Level 2: Province/City (시/도)
   ↓
Level 3: District (구/군)
   ↓
Level 4: Association (협회)
```

### 예시

```
대한민국 생활체육 플랫폼
   ├ 서울특별시
   │   ├ 노원구 축구협회
   │   ├ 강북구 축구협회
   │   └ 중랑구 축구협회
   ├ 경기도
   │   ├ 수원시 축구협회
   │   └ 성남시 축구협회
   └ 부산광역시
       └ 해운대구 축구협회
```

---

## 3️⃣ Firestore 컬렉션 구조

### organizations

```
organizations/{orgId}
```

예시:

```json
{
  "id": "KR_SEOUL_NOWON_FA",
  "name": "노원구 축구협회",
  "type": "association",
  "level": 3,
  "parentOrgId": "KR_SEOUL_FA",
  "regionCode": "KR_SEOUL_NOWON",
  "sportType": "football",
  "status": "active",
  "createdAt": "2026-01-01T00:00:00Z"
}
```

### organization_members

```
organization_members/{orgId}_{userId}
```

예시:

```json
{
  "organizationId": "KR_SEOUL_NOWON_FA",
  "userId": "user_123",
  "role": "admin",
  "status": "active",
  "joinedAt": "2026-01-01T00:00:00Z"
}
```

### organization_roles

역할 정의:

```typescript
type OrganizationRole =
  | "super_admin"        // 플랫폼 전체 관리자
  | "organization_admin"  // Organization 관리자
  | "association_admin"  // 협회 관리자
  | "event_manager"      // 행사 운영자
  | "referee"            // 심판
  | "viewer";            // 조회만 가능
```

---

## 4️⃣ 권한 계층 구조

### 권한 우선순위

```
Super Admin (플랫폼)
   ↓
Organization Admin (서울 축구협회)
   ↓
Association Admin (노원구 축구협회)
   ↓
Event Manager (협회장기 운영자)
   ↓
Referee (심판)
   ↓
Viewer (조회)
```

### 권한 매트릭스

| 기능 | Super Admin | Org Admin | Assoc Admin | Event Manager | Referee | Viewer |
|------|-------------|-----------|-------------|---------------|---------|--------|
| Organization 생성 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Organization 관리 | ✅ | ✅ (자기 조직) | ❌ | ❌ | ❌ | ❌ |
| Event 생성 | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Event 관리 | ✅ | ✅ | ✅ | ✅ (자기 행사) | ❌ | ❌ |
| 경기 결과 입력 | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 조회 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 5️⃣ Event와 Organization 연결

### Event 스키마 확장

```typescript
interface Event {
  // 기존 필드...
  organizationId: string;        // 소속 Organization
  organizationName: string;     // "노원구 축구협회"
  organizerName: string;        // "노원구축구협회" (기존 필드 유지)
  // ...
}
```

### Organization별 Event 조회

```typescript
// 노원구 축구협회의 모든 행사
getEvents({
  organizationId: "KR_SEOUL_NOWON_FA"
})

// 서울 축구협회 하위 모든 행사
getEvents({
  parentOrgId: "KR_SEOUL_FA"
})
```

---

## 6️⃣ Admin 페이지 계층화

### 현재 구조

```
/admin/events
```

### 확장 구조

```
/admin/organizations                    # Organization 목록
/admin/organizations/create            # Organization 생성
/admin/organizations/:orgId             # Organization 상세
/admin/organizations/:orgId/events     # Organization별 행사 목록
/admin/organizations/:orgId/members    # Organization 멤버 관리
/admin/organizations/:orgId/roles      # 역할 관리
```

### Event 페이지는 그대로

```
/admin/events                           # 전체 행사 (Super Admin)
/admin/organizations/:orgId/events      # Organization별 행사
/admin/events/:eventId                  # 행사 상세
```

---

## 7️⃣ Organization Service Layer

### organizationService.ts

```typescript
// Organization 생성
export async function createOrganization(input: {
  name: string;
  type: "province" | "city" | "district" | "association";
  level: number;
  parentOrgId?: string;
  regionCode: string;
  sportType: string;
  createdBy: string;
}): Promise<string>

// Organization 조회
export async function getOrganization(orgId: string): Promise<Organization | null>

// Organization 목록 조회
export async function getOrganizations(options?: {
  parentOrgId?: string;
  regionCode?: string;
  sportType?: string;
}): Promise<Organization[]>

// Organization 멤버 추가
export async function addOrganizationMember(
  orgId: string,
  userId: string,
  role: OrganizationRole
): Promise<void>

// Organization 멤버 조회
export async function getOrganizationMembers(orgId: string): Promise<OrganizationMember[]>
```

---

## 8️⃣ 권한 체크 유틸리티

### hasOrganizationPermission.ts

```typescript
export function hasOrganizationPermission(
  user: User | null,
  organizationId: string,
  requiredRole: OrganizationRole
): boolean {
  // Super Admin은 모든 권한
  if (isSuperAdmin(user)) return true;
  
  // Organization 멤버 권한 확인
  const member = getOrganizationMember(user?.uid, organizationId);
  if (!member) return false;
  
  // 역할 우선순위 확인
  return hasRolePermission(member.role, requiredRole);
}
```

---

## 9️⃣ 확장 시나리오

### 시나리오 1: 노원구만 운영

```
Organization: KR_SEOUL_NOWON_FA
Events: 노원구 행사만
```

### 시나리오 2: 서울 전체 운영

```
Organization: KR_SEOUL_FA
   ├ KR_SEOUL_NOWON_FA
   ├ KR_SEOUL_GANGBUK_FA
   └ KR_SEOUL_JUNGLANG_FA
```

### 시나리오 3: 전국 플랫폼

```
Platform
   ├ KR_SEOUL_FA
   ├ KR_GYEONGGI_FA
   ├ KR_BUSAN_FA
   └ ...
```

**같은 Event Engine 사용**

---

## 🔟 구현 우선순위

### Phase 1: Organization 기본 구조
1. `organizations` 컬렉션
2. `organization_members` 컬렉션
3. `organizationService.ts`
4. Organization 생성/조회

### Phase 2: 권한 시스템
5. `hasOrganizationPermission` 유틸
6. `OrganizationRoute` 컴포넌트
7. Organization별 Event 필터링

### Phase 3: Admin UI
8. `/admin/organizations` 페이지
9. `/admin/organizations/:orgId/events` 페이지
10. Organization 멤버 관리 페이지

---

## 1️⃣1️⃣ Event Platform과의 통합

### 기존 Event Engine은 그대로 사용

```
Event 생성
   ↓
organizationId 자동 설정
   ↓
Event Engine 동작 (변경 없음)
```

### Event 조회만 확장

```typescript
// 기존: 전체 조회
getEvents()

// 확장: Organization별 조회
getEvents({ organizationId: "KR_SEOUL_NOWON_FA" })
```

---

## 1️⃣2️⃣ 최종 플랫폼 구조

```
Platform
   ↓
Organizations (계층)
   ↓
Seasons
   ↓
Events (기존 엔진)
   ↓
Divisions
   ↓
Entries
   ↓
Matches
   ↓
Stats
```

**Event Engine은 변경 없이 그대로 사용**

---

## 🚀 다음 단계

1. ✅ **Event Platform 엔진 완성**
2. → **Organization Layer 추가**
3. → **권한 시스템 통합**
4. → **전국 확장 준비 완료**

---

## 💡 핵심 포인트

**지금 만든 Event Engine은 전국 확장에 그대로 사용 가능합니다.**

Organization Layer만 추가하면:
- 노원구만 운영 가능
- 서울 전체 운영 가능
- 전국 플랫폼 확장 가능

**같은 엔진, 다른 스코프**
