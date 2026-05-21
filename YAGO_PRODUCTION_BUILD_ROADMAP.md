# 🚀 YAGO VIBE SPORTS - Production Build Roadmap

> **작성일**: 2024년  
> **목적**: Cursor로 바로 개발 시작 가능한 실무형 개발 로드맵

---

## 📋 목차

1. [전체 개발 단계](#1-전체-개발-단계)
2. [Phase 1: 플랫폼 기반 구축](#2-phase-1-플랫폼-기반-구축)
3. [Phase 2: 협회 홈페이지](#3-phase-2-협회-홈페이지)
4. [Phase 3: 관리자 대시보드](#4-phase-3-관리자-대시보드)
5. [Phase 4: 리그/시즌 시스템](#5-phase-4-리그시즌-시스템)
6. [Phase 5: 경기/결과 시스템](#6-phase-5-경기결과-시스템)
7. [Phase 6: 대회/대진표/AI 시스템](#7-phase-6-대회대진표ai-시스템)
8. [실제 개발 순서](#8-실제-개발-순서)
9. [MVP 완료 기준](#9-mvp-완료-기준)

---

## 1️⃣ 전체 개발 단계

### 6단계 개발 구조

```
Phase 1: 플랫폼 기본 구조
  ↓
Phase 2: 협회 홈페이지
  ↓
Phase 3: 협회 관리자 대시보드
  ↓
Phase 4: 리그 / 시즌 운영 시스템
  ↓
Phase 5: 경기 / 순위 / 결과 시스템
  ↓
Phase 6: 대회 / 대진표 / AI 시스템
```

### 목표

```
노원구 축구협회 운영 가능한 MVP
  ↓
협회 SaaS 플랫폼
  ↓
AI 스포츠 운영 시스템
```

---

## 2️⃣ Phase 1: 플랫폼 기반 구축

### 목표

```
멀티 협회 플랫폼 기본 구조 완성
```

### 개발 항목

#### 1. 프로젝트 초기화

```bash
# Next.js 프로젝트 생성
npx create-next-app@latest yago-vibe-spt --typescript --tailwind --app

# 필수 패키지 설치
npm install lucide-react
npm install date-fns
npm install clsx tailwind-merge
```

#### 2. 폴더 구조 생성

```
src/
  app/
    (platform)/
      page.tsx                    # 플랫폼 홈
      sports/
        page.tsx                  # 개인 스포츠 활동
      federations/
        page.tsx                  # 협회 목록
        [federationId]/
          page.tsx                # 협회 홈페이지
          about/
            page.tsx
          notices/
            page.tsx
          tournaments/
            page.tsx
          matches/
            page.tsx
          clubs/
            page.tsx
          docs/
            page.tsx
          sponsors/
            page.tsx
          admin/
            page.tsx              # 관리자 대시보드
            leagues/
              page.tsx
            seasons/
              page.tsx
            registrations/
              page.tsx
            teams/
              page.tsx
            players/
              page.tsx
            matches/
              page.tsx
            results/
              page.tsx
            standings/
              page.tsx
            notices/
              page.tsx
            tournaments/
              page.tsx
              [tournamentId]/
                page.tsx
                draw/
                  page.tsx
                schedule/
                  page.tsx
                bracket/
                  page.tsx
    platform/
      federations/
        new/
          page.tsx                # 협회 생성

  components/
    federation/
      FederationHeader.tsx
      FederationTabs.tsx
      FederationHero.tsx
      ActiveTournaments.tsx
      TodayMatches.tsx
      CurrentStandings.tsx
      FeaturedClubs.tsx
      SponsorsBanner.tsx
      AIChatbot.tsx
    
    admin/
      AdminSidebar.tsx
      AdminTopbar.tsx
      StatCard.tsx
      QuickActionGrid.tsx
      ApprovalDrawer.tsx
      ResultEntryPanel.tsx
    
    shared/
      DataTable.tsx
      StatusBadge.tsx
      SectionHeader.tsx
      FilterBar.tsx
      NoticeCard.tsx
      LeagueCard.tsx
      TournamentCard.tsx
      MatchCard.tsx
      StandingTable.tsx
      TeamCard.tsx
      PlayerTable.tsx
      BracketView.tsx
      LoadingSpinner.tsx
      ErrorBoundary.tsx

  hooks/
    useFederation.ts
    useLeagues.ts
    useSeasons.ts
    useTeams.ts
    useMatches.ts
    useStandings.ts
    useTournaments.ts
    useIsFederationAdmin.ts

  services/
    federationService.ts
    leagueService.ts
    seasonService.ts
    teamService.ts
    matchService.ts
    tournamentService.ts

  types/
    federation.ts
    league.ts
    season.ts
    team.ts
    match.ts
    tournament.ts
    player.ts

  lib/
    mock/
      mockFederation.ts
      mockLeagues.ts
      mockSeasons.ts
      mockTeams.ts
      mockMatches.ts
      mockStandings.ts
    utils/
      dateUtils.ts
      formatUtils.ts
      validation.ts
    constants/
      routes.ts
      status.ts
```

#### 3. 공통 UI 컴포넌트 구현

**우선순위**:
1. StatCard
2. DataTable
3. StatusBadge
4. SectionHeader
5. AdminSidebar
6. AdminTopbar

#### 4. 타입 정의

**필수 타입**:
- Federation
- League
- Season
- Team
- Player
- Match
- Tournament
- Standing

#### 5. Mock 데이터

**Mock 파일**:
- mockFederation.ts (노원구 축구협회 데이터)
- mockLeagues.ts
- mockSeasons.ts
- mockTeams.ts
- mockMatches.ts
- mockStandings.ts

#### 6. 라우팅 설정

**기본 라우트**:
- `/` - 플랫폼 홈
- `/sports` - 개인 스포츠 활동
- `/federations` - 협회 목록
- `/federations/nowon-football` - 노원구 축구협회 홈

### 완료 기준

- [ ] Next.js 프로젝트 생성
- [ ] 폴더 구조 완성
- [ ] 공통 컴포넌트 6개 이상
- [ ] 타입 정의 완료
- [ ] Mock 데이터 준비
- [ ] 기본 라우팅 동작

### 예상 기간

**1주**

---

## 3️⃣ Phase 2: 협회 홈페이지

### 목표

```
노원구 축구협회 공식 홈페이지 완성
```

### URL

```
/federations/nowon-football
```

### 페이지 구성

#### 1. 홈페이지 (`/federations/[federationId]`)

**섹션 (순서대로)**:
1. **Hero Section**
   - 협회 로고
   - 협회명: "노원구 축구협회"
   - 짧은 설명
   - CTA 버튼: "대회 보기", "경기 일정", "팀 등록"

2. **Active Competitions**
   - 진행 중인 리그
   - 진행 중인 대회
   - TournamentCard 컴포넌트 사용

3. **Latest Notices**
   - 최근 공지 5개
   - NoticeCard 컴포넌트 사용
   - "더보기" 링크 → `/notices`

4. **Upcoming Matches**
   - 오늘 경기
   - 이번 주 경기
   - TodayMatches 컴포넌트 사용

5. **Standings Snapshot**
   - 현재 시즌 상위 5팀
   - CurrentStandings 컴포넌트 사용
   - "전체 순위 보기" 링크

6. **Featured Clubs**
   - 참가 팀 미리보기
   - FeaturedClubs 컴포넌트 사용
   - "전체 팀 보기" 링크 → `/clubs`

7. **Sponsors Banner**
   - 후원사 로고
   - SponsorsBanner 컴포넌트 사용

8. **AI Helper CTA**
   - "AI 비서에게 물어보기" 버튼
   - AIChatbot 컴포넌트 (Phase 6에서 구현)

#### 2. 협회 소개 (`/about`)

- 협회장 인사말
- 협회 소개
- 연혁
- 조직도
- 연락처

#### 3. 공지사항 (`/notices`)

- 공지 목록
- 카테고리 필터
- 공지 상세

#### 4. 대회/리그 (`/tournaments`)

- 대회 목록
- 리그 목록
- 대회 상세

#### 5. 경기 일정 (`/matches`)

- 경기 목록
- 날짜 필터
- 경기 상세

#### 6. 참가팀 (`/clubs`)

- 팀 목록
- 팀 상세
- 팀 명단

#### 7. 규정/자료실 (`/docs`)

- 문서 목록
- 카테고리별 분류
- 문서 상세

#### 8. 후원사 (`/sponsors`)

- 후원사 목록
- 후원사 상세

### 완료 기준

- [ ] 홈페이지 8개 섹션 완성
- [ ] 공개 페이지 7개 완성
- [ ] FederationHeader 완성
- [ ] FederationTabs 완성
- [ ] 반응형 디자인 적용
- [ ] Mock 데이터 연동

### 예상 기간

**1주**

---

## 4️⃣ Phase 3: 관리자 대시보드

### 목표

```
협회 운영 시스템 MVP
```

### URL

```
/federations/nowon-football/admin
```

### 대시보드 구성

#### 1. 레이아웃

- **AdminSidebar** (왼쪽)
  - 메뉴 항목
  - 활성 라우트 하이라이트
  - 모바일 접을 수 있음

- **AdminTopbar** (상단)
  - 사용자 정보
  - 알림
  - 설정

- **Main Content** (중앙)
  - 대시보드 콘텐츠

#### 2. KPI Cards (상단)

**표시 항목**:
- Active Leagues (활성 리그 수)
- Active Seasons (활성 시즌 수)
- Registered Teams (등록 팀 수)
- Registered Players (등록 선수 수)
- Total Matches (총 경기 수)
- Pending Approvals (승인 대기 수)
- Unreported Results (미입력 결과 수)

**StatCard 컴포넌트 사용**

#### 3. Quick Actions (두 번째 행)

**액션 버튼**:
- "리그 생성" → `/admin/leagues?action=create`
- "시즌 생성" → `/admin/seasons?action=create`
- "팀 승인" → `/admin/registrations`
- "공지 작성" → `/admin/notices?action=create`
- "결과 입력" → `/admin/results`

**QuickActionGrid 컴포넌트 사용**

#### 4. Widgets (하단)

**1. Pending Registrations**
- 승인 대기 팀 목록
- 팀명, 제출일, 상태
- "승인하기" 버튼

**2. Today's Matches**
- 오늘 경기 목록
- 시간, 팀, 경기장, 상태
- "결과 입력" 버튼

**3. Recent Notices**
- 최근 공지 5개
- "새 공지 작성" 버튼

**4. Missing Results**
- 결과 미입력 경기
- 날짜, 팀, 경과 시간

### 관리 메뉴 (AdminSidebar)

```
대시보드 (/admin)
리그 관리 (/admin/leagues)
시즌 관리 (/admin/seasons)
참가 승인 (/admin/registrations)
팀 관리 (/admin/teams)
선수 관리 (/admin/players)
경기 관리 (/admin/matches)
결과 입력 (/admin/results)
순위 (/admin/standings)
공지 관리 (/admin/notices)
대회 관리 (/admin/tournaments)
```

### 완료 기준

- [ ] 대시보드 레이아웃 완성
- [ ] AdminSidebar 동작
- [ ] AdminTopbar 동작
- [ ] KPI Cards 표시
- [ ] Quick Actions 동작
- [ ] Widgets 4개 완성

### 예상 기간

**1주**

---

## 5️⃣ Phase 4: 리그/시즌 시스템

### 목표

```
정규 리그 운영 시스템
```

### 개발 항목

#### 1. 리그 관리 (`/admin/leagues`)

**기능**:
- 리그 목록 표시
- 리그 생성
- 리그 수정
- 리그 보관

**UI**:
- DataTable 사용
- 필터 (카테고리, 상태)
- 검색
- 생성/수정 폼 (Drawer 또는 Modal)

**데이터**:
- `leagues` 컬렉션

#### 2. 시즌 관리 (`/admin/seasons`)

**기능**:
- 시즌 목록 표시
- 시즌 생성
- 시즌 수정
- 시즌 상세 (탭)

**시즌 상세 탭**:
- Overview (기본 정보, 통계)
- Teams (참가 팀)
- Matches (경기 일정)
- Standings (순위)
- Notices (관련 공지)

**데이터**:
- `seasons` 컬렉션

#### 3. 참가 승인 (`/admin/registrations`)

**기능**:
- 참가 신청 목록
- 승인/거절
- 수정 요청
- 상태 필터

**UI**:
- DataTable 사용
- ApprovalDrawer 사용
- 상태 배지

**데이터**:
- `registrations` 컬렉션

#### 4. 팀 관리 (`/admin/teams`)

**기능**:
- 팀 목록
- 팀 상세
- 팀 수정

**데이터**:
- `teams` 컬렉션

#### 5. 선수 관리 (`/admin/players`)

**기능**:
- 선수 목록
- 선수 상세
- 선수 수정

**데이터**:
- `players` 컬렉션

#### 6. 팀 명단 (`/teams/[teamId]/roster`)

**기능**:
- 명단 표시
- 선수 추가
- 선수 수정
- 선수 비활성화

**UI**:
- PlayerTable 사용
- 포지션별 분류 (FW, MF, DF, GK)

### 완료 기준

- [ ] 리그 CRUD 완성
- [ ] 시즌 CRUD 완성
- [ ] 참가 승인 플로우 완성
- [ ] 팀 CRUD 완성
- [ ] 선수 CRUD 완성
- [ ] 명단 관리 완성

### 예상 기간

**1주**

---

## 6️⃣ Phase 5: 경기/결과 시스템

### 목표

```
경기 운영 및 결과 입력 시스템
```

### 개발 항목

#### 1. 경기 관리 (`/admin/matches`)

**기능**:
- 경기 목록
- 경기 필터 (날짜, 리그/시즌, 상태)
- 경기 상세
- 경기 생성

**경기 상세 탭**:
- Overview (경기 정보)
- Lineups (라인업)
- Events (경기 이벤트)
- Stats (통계)
- Result (결과)

**UI**:
- DataTable 사용
- MatchCard 사용
- 상태 배지

**데이터**:
- `matches` 컬렉션

#### 2. 결과 입력 (`/admin/results`)

**기능**:
- 결과 입력 목록
- 결과 입력 패널
- 자동 저장 (드래프트)

**ResultEntryPanel 구성**:
1. 경기 정보 (읽기 전용)
2. 최종 스코어
3. 득점자
4. 카드 (경고/퇴장)
5. 교체
6. 메모

**데이터**:
- `matches` 컬렉션 업데이트
- `matches/{matchId}/events` 컬렉션
- `matches/{matchId}/lineups` 컬렉션

#### 3. 순위 (`/admin/standings`)

**기능**:
- 시즌별 순위표
- 정렬 (승점, 득실차, 득점)
- 추가 위젯

**위젯**:
- Top Scorers
- Top Assists
- Discipline Table

**UI**:
- StandingTable 사용

**데이터**:
- `standings` 컬렉션
- 자동 계산 (경기 결과 입력 시)

### 완료 기준

- [ ] 경기 CRUD 완성
- [ ] 결과 입력 완성
- [ ] 순위 계산 로직 완성
- [ ] 순위표 표시 완성
- [ ] 자동 순위 업데이트 동작

### 예상 기간

**1주**

---

## 7️⃣ Phase 6: 대회/대진표/AI 시스템

### 목표

```
컵 대회 운영 및 AI 시스템
```

### 개발 항목

#### 1. 대회 관리 (`/admin/tournaments`)

**기능**:
- 대회 목록
- 대회 생성
- 대회 상세

**대회 생성 폼**:
- 기본 정보
- 포맷 선택 (리그/토너먼트/혼합)
- AI 포맷 추천
- 운영 옵션
- 일정 옵션

#### 2. 조 추첨 (`/admin/tournaments/[id]/draw`)

**기능**:
- AI 추천 조 편성
- 수동 조 편성
- 시드 배정
- 추첨 실행

#### 3. 일정 생성 (`/admin/tournaments/[id]/schedule`)

**기능**:
- AI 일정 생성
- 충돌 감지
- 수동 조정
- 일정 확정

#### 4. 대진표 (`/admin/tournaments/[id]/bracket`)

**기능**:
- 조별 순위 표시
- 토너먼트 브래킷 시각화
- 결과 입력
- 다음 라운드 자동 연결

**UI**:
- BracketView 컴포넌트

#### 5. AI 시스템

**Public AI Chatbot**:
- 홈페이지 통합
- AIChatbot 컴포넌트
- 대화 기록

**Admin AI Panel**:
- 일일 리포트
- 알림
- 추천 액션

**AI Gateway** (Cloud Function):
- queryAI 함수
- 의도 분석
- 에이전트 라우팅

### 완료 기준

- [ ] 대회 CRUD 완성
- [ ] AI 포맷 추천 동작
- [ ] 조 편성 완성
- [ ] 대진표 생성 완성
- [ ] 일정 생성 완성
- [ ] 브래킷 시각화 완성
- [ ] Public AI Chatbot 동작
- [ ] Admin AI Panel 동작

### 예상 기간

**2주**

---

## 8️⃣ 실제 개발 순서

### 17단계 상세 순서

```
1. 프로젝트 구조
   - Next.js 초기화
   - 폴더 구조 생성
   - 기본 설정

2. 공통 UI
   - StatCard
   - DataTable
   - StatusBadge
   - SectionHeader
   - LoadingSpinner

3. 협회 홈페이지
   - Hero Section
   - Active Tournaments
   - Latest Notices
   - Upcoming Matches
   - Standings Snapshot
   - Featured Clubs
   - Sponsors Banner

4. 관리자 대시보드
   - AdminSidebar
   - AdminTopbar
   - KPI Cards
   - Quick Actions
   - Widgets

5. 리그 관리
   - 리그 목록
   - 리그 생성/수정
   - 리그 필터

6. 시즌 관리
   - 시즌 목록
   - 시즌 생성/수정
   - 시즌 상세

7. 팀 승인
   - 참가 신청 목록
   - ApprovalDrawer
   - 승인/거절 로직

8. 팀 / 선수
   - 팀 목록
   - 선수 목록
   - 명단 관리

9. 경기
   - 경기 목록
   - 경기 생성
   - 경기 상세

10. 결과
    - 결과 입력 패널
    - 득점자 입력
    - 카드 입력
    - 교체 입력

11. 순위
    - 순위 계산 로직
    - 순위표 표시
    - 통계 위젯

12. 공지
    - 공지 목록
    - 공지 생성/수정
    - 공지 필터

13. 대회
    - 대회 목록
    - 대회 생성
    - 대회 상세

14. 대진표
    - 조 편성
    - 대진표 생성
    - 브래킷 시각화
    - 일정 생성

15. Firestore
    - Firestore 연결
    - Security Rules
    - 인덱스 설정

16. AI
    - AI Gateway
    - Public Chatbot
    - Admin Panel
    - 에이전트별 로직

17. 협회 생성
    - 협회 생성 폼
    - 자동 생성 로직
    - 검증 로직
```

---

## 9️⃣ MVP 완료 기준

### MVP 범위

```
Phase 1: 플랫폼 기본 구조 ✅
Phase 2: 협회 홈페이지 ✅
Phase 3: 관리자 대시보드 ✅
Phase 4: 리그/시즌 시스템 ✅
Phase 5: 경기/결과 시스템 ✅
```

### MVP 완료 시 가능한 것

```
✅ 리그 운영
✅ 팀 등록
✅ 선수 등록
✅ 경기 일정
✅ 결과 입력
✅ 순위 계산
✅ 공지
✅ 기본 대회 운영
```

### MVP 예상 기간

**5주**

---

## 🔟 YAGO 완성 단계

### 최종 플랫폼 구성

```
협회 홈페이지
  +
리그 운영
  +
대회 운영
  +
AI 운영
  +
협회 SaaS
```

### = Sports Operating System

---

## 📊 개발 일정 요약

### MVP (5주)

```
Week 1: 플랫폼 기본 구조
Week 2: 협회 홈페이지
Week 3: 관리자 대시보드
Week 4: 리그/시즌 시스템
Week 5: 경기/결과 시스템
```

### Full Feature (추가 2주)

```
Week 6: 대회/대진표 시스템
Week 7: AI 시스템 + 협회 자동 생성
```

### 총 예상 기간

**7주 (약 1.75개월)**

---

## ✅ 체크리스트

### Phase 1 체크리스트
- [ ] Next.js 프로젝트 생성
- [ ] 폴더 구조 완성
- [ ] 공통 컴포넌트 6개
- [ ] 타입 정의
- [ ] Mock 데이터
- [ ] 라우팅 설정

### Phase 2 체크리스트
- [ ] 홈페이지 8개 섹션
- [ ] 공개 페이지 7개
- [ ] FederationHeader
- [ ] FederationTabs
- [ ] 반응형 디자인

### Phase 3 체크리스트
- [ ] 대시보드 레이아웃
- [ ] AdminSidebar
- [ ] AdminTopbar
- [ ] KPI Cards
- [ ] Quick Actions
- [ ] Widgets 4개

### Phase 4 체크리스트
- [ ] 리그 CRUD
- [ ] 시즌 CRUD
- [ ] 참가 승인
- [ ] 팀 CRUD
- [ ] 선수 CRUD
- [ ] 명단 관리

### Phase 5 체크리스트
- [ ] 경기 CRUD
- [ ] 결과 입력
- [ ] 순위 계산
- [ ] 순위표 표시

### Phase 6 체크리스트
- [ ] 대회 CRUD
- [ ] AI 포맷 추천
- [ ] 조 편성
- [ ] 대진표 생성
- [ ] 일정 생성
- [ ] 브래킷 시각화
- [ ] Public AI Chatbot
- [ ] Admin AI Panel

---

**작성일**: 2024년  
**상태**: ✅ YAGO Production Build Roadmap 완료
