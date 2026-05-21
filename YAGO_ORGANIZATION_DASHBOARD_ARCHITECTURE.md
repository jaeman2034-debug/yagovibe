# YAGO Organization Dashboard - UI 아키텍처 (핵심 Landing)

## 🎯 목표

**Wizard 생성 완료 직후 첫 화면** - 사용자가 바로 운영을 시작할 수 있도록

**핵심 원칙**: 생성 → 바로 운영 (Quick Actions 중심)

---

## 📊 전체 구조

```
Organization Dashboard
 │
 ├─ Header (글로벌 네비게이션)
 │
 ├─ Hero Section (생성된 이미지 사용)
 │
 ├─ Quick Actions (핵심 기능 바로가기)
 │
 ├─ Organization Overview (현재 상태)
 │
 └─ Recent Activity (최근 활동)
```

---

## 🎨 화면 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│  [Header]                                               │
│  YAGO Logo | 노원구 축구협회 | 알림 | 프로필            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Hero Section]                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  [Hero Image - Full Width]                      │   │
│  │                                                  │   │
│  │  노원구 축구협회                                 │   │
│  │  지역 생활체육 축구 리그 운영                    │   │
│  │                                                  │   │
│  │  [사이트 보기] [관리자 설정]                    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [Quick Actions]                                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ + 리그   │  │ + 팀     │  │ + 경기   │           │
│  │ 생성     │  │ 등록     │  │ 일정     │           │
│  └──────────┘  └──────────┘  └──────────┘           │
│  ┌──────────┐                                         │
│  │ + 공지   │                                         │
│  │ 작성     │                                         │
│  └──────────┘                                         │
│                                                         │
│  [Organization Overview]                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ Teams    │  │ Players  │  │ Matches  │           │
│  │   12     │  │   240    │  │   36     │           │
│  └──────────┘  └──────────┘  └──────────┘           │
│  ┌──────────┐                                         │
│  │ Seasons  │                                         │
│  │    1     │                                         │
│  └──────────┘                                         │
│                                                         │
│  [Recent Activity]                                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │ • 상계유나이티드 팀 등록 (2시간 전)            │   │
│  │ • 노원FC 경기 결과 입력 (5시간 전)              │   │
│  │ • 2026 시즌 생성 (1일 전)                      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🧩 React 컴포넌트 구조

```typescript
OrganizationDashboard
 ├─ DashboardHeader
 ├─ HeroSection
 ├─ QuickActions
 ├─ OverviewStats
 └─ ActivityFeed
```

---

## 📱 컴포넌트 상세

### 1. DashboardHeader

**글로벌 네비게이션**

```typescript
interface DashboardHeaderProps {
  organization: Organization;
  user: User;
}

export default function DashboardHeader({
  organization,
  user
}: DashboardHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Logo + Organization Name */}
          <div className="flex items-center gap-4">
            <Link to="/" className="text-xl font-bold text-blue-600">
              YAGO
            </Link>
            <div className="text-gray-400">|</div>
            <div className="font-semibold text-gray-900">
              {organization.name}
            </div>
          </div>
          
          {/* Right: Actions */}
          <div className="flex items-center gap-4">
            {/* Organization Switcher */}
            <button className="text-sm text-gray-600 hover:text-gray-900">
              조직 전환
            </button>
            
            {/* Notifications */}
            <button className="relative">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            
            {/* Profile */}
            <button>
              <img
                src={user.photoURL || "/default-avatar.png"}
                alt={user.displayName}
                className="w-8 h-8 rounded-full"
              />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
```

---

### 2. HeroSection

**생성된 Hero 이미지 사용**

```typescript
interface HeroSectionProps {
  organization: Organization;
}

export default function HeroSection({
  organization
}: HeroSectionProps) {
  return (
    <div className="relative w-full h-[400px] md:h-[500px]">
      {/* Hero Image */}
      <img
        src={organization.heroImageUrl}
        alt={organization.name}
        className="w-full h-full object-cover"
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      
      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white px-4">
        {/* Logo (if exists) */}
        {organization.logoUrl && (
          <img
            src={organization.logoUrl}
            alt="Logo"
            className="w-24 h-24 md:w-32 md:h-32 mb-4 object-contain"
          />
        )}
        
        {/* Organization Name */}
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center">
          {organization.name}
        </h1>
        
        {/* Description */}
        {organization.description && (
          <p className="text-xl md:text-2xl text-center mb-8 max-w-2xl">
            {organization.description}
          </p>
        )}
        
        {/* Actions */}
        <div className="flex gap-4">
          <Link
            to={`/${organization.type}s/${organization.slug}`}
            className="px-6 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            사이트 보기
          </Link>
          <Link
            to={`/admin/${organization.type}s/${organization.slug}/settings`}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            관리자 설정
          </Link>
        </div>
      </div>
    </div>
  );
}
```

---

### 3. QuickActions

**핵심 기능 바로가기**

```typescript
interface QuickActionsProps {
  organizationType: "federation" | "academy" | "club";
  organizationId: string;
}

export default function QuickActions({
  organizationType,
  organizationId
}: QuickActionsProps) {
  const navigate = useNavigate();
  
  // 조직 유형별 다른 액션
  const actions = getActionsByType(organizationType);
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-6">빠른 작업</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => navigate(action.path)}
            className="p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-600 hover:bg-blue-50 transition-all text-left"
          >
            <div className="text-3xl mb-3">{action.icon}</div>
            <div className="font-semibold text-lg mb-2">{action.title}</div>
            <div className="text-sm text-gray-600">{action.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function getActionsByType(
  type: "federation" | "academy" | "club"
): QuickAction[] {
  if (type === "federation") {
    return [
      {
        id: "create-league",
        icon: "🏆",
        title: "리그 생성",
        description: "새 시즌 리그 만들기",
        path: "/admin/federations/{id}/leagues/create"
      },
      {
        id: "register-team",
        icon: "👥",
        title: "팀 등록",
        description: "리그 참가 팀 추가",
        path: "/admin/federations/{id}/teams/register"
      },
      {
        id: "add-match",
        icon: "⚽",
        title: "경기 일정",
        description: "경기 일정 등록",
        path: "/admin/federations/{id}/matches/create"
      },
      {
        id: "create-announcement",
        icon: "📢",
        title: "공지 작성",
        description: "협회 공지 게시",
        path: "/admin/federations/{id}/announcements/create"
      }
    ];
  }
  
  if (type === "academy") {
    return [
      {
        id: "add-coach",
        icon: "👨‍🏫",
        title: "코치 등록",
        description: "새 코치 추가",
        path: "/admin/academies/{id}/coaches/create"
      },
      {
        id: "create-program",
        icon: "📚",
        title: "프로그램 생성",
        description: "훈련 프로그램 만들기",
        path: "/admin/academies/{id}/programs/create"
      },
      {
        id: "register-student",
        icon: "👦",
        title: "선수 등록",
        description: "아카데미 선수 추가",
        path: "/admin/academies/{id}/students/register"
      },
      {
        id: "create-announcement",
        icon: "📢",
        title: "공지 작성",
        description: "아카데미 공지 게시",
        path: "/admin/academies/{id}/announcements/create"
      }
    ];
  }
  
  // Club
  return [
    {
      id: "add-player",
      icon: "👤",
      title: "선수 추가",
      description: "클럽 선수 등록",
      path: "/admin/clubs/{id}/players/add"
    },
    {
      id: "create-match",
      icon: "⚽",
      title: "경기 일정",
      description: "경기 일정 등록",
      path: "/admin/clubs/{id}/matches/create"
    },
    {
      id: "add-result",
      icon: "📊",
      title: "경기 결과",
      description: "경기 결과 입력",
      path: "/admin/clubs/{id}/matches/results"
    },
    {
      id: "create-announcement",
      icon: "📢",
      title: "공지 작성",
      description: "클럽 공지 게시",
      path: "/admin/clubs/{id}/announcements/create"
    }
  ];
}
```

---

### 4. OverviewStats

**현재 조직 상태**

```typescript
interface OverviewStatsProps {
  organizationId: string;
  organizationType: "federation" | "academy" | "club";
}

export default function OverviewStats({
  organizationId,
  organizationType
}: OverviewStatsProps) {
  const { stats, loading } = useOrganizationStats(organizationId, organizationType);
  
  if (loading) {
    return <div>로딩 중...</div>;
  }
  
  const statItems = getStatItemsByType(organizationType, stats);
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-6">현재 상태</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statItems.map((item) => (
          <div
            key={item.id}
            className="bg-white border border-gray-200 rounded-xl p-6"
          >
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {item.value}
            </div>
            <div className="text-sm text-gray-500">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getStatItemsByType(
  type: "federation" | "academy" | "club",
  stats: any
): StatItem[] {
  if (type === "federation") {
    return [
      { id: "teams", label: "Teams", value: stats.teamCount || 0 },
      { id: "players", label: "Players", value: stats.playerCount || 0 },
      { id: "matches", label: "Matches", value: stats.matchCount || 0 },
      { id: "seasons", label: "Seasons", value: stats.seasonCount || 0 }
    ];
  }
  
  if (type === "academy") {
    return [
      { id: "coaches", label: "Coaches", value: stats.coachCount || 0 },
      { id: "students", label: "Students", value: stats.studentCount || 0 },
      { id: "programs", label: "Programs", value: stats.programCount || 0 },
      { id: "classes", label: "Classes", value: stats.classCount || 0 }
    ];
  }
  
  // Club
  return [
    { id: "players", label: "Players", value: stats.playerCount || 0 },
    { id: "matches", label: "Matches", value: stats.matchCount || 0 },
    { id: "wins", label: "Wins", value: stats.winCount || 0 },
    { id: "losses", label: "Losses", value: stats.lossCount || 0 }
  ];
}
```

**Custom Hook**:
```typescript
function useOrganizationStats(
  organizationId: string,
  type: "federation" | "academy" | "club"
) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        const statsData = await getOrganizationStats(organizationId, type);
        setStats(statsData);
      } catch (error) {
        console.error("Stats fetch error:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchStats();
  }, [organizationId, type]);
  
  return { stats, loading };
}
```

---

### 5. ActivityFeed

**최근 활동**

```typescript
interface ActivityFeedProps {
  organizationId: string;
}

export default function ActivityFeed({
  organizationId
}: ActivityFeedProps) {
  const { activities, loading } = useOrganizationActivities(organizationId);
  
  if (loading) {
    return <div>로딩 중...</div>;
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-6">최근 활동</h2>
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        {activities.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            아직 활동이 없습니다.
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0"
              >
                <div className="text-2xl">{activity.icon}</div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {activity.title}
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatTimeAgo(activity.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Activity 데이터 구조**:
```typescript
interface Activity {
  id: string;
  type: "team_registered" | "match_result" | "season_created" | "announcement_created";
  title: string;
  icon: string;
  createdAt: Timestamp;
  link?: string;
}
```

---

## 🗄️ 데이터 구조

### Organization Stats (Firestore)

```typescript
interface OrganizationStats {
  organizationId: string;
  
  // Federation
  teamCount?: number;
  playerCount?: number;
  matchCount?: number;
  seasonCount?: number;
  
  // Academy
  coachCount?: number;
  studentCount?: number;
  programCount?: number;
  classCount?: number;
  
  // Club
  winCount?: number;
  lossCount?: number;
  
  lastUpdatedAt: Timestamp;
}
```

**Cloud Function으로 자동 집계**:
```typescript
// onTeamRegistered → teamCount++
// onMatchCreated → matchCount++
// onSeasonCreated → seasonCount++
```

---

## 🔄 전체 사용자 흐름

```
Organization Builder (Wizard)
        │
        ▼
Organization 생성 완료
        │
        ▼
Organization Dashboard (이 화면)
        │
        ▼
Quick Actions 클릭
        │
        ▼
리그/팀/경기 생성
        │
        ▼
League 운영 시작
```

---

## 📁 파일 구조

```
src/
├── pages/
│   └── organization/
│       └── OrganizationDashboard.tsx
├── components/
│   └── organization/
│       ├── DashboardHeader.tsx
│       ├── HeroSection.tsx
│       ├── QuickActions.tsx
│       ├── OverviewStats.tsx
│       └── ActivityFeed.tsx
├── hooks/
│   ├── useOrganizationStats.ts
│   └── useOrganizationActivities.ts
└── services/
    ├── organizationStatsService.ts
    └── organizationActivityService.ts
```

---

## 🚀 API 구조

### Stats 조회

```typescript
// GET /api/organizations/{id}/stats
export async function getOrganizationStats(
  organizationId: string,
  type: "federation" | "academy" | "club"
): Promise<OrganizationStats> {
  const statsDoc = await getDoc(
    doc(db, "organization_stats", organizationId)
  );
  
  if (!statsDoc.exists()) {
    // 초기값 반환
    return getDefaultStats(type);
  }
  
  return statsDoc.data() as OrganizationStats;
}
```

### Activities 조회

```typescript
// GET /api/organizations/{id}/activities
export async function getOrganizationActivities(
  organizationId: string,
  limit: number = 10
): Promise<Activity[]> {
  const q = query(
    collection(db, "organization_activities"),
    where("organizationId", "==", organizationId),
    orderBy("createdAt", "desc"),
    limit(limit)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Activity[];
}
```

---

## ✅ 구현 체크리스트

- [ ] DashboardHeader 컴포넌트
- [ ] HeroSection 컴포넌트 (생성된 이미지 사용)
- [ ] QuickActions 컴포넌트 (조직 유형별)
- [ ] OverviewStats 컴포넌트
- [ ] ActivityFeed 컴포넌트
- [ ] useOrganizationStats 훅
- [ ] useOrganizationActivities 훅
- [ ] Stats 자동 집계 Cloud Function
- [ ] Activity 로깅 시스템

---

## 🎯 핵심 가치

### 1. 생성 → 바로 운영

**Wizard 완료 직후**:
- Hero 이미지가 바로 표시됨
- Quick Actions로 즉시 작업 시작
- 상태 파악 가능

### 2. 관리자 길 잃지 않음

**명확한 액션**:
- 가장 많이 쓰는 기능이 바로 보임
- 조직 유형별 맞춤 액션
- 한 번의 클릭으로 작업 시작

### 3. 플랫폼 완성도 상승

**프로페셔널한 느낌**:
- SportsEngine/LeagueApps 수준의 UX
- 일관된 디자인 시스템
- 직관적인 네비게이션

---

## 🔥 Cursor에게 전달할 지시

```
Implement this as a React + Tailwind dashboard landing page.
Use the hero image and logo from the organization creation wizard.
Create quick action cards that vary by organization type (federation/academy/club).
Display real-time stats using Firestore queries.
Show recent activities in a feed format.
Make all quick actions navigate to the appropriate creation pages.
```

---

이 구조를 구현하면 **YAGO가 진짜 플랫폼처럼 보입니다!** 🚀
