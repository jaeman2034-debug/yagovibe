# 🚀 YAGO SPORTS 플랫폼 아키텍처 (프로급 구조)

## 📊 현재 프로젝트 상태

### 기술 스택
- **프레임워크**: Vite + React (React 19.0.0)
- **라우팅**: React Router DOM v7.0.0
- **백엔드**: Firebase (Firestore, Auth)
- **UI**: Tailwind CSS + shadcn/ui
- **상태 관리**: Context API (AuthProvider, TeamContext 등)

### 현재 완성도: **70%** ✅

---

## 🏗️ 6개 도메인 구조

### 1️⃣ Auth 시스템 ✅ (완료)

**Firestore 구조**
```
users/{userId}
{
  nickname: string
  email: string
  region: string
  position: string
  createdAt: Timestamp
  role: "ADMIN" | "USER"  // 플랫폼 권한
}
```

**현재 상태**: ✅ 완료
- 로그인/회원가입 구현됨
- 전화번호, Google OAuth 지원
- QR 로그인 지원

---

### 2️⃣ Teams 시스템 ✅ (완료)

**Firestore 구조**
```
teams/{teamId}
{
  name: string
  region: string
  level: string
  logo?: string
  ownerUid: string  // v1: ownerUid 통일
  createdAt: Timestamp
}

teams/{teamId}/members/{userId}
{
  userId: string
  role: "owner" | "admin" | "member"  // 소문자 통일
  status: "active"
  joinedAt: Timestamp
}

team_members/{userId}_{teamId}  // 역인덱스
{
  userId: string
  teamId: string
  role: "owner" | "admin" | "member"
  status: "active"
  createdAt: Timestamp
}
```

**현재 상태**: ✅ 완료
- 팀 생성/가입 구현됨
- 팀 관리 페이지 구현됨
- 권한 시스템 (owner/admin/member) 구현됨
- Ghost team 제거 로직 구현됨

---

### 3️⃣ Recruit (팀원 모집) ✅ (완료)

**Firestore 구조**
```
recruits/{recruitId}
{
  teamId: string
  teamName: string
  authorId: string
  
  position: string[]  // ["공격수", "미드필더", ...]
  slots: number
  region: string
  trainingDays?: string[]  // ["월", "화", ...]
  level: "취미" | "아마추어" | "준선수"
  contact: "채팅" | "전화"
  description?: string
  
  status: "open" | "closed"
  createdAt: Timestamp
}
```

**라우팅**
- `/recruit/create` → RecruitCreatePage ✅
- `/recruit` → RecruitListPage (구현 필요)

**현재 상태**: ✅ 작성 페이지 완료
- 팀 권한 체크 구현됨
- Empty State 구현됨
- activities 컬렉션 연동됨

**추가 필요**
- [ ] RecruitListPage (목록 페이지)
- [ ] RecruitDetailPage (상세 페이지)
- [ ] recruit_applications 컬렉션 (지원 시스템)

---

### 4️⃣ Match (팀 경기 매칭) ✅ (완료)

**Firestore 구조**
```
matches/{matchId}
{
  teamId: string
  teamName: string
  authorId: string
  
  date: Timestamp
  time: string
  region: string
  stadium?: string
  level: "취미" | "아마추어"
  fee?: number
  contact: "채팅" | "전화"
  description?: string
  
  status: "open" | "matched" | "finished"
  createdAt: Timestamp
}
```

**라우팅**
- `/match/create` → MatchCreatePage ✅
- `/match` → MatchListPage (구현 필요)

**현재 상태**: ✅ 작성 페이지 완료
- 팀 권한 체크 구현됨
- Empty State 구현됨
- activities 컬렉션 연동됨

**추가 필요**
- [ ] MatchListPage (목록 페이지)
- [ ] MatchDetailPage (상세 페이지)
- [ ] match_requests 컬렉션 (신청 시스템)

---

### 5️⃣ Guest Player (용병) ⚠️ (구현 필요)

**Firestore 구조**
```
guest_players/{guestId}
{
  authorId: string  // 팀 없어도 작성 가능
  
  date: Timestamp
  time: string
  region: string
  stadium?: string
  
  position: string[]  // 필요한 포지션
  slots: number  // 필요한 인원
  
  fee?: number
  description?: string
  
  status: "open" | "closed"
  createdAt: Timestamp
}
```

**라우팅**
- `/guest/create` → GuestPlayerCreatePage (구현 필요)
- `/guest` → GuestPlayerListPage (구현 필요)

**현재 상태**: ❌ 미구현

**권한 정책**: ✅ 팀 없어도 작성 가능 (개인도 용병 지원/모집 가능)

**구현 우선순위**: 🔥 **높음** (트래픽 핵심 기능)

---

### 6️⃣ Community (커뮤니티) ✅ (부분 완료)

**Firestore 구조**
```
posts/{postId}
{
  authorId: string
  title: string
  content: string
  category: "free" | "gear" | "review"
  createdAt: Timestamp
}
```

**현재 상태**: ✅ ActivityFeed로 커뮤니티 피드 구현됨
- activities 컬렉션 사용
- visibility: "public" 기준으로 전체 피드 표시

**추가 필요**
- [ ] 게시판 카테고리별 분리
- [ ] 댓글 시스템

---

## 🔥 핵심 플랫폼 페이지 구조

### 라우팅 구조 (현재 + 제안)

```
/                          → 홈 (ActivityFeed)
/recruit                   → 모집 목록 (구현 필요)
/recruit/create            → 모집 작성 ✅
/match                     → 매칭 목록 (구현 필요)
/match/create              → 매칭 작성 ✅
/guest                     → 용병 목록 (구현 필요)
/guest/create              → 용병 모집 (구현 필요)
/team                      → 팀 목록 ✅
/team/create               → 팀 생성 ✅
/team/:id                  → 팀 페이지 ✅
/market                    → 거래 마켓 ✅
/market/create             → 거래 글쓰기 ✅
```

---

## 🔥 홈 화면 구성 (제안)

### 현재 홈 구조
- ActivityFeed (전체 피드)
- 탭 필터: 전체 / 거래 / 팀 / 이벤트

### 제안: 홈 화면 개선
```
🔥 오늘 용병
  - 오늘 날짜의 guest_players 표시
  - 시간순 정렬

🔥 오늘 매칭
  - 오늘 날짜의 matches 표시
  - 시간순 정렬

🔥 최신 팀원 모집
  - 최근 3일 내 recruits 표시
  - 최신순 정렬

🔥 인기 팀
  - 팀원 수 많은 순
  - 활동 많은 순
```

---

## 🔥 권한 정책 매트릭스

| 기능 | 팀 필요 | 현재 상태 |
|------|--------|----------|
| 팀 생성 | ❌ | ✅ 완료 |
| 팀 가입 | ❌ | ✅ 완료 |
| Recruit 작성 | ✅ | ✅ 완료 |
| Match 작성 | ✅ | ✅ 완료 |
| Guest 작성 | ❌ | ❌ 미구현 |
| 게시판 | ❌ | ✅ 완료 (ActivityFeed) |

---

## 🔥 Firestore 인덱스 (필수)

### Recruits
```
Collection: recruits
Fields:
  - status (Ascending)
  - createdAt (Descending)
  
Composite Index:
  - status + createdAt
```

### Matches
```
Collection: matches
Fields:
  - status (Ascending)
  - date (Ascending)
  
Composite Index:
  - status + date
```

### Guest Players
```
Collection: guest_players
Fields:
  - date (Ascending)
  - region (Ascending)
  
Composite Index:
  - date + region
```

---

## 📋 MVP 완성 체크리스트

### ✅ 완료된 기능

- [x] Auth: 로그인, 회원가입
- [x] Team: 팀 생성, 팀 가입, 팀 페이지
- [x] Recruit: 모집 작성
- [x] Match: 매칭 작성
- [x] Community: ActivityFeed (전체 피드)

### ⚠️ 구현 필요

- [ ] Recruit: 모집 목록, 상세, 지원 시스템
- [ ] Match: 매칭 목록, 상세, 신청 시스템
- [ ] Guest: 용병 모집, 용병 목록, 용병 신청
- [ ] 홈 화면: 오늘 용병/매칭 섹션

---

## 🚀 다음 단계 제안

### Phase 1: Guest Player 구현 (우선순위 높음)
1. GuestPlayerCreatePage 생성
2. GuestPlayerListPage 생성
3. activities 컬렉션에 `guest_player_created` 타입 추가
4. ActivityFeed에 guest_player 표시

### Phase 2: 목록 페이지 구현
1. RecruitListPage
2. MatchListPage
3. 공통 컴포넌트: ListCard, FilterBar

### Phase 3: 상세 페이지 구현
1. RecruitDetailPage
2. MatchDetailPage
3. 지원/신청 시스템

---

## 📁 폴더 구조 제안

### 현재 구조 (Vite + React)
```
src/
├── pages/
│   ├── recruit/
│   │   ├── RecruitCreatePage.tsx ✅
│   │   ├── RecruitListPage.tsx (구현 필요)
│   │   └── RecruitDetailPage.tsx (구현 필요)
│   ├── match/
│   │   ├── MatchCreatePage.tsx ✅
│   │   ├── MatchListPage.tsx (구현 필요)
│   │   └── MatchDetailPage.tsx (구현 필요)
│   └── guest/
│       ├── GuestPlayerCreatePage.tsx (구현 필요)
│       ├── GuestPlayerListPage.tsx (구현 필요)
│       └── GuestPlayerDetailPage.tsx (구현 필요)
├── components/
│   ├── recruit/
│   │   ├── RecruitCard.tsx (구현 필요)
│   │   └── RecruitApplicationForm.tsx (구현 필요)
│   ├── match/
│   │   ├── MatchCard.tsx (구현 필요)
│   │   └── MatchRequestForm.tsx (구현 필요)
│   └── guest/
│       ├── GuestPlayerCard.tsx (구현 필요)
│       └── GuestPlayerApplicationForm.tsx (구현 필요)
└── lib/
    ├── recruit/
    │   ├── createRecruit.ts ✅
    │   ├── getRecruits.ts (구현 필요)
    │   └── applyToRecruit.ts (구현 필요)
    ├── match/
    │   ├── createMatch.ts ✅
    │   ├── getMatches.ts (구현 필요)
    │   └── requestMatch.ts (구현 필요)
    └── guest/
        ├── createGuestPlayer.ts (구현 필요)
        ├── getGuestPlayers.ts (구현 필요)
        └── applyToGuestPlayer.ts (구현 필요)
```

---

## 🎯 현재 프로젝트 평가

### ✅ 잘 되어 있는 것
- 구조 방향: ✅ 올바름
- 기능 구성: ✅ 핵심 기능 구현됨
- Firestore 선택: ✅ 적절함
- 권한 시스템: ✅ 2-level 구조 완료

### ⚠️ 개선 필요
- UI 정리: 일부 페이지 스타일 통일 필요
- 권한 로직: Guest Player 권한 정책 추가 필요
- 데이터 구조: recruit_applications, match_requests 컬렉션 추가 필요

---

## 🔥 결론

**현재 상태**: **70% 완성** ✅

**남은 작업**:
1. Guest Player 시스템 (트래픽 핵심)
2. 목록/상세 페이지 구현
3. 지원/신청 시스템 구현

**예상 완성 시간**: 2-3주 (Guest Player 우선)

---

## 📝 다음 메시지에서 정리할 내용

원하면 다음을 정리해드릴 수 있습니다:

1. **Guest Player 완전 구현 가이드**
2. **목록/상세 페이지 공통 컴포넌트 설계**
3. **지원/신청 시스템 아키텍처**
4. **홈 화면 개선 설계**
