# 🔥 마이페이지 컴포넌트 구조 설계 (STEP 3)

## 📐 전체 컴포넌트 트리

```
MePage (src/pages/me/MePage.tsx)
└─ MePageLayout
   ├─ IdentityHeader (항상 렌더링)
   ├─ PersonaSection (Persona별 분기)
   │   ├─ PersonaP0NewUser
   │   ├─ PersonaP1Individual
   │   ├─ PersonaP2TeamMember
   │   ├─ PersonaP3TeamCaptain
   │   └─ PersonaP4AssociationAdmin
   └─ OpportunitySection (조건부 렌더링)
```

---

## 🟦 ① IdentityHeader (공통 컴포넌트)

**파일**: `src/components/me/IdentityHeader.tsx`

**Props:**
```typescript
interface IdentityHeaderProps {
  user: User | null;
  persona: Persona;
  stats: {
    teamCount: number;
    tournamentCount: number;
    recordCount: number;
  };
  onSettings: () => void;
  onLogout: () => void;
}
```

**구성:**
```typescript
<IdentityHeader>
  <Avatar src={user?.photoURL} />
  <Name>{user?.displayName || user?.email?.split("@")[0] || "게스트"}</Name>
  <SportTag>{user?.sportType || "미설정"}</SportTag>
  <AccountTypeBadge persona={persona} />
  <ActivitySummary>
    <StatItem label="팀" value={stats.teamCount} />
    <StatItem label="대회" value={stats.tournamentCount} />
    <StatItem label="기록" value={stats.recordCount} />
  </ActivitySummary>
  <SettingsButton onClick={onSettings} />
  <LogoutButton onClick={onLogout} />
</IdentityHeader>
```

**핵심 원칙:**
- 데이터 없으면 0, "-", "미설정" 표시
- 절대 에러 / Empty UI 없음
- 모든 Persona 공통 사용

---

## 🟩 ② PersonaSection (Persona별 컴포넌트)

### 📁 파일 구조

```
src/components/me/persona/
├── PersonaP0NewUser.tsx
├── PersonaP1Individual.tsx
├── PersonaP2TeamMember.tsx
├── PersonaP3TeamCaptain.tsx
└── PersonaP4AssociationAdmin.tsx
```

### 🔹 PersonaP0NewUser

**파일**: `src/components/me/persona/PersonaP0NewUser.tsx`

**Props:**
```typescript
interface PersonaP0NewUserProps {
  user: User | null;
  onSelectPersona: (type: 'individual' | 'team' | 'admin') => void;
  onCreateTeam: () => void;
  onJoinTeam: () => void;
}
```

**구성:**
```typescript
<PersonaP0NewUser>
  <WelcomeCard>
    <Title>환영합니다 {user?.displayName}님</Title>
    <Description>당신은 어떤 체육인인가요?</Description>
  </WelcomeCard>
  
  <PersonaSelectCard>
    <PersonaOption
      icon="individual"
      title="개인 체육인"
      description="팀 없이 혼자 활동하고 싶어요"
      onClick={() => onSelectPersona('individual')}
    />
    <PersonaOption
      icon="team"
      title="팀 참여"
      description="팀을 만들거나 소속되기"
      onClick={() => onSelectPersona('team')}
    />
    <PersonaOption
      icon="admin"
      title="관리자"
      description="협회 관리자 신청"
      onClick={() => onSelectPersona('admin')}
    />
  </PersonaSelectCard>
</PersonaP0NewUser>
```

**CTA:**
- ❌ 대회 / 출전 언급 없음
- ✅ 개인 / 팀 / 관리자 선택만

---

### 🔹 PersonaP1Individual (🔥 핵심)

**파일**: `src/components/me/persona/PersonaP1Individual.tsx`

**Props:**
```typescript
interface PersonaP1IndividualProps {
  user: User | null;
  sportProfile: {
    sportType: string;
    experience: number;
    goals: string[];
  };
  records: PersonalRecord[];
  recommendedContent: RecommendedContent[];
  tournaments: Tournament[]; // 정보만 (참가 불가)
  onViewTournament: (id: string) => void;
  onJoinTeam?: () => void; // 선택적
}
```

**구성:**
```typescript
<PersonaP1Individual>
  <MySportProfile>
    <SportType>{sportProfile.sportType}</SportType>
    <Experience>{sportProfile.experience}년 경력</Experience>
    <Goals>
      {sportProfile.goals.map(goal => <GoalTag key={goal}>{goal}</GoalTag>)}
    </Goals>
  </MySportProfile>
  
  <PersonalRecords>
    <SectionTitle>개인 기록</SectionTitle>
    {records.length > 0 ? (
      <RecordList records={records} />
    ) : (
      <EmptyState message="아직 기록이 없습니다" />
    )}
  </PersonalRecords>
  
  <RecommendedContent>
    <SectionTitle>추천 콘텐츠</SectionTitle>
    <ContentList items={recommendedContent} />
  </RecommendedContent>
  
  <InfoOnlyTournaments>
    <SectionTitle>관심 대회</SectionTitle>
    <TournamentList
      tournaments={tournaments}
      mode="info-only" // 참가 불가, 정보만
      onView={onViewTournament}
    />
  </InfoOnlyTournaments>
</PersonaP1Individual>
```

**핵심 원칙:**
- ✅ 팀 강요 없음
- ✅ 대회 참가 강요 없음
- ✅ 개인 활동 중심
- ✅ 정보 제공 중심

---

### 🔹 PersonaP2TeamMember

**파일**: `src/components/me/persona/PersonaP2TeamMember.tsx`

**Props:**
```typescript
interface PersonaP2TeamMemberProps {
  team: Team;
  role: TeamRole;
  participations: TournamentParticipation[];
  records: PersonalRecord[];
  upcomingMatches: Match[];
  onViewTeam: () => void;
  onViewTournament: (id: string) => void;
}
```

**구성:**
```typescript
<PersonaP2TeamMember>
  <MyTeamCard>
    <TeamLogo src={team.logo} />
    <TeamName>{team.name}</TeamName>
    <MemberCount>{team.memberCount}명</MemberCount>
    <MyRole>{role === 'member' ? '선수' : '팀원'}</MyRole>
    <ViewTeamButton onClick={onViewTeam} />
  </MyTeamCard>
  
  <MyParticipationStatus>
    <SectionTitle>출전 현황</SectionTitle>
    <ParticipationList items={participations} onView={onViewTournament} />
  </MyParticipationStatus>
  
  <PersonalRecords>
    <SectionTitle>개인 기록</SectionTitle>
    <RecordList records={records} />
  </PersonalRecords>
  
  <UpcomingMatches>
    <SectionTitle>다가오는 경기</SectionTitle>
    <MatchList matches={upcomingMatches} />
  </UpcomingMatches>
</PersonaP2TeamMember>
```

---

### 🔹 PersonaP3TeamCaptain

**파일**: `src/components/me/persona/PersonaP3TeamCaptain.tsx`

**Props:**
```typescript
interface PersonaP3TeamCaptainProps {
  team: Team;
  applications: TournamentApplication[];
  members: TeamMember[];
  pendingMembers: TeamMember[];
  schedule: ScheduleItem[];
  onManageTeam: () => void;
  onManageApplication: (id: string) => void;
  onManageMembers: () => void;
}
```

**구성:**
```typescript
<PersonaP3TeamCaptain>
  <MyTeamManagement>
    <TeamCard team={team} />
    <ManageTeamButton onClick={onManageTeam} />
  </MyTeamManagement>
  
  <TournamentApplications>
    <SectionTitle>출전 신청 현황</SectionTitle>
    <ApplicationList
      applications={applications}
      onView={onManageApplication}
    />
  </TournamentApplications>
  
  <TeamMembers>
    <SectionTitle>선수 관리</SectionTitle>
    <PendingCount>{pendingMembers.length}명 승인 대기</PendingCount>
    <ActiveCount>{members.length}명 활성</ActiveCount>
    <ManageMembersButton onClick={onManageMembers} />
  </TeamMembers>
  
  <Schedule>
    <SectionTitle>대회 일정</SectionTitle>
    <ScheduleList items={schedule} />
  </Schedule>
</PersonaP3TeamCaptain>
```

---

### 🔹 PersonaP4AssociationAdmin

**파일**: `src/components/me/persona/PersonaP4AssociationAdmin.tsx`

**Props:**
```typescript
interface PersonaP4AssociationAdminProps {
  managedTournaments: Tournament[];
  pendingApprovals: TournamentApplication[];
  stats: {
    totalTeams: number;
    activeTournaments: number;
    pendingCount: number;
  };
  onManageTournament: (id: string) => void;
  onManageApprovals: () => void;
  onAdminTools: () => void;
}
```

**구성:**
```typescript
<PersonaP4AssociationAdmin>
  <AdminOverview>
    <StatCard label="총 참가 팀" value={stats.totalTeams} />
    <StatCard label="진행 중 대회" value={stats.activeTournaments} />
    <StatCard label="승인 대기" value={stats.pendingCount} />
  </AdminOverview>
  
  <ManagedTournaments>
    <SectionTitle>운영 중인 대회</SectionTitle>
    <TournamentList
      tournaments={managedTournaments}
      onManage={onManageTournament}
    />
  </ManagedTournaments>
  
  <PendingApprovals>
    <SectionTitle>승인 대기</SectionTitle>
    <ApprovalList
      applications={pendingApprovals}
      onManage={onManageApprovals}
    />
  </PendingApprovals>
  
  <AdminTools>
    <AdminToolButton onClick={onAdminTools} />
  </AdminTools>
</PersonaP4AssociationAdmin>
```

---

## 🟨 ③ OpportunitySection (공통 컴포넌트)

**파일**: `src/components/me/OpportunitySection.tsx`

**Props:**
```typescript
interface OpportunitySectionProps {
  persona: Persona;
  hasTeam: boolean;
  hasApplications: boolean;
  onCreateTeam: () => void;
  onJoinTeam: () => void;
  onApplyTournament: () => void;
  onAdminApply: () => void;
}
```

**구성:**
```typescript
<OpportunitySection>
  {/* P0, P1: 팀 만들기 */}
  {(persona === 'P0' || persona === 'P1') && (
    <CreateTeamCard>
      <Title>팀 만들기</Title>
      <Description>새로운 팀을 만들어보세요</Description>
      <ActionButton onClick={onCreateTeam}>팀 만들기</ActionButton>
    </CreateTeamCard>
  )}
  
  {/* P0, P1: 팀에 소속되기 */}
  {(persona === 'P0' || persona === 'P1') && (
    <JoinTeamCard>
      <Title>팀에 소속되기</Title>
      <Description>기존 팀에 참여해보세요</Description>
      <ActionButton onClick={onJoinTeam}>팀 찾기</ActionButton>
    </JoinTeamCard>
  )}
  
  {/* P2: 대회 참가 신청 */}
  {persona === 'P2' && !hasApplications && (
    <ApplyTournamentCard>
      <Title>대회 참가 신청</Title>
      <Description>팀과 함께 대회에 참가하세요</Description>
      <ActionButton onClick={onApplyTournament}>대회 찾기</ActionButton>
    </ApplyTournamentCard>
  )}
  
  {/* P3: 새 대회 참가 */}
  {persona === 'P3' && (
    <ApplyTournamentCard>
      <Title>새 대회 참가 신청</Title>
      <ActionButton onClick={onApplyTournament}>대회 찾기</ActionButton>
    </ApplyTournamentCard>
  )}
  
  {/* P0, P1: 관리자 신청 */}
  {(persona === 'P0' || persona === 'P1') && (
    <AdminApplyCard>
      <Title>협회 관리자 신청</Title>
      <ActionButton onClick={onAdminApply}>신청하기</ActionButton>
    </AdminApplyCard>
  )}
</OpportunitySection>
```

**핵심 원칙:**
- 조건부 렌더링만 사용
- PersonaSection에는 절대 침범하지 않음
- 선택적 액션 유도만

---

## 🔧 필요한 훅 목록

### 1. useMePersona (이미 구현됨)
**파일**: `src/hooks/useMePersona.ts`
- Persona 감지 (P0 ~ P4)
- Persona 데이터 반환

### 2. useMeStats (신규)
**파일**: `src/hooks/useMeStats.ts`
```typescript
export function useMeStats() {
  const { teamCount } = useMyTeams();
  const { applications } = useMyTournamentApplications();
  // TODO: 개인 기록 수 조회
  
  return {
    teamCount,
    tournamentCount: applications.length,
    recordCount: 0, // TODO: 구현
  };
}
```

### 3. useMySportProfile (신규 - P1용)
**파일**: `src/hooks/useMySportProfile.ts`
```typescript
export function useMySportProfile() {
  const { user } = useAuth();
  // TODO: 사용자 프로필에서 종목/경력/목표 조회
  
  return {
    sportType: user?.sportType || "미설정",
    experience: 0, // TODO: 경력 계산
    goals: [], // TODO: 목표 목록
  };
}
```

### 4. usePersonalRecords (신규 - P1, P2용)
**파일**: `src/hooks/usePersonalRecords.ts`
```typescript
export function usePersonalRecords() {
  // TODO: 개인 기록 조회
  return {
    records: [],
    loading: false,
  };
}
```

### 5. useRecommendedContent (신규 - P1용)
**파일**: `src/hooks/useRecommendedContent.ts`
```typescript
export function useRecommendedContent(persona: Persona) {
  // TODO: AI 기반 추천 콘텐츠
  return {
    content: [],
    loading: false,
  };
}
```

### 6. useInfoOnlyTournaments (신규 - P1용)
**파일**: `src/hooks/useInfoOnlyTournaments.ts`
```typescript
export function useInfoOnlyTournaments() {
  // TODO: 참가 불가능한 대회 목록 (정보만)
  return {
    tournaments: [],
    loading: false,
  };
}
```

---

## 📦 파일 구조 (최종)

```
src/
├── pages/me/
│   └── MePage.tsx (메인 페이지)
├── components/me/
│   ├── IdentityHeader.tsx (공통)
│   ├── OpportunitySection.tsx (공통)
│   ├── MeSkeleton.tsx (기존)
│   ├── MeErrorFallback.tsx (기존)
│   └── persona/
│       ├── PersonaP0NewUser.tsx
│       ├── PersonaP1Individual.tsx
│       ├── PersonaP2TeamMember.tsx
│       ├── PersonaP3TeamCaptain.tsx
│       └── PersonaP4AssociationAdmin.tsx
└── hooks/
    ├── useMePersona.ts (완료)
    ├── useMeStats.ts (신규 필요)
    ├── useMySportProfile.ts (신규 필요)
    ├── usePersonalRecords.ts (신규 필요)
    ├── useRecommendedContent.ts (신규 필요)
    └── useInfoOnlyTournaments.ts (신규 필요)
```

---

## 🎯 MePage.tsx 최종 구조

```typescript
export default function MePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  // 🔥 Persona 감지
  const { persona, loading: personaLoading, ...personaData } = useMePersona();
  
  // 🔥 통계 데이터
  const stats = useMeStats();
  
  // 🔥 로딩 상태
  if (personaLoading) {
    return <MeSkeleton />;
  }
  
  // 🔥 Persona별 컴포넌트 선택
  const PersonaComponent = {
    P0: PersonaP0NewUser,
    P1: PersonaP1Individual,
    P2: PersonaP2TeamMember,
    P3: PersonaP3TeamCaptain,
    P4: PersonaP4AssociationAdmin,
  }[persona];
  
  return (
    <MePageLayout>
      <IdentityHeader
        user={user}
        persona={persona}
        stats={stats}
        onSettings={() => navigate('/settings')}
        onLogout={logout}
      />
      
      <PersonaSection>
        <PersonaComponent
          persona={persona}
          personaData={personaData}
          navigate={navigate}
        />
      </PersonaSection>
      
      <OpportunitySection
        persona={persona}
        hasTeam={personaData.hasTeam}
        hasApplications={personaData.hasApplications}
        onCreateTeam={() => navigate('/team/create')}
        onJoinTeam={() => navigate('/team/join')}
        onApplyTournament={() => navigate('/tournaments')}
        onAdminApply={() => navigate('/admin/apply')}
      />
    </MePageLayout>
  );
}
```

---

## ✅ 다음 단계

1. **기본 훅 구현** (useMeStats 등)
2. **IdentityHeader 컴포넌트 구현**
3. **PersonaP1Individual 컴포넌트 구현** (🔥 우선)
4. **OpportunitySection 컴포넌트 구현**
5. **MePage.tsx 재구성**
