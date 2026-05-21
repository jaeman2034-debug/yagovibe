# 협회 공식 페이지 아키텍처 설계 지시문 (Cursor Architect Mode)

## 🎯 프로젝트 목적

노원구 축구협회 공식 페이지의 MVP 화면 아키텍처를 설계한다.

**핵심 원칙**: 이 페이지는 단순 홈페이지가 아니라 협회 행정·대회·시설(대관)을 통합하는 공식 디지털 본부이다.

---

## ❌ 제외 범위 (구현하지 않을 것)

- ❌ 디자인 구현
- ❌ 스타일링
- ❌ 세부 기능 로직
- ❌ 인증(Auth)
- ❌ 관리자 대시보드
- ❌ 회계/결제
- ❌ 선수 관리
- ❌ 유소년 신청

---

## ⭕ 포함 범위 (설계할 것)

- ⭕ 화면 구조
- ⭕ 정보 아키텍처(IA)
- ⭕ 컴포넌트 분리 기준
- ⭕ 확장 가능한 설계

---

## 1️⃣ 페이지 타입 정의

**Page Type**: `AssociationOfficialPage`

**Scope**: MVP (Read-only 중심)

**Target**: 노원구 축구협회 (단, 다른 구 협회 재사용 가능)

**URL 구조**: `/associations/{associationId}`

---

## 2️⃣ 상단 Header 아키텍처 (확정)

```
Header
 ├─ Logo / Association Name
 └─ Navigation Tabs
     ├─ 공지 (Notices)
     ├─ 대회 (Tournaments)
     ├─ 대관 (Facilities / Reservations)
     ├─ 클럽 (Affiliated Clubs)
     └─ 자료실 (Archive)
```

### 규칙

- 모든 메뉴는 **동일 페이지 내 섹션 이동** (scroll-based navigation)
- 페이지 라우팅 분기 ❌
- 관리자 메뉴 ❌ (MVP)
- Tab 클릭 시 해당 섹션으로 스크롤 이동

---

## 3️⃣ 전체 페이지 섹션 구조 (Scroll-based IA)

```
AssociationOfficialPage
 ├─ Header (Sticky)
 ├─ HeroSection (협회 요약)
 ├─ NoticeSection (공지)
 ├─ TournamentSection (대회 허브)
 ├─ FacilitySection (대관)
 ├─ StorySection (스토리 & 기록)
 ├─ ClubSummarySection (가맹 클럽 요약)
 └─ Footer
```

**레이아웃 원칙**: 단일 페이지 내 세로 스크롤, 각 섹션은 독립적이지만 일관된 디자인 시스템 사용

---

## 4️⃣ 섹션별 설계 지침

### 4-1. HeroSection (협회 요약)

**역할**:
- 협회 공식성 강조
- 숫자 기반 신뢰 제공

**포함 데이터**:
```typescript
interface HeroSectionData {
  associationName: string;
  slogan?: string;
  affiliatedClubsCount: number;  // 가맹 클럽 수
  activeTournamentsCount: number; // 운영 대회 수
  currentTournamentName?: string; // 현재 진행 중인 대회명
  logoUrl?: string;
}
```

**컴포넌트**: `<AssociationHeroSection associationId={string} />`

---

### 4-2. NoticeSection (공지)

**규칙**:
- 협회 전용 콘텐츠
- 최대 3개 노출
- "더보기" 링크 제공 (전체 공지 페이지로 이동)

**데이터 모델**:
```typescript
interface Notice {
  id: string;
  title: string;
  publishedAt: Timestamp;
  type: "notice" | "announcement" | "event";
  content?: string; // 미리보기용
  author?: string; // 협회 관리자
}
```

**컴포넌트**: `<AssociationNoticeSection associationId={string} limit={3} />`

**쿼리**: `notices/{associationId}/items` (최신순, 최대 3개)

---

### 4-3. TournamentSection (대회 허브)

**핵심 섹션**: 대회는 협회의 주요 활동

**데이터 모델**:
```typescript
interface Tournament {
  id: string;
  name: string;
  dateRange: {
    start: Timestamp;
    end: Timestamp;
  };
  location: string;
  status: "upcoming" | "ongoing" | "completed";
  bracketUrl?: string;  // 대진표 링크
  rulesUrl?: string;    // 규칙 링크
  resultsUrl?: string;  // 결과 링크
}
```

**MVP 제약**:
- 단일 대회만 노출 (현재 진행 중 또는 최근 완료된 대회)
- 상세는 링크/모달 수준 (별도 페이지 아님)

**컴포넌트**: `<AssociationTournamentSection associationId={string} />`

**쿼리**: `tournaments/{associationId}/items` (status="ongoing" 우선, 없으면 최신 completed)

---

### 4-4. FacilitySection (대관 업무 – 중요)

**대관은 독립 섹션으로 분리**

**데이터 모델**:
```typescript
interface Facility {
  id: string;
  name: string;
  type: "stadium" | "subfield" | "training";
  location: string;
}

interface ReservationSchedule {
  facilityId: string;
  date: Date;
  timeSlots: {
    start: string;  // "10:00"
    end: string;    // "12:00"
    status: "available" | "blocked" | "event";
    eventName?: string; // status="event"일 때
  }[];
}
```

**MVP 규칙**:
- 읽기 전용 (신청 버튼 ❌)
- 대회 일정과 충돌 없는 구조
- 날짜별 가용 시간대 표시

**컴포넌트**: 
- `<AssociationFacilitySection associationId={string} />`
- `<FacilityList facilities={Facility[]} />`
- `<ReservationSchedule facilityId={string} dateRange={DateRange} />`

**쿼리**: 
- `associations/{associationId}/facilities`
- `bookings/{associationId}/schedules` (미래 일정만)

---

### 4-5. StorySection (스토리 & 기록)

**목적**: 행정 페이지의 경직성 제거, 콘텐츠 생동감 추가

**데이터 모델**:
```typescript
interface Story {
  id: string;
  title: string;
  thumbnail?: string;
  category: "story" | "archive" | "highlight";
  createdAt: Timestamp;
  author?: string;
  summary?: string;
}
```

**컴포넌트**: `<AssociationStorySection associationId={string} limit={6} />`

**쿼리**: `stories/{associationId}/items` (최신순, 최대 6개)

---

### 4-6. ClubSummarySection (가맹 클럽 요약)

**MVP 범위**: 클럽 이름 리스트만 노출, 상세 관리 ❌

**데이터 모델**:
```typescript
interface Club {
  id: string;  // teamId reference
  name: string;
  logoUrl?: string;
  membershipStatus: "member" | "pending";
}
```

**컴포넌트**: `<AssociationClubSummarySection associationId={string} />`

**쿼리**: `teams` where `associationId == {associationId}` AND `membership == "member"`

---

## 5️⃣ 데이터 모델 기준 (논리 구조)

```typescript
// Firestore 구조 (논리적)
Association {
  id: string;
  profile: {
    name: string;
    region: string;
    slogan?: string;
    logoUrl?: string;
  };
  
  // 하위 컬렉션 또는 서브컬렉션
  notices: Notice[];
  tournaments: Tournament[];
  facilities: Facility[];
  stories: Story[];
  clubs: Club[];  // teams 참조 (where associationId == id)
}

// 또는 독립 컬렉션
notices/{noticeId} {
  associationId: string;
  title: string;
  publishedAt: Timestamp;
  // ...
}

tournaments/{tournamentId} {
  associationId: string;
  name: string;
  dateRange: { ... };
  // ...
}

facilities/{facilityId} {
  associationId: string;
  name: string;
  // ...
}
```

---

## 6️⃣ 설계 원칙 (중요)

### ❌ 금지 사항

- ❌ 단일 협회 하드코딩 (예: "assoc-nowon-football" 직접 참조)
- ❌ 홈페이지식 메뉴 이동 (페이지 라우팅)
- ❌ 현재 로그인 상태 의존

### ⭕ 필수 사항

- ⭕ AssociationId 기반 구조 (URL 파라미터 또는 prop으로 전달)
- ⭕ 행정 객체 중심 설계 (Notice, Tournament, Facility 등 엔티티 기반)
- ⭕ Phase 2 확장 고려 (관리자 기능, 권한 체크 등 확장 가능한 구조)

### 확장성 고려

```typescript
// Phase 2에서 추가될 수 있는 것들
- AdminMenu (조건부 렌더링)
- EditButtons (권한 체크 후 표시)
- CreateNoticeModal (관리자만)
- ManageTournamentPage (관리자 전용)
```

---

## 7️⃣ 컴포넌트 트리 구조 (예시)

```
AssociationOfficialPage (페이지 컴포넌트)
 ├─ AssociationHeader
 │    ├─ AssociationLogo
 │    └─ NavigationTabs (sticky)
 │         ├─ Tab: 공지 → scrollTo(NoticeSection)
 │         ├─ Tab: 대회 → scrollTo(TournamentSection)
 │         ├─ Tab: 대관 → scrollTo(FacilitySection)
 │         ├─ Tab: 클럽 → scrollTo(ClubSummarySection)
 │         └─ Tab: 자료실 → scrollTo(StorySection)
 │
 ├─ AssociationHeroSection
 │    ├─ AssociationProfile
 │    └─ AssociationStats
 │
 ├─ AssociationNoticeSection
 │    ├─ NoticeCard (최대 3개)
 │    └─ ViewAllLink
 │
 ├─ AssociationTournamentSection
 │    ├─ TournamentCard (단일)
 │    └─ TournamentActions (Bracket, Rules, Results)
 │
 ├─ AssociationFacilitySection
 │    ├─ FacilityList
 │    └─ ReservationSchedule (Calendar view)
 │
 ├─ AssociationStorySection
 │    └─ StoryGrid (6개)
 │
 ├─ AssociationClubSummarySection
 │    └─ ClubList (이름만)
 │
 └─ AssociationFooter
```

---

## 8️⃣ 폴더/파일 구조 제안

```
src/
 └─ pages/
     └─ association/
         ├─ AssociationOfficialPage.tsx  (메인 페이지)
         │
         └─ components/  (협회 페이지 전용 컴포넌트)
             ├─ AssociationHeader.tsx
             ├─ AssociationHeroSection.tsx
             ├─ AssociationNoticeSection.tsx
             ├─ AssociationTournamentSection.tsx
             ├─ AssociationFacilitySection.tsx
             ├─ AssociationStorySection.tsx
             ├─ AssociationClubSummarySection.tsx
             │
             └─ shared/  (재사용 가능한 하위 컴포넌트)
                 ├─ NoticeCard.tsx
                 ├─ TournamentCard.tsx
                 ├─ FacilityCard.tsx
                 ├─ StoryCard.tsx
                 └─ ClubCard.tsx
```

**또는 더 세분화된 구조**:

```
src/
 └─ pages/
     └─ association/
         ├─ AssociationOfficialPage.tsx
         │
         └─ sections/  (섹션별 컴포넌트)
             ├─ HeroSection/
             │    └─ index.tsx
             ├─ NoticeSection/
             │    ├─ index.tsx
             │    └─ NoticeCard.tsx
             ├─ TournamentSection/
             │    ├─ index.tsx
             │    └─ TournamentCard.tsx
             ├─ FacilitySection/
             │    ├─ index.tsx
             │    ├─ FacilityList.tsx
             │    └─ ReservationSchedule.tsx
             ├─ StorySection/
             │    ├─ index.tsx
             │    └─ StoryCard.tsx
             └─ ClubSummarySection/
                  ├─ index.tsx
                  └─ ClubList.tsx
```

---

## 9️⃣ 각 섹션의 책임 범위

### AssociationOfficialPage (페이지 레벨)

**책임**:
- URL 파라미터에서 `associationId` 추출
- 전체 섹션 레이아웃 구성
- Scroll navigation 처리 (Header 탭 클릭 시 섹션으로 이동)
- 데이터 페칭 오케스트레이션 (선택적: 각 섹션이 독립적으로 페칭 가능)

**Props/State**:
```typescript
// URL: /associations/:associationId
const { associationId } = useParams<{ associationId: string }>();
```

---

### 각 Section 컴포넌트

**공통 책임**:
- `associationId` prop 받기
- Firestore에서 해당 섹션 데이터 조회
- 로딩/에러 상태 처리
- 데이터가 없을 때 빈 상태 표시

**예시** (AssociationNoticeSection):
```typescript
interface AssociationNoticeSectionProps {
  associationId: string;
  limit?: number; // 기본값: 3
}

export function AssociationNoticeSection({ 
  associationId, 
  limit = 3 
}: AssociationNoticeSectionProps) {
  // 데이터 페칭
  // 로딩/에러 처리
  // 렌더링
}
```

---

## 🔟 재사용 가능한 Association Template 구조

**목표**: 노원구 축구협회뿐만 아니라 다른 구 협회도 동일 템플릿 사용

**구현 방식**:
1. 모든 섹션 컴포넌트는 `associationId` prop만 받음
2. 데이터는 Firestore에서 동적으로 조회
3. 협회별 커스터마이징은 `associations/{id}/config`에서 관리 (선택적)

**확장 예시** (Phase 2):
```typescript
// associations/{associationId}/config
{
  theme: {
    primaryColor: string;
    logoUrl: string;
  };
  enabledSections: {
    notices: boolean;
    tournaments: boolean;
    facilities: boolean;
    stories: boolean;
    clubs: boolean;
  };
}
```

---

## 🎯 최종 목표 문장 (Cursor 인식용)

**이 페이지는 "노원구 축구협회 홈페이지"가 아니라 모든 구 축구협회가 공통으로 사용하는 공식 디지털 행정 페이지의 표준 아키텍처다.**

---

## 📋 구현 체크리스트 (Cursor 참고용)

- [ ] `AssociationOfficialPage` 페이지 컴포넌트 생성
- [ ] URL 라우팅: `/associations/:associationId`
- [ ] `AssociationHeader` 컴포넌트 (Logo + Navigation Tabs)
- [ ] 각 섹션 컴포넌트 생성 (6개)
- [ ] Scroll navigation 구현 (Tab 클릭 → 섹션 스크롤)
- [ ] Firestore 데이터 모델 정의 (각 섹션별)
- [ ] 데이터 페칭 Hook 또는 함수 (각 섹션별)
- [ ] 로딩/에러 상태 처리
- [ ] 빈 상태 표시 (데이터 없을 때)
- [ ] AssociationId 기반 동적 데이터 조회 (하드코딩 금지)

---

## ⚠️ 주의사항

1. **하드코딩 금지**: "assoc-nowon-football" 같은 특정 ID 직접 참조 금지
2. **MVP 범위 준수**: 읽기 전용, 관리 기능 제외
3. **확장성 고려**: Phase 2에서 관리자 기능 추가 가능한 구조
4. **성능 고려**: 각 섹션은 독립적으로 로딩 가능 (필요시 lazy loading)

---

**이 지시문을 기반으로 컴포넌트 구조와 파일 시스템을 설계하시오.**

