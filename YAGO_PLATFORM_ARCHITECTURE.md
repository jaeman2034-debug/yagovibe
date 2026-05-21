# YAGO Platform Architecture - 전체 시스템 구조 (서비스 레벨)

## 🎯 플랫폼 비전

**Sports Organization Platform** - 협회, 아카데미, 클럽을 위한 통합 플랫폼

```
AI Organization Builder + League Platform + Website Builder
```

---

## 📊 전체 시스템 아키텍처

```
                 ┌─────────────────────────┐
                 │         User            │
                 │  협회 / 아카데미 / 클럽 생성 │
                 └─────────────┬───────────┘
                               │
                               ▼
                  ┌────────────────────────┐
                  │ Organization Builder   │
                  │ (AI Wizard UI)         │
                  │ - Step 기반 Wizard      │
                  │ - Hero Image 선택      │
                  │ - Template 추천        │
                  └─────────────┬──────────┘
                                │
                                ▼
                  ┌────────────────────────┐
                  │ Template Decision      │
                  │ Engine                 │
                  │ - Rule 기반 매칭       │
                  │ - AI 기반 추천 (선택)  │
                  └─────────────┬──────────┘
                                │
                                ▼
                  ┌────────────────────────┐
                  │ Template Library       │
                  │ - federation templates │
                  │ - academy templates    │
                  │ - club templates       │
                  └─────────────┬──────────┘
                                │
                                ▼
                  ┌────────────────────────┐
                  │ Organization Generator │
                  │ - 사이트 생성          │
                  │ - 시스템 생성          │
                  │ - 초기 데이터 생성     │
                  └─────────────┬──────────┘
                                │
                                ▼
                     ┌────────────────────┐
                     │ Platform Backend    │
                     │ - API Server        │
                     │ - Business Logic    │
                     │ - Cloud Functions   │
                     └─────────┬──────────┘
                               │
                               ▼
                     ┌────────────────────┐
                     │ Platform Database  │
                     │ - Organizations    │
                     │ - Leagues          │
                     │ - Teams            │
                     │ - Matches          │
                     │ - Players          │
                     └─────────┬──────────┘
                               │
                               ▼
             ┌────────────────────────────────┐
             │ Organization Dashboard         │
             │ - 리그 관리                    │
             │ - 팀 관리                      │
             │ - 경기 운영                    │
             │ - 통계 대시보드                │
             └────────────────────────────────┘
                               │
                               ▼
             ┌────────────────────────────────┐
             │ Organization Website           │
             │ - Public 사이트                │
             │ - Hero Section                  │
             │ - Teams / Matches / Standings  │
             │ - News / Contact                │
             └────────────────────────────────┘
```

---

## 🔧 핵심 시스템 4개

### 1️⃣ Organization Builder

**사용자 온보딩 시스템**

**기능**:
- AI 기반 Wizard (7단계)
- 조직 유형 선택 (Federation/Academy/Club)
- Hero 이미지 + 로고 업로드
- 템플릿 추천

**출력**:
```typescript
interface OrganizationConfig {
  type: "federation" | "academy" | "club";
  name: string;
  sport: string;
  region: string;
  target: string;
  operationType: string;
  logoUrl?: string;
  heroImageUrl: string;
  templateId: string;
}
```

**Wizard 구조**:
```
Step 1: Organization Type
Step 2: Sport Selection
Step 3: Target Audience
Step 4: Operation Type
Step 5: Logo Upload
Step 6: Hero Image Selection
Step 7: Template Recommendation
```

---

### 2️⃣ Template System

**조직 구조 자동 생성 엔진**

**Template Library 구조**:
```
templates/
  ├─ federation/
  │   ├─ football_league/
  │   │   ├─ config.json
  │   │   ├─ menus.json
  │   │   ├─ defaultData.json
  │   │   └─ schema.json
  │   └─ basketball_league/
  │
  ├─ academy/
  │   ├─ football_training/
  │   └─ basketball_training/
  │
  └─ club/
      ├─ football_club/
      └─ futsal_club/
```

**Template 정의**:
```typescript
interface Template {
  id: string;
  type: "federation" | "academy" | "club";
  name: string;
  description: string;
  sport: string;
  target?: string;
  operationType?: string;
  
  // 생성될 구조
  menus: string[];
  features: string[];
  defaultData: {
    seasons?: string[];
    announcements?: number;
    programs?: string[];
  };
  
  // 추천 이미지
  recommendedHeroImageCategory?: string;
}
```

**Template Engine**:
```typescript
class TemplateEngine {
  // 템플릿 추천
  recommendTemplates(config: OrganizationConfig): Template[] {
    // Rule 기반 매칭
    let templates = this.templates.filter(t => t.type === config.type);
    
    // 스코어 계산
    templates = templates.map(t => ({
      ...t,
      score: this.calculateMatchScore(t, config)
    }));
    
    // 정렬 및 반환
    return templates.sort((a, b) => b.score - a.score).slice(0, 3);
  }
  
  // 조직 생성
  async generateOrganization(
    config: OrganizationConfig,
    template: Template
  ): Promise<Organization> {
    // 1. Organization 문서 생성
    const organization = await this.createOrganization(config);
    
    // 2. 템플릿 기반 초기 데이터 생성
    await this.createFromTemplate(organization.id, template);
    
    // 3. 사이트 구조 생성
    await this.generateWebsite(organization.id, template);
    
    return organization;
  }
}
```

---

### 3️⃣ League Operation System

**리그 운영 기능**

**핵심 기능**:
- Season 관리
- League 생성/관리
- Team 등록/승인
- Player 관리
- Match 일정 생성 (자동 스케줄링)
- 결과 입력
- Standings 자동 계산

**데이터 구조**:
```
Organization
 ├─ Seasons
 │   ├─ Leagues
 │   │   ├─ League Teams
 │   │   ├─ League Matches
 │   │   └─ League Standings
 │   │
 │   └─ Season Settings
 │
 └─ Federation Teams
     └─ Players
```

**자동 스케줄링**:
```typescript
// Round Robin 자동 생성
generateRoundRobinSchedule(teams: Team[], options: ScheduleOptions): Match[]

// Tournament 자동 생성
generateTournamentSchedule(teams: Team[], options: ScheduleOptions): Match[]

// Hybrid (조별 리그 + 토너먼트)
generateHybridSchedule(teams: Team[], options: ScheduleOptions): Match[]
```

**Cloud Functions 트리거**:
```typescript
// 경기 결과 입력 시 순위 자동 업데이트
onLeagueMatchWrite → updateStandings()

// 팀 등록 시 통계 자동 업데이트
onLeagueTeamWrite → updateLeagueStats()

// 리그 생성 시 통계 자동 업데이트
onLeagueWrite → updateOrganizationStats()
```

---

### 4️⃣ Website System

**각 조직의 자동 웹사이트**

**URL 구조**:
```
yago.io/{organizationType}s/{slug}
  → Public Website

yago.io/admin/{organizationType}s/{slug}
  → Admin Dashboard
```

**사이트 구조**:
```
Organization Website
 ├─ Hero Section (생성된 이미지)
 ├─ Organization 소개
 ├─ Teams
 ├─ Matches
 ├─ Standings
 ├─ News / Announcements
 └─ Contact
```

**Website Generator**:
```typescript
class WebsiteGenerator {
  async generateWebsite(
    organizationId: string,
    template: Template
  ): Promise<void> {
    // 1. 사이트 설정 생성
    await this.createSiteConfig(organizationId, template);
    
    // 2. 메뉴 구조 생성
    await this.createMenus(organizationId, template.menus);
    
    // 3. 기본 페이지 생성
    await this.createDefaultPages(organizationId, template);
    
    // 4. Hero Section 설정
    await this.setupHeroSection(organizationId);
  }
}
```

---

## 🏗️ Frontend 구조

### 기술 스택

```
React 19
TypeScript
Tailwind CSS
React Router v7
Firebase SDK
```

### 앱 구조

```
src/
├── apps/
│   ├── organization-builder/    # Wizard UI
│   │   ├── pages/
│   │   │   └── OrganizationCreatePage.tsx
│   │   └── components/
│   │       └── wizard/
│   │
│   ├── dashboard/               # Admin Dashboard
│   │   ├── pages/
│   │   │   └── OrganizationDashboard.tsx
│   │   └── components/
│   │       └── organization/
│   │
│   └── website/                 # Public Website
│       ├── pages/
│       │   └── OrganizationWebsite.tsx
│       └── components/
│           └── public/
│
├── shared/
│   ├── components/              # 공통 컴포넌트
│   ├── hooks/                   # 공통 훅
│   ├── services/                # API 서비스
│   └── types/                   # 타입 정의
│
└── lib/
    ├── firebase/                # Firebase 설정
    ├── templates/               # 템플릿 로직
    └── utils/                   # 유틸리티
```

---

## 🔧 Backend 구조

### API Server

```
functions/
├── organization/
│   ├── createOrganization.ts
│   ├── getOrganization.ts
│   └── updateOrganization.ts
│
├── league/
│   ├── createLeague.ts
│   ├── generateSchedule.ts
│   └── updateStandings.ts
│
├── team/
│   ├── registerTeam.ts
│   └── approveTeam.ts
│
└── match/
    ├── createMatch.ts
    └── recordResult.ts
```

### Cloud Functions 트리거

```typescript
// 자동 집계 트리거
onLeagueMatchWrite → updateStandings()
onLeagueTeamWrite → updateLeagueStats()
onLeagueWrite → updateOrganizationStats()

// 검색 인덱스 업데이트
onOrganizationWrite → updateSearchIndex()
onTeamWrite → updateSearchIndex()
```

---

## 🗄️ Database 구조 (Firestore)

### 주요 컬렉션

```
organizations/{organizationId}
  ├─ type: "federation" | "academy" | "club"
  ├─ name, slug, sport, region
  ├─ logoUrl, heroImageUrl
  ├─ templateId
  └─ ownerId, adminIds

seasons/{seasonId}
  ├─ federationId
  ├─ name, year, period
  └─ startDate, endDate

leagues/{leagueId}
  ├─ seasonId, federationId
  ├─ name, slug, format
  └─ status, teamCount, matchCount

league_teams/{leagueTeamId}
  ├─ leagueId, teamId
  ├─ status: "pending" | "approved"
  └─ matchesPlayed, wins, points, rank

league_matches/{matchId}
  ├─ leagueId
  ├─ homeTeamId, awayTeamId
  ├─ scheduledAt, status
  └─ homeScore, awayScore

league_standings/{leagueId}_{teamId}
  ├─ leagueId, teamId
  ├─ games, wins, draws, losses
  ├─ goalsFor, goalsAgainst
  └─ points, rank

teams/{teamId}
  ├─ name, sportType, region
  ├─ logoUrl
  └─ ownerUid

players/{playerId}
  ├─ teamId, userId
  ├─ name, position, jerseyNumber
  └─ stats

organization_stats/{organizationId}
  ├─ teamCount, playerCount
  ├─ matchCount, seasonCount
  └─ lastUpdatedAt
```

---

## 📦 Media Storage

### Firebase Storage 구조

```
organizations/
  ├─ {organizationId}/
  │   ├─ logo/
  │   │   └─ logo.jpg
  │   └─ hero/
  │       └─ hero.jpg
  │
  └─ hero_library/
      ├─ football/
      │   ├─ stadium_01.jpg
      │   └─ training_01.jpg
      ├─ academy/
      │   └─ kids_training_01.jpg
      └─ generic/
          └─ sports_01.jpg

teams/
  └─ {teamId}/
      └─ logo/
          └─ logo.jpg

players/
  └─ {playerId}/
      └─ photo/
          └─ photo.jpg
```

---

## 🔄 생성 흐름

```
User
  │
  ▼
Organization Builder (Wizard)
  │
  ├─ Step 1-6: 정보 수집
  │
  ├─ Step 7: Template 추천
  │
  └─ 생성 버튼 클릭
      │
      ▼
Template Engine
  │
  ├─ Template 선택
  │
  └─ Organization Generator 호출
      │
      ▼
Organization Generator
  │
  ├─ 1. Organization 문서 생성
  │
  ├─ 2. 이미지 업로드 (Storage)
  │
  ├─ 3. 템플릿 기반 초기 데이터 생성
  │   ├─ Season 생성
  │   ├─ 기본 League 생성
  │   └─ 샘플 Announcement 생성
  │
  ├─ 4. Website 생성
  │   ├─ 사이트 설정
  │   ├─ 메뉴 구조
  │   └─ 기본 페이지
  │
  └─ 5. Dashboard 생성
      │
      ▼
Organization Dashboard (Landing)
  │
  ├─ Hero Section 표시
  │
  ├─ Quick Actions 표시
  │
  └─ Stats 표시
      │
      ▼
사용자 작업 시작
  │
  ├─ 리그 생성
  ├─ 팀 등록
  ├─ 경기 일정
  └─ 결과 입력
```

---

## 🏢 Multi-Tenant Architecture

**초기부터 설계해야 하는 핵심 구조**

### 왜 중요한가?

1. **데이터 격리**: 각 조직의 데이터 완전 분리
2. **확장성**: 수천 개 조직 지원 가능
3. **보안**: 조직 간 데이터 접근 방지
4. **성능**: 조직별 최적화 가능

### 구조 설계

```
Platform (Multi-Tenant)
 │
 ├─ Tenant 1: 노원구 축구협회
 │   ├─ Data: organizations/fed-nowon-football/...
 │   ├─ Storage: organizations/fed-nowon-football/...
 │   └─ Website: yago.io/federations/no-won-football
 │
 ├─ Tenant 2: 강남구 농구협회
 │   ├─ Data: organizations/fed-gangnam-basketball/...
 │   ├─ Storage: organizations/fed-gangnam-basketball/...
 │   └─ Website: yago.io/federations/gangnam-basketball
 │
 └─ Tenant 3: 서울 축구 아카데미
     ├─ Data: organizations/academy-seoul-football/...
     ├─ Storage: organizations/academy-seoul-football/...
     └─ Website: yago.io/academies/seoul-football
```

### 데이터 격리 전략

**1. 컬렉션 레벨 격리**:
```typescript
// 각 조직의 데이터는 organizationId로 필터링
organizations/{organizationId}
leagues?organizationId={organizationId}
teams?organizationId={organizationId}
```

**2. Firestore Rules**:
```javascript
match /organizations/{organizationId} {
  allow read: if request.auth != null;
  allow write: if request.auth.uid == resource.data.ownerId 
              || request.auth.uid in resource.data.adminIds;
  
  match /leagues/{leagueId} {
    allow read: if request.auth != null;
    allow write: if request.auth.uid == get(/databases/$(database)/documents/organizations/$(organizationId)).data.ownerId;
  }
}
```

**3. Storage 격리**:
```
organizations/{organizationId}/logo/
organizations/{organizationId}/hero/
```

### Tenant Context

```typescript
// 현재 조직 컨텍스트
interface TenantContext {
  organizationId: string;
  organizationType: "federation" | "academy" | "club";
  slug: string;
  permissions: {
    isOwner: boolean;
    isAdmin: boolean;
    isManager: boolean;
  };
}

// 모든 API 호출에 organizationId 포함
const apiCall = async (endpoint: string, data: any) => {
  return fetch(`${endpoint}?organizationId=${tenantContext.organizationId}`, {
    method: "POST",
    body: JSON.stringify(data)
  });
};
```

---

## 📊 플랫폼 확장성

### 현재 지원

```
✅ Federations (협회)
✅ Academies (아카데미)
✅ Clubs (클럽)
✅ Leagues (리그)
✅ Tournaments (토너먼트)
✅ Teams (팀)
✅ Players (선수)
```

### 향후 확장 가능

```
🔜 대회 시스템
🔜 선수 통계 분석
🔜 스카우팅 시스템
🔜 영상 관리
🔜 결제 시스템
🔜 모바일 앱
```

---

## 🎯 핵심 가치

### 1. 자동 조직 생성

**3분 생성**:
- AI Wizard로 빠른 설정
- 템플릿 기반 자동 생성
- 즉시 운영 가능

### 2. 리그 운영 시스템

**완전 자동화**:
- 일정 자동 생성
- 순위 자동 계산
- 통계 자동 집계

### 3. 조직 웹사이트 자동 생성

**CMS 불필요**:
- 템플릿 기반 자동 생성
- Hero 이미지 자동 적용
- 메뉴 구조 자동 생성

### 4. Multi-Tenant 확장성

**수천 개 조직 지원**:
- 데이터 완전 격리
- 조직별 독립 운영
- 성능 최적화 가능

---

## ✅ 구현 체크리스트

### Phase 1: 기본 구조
- [ ] Organization Builder (Wizard)
- [ ] Template System
- [ ] Organization Generator
- [ ] Multi-Tenant 데이터 구조

### Phase 2: 리그 운영
- [ ] League Operation System
- [ ] 자동 스케줄링
- [ ] 순위 자동 계산
- [ ] 통계 자동 집계

### Phase 3: 웹사이트
- [ ] Website Generator
- [ ] Public Website
- [ ] Hero Section
- [ ] 메뉴 시스템

### Phase 4: 대시보드
- [ ] Organization Dashboard
- [ ] Quick Actions
- [ ] Stats Dashboard
- [ ] Activity Feed

---

## 🚀 Cursor에게 전달할 지시

```
Implement YAGO as a multi-tenant sports organization platform.
Use React + TypeScript + Tailwind for frontend.
Use Firebase (Firestore + Storage + Functions) for backend.
Implement template-based organization generation.
Create automatic league scheduling and standings calculation.
Design with multi-tenant architecture from the start.
Each organization should have isolated data and storage.
```

---

이 구조를 구현하면 **YAGO가 진짜 플랫폼이 됩니다!** 🚀
