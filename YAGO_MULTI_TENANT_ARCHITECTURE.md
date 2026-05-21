# YAGO Multi-Tenant Architecture - 실제 서비스 수준

## 🎯 핵심 개념

**하나의 플랫폼, 여러 조직(협회/아카데미/클럽), 각 조직은 독립된 시스템처럼 동작**

```
YAGO Platform
 │
 ├─ Organization A (노원구 축구협회)
 │   ├─ Leagues
 │   ├─ Teams
 │   └─ Matches
 │
 ├─ Organization B (서울 유소년 아카데미)
 │   ├─ Training Programs
 │   ├─ Coaches
 │   └─ Students
 │
 └─ Organization C (강남 FC 클럽)
     ├─ Club Teams
     ├─ Players
     └─ Matches
```

---

## 📊 전체 시스템 구조

```
                YAGO Platform
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
   Organization   Organization   Organization
     (협회)          (아카데미)        (클럽)
        │              │              │
        ├─ Seasons     ├─ Programs    ├─ Teams
        │              │              │
        └─ Leagues     └─ Coaches     └─ Players
             │
             ├─ Teams
             ├─ Matches
             └─ Standings
```

---

## 🔑 핵심 개념: Tenant

**Tenant = 하나의 조직 (Organization)**

각 조직은:
- 독립된 데이터 공간
- 독립된 스토리지
- 독립된 웹사이트
- 독립된 관리자 권한

**예시**:
```
Tenant 1: 노원구 축구협회 (fed-nowon-football)
Tenant 2: 서울 유소년 아카데미 (academy-seoul-football)
Tenant 3: 강남 FC 클럽 (club-gangnam-fc)
```

---

## 🗄️ 데이터 구조 (Firestore)

### 모든 컬렉션에 `organizationId` 필수

### 1. Organizations (Tenant 정의)

```typescript
interface Organization {
  id: string;                    // Tenant ID
  type: "federation" | "academy" | "club";
  name: string;
  slug: string;                   // URL용 (nowon-fa)
  sport: string;
  region: string;
  
  // 이미지
  logoUrl?: string;
  heroImageUrl: string;
  
  // 템플릿
  templateId: string;
  
  // 관리자
  ownerId: string;
  adminIds: string[];
  
  // 상태
  status: "active" | "inactive" | "suspended";
  
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

### 2. Teams (조직별 팀)

```typescript
interface Team {
  id: string;
  organizationId: string;         // 🔑 Tenant ID (필수)
  name: string;
  sportType: string;
  region: string;
  logoUrl?: string;
  ownerUid: string;
  status: "active" | "inactive";
  createdAt: Timestamp;
}
```

**쿼리 예시**:
```typescript
// 특정 조직의 팀만 조회
const teamsQuery = query(
  collection(db, "teams"),
  where("organizationId", "==", currentOrganizationId)
);
```

### 3. Leagues (조직별 리그)

```typescript
interface League {
  id: string;
  organizationId: string;         // 🔑 Tenant ID (필수)
  seasonId: string;
  name: string;
  slug: string;
  sport: string;
  format: "round_robin" | "tournament" | "hybrid";
  status: "draft" | "registration" | "active" | "completed";
  teamCount: number;
  matchCount: number;
  createdAt: Timestamp;
}
```

### 4. Matches (조직별 경기)

```typescript
interface LeagueMatch {
  id: string;
  organizationId: string;         // 🔑 Tenant ID (필수)
  leagueId: string;
  seasonId: string;
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: Timestamp;
  status: "scheduled" | "live" | "completed";
  homeScore?: number;
  awayScore?: number;
  createdAt: Timestamp;
}
```

### 5. Players (조직별 선수)

```typescript
interface Player {
  id: string;
  organizationId: string;         // 🔑 Tenant ID (필수)
  teamId: string;
  userId: string;                 // Global User ID
  playerName: string;
  position?: string;
  jerseyNumber?: number;
  status: "active" | "inactive";
  registeredAt: Timestamp;
}
```

---

## 🔐 Firestore Security Rules

### 조직별 데이터 격리

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Organizations
    match /organizations/{organizationId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == resource.data.ownerId 
                  || request.auth.uid in resource.data.adminIds;
      
      // Teams (조직별)
      match /teams/{teamId} {
        allow read: if request.auth != null 
                  && resource.data.organizationId == organizationId;
        allow write: if request.auth.uid == resource.data.ownerUid
                    && resource.data.organizationId == organizationId;
      }
      
      // Leagues (조직별)
      match /leagues/{leagueId} {
        allow read: if request.auth != null 
                  && resource.data.organizationId == organizationId;
        allow write: if request.auth.uid in get(/databases/$(database)/documents/organizations/$(organizationId)).data.adminIds
                    && resource.data.organizationId == organizationId;
      }
      
      // Matches (조직별)
      match /league_matches/{matchId} {
        allow read: if request.auth != null 
                  && resource.data.organizationId == organizationId;
        allow write: if request.auth.uid in get(/databases/$(database)/documents/organizations/$(organizationId)).data.adminIds
                    && resource.data.organizationId == organizationId;
      }
    }
    
    // Global collections (organizationId 필수)
    match /teams/{teamId} {
      allow read: if request.auth != null 
                && resource.data.organizationId == request.auth.token.organizationId;
      allow write: if request.auth.uid == resource.data.ownerUid
                  && resource.data.organizationId == request.auth.token.organizationId;
    }
    
    match /leagues/{leagueId} {
      allow read: if request.auth != null 
                && resource.data.organizationId == request.auth.token.organizationId;
      allow write: if request.auth.uid in get(/databases/$(database)/documents/organizations/$(resource.data.organizationId)).data.adminIds
                  && resource.data.organizationId == request.auth.token.organizationId;
    }
  }
}
```

---

## 🌐 URL 구조

### Public Website

```
yago.io/{organizationType}s/{slug}
```

**예시**:
```
yago.io/federations/nowon-fa
yago.io/academies/seoul-football
yago.io/clubs/gangnam-fc
```

### Admin Dashboard

```
yago.io/admin/{organizationType}s/{slug}
```

**예시**:
```
yago.io/admin/federations/nowon-fa
yago.io/admin/academies/seoul-football
yago.io/admin/clubs/gangnam-fc
```

### API Endpoints

```
/api/organizations/{organizationId}/teams
/api/organizations/{organizationId}/leagues
/api/organizations/{organizationId}/matches
```

---

## 🎯 Organization Context

### Frontend Context

```typescript
interface OrganizationContext {
  currentOrganization: Organization | null;
  setCurrentOrganization: (org: Organization | null) => void;
  isOwner: boolean;
  isAdmin: boolean;
  isManager: boolean;
}

// Context Provider
export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const { user } = useAuth();
  
  // 사용자가 소유하거나 관리하는 조직 목록 조회
  useEffect(() => {
    if (user) {
      fetchUserOrganizations(user.uid).then(orgs => {
        if (orgs.length > 0) {
          setCurrentOrganization(orgs[0]); // 첫 번째 조직 선택
        }
      });
    }
  }, [user]);
  
  const isOwner = currentOrganization?.ownerId === user?.uid;
  const isAdmin = currentOrganization?.adminIds.includes(user?.uid || "") || isOwner;
  
  return (
    <OrganizationContext.Provider
      value={{
        currentOrganization,
        setCurrentOrganization,
        isOwner,
        isAdmin,
        isManager: isAdmin // 간단화
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}
```

### 모든 API 호출에 organizationId 포함

```typescript
// Custom Hook
function useOrganizationData<T>(
  collectionName: string,
  additionalQueries?: QueryConstraint[]
) {
  const { currentOrganization } = useOrganization();
  
  useEffect(() => {
    if (!currentOrganization) return;
    
    let q = query(
      collection(db, collectionName),
      where("organizationId", "==", currentOrganization.id),
      ...(additionalQueries || [])
    );
    
    // 실시간 구독
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];
      setData(data);
    });
    
    return () => unsubscribe();
  }, [currentOrganization?.id]);
  
  return { data, loading };
}

// 사용 예시
function TeamsList() {
  const { data: teams, loading } = useOrganizationData<Team>("teams");
  
  if (loading) return <div>로딩 중...</div>;
  
  return (
    <div>
      {teams.map(team => (
        <TeamCard key={team.id} team={team} />
      ))}
    </div>
  );
}
```

---

## 📦 Storage 구조 (Firebase Storage)

### 조직별 격리된 스토리지

```
organizations/
  ├─ {organizationId}/
  │   ├─ logo/
  │   │   └─ logo.jpg
  │   ├─ hero/
  │   │   └─ hero.jpg
  │   ├─ teams/
  │   │   └─ {teamId}/
  │   │       └─ logo.jpg
  │   └─ players/
  │       └─ {playerId}/
  │           └─ photo.jpg
  │
  └─ hero_library/          # 공통 라이브러리
      ├─ football/
      ├─ academy/
      └─ generic/
```

### Storage Security Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // 조직별 데이터
    match /organizations/{organizationId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == getOrganizationOwner(organizationId)
                  || request.auth.uid in getOrganizationAdmins(organizationId);
    }
    
    // 공통 라이브러리 (읽기 전용)
    match /organizations/hero_library/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if false; // 관리자만 업로드 (별도 처리)
    }
  }
}
```

---

## 🔄 API 구조

### 모든 API에 organizationId 필수

```typescript
// Organization Service
class OrganizationService {
  // 팀 조회
  async getTeams(organizationId: string): Promise<Team[]> {
    const q = query(
      collection(db, "teams"),
      where("organizationId", "==", organizationId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Team[];
  }
  
  // 리그 조회
  async getLeagues(organizationId: string): Promise<League[]> {
    const q = query(
      collection(db, "leagues"),
      where("organizationId", "==", organizationId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as League[];
  }
  
  // 경기 생성
  async createMatch(
    organizationId: string,
    matchData: Omit<LeagueMatch, "id" | "organizationId">
  ): Promise<string> {
    const matchRef = await addDoc(collection(db, "league_matches"), {
      ...matchData,
      organizationId // 🔑 항상 포함
    });
    return matchRef.id;
  }
}
```

---

## 👤 Member / Player Identity System

**선수가 여러 팀 / 여러 리그에서 활동할 수 있는 시스템**

### 핵심 개념

**Global User Identity** + **Organization별 Player Profile**

```
User (Global)
 ├─ Profile (전역)
 │   ├─ name
 │   ├─ email
 │   └─ photo
 │
 └─ Player Profiles (조직별)
     ├─ Organization A (노원구 축구협회)
     │   ├─ Team: 노원FC
     │   ├─ Position: 공격수
     │   ├─ Jersey: 10
     │   └─ Stats: {...}
     │
     └─ Organization B (서울 아카데미)
         ├─ Team: U15
         ├─ Position: 미드필더
         ├─ Jersey: 7
         └─ Stats: {...}
```

### 데이터 구조

#### 1. Users (Global Identity)

```typescript
interface User {
  id: string;                    // Global User ID
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Timestamp;
}
```

#### 2. Players (Organization별 Profile)

```typescript
interface Player {
  id: string;
  organizationId: string;         // 🔑 Tenant ID
  userId: string;                 // Global User ID (참조)
  teamId: string;
  
  // 조직별 선수 정보
  playerName: string;             // 조직 내 이름 (다를 수 있음)
  position?: string;
  jerseyNumber?: number;
  birthDate?: Timestamp;
  
  // 조직별 통계
  stats?: {
    matchesPlayed: number;
    goals?: number;
    assists?: number;
  };
  
  status: "active" | "inactive";
  registeredAt: Timestamp;
}
```

#### 3. Player Identity Mapping

```typescript
interface PlayerIdentity {
  userId: string;                 // Global User ID
  organizationId: string;         // Tenant ID
  playerId: string;               // Organization별 Player ID
  teamId: string;
  role: "player" | "coach" | "manager";
}
```

### 사용 예시

**선수가 여러 조직에서 활동**:

```typescript
// 사용자: 김민수 (userId: "user-123")

// Organization A: 노원구 축구협회
{
  userId: "user-123",
  organizationId: "fed-nowon-football",
  playerId: "player-001",
  teamId: "team-nowon-fc",
  playerName: "김민수",
  position: "공격수",
  jerseyNumber: 10
}

// Organization B: 서울 아카데미
{
  userId: "user-123",
  organizationId: "academy-seoul-football",
  playerId: "player-002",
  teamId: "team-u15",
  playerName: "김민수",
  position: "미드필더",
  jerseyNumber: 7
}
```

### Player 조회 API

```typescript
// 특정 조직의 선수 조회
async function getOrganizationPlayers(
  organizationId: string
): Promise<Player[]> {
  const q = query(
    collection(db, "players"),
    where("organizationId", "==", organizationId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Player[];
}

// 사용자의 모든 선수 프로필 조회 (여러 조직)
async function getUserPlayerProfiles(
  userId: string
): Promise<Player[]> {
  const q = query(
    collection(db, "players"),
    where("userId", "==", userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Player[];
}
```

---

## 🎯 이 구조의 장점

### 1. SaaS 구조

**한 플랫폼, 무한 조직**:
- 수천 개 조직 지원 가능
- 조직별 독립 운영
- 확장성 극대화

### 2. 데이터 완전 분리

**organizationId 기반 격리**:
- 조직 간 데이터 접근 불가
- 보안 강화
- 프라이버시 보장

### 3. Member/Player Identity

**선수 중복 등록 가능**:
- 한 선수가 여러 조직에서 활동
- 조직별 독립 통계
- 글로벌 프로필 관리

### 4. 확장 가능

**추가 기능 쉽게 확장**:
- 대회 시스템
- 선수 통계 분석
- 스카우팅 시스템
- 영상 분석

---

## 📊 실제 SaaS 구조 비교

이 구조는 다음 SaaS들이 사용하는 구조입니다:

- **Shopify**: Store별 데이터 격리
- **Notion**: Workspace별 데이터 격리
- **Slack**: Workspace별 데이터 격리
- **SportsEngine**: Organization별 데이터 격리

---

## ✅ 구현 체크리스트

### Phase 1: Multi-Tenant 기본 구조
- [ ] 모든 컬렉션에 `organizationId` 필드 추가
- [ ] Firestore Security Rules (조직별 격리)
- [ ] Storage Security Rules (조직별 격리)
- [ ] Organization Context Provider

### Phase 2: API 구조
- [ ] 모든 API에 organizationId 필수
- [ ] Organization별 데이터 조회
- [ ] Organization 전환 기능

### Phase 3: Member/Player Identity
- [ ] Global User Identity
- [ ] Organization별 Player Profile
- [ ] 사용자 프로필 통합 조회

---

## 🚀 Cursor에게 전달할 지시

```
Implement YAGO with multi-tenant architecture.
Every collection must include organizationId field.
All queries must filter by organizationId.
Implement Firestore Security Rules for tenant isolation.
Create Organization Context Provider for frontend.
Design Member/Player Identity System where players can belong to multiple organizations.
Use Firebase Storage with organization-based folder structure.
```

---

이 구조를 구현하면 **YAGO가 진짜 SaaS 플랫폼이 됩니다!** 🚀
