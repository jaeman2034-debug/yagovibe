# YAGO VIBE 플랫폼 아키텍처

> CTO / Tech Lead 기준 · 프로젝트 전체 구조의 단일 진실 소스  
> 스타트업 서비스 운영 전 필수 문서

---

## 1. 플랫폼 개요

| 항목 | 설명 |
|------|------|
| **서비스명** | YAGO VIBE (야고 바이브) |
| **목적** | 스포츠 커뮤니티 플랫폼 |
| **핵심 기능** | 팀·이벤트·공지·채팅·마켓·출석·점수 시스템 |
| **성숙도** | Backend Architecture 90% · 실서비스 준비 단계 |

---

## 2. 기술 스택

| 계층 | 기술 | 비고 |
|------|------|------|
| **Frontend** | React 18, Vite 7, TypeScript | SPA + PWA |
| **State** | React Context (Auth, Team, Hub 등) | |
| **UI** | Tailwind CSS, Lucide Icons | |
| **Auth** | Firebase Auth (Google, Email, Phone, Anonymous) | |
| **Database** | Firestore | |
| **Backend** | Firebase Cloud Functions (Node 20) | v1 + v2 혼용 |
| **Storage** | Firebase Storage | |
| **Messaging** | FCM (Firebase Cloud Messaging) | |
| **Hosting** | Firebase Hosting | |
| **Dev** | Cursor, Firebase Emulator | |

---

## 3. 전체 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│                    YAGO VIBE Client (SPA/PWA)                     │
│  React + Vite + TypeScript                                        │
│  ├── AuthProvider · TeamProvider · HubProvider · FavoritesProvider│
│  ├── ProtectedRoute · PublicRoute · OnboardingRoute               │
│  └── BottomNav · Header · AppShell                                │
└───────────────────────────────┬──────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Firebase Services                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐  │
│  │ Auth        │ │ Firestore   │ │ Functions   │ │ Storage    │  │
│  │ Google/     │ │ teams,      │ │ onTeam*     │ │ images,    │  │
│  │ Email/Phone │ │ chatRooms,  │ │ onEvent*    │ │ avatars    │  │
│  │             │ │ market,     │ │ onNotice*   │ │            │  │
│  │             │ │ activities  │ │ onMarket*   │ │            │  │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Cloud Functions (Backend Logic)               │
│  Team │ Chat │ Market │ Attendance │ Cron │ Migration            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. 도메인 모델

### 4.1 핵심 도메인

| 도메인 | 컬렉션 | 설명 |
|--------|--------|------|
| **Team** | teams, teams/.../members, events, notices, attendance | 팀, 멤버, 이벤트, 공지, 출석 |
| **Chat** | chatRooms, chatRooms/.../messages | 팀/DM/모집 채팅 |
| **Market** | market, marketJoins | 모집·중고·매칭 게시글 |
| **Activity** | activities | 커뮤니티 피드 단일 소스 |
| **User** | users | 프로필, 플랫폼 권한 |

### 4.2 도메인 관계

```
User ──┬── teams/members (역할: owner/admin/member)
       ├── chatRooms (members)
       ├── market (authorId)
       └── activities (authorId)

Team ──┬── events (teams/{id}/events)
       ├── notices (teams/{id}/notices)
       ├── attendance (teams/{id}/attendance)
       └── chatRooms (teamId)
```

---

## 5. Frontend 구조

### 5.1 폴더 구조

```
src/
├── app/           # 라우터, providers
├── pages/         # 페이지 컴포넌트
│   ├── chat/      # 채팅
│   ├── team/      # 팀
│   ├── activity/  # 일정·활동
│   ├── market/    # 마켓
│   ├── me/        # 마이페이지
│   ├── admin/     # 관리자
│   └── ...
├── components/    # 공통 UI
├── features/      # 기능별 모듈 (market, chat, activity)
├── hooks/         # 커스텀 훅
├── services/      # Firestore 서비스 레이어
├── lib/           # 유틸, Firebase 초기화
├── context/       # Auth, Team, Hub, Favorites 등
├── types/         # TypeScript 타입
└── styles/        # CSS
```

### 5.2 라우팅 개요

| 경로 | 용도 |
|------|------|
| / | 시작 화면 |
| /login, /signup | 인증 |
| /onboarding | 신규 사용자 온보딩 |
| /home, /hub | 홈·허브 |
| /chat | 채팅 목록/방 |
| /teams/* | 팀 관리 |
| /activity/* | 일정·활동 |
| /market, /market/:sport | 마켓 |
| /me | 마이페이지 |

### 5.3 인증 플로우

```
비로그인 → PublicRoute (/, /login, /signup)
    ↓
로그인 → ProtectedRoute
    ↓
온보딩 미완료 → OnboardingRoute → /onboarding
    ↓
온보딩 완료 → /home, /hub, /chat, /teams, /market, /me
```

---

## 6. Backend 구조

### 6.1 Firestore 컬렉션

| 컬렉션 | 용도 |
|--------|------|
| teams | 팀 메타데이터 |
| teams/{id}/members | 팀 멤버, 역할, 점수 |
| teams/{id}/events | 이벤트 (참석자) |
| teams/{id}/notices | 공지 |
| teams/{id}/attendance | 출석 체크 |
| teamSchedules | 팀 일정 (최상위) |
| chatRooms | 채팅방 |
| chatRooms/{id}/messages | 메시지 |
| market | 마켓 게시글 |
| marketJoins | 모집 참여/승인 |
| activities | 피드 |
| users | 사용자 프로필 |

### 6.2 Cloud Functions

| 도메인 | 함수 | 트리거 |
|--------|------|--------|
| Team | onTeamCreated | teams/{id} onCreate |
| Team | onEventCreated | teams/.../events/{id} onCreate |
| Team | onEventAttendScore | teams/.../events/{id} onUpdate |
| Team | onNoticeCreated, onNoticeScore | teams/.../notices/{id} onCreate |
| Team | syncTeamChatMembers | teams/.../members onWrite |
| Chat | onChatRoomCreated | chatRooms/{id} onCreate |
| Chat | onMessageCreated | chatRooms/.../messages onCreate |
| Market | onMarketPostCreated/Updated | market/{id} onCreate/onUpdate |
| Market | onMarketJoinStatusChanged | marketJoins onUpdate |
| Cron | dailyChatSummary, monthlyReport, eventReminder | 스케줄 |
| Attendance | startAttendanceCheck, checkInAttendance | Callable / Trigger |

---

## 7. 권한 모델

### 7.1 플랫폼 권한

| 역할 | 위치 | 값 |
|------|------|-----|
| ADMIN | users/{uid}.role | "ADMIN" |
| USER | users/{uid}.role | "USER" |

### 7.2 팀 권한

| 역할 | 위치 | 설명 |
|------|------|------|
| owner | teams/{id}/members/{uid}.role | 팀 대표 |
| admin | teams/{id}/members/{uid}.role | 관리자 |
| member | teams/{id}/members/{uid}.role | 일반 멤버 |

---

## 8. 보안

- **Firestore Rules**: 인증된 사용자 기반 read/write
- **Auth**: Firebase Auth (Google, Email, Phone)
- **Authorized Domains**: localhost, firebaseapp.com, web.app, 커스텀 도메인

---

## 9. 배포

| 환경 | 방법 |
|------|------|
| **Frontend** | `npm run build` → Firebase Hosting |
| **Functions** | `firebase deploy --only functions` |
| **Firestore** | 규칙·인덱스 별도 배포 |

---

## 10. 문서 인덱스

| 문서 | 설명 |
|------|------|
| [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | 시스템 개요 |
| [FIRESTORE_SCHEMA.md](./FIRESTORE_SCHEMA.md) | Firestore 스키마 상세 |
| [CLOUD_FUNCTIONS_EVENTS.md](./CLOUD_FUNCTIONS_EVENTS.md) | Functions 이벤트 흐름 |
| [CHAT_SYSTEM_DESIGN.md](./CHAT_SYSTEM_DESIGN.md) | 채팅 시스템 설계 |
| [YAGO_FIRESTORE_RULES.md](./YAGO_FIRESTORE_RULES.md) | Firestore Security Rules 설계 |
| [YAGO_PRODUCTION_DEPLOYMENT.md](./YAGO_PRODUCTION_DEPLOYMENT.md) | 프로덕션 배포 가이드 |
| [YAGO_TROUBLESHOOTING.md](./YAGO_TROUBLESHOOTING.md) | **운영 매뉴얼 (Troubleshooting)** |

---

## 11. 다음 단계 (운영 설계)

1. **Firestore Security Rules** 강화
2. **Push Notification** 설계·테스트
3. **Chat** 메시지 성능·부하 테스트
4. **모니터링** (에러, 지연, 비용)

---

*CTO / Tech Lead 검토용 · 프로젝트 전체 구조의 기준 문서*
