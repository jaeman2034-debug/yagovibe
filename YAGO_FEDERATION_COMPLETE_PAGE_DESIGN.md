# 📄 YAGO VIBE SPORTS - 노원구 축구협회 완성형 페이지 설계

> **작성일**: 2024년  
> **목적**: 실제 개발 가능한 수준의 페이지별 상세 설계

---

## 📋 목차

1. [홈페이지 (메인)](#1-홈페이지-메인)
2. [협회소개 페이지](#2-협회소개-페이지)
3. [공지사항 페이지](#3-공지사항-페이지)
4. [대회/리그 페이지](#4-대회리그-페이지)
5. [경기센터 페이지](#5-경기센터-페이지)
6. [팀/클럽 페이지](#6-팀클럽-페이지)
7. [규정/자료실 페이지](#7-규정자료실-페이지)
8. [후원사 페이지](#8-후원사-페이지)
9. [관리자 대시보드](#9-관리자-대시보드)

---

## 1️⃣ 홈페이지 (메인)

### 경로: `/federations/nowon-football`

### 컴포넌트 구조

```tsx
// src/pages/federations/FederationHomePage.tsx
export default function FederationHomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <FederationHeader />
      <FederationTabs />
      <FederationHero />
      <ActiveTournaments />
      <TodayMatches />
      <CurrentStandings />
      <FeaturedClubs />
      <SponsorsBanner />
      <AIChatbot />
      <Footer />
    </div>
  );
}
```

### 섹션별 컴포넌트

#### FederationHero

```tsx
// src/components/federation/FederationHero.tsx
export function FederationHero({ federation }: { federation: Federation }) {
  return (
    <section className="bg-gradient-to-r from-blue-600 to-green-600 text-white py-16">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-4xl font-bold mb-4">{federation.name}</h1>
        <p className="text-xl mb-8">{federation.description}</p>
        <div className="flex gap-4">
          <Button href="/tournaments">대회 보기</Button>
          <Button href="/matches" variant="outline">경기 일정</Button>
          <Button href="/docs" variant="outline">참가 신청</Button>
        </div>
        <div className="grid grid-cols-4 gap-4 mt-8">
          <StatCard label="진행중 리그" value={4} />
          <StatCard label="참가 팀" value={24} />
          <StatCard label="총 경기" value={66} />
          <StatCard label="등록 선수" value={312} />
        </div>
      </div>
    </section>
  );
}
```

#### ActiveTournaments

```tsx
// src/components/federation/ActiveTournaments.tsx
export function ActiveTournaments({ federationId }: { federationId: string }) {
  const { tournaments, loading } = useTournaments(federationId, {
    status: "active",
    limit: 3,
  });

  return (
    <section className="max-w-7xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-4">진행중 대회</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tournaments.map((tournament) => (
          <TournamentCard key={tournament.id} tournament={tournament} />
        ))}
      </div>
    </section>
  );
}
```

#### TodayMatches

```tsx
// src/components/federation/TodayMatches.tsx
export function TodayMatches({ federationId }: { federationId: string }) {
  const { matches, loading } = useMatches(federationId, {
    date: today(),
    limit: 5,
  });

  return (
    <section className="max-w-7xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-4">오늘 경기</h2>
      <div className="space-y-3">
        {matches.map((match) => (
          <MatchCard key={match.id} match={match} />
        ))}
      </div>
    </section>
  );
}
```

#### CurrentStandings

```tsx
// src/components/federation/CurrentStandings.tsx
export function CurrentStandings({ federationId }: { federationId: string }) {
  const { standings, loading } = useStandings(federationId, {
    limit: 5,
  });

  return (
    <section className="max-w-7xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-4">현재 순위 TOP 5</h2>
      <StandingsTable standings={standings} />
      <Button href="/standings" variant="outline">전체 순위 보기</Button>
    </section>
  );
}
```

#### FeaturedClubs

```tsx
// src/components/federation/FeaturedClubs.tsx
export function FeaturedClubs({ federationId }: { federationId: string }) {
  const { clubs, loading } = useClubs(federationId, {
    featured: true,
    limit: 6,
  });

  return (
    <section className="max-w-7xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-4">참가 클럽</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {clubs.map((club) => (
          <ClubCard key={club.id} club={club} />
        ))}
      </div>
      <Button href="/clubs" variant="outline">전체 클럽 보기</Button>
    </section>
  );
}
```

#### SponsorsBanner

```tsx
// src/components/federation/SponsorsBanner.tsx
export function SponsorsBanner({ federationId }: { federationId: string }) {
  const { sponsors, loading } = useSponsors(federationId, {
    type: "official",
    limit: 4,
  });

  return (
    <section className="bg-white border-t border-gray-200 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-2xl font-bold mb-4">공식 후원사</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {sponsors.map((sponsor) => (
            <SponsorCard key={sponsor.id} sponsor={sponsor} />
          ))}
        </div>
      </div>
    </section>
  );
}
```

#### AIChatbot

```tsx
// src/components/federation/AIChatbot.tsx
export function AIChatbot({ federationId }: { federationId: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <ChatWindow federationId={federationId} onClose={() => setIsOpen(false)} />
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
```

---

## 2️⃣ 협회소개 페이지

### 경로: `/federations/nowon-football/about`

### 컴포넌트 구조

```tsx
// src/pages/federations/FederationAboutPage.tsx
export default function FederationAboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <FederationHeader />
      <FederationTabs activeTab="about" />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <AboutTabs />
        <AboutContent />
      </div>
      
      <Footer />
    </div>
  );
}
```

### AboutTabs

```tsx
// src/components/federation/about/AboutTabs.tsx
export function AboutTabs() {
  const [activeTab, setActiveTab] = useState("greeting");

  const tabs = [
    { id: "greeting", label: "협회장 인사말" },
    { id: "congratulation", label: "축사" },
    { id: "history", label: "협회 연혁" },
    { id: "vision", label: "협회 비전" },
    { id: "organization", label: "조직도" },
    { id: "advisors", label: "고문단" },
    { id: "executives", label: "임원단" },
    { id: "presidents", label: "회장단" },
    { id: "coaches", label: "감독단" },
    { id: "consultants", label: "자문위원" },
    { id: "location", label: "오시는 길" },
  ];

  return (
    <div className="flex border-b mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`px-4 py-2 ${
            activeTab === tab.id
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

### AboutContent

```tsx
// src/components/federation/about/AboutContent.tsx
export function AboutContent({ activeTab, federationId }: { activeTab: string; federationId: string }) {
  const { data, loading } = useAboutContent(federationId, activeTab);

  switch (activeTab) {
    case "greeting":
      return <GreetingSection content={data} />;
    case "congratulation":
      return <CongratulationSection content={data} />;
    case "history":
      return <HistorySection content={data} />;
    case "vision":
      return <VisionSection content={data} />;
    case "organization":
      return <OrganizationChart content={data} />;
    case "advisors":
      return <AdvisorsSection content={data} />;
    case "executives":
      return <ExecutivesSection content={data} />;
    case "presidents":
      return <PresidentsSection content={data} />;
    case "coaches":
      return <CoachesSection content={data} />;
    case "consultants":
      return <ConsultantsSection content={data} />;
    case "location":
      return <LocationSection content={data} />;
    default:
      return null;
  }
}
```

---

## 3️⃣ 공지사항 페이지

### 경로: `/federations/nowon-football/notices`

### 컴포넌트 구조

```tsx
// src/pages/federations/FederationNoticesPage.tsx
export default function FederationNoticesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <FederationHeader />
      <FederationTabs activeTab="notices" />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <NoticeFilters />
        <NoticeList />
      </div>
      
      <Footer />
    </div>
  );
}
```

### NoticeFilters

```tsx
// src/components/federation/notices/NoticeFilters.tsx
export function NoticeFilters({ onFilterChange }: { onFilterChange: (filters: any) => void }) {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");

  return (
    <div className="mb-6 flex gap-4">
      <select
        value={category}
        onChange={(e) => {
          setCategory(e.target.value);
          onFilterChange({ category: e.target.value, search });
        }}
        className="px-4 py-2 border rounded-lg"
      >
        <option value="all">전체</option>
        <option value="important">중요</option>
        <option value="tournament">대회</option>
        <option value="schedule">일정</option>
        <option value="general">일반</option>
      </select>
      <input
        type="text"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          onFilterChange({ category, search: e.target.value });
        }}
        placeholder="검색..."
        className="flex-1 px-4 py-2 border rounded-lg"
      />
    </div>
  );
}
```

### NoticeList

```tsx
// src/components/federation/notices/NoticeList.tsx
export function NoticeList({ federationId, filters }: { federationId: string; filters: any }) {
  const { notices, loading } = useNotices(federationId, filters);

  return (
    <div className="space-y-4">
      {notices.map((notice) => (
        <NoticeCard key={notice.id} notice={notice} />
      ))}
    </div>
  );
}
```

---

## 4️⃣ 대회/리그 페이지

### 경로: `/federations/nowon-football/tournaments`

### 컴포넌트 구조

```tsx
// src/pages/federations/FederationTournamentsPage.tsx
export default function FederationTournamentsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <FederationHeader />
      <FederationTabs activeTab="tournaments" />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <TournamentFilters />
        <TournamentList />
      </div>
      
      <Footer />
    </div>
  );
}
```

### 대회 상세 페이지

### 경로: `/federations/nowon-football/tournaments/:tournamentId`

```tsx
// src/pages/federations/TournamentDetailPage.tsx
export default function TournamentDetailPage() {
  const { tournamentId } = useParams();
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "개요" },
    { id: "bracket", label: "대진표" },
    { id: "teams", label: "참가팀" },
    { id: "schedule", label: "일정" },
    { id: "regulations", label: "규정" },
    { id: "notices", label: "공지" },
    { id: "results", label: "결과" },
    { id: "media", label: "사진" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <FederationHeader />
      
      <TournamentHeader tournamentId={tournamentId} />
      <TournamentTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <TournamentContent tournamentId={tournamentId} activeTab={activeTab} />
      </div>
      
      <Footer />
    </div>
  );
}
```

---

## 5️⃣ 경기센터 페이지

### 경로: `/federations/nowon-football/matches`

### 컴포넌트 구조

```tsx
// src/pages/federations/FederationMatchesPage.tsx
export default function FederationMatchesPage() {
  const [activeTab, setActiveTab] = useState("schedule");

  const tabs = [
    { id: "schedule", label: "경기 일정" },
    { id: "results", label: "경기 결과" },
    { id: "standings", label: "순위" },
    { id: "scorers", label: "득점 랭킹" },
    { id: "assists", label: "도움 랭킹" },
    { id: "discipline", label: "징계" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <FederationHeader />
      <FederationTabs activeTab="matches" />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <MatchTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        <MatchContent activeTab={activeTab} />
      </div>
      
      <Footer />
    </div>
  );
}
```

---

## 6️⃣ 팀/클럽 페이지

### 경로: `/federations/nowon-football/clubs`

### 컴포넌트 구조

```tsx
// src/pages/federations/FederationClubsPage.tsx
export default function FederationClubsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <FederationHeader />
      <FederationTabs activeTab="clubs" />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <ClubFilters />
        <ClubList />
      </div>
      
      <Footer />
    </div>
  );
}
```

### 클럽 상세 페이지

### 경로: `/federations/nowon-football/clubs/:clubId`

```tsx
// src/pages/federations/ClubDetailPage.tsx
export default function ClubDetailPage() {
  const { clubId } = useParams();
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "개요" },
    { id: "members", label: "멤버" },
    { id: "matches", label: "경기" },
    { id: "records", label: "기록" },
    { id: "media", label: "미디어" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <FederationHeader />
      
      <ClubHeader clubId={clubId} />
      <ClubTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <ClubContent clubId={clubId} activeTab={activeTab} />
      </div>
      
      <Footer />
    </div>
  );
}
```

---

## 7️⃣ 규정/자료실 페이지

### 경로: `/federations/nowon-football/docs`

### 컴포넌트 구조

```tsx
// src/pages/federations/FederationDocsPage.tsx
export default function FederationDocsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <FederationHeader />
      <FederationTabs activeTab="docs" />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <DocCategories />
        <DocList />
        <FAQSection />
      </div>
      
      <Footer />
    </div>
  );
}
```

---

## 8️⃣ 후원사 페이지

### 경로: `/federations/nowon-football/sponsors`

### 컴포넌트 구조

```tsx
// src/pages/federations/FederationSponsorsPage.tsx
export default function FederationSponsorsPage() {
  const [activeTab, setActiveTab] = useState("official");

  const tabs = [
    { id: "official", label: "공식 후원사" },
    { id: "hospital", label: "협력 병원" },
    { id: "equipment", label: "스포츠 브랜드" },
    { id: "restaurant", label: "식당" },
    { id: "local", label: "지역 업체" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <FederationHeader />
      <FederationTabs activeTab="sponsors" />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <SponsorTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        <SponsorList activeTab={activeTab} />
        <SponsorInquiry />
      </div>
      
      <Footer />
    </div>
  );
}
```

---

## 9️⃣ 관리자 대시보드

### 경로: `/federations/nowon-football/admin`

### 컴포넌트 구조

```tsx
// src/pages/federations/FederationAdminDashboard.tsx
export default function FederationAdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="flex">
        <AdminSidebar />
        
        <div className="flex-1">
          <AdminHeader />
          <AdminKPICards />
          <AdminQuickActions />
          <AdminWidgets />
        </div>
      </div>
    </div>
  );
}
```

### AdminSidebar

```tsx
// src/components/federation/admin/AdminSidebar.tsx
export function AdminSidebar() {
  const menuItems = [
    { id: "dashboard", label: "운영 대시보드", icon: LayoutDashboard },
    { id: "tournaments", label: "대회 관리", icon: Trophy },
    { id: "leagues", label: "리그 관리", icon: Calendar },
    { id: "seasons", label: "시즌 관리", icon: Calendar },
    { id: "teams", label: "팀 승인", icon: Users },
    { id: "players", label: "선수 등록", icon: User },
    { id: "matches", label: "경기 관리", icon: Calendar },
    { id: "results", label: "결과 입력", icon: CheckCircle },
    { id: "standings", label: "순위 관리", icon: BarChart },
    { id: "notices", label: "공지 관리", icon: Bell },
    { id: "organization", label: "조직 관리", icon: Building2 },
    { id: "sponsors", label: "후원사 관리", icon: Trophy },
    { id: "inquiries", label: "문의 관리", icon: MessageSquare },
    { id: "ai", label: "AI 운영", icon: Bot },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <div className="p-4">
        <h2 className="text-lg font-bold">관리자 메뉴</h2>
      </div>
      <nav className="space-y-1">
        {menuItems.map((item) => (
          <Link
            key={item.id}
            to={`/admin/${item.id}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100"
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

### AdminKPICards

```tsx
// src/components/federation/admin/AdminKPICards.tsx
export function AdminKPICards({ federationId }: { federationId: string }) {
  const { stats, loading } = useAdminStats(federationId);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6">
      <KPICard label="진행중 리그" value={stats.activeLeagues} />
      <KPICard label="진행중 시즌" value={stats.activeSeasons} />
      <KPICard label="참가 팀" value={stats.totalTeams} />
      <KPICard label="등록 선수" value={stats.totalPlayers} />
      <KPICard label="금주 경기" value={stats.weeklyMatches} />
      <KPICard label="결과 미입력" value={stats.pendingResults} color="red" />
    </div>
  );
}
```

### AdminQuickActions

```tsx
// src/components/federation/admin/AdminQuickActions.tsx
export function AdminQuickActions() {
  return (
    <div className="p-6 bg-white border-b border-gray-200">
      <h2 className="text-lg font-semibold mb-4">빠른 액션</h2>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => navigate("/admin/tournaments/create")}>
          <Trophy className="w-4 h-4 mr-2" />
          리그 생성
        </Button>
        <Button onClick={() => navigate("/admin/seasons/create")}>
          <Calendar className="w-4 h-4 mr-2" />
          시즌 생성
        </Button>
        <Button onClick={() => navigate("/admin/notices/create")}>
          <Bell className="w-4 h-4 mr-2" />
          공지 작성
        </Button>
        <Button onClick={() => navigate("/admin/teams/approval")}>
          <CheckCircle className="w-4 h-4 mr-2" />
          팀 승인 처리
        </Button>
      </div>
    </div>
  );
}
```

### AdminWidgets

```tsx
// src/components/federation/admin/AdminWidgets.tsx
export function AdminWidgets({ federationId }: { federationId: string }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
      <PendingTeamsWidget federationId={federationId} />
      <PendingResultsWidget federationId={federationId} />
      <RecentNoticesWidget federationId={federationId} />
      <UpcomingMatchesWidget federationId={federationId} />
    </div>
  );
}
```

---

## ✅ 공통 컴포넌트

### FederationHeader

```tsx
// src/components/federation/FederationHeader.tsx
export function FederationHeader({ federationId }: { federationId: string }) {
  const { federation, loading } = useFederation(federationId);
  const { user } = useAuth();
  const isAdmin = useIsFederationAdmin(federationId, user?.uid);

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{federation?.name}</h1>
            <p className="text-gray-600 mt-1">{federation?.description}</p>
          </div>
          {isAdmin && (
            <Button href={`/federations/${federationId}/admin`}>
              <Settings className="w-4 h-4 mr-2" />
              관리자
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

### FederationTabs

```tsx
// src/components/federation/FederationTabs.tsx
export function FederationTabs({ activeTab, federationId }: { activeTab?: string; federationId: string }) {
  const tabs = [
    { id: "home", label: "홈", path: `/federations/${federationId}` },
    { id: "about", label: "협회소개", path: `/federations/${federationId}/about` },
    { id: "notices", label: "공지", path: `/federations/${federationId}/notices` },
    { id: "tournaments", label: "대회/리그", path: `/federations/${federationId}/tournaments` },
    { id: "matches", label: "경기일정", path: `/federations/${federationId}/matches` },
    { id: "results", label: "결과/순위", path: `/federations/${federationId}/results` },
    { id: "clubs", label: "참가팀/클럽", path: `/federations/${federationId}/clubs` },
    { id: "docs", label: "규정/자료실", path: `/federations/${federationId}/docs` },
    { id: "sponsors", label: "후원사", path: `/federations/${federationId}/sponsors` },
    { id: "youth", label: "유소년", path: `/federations/${federationId}/youth` },
    { id: "contact", label: "문의하기", path: `/federations/${federationId}/contact` },
  ];

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              to={tab.path}
              className={`px-4 py-3 text-sm font-medium ${
                activeTab === tab.id
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

**작성일**: 2024년  
**상태**: ✅ 노원구 축구협회 완성형 페이지 설계 완료
