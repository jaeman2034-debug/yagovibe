# 🚀 전국 스포츠 SaaS 플랫폼 아키텍처 완전 설계

> **단일 협회 시스템 → 전국 스포츠 SaaS 플랫폼 확장**

---

## 📋 목차

1. [SaaS 플랫폼 개념](#1-saas-플랫폼-개념)
2. [Multi-Tenant 아키텍처](#2-multi-tenant-아키텍처)
3. [플랫폼 구조](#3-플랫폼-구조)
4. [Association Domain 확장](#4-association-domain-확장)
5. [Billing 시스템](#5-billing-시스템)
6. [Feature Flags 시스템](#6-feature-flags-시스템)
7. [Multi-Sport 지원](#7-multi-sport-지원)
8. [Tenant Isolation](#8-tenant-isolation)
9. [Router 구조](#9-router-구조)
10. [Platform Admin vs Association Admin](#10-platform-admin-vs-association-admin)
11. [확장 전략](#11-확장-전략)
12. [Production Architecture 옵션](#12-production-architecture-옵션)

---

## 1️⃣ SaaS 플랫폼 개념

### 1-1. 현재 구조

```
노원구 축구협회 플랫폼
```

### 1-2. SaaS 확장 후

```
Sports SaaS Platform
 ├─ 노원구 축구협회
 ├─ 도봉구 축구협회
 ├─ 서울시 축구협회
 ├─ 대한축구협회
 ├─ 농구 협회
 └─ 야구 협회
```

### 1-3. 플랫폼 정체성

```
Association-as-a-Service (AaaS)
```

또는

```
Sports Operating System (SportOS)
```

---

## 2️⃣ Multi-Tenant 아키텍처

### 2-1. 핵심 원칙

**Tenant = Association**

모든 데이터는 `associationId`를 포함하여 완전히 격리됩니다.

```typescript
// 모든 컬렉션에 필수 필드
{
  associationId: "assoc-nowon-football",
  // ... 기타 필드
}
```

### 2-2. 데이터 격리 구조

```
Platform Root
│
├─ associations/{associationId}
│   ├─ teams/{teamId}              (associationId 포함)
│   ├─ players/{playerId}           (associationId 포함)
│   ├─ tournaments/{tournamentId}   (associationId 포함)
│   ├─ matches/{matchId}            (associationId 포함)
│   └─ activities/{activityId}    (associationId 포함)
│
└─ platform/                        (플랫폼 전역)
    ├─ users/{userId}
    ├─ billing/{subscriptionId}
    └─ admin_logs/{logId}
```

### 2-3. Tenant Isolation 규칙

**보안 규칙**:
```javascript
// 모든 쿼리는 associationId 필터링
where("associationId", "==", currentAssociationId)

// 보안 규칙
request.auth.associationId == resource.data.associationId
```

---

## 3️⃣ 플랫폼 구조

### 3-1. 전체 플랫폼 레이어

```
Sports SaaS Platform
│
├─ Platform Core (플랫폼 핵심)
│   ├─ Authentication
│   ├─ Authorization (RBAC)
│   ├─ Tenant Management
│   ├─ Billing & Subscriptions
│   ├─ Feature Flags
│   └─ Platform Analytics
│
├─ Association Services (협회 서비스)
│   ├─ Team Management
│   ├─ Player Management
│   ├─ Tournament Management
│   ├─ Match Management
│   ├─ Stats & Analytics
│   ├─ Media Management
│   ├─ Social Features
│   └─ Activity Feed
│
├─ Content Services (콘텐츠 서비스)
│   ├─ Media Storage
│   ├─ Activity Feed
│   └─ Notifications
│
└─ Admin Services (관리 서비스)
    ├─ Platform Admin
    ├─ Association Admin
    └─ System Monitoring
```

---

## 4️⃣ Association Domain 확장

### 4-1. associations 컬렉션 확장

**경로**: `associations/{associationId}`

```typescript
interface Association {
  id: string;
  
  // 기본 정보
  name: string;                       // "노원구 축구협회"
  slug: string;                       // "nowon-football" (URL용)
  region: string;                     // "서울 노원구"
  description?: string;
  
  // 스포츠 타입
  sportType: "football" | "basketball" | "baseball" | "futsal" | "volleyball" | "multi";
  
  // 로고/이미지
  logoUrl?: string;
  bannerUrl?: string;
  
  // 관리자
  adminUids: string[];                // 협회 관리자 UID 배열
  superAdminUids?: string[];          // 슈퍼 관리자 UID 배열
  
  // 플랜 & Billing
  plan: "free" | "basic" | "pro" | "enterprise";
  subscriptionId?: string;            // Stripe/결제 시스템 구독 ID
  subscriptionStatus?: "active" | "cancelled" | "past_due" | "trialing";
  subscriptionStartDate?: Timestamp;
  subscriptionEndDate?: Timestamp;
  
  // Feature Flags
  features: {
    liveMatch: boolean;                // Live Match 기능
    media: boolean;                    // Media 기능
    analytics: boolean;                // Analytics 기능
    social: boolean;                  // Social Features
    api: boolean;                     // API Access
    customDomain: boolean;             // 커스텀 도메인
    whiteLabel: boolean;               // 화이트 라벨
  };
  
  // 제한사항 (플랜별)
  limits: {
    teams?: number;                   // 최대 팀 수 (null = 무제한)
    players?: number;                 // 최대 선수 수
    matches?: number;                 // 최대 경기 수 (월간)
    mediaStorage?: number;            // 미디어 저장 용량 (GB)
    admins?: number;                  // 최대 관리자 수
  };
  
  // 사용량 (현재)
  usage: {
    teams: number;                    // 현재 팀 수
    players: number;                  // 현재 선수 수
    matches: number;                  // 현재 경기 수 (이번 달)
    mediaStorage: number;              // 사용 중인 저장 용량 (GB)
    admins: number;                   // 현재 관리자 수
  };
  
  // 통계 (Denormalized)
  stats: {
    teamCount: number;
    playerCount: number;
    matchCount: number;
    activeUsers: number;               // 활성 사용자 수
  };
  
  // 도메인
  customDomain?: string;               // "nowonfootball.kr"
  domainVerified?: boolean;            // 도메인 인증 여부
  
  // 상태
  status: "active" | "suspended" | "deleted";
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  trialEndsAt?: Timestamp;            // 트라이얼 종료일
}
```

**예시**:
```typescript
{
  id: "assoc-nowon-football",
  name: "노원구 축구협회",
  slug: "nowon-football",
  region: "서울 노원구",
  sportType: "football",
  plan: "pro",
  subscriptionId: "sub_1234567890",
  subscriptionStatus: "active",
  features: {
    liveMatch: true,
    media: true,
    analytics: true,
    social: true,
    api: false,
    customDomain: true,
    whiteLabel: false,
  },
  limits: {
    teams: null,                      // 무제한
    players: null,                    // 무제한
    matches: null,                    // 무제한
    mediaStorage: 100,                // 100GB
    admins: 10,
  },
  usage: {
    teams: 24,
    players: 340,
    matches: 72,
    mediaStorage: 12.5,
    admins: 3,
  },
  customDomain: "nowonfootball.kr",
  domainVerified: true,
  status: "active",
  createdAt: Timestamp,
}
```

---

### 4-2. 플랜별 기능 매트릭스

| 기능 | Free | Basic | Pro | Enterprise |
|------|------|-------|-----|------------|
| 팀 수 | 5 | 20 | 무제한 | 무제한 |
| 선수 수 | 50 | 200 | 무제한 | 무제한 |
| 경기 수 (월) | 20 | 100 | 무제한 | 무제한 |
| 미디어 저장 | 1GB | 10GB | 100GB | 무제한 |
| Live Match | ❌ | ✅ | ✅ | ✅ |
| Analytics | ❌ | 기본 | 고급 | 커스텀 |
| API Access | ❌ | ❌ | ✅ | ✅ |
| 커스텀 도메인 | ❌ | ❌ | ✅ | ✅ |
| 화이트 라벨 | ❌ | ❌ | ❌ | ✅ |
| 우선 지원 | ❌ | ❌ | ❌ | ✅ |

---

## 5️⃣ Billing 시스템

### 5-1. subscriptions 컬렉션

**경로**: `subscriptions/{subscriptionId}`

```typescript
interface Subscription {
  id: string;                         // Stripe subscription ID
  associationId: string;
  
  // 플랜 정보
  plan: "free" | "basic" | "pro" | "enterprise";
  planName: string;                   // "Pro Plan"
  
  // 결제 정보
  price: number;                      // 월간 가격 (원)
  currency: string;                   // "KRW"
  interval: "month" | "year";         // 결제 주기
  
  // 상태
  status: "active" | "cancelled" | "past_due" | "trialing" | "unpaid";
  
  // 기간
  currentPeriodStart: Timestamp;
  currentPeriodEnd: Timestamp;
  cancelAtPeriodEnd?: boolean;        // 기간 종료 시 취소
  
  // 트라이얼
  trialStart?: Timestamp;
  trialEnd?: Timestamp;
  
  // 결제 이력
  paymentMethodId?: string;           // Stripe payment method ID
  lastPaymentAt?: Timestamp;
  nextPaymentAt?: Timestamp;
  
  // 취소 정보
  cancelledAt?: Timestamp;
  cancellationReason?: string;
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

---

### 5-2. billing_history 컬렉션

**경로**: `billing_history/{invoiceId}`

```typescript
interface BillingHistory {
  id: string;                         // Stripe invoice ID
  associationId: string;
  subscriptionId: string;
  
  // 청구 정보
  amount: number;                     // 금액
  currency: string;                  // "KRW"
  status: "paid" | "pending" | "failed" | "refunded";
  
  // 기간
  periodStart: Timestamp;
  periodEnd: Timestamp;
  
  // 결제 정보
  paidAt?: Timestamp;
  paymentMethod?: string;              // "card", "bank_transfer"
  
  // 영수증
  receiptUrl?: string;                 // 영수증 URL
  
  // 메타데이터
  createdAt: Timestamp;
}
```

---

### 5-3. Billing Flow

```
1. 협회 가입
   ↓
2. Free Plan 자동 할당
   ↓
3. 플랜 업그레이드 선택
   ↓
4. 결제 정보 입력 (Stripe)
   ↓
5. 구독 생성
   ↓
6. Feature Flags 활성화
   ↓
7. 월간/연간 자동 결제
```

---

## 6️⃣ Feature Flags 시스템

### 6-1. Feature Flags 구조

**경로**: `associations/{associationId}.features`

```typescript
interface FeatureFlags {
  // Core Features
  liveMatch: boolean;                 // Live Match 기능
  media: boolean;                     // Media 기능
  analytics: boolean;                 // Analytics 기능
  social: boolean;                    // Social Features
  api: boolean;                       // API Access
  customDomain: boolean;              // 커스텀 도메인
  whiteLabel: boolean;                // 화이트 라벨
  
  // Advanced Features
  aiStats: boolean;                   // AI 통계 분석
  videoAnalysis: boolean;              // 영상 분석
  playerTracking: boolean;             // 선수 추적
  customReports: boolean;               // 커스텀 리포트
  
  // Integration Features
  calendarSync: boolean;              // 캘린더 동기화
  emailNotifications: boolean;         // 이메일 알림
  smsNotifications: boolean;          // SMS 알림
  webhook: boolean;                   // Webhook 지원
}
```

### 6-2. Feature Flag 체크 함수

```typescript
// Frontend
function hasFeature(association: Association, feature: keyof FeatureFlags): boolean {
  return association.features[feature] === true;
}

// 사용 예시
if (hasFeature(association, "liveMatch")) {
  // Live Match 기능 표시
}

// Backend (Cloud Functions)
async function checkFeature(associationId: string, feature: string): Promise<boolean> {
  const association = await getAssociation(associationId);
  return association.features[feature] === true;
}
```

---

## 7️⃣ Multi-Sport 지원

### 7-1. 스포츠 타입 확장

```typescript
type SportType = 
  | "football"        // 축구
  | "basketball"      // 농구
  | "baseball"        // 야구
  | "futsal"          // 풋살
  | "volleyball"      // 배구
  | "badminton"       // 배드민턴
  | "tennis"          // 테니스
  | "multi";          // 복합 (여러 종목)
```

### 7-2. 스포츠별 설정

```typescript
interface SportConfig {
  sportType: SportType;
  
  // 경기 설정
  matchDuration: number;              // 경기 시간 (분)
  periods: number;                    // 세트/라운드 수
  playersPerTeam: number;            // 팀당 선수 수
  
  // 통계 필드
  statsFields: string[];              // ["goals", "assists", "cards"]
  
  // 포지션
  positions: string[];                // ["GK", "DF", "MF", "FW"]
  
  // 이벤트 타입
  eventTypes: string[];               // ["goal", "assist", "card"]
}
```

### 7-3. 스포츠별 UI 컴포넌트

```typescript
// 스포츠별 컴포넌트 매핑
const sportComponents = {
  football: {
    MatchCard: FootballMatchCard,
    StatsCard: FootballStatsCard,
    Timeline: FootballTimeline,
  },
  basketball: {
    MatchCard: BasketballMatchCard,
    StatsCard: BasketballStatsCard,
    Timeline: BasketballTimeline,
  },
  // ...
};

// 사용 예시
const MatchCard = sportComponents[association.sportType].MatchCard;
```

---

## 8️⃣ Tenant Isolation

### 8-1. 데이터 격리 규칙

**모든 쿼리는 associationId 필터링**:

```typescript
// ✅ 올바른 쿼리
query(
  collection(db, "teams"),
  where("associationId", "==", associationId),
  orderBy("createdAt", "desc")
)

// ❌ 잘못된 쿼리 (모든 협회 데이터 조회)
query(
  collection(db, "teams"),
  orderBy("createdAt", "desc")
)
```

### 8-2. 보안 규칙 강화

**파일**: `firestore.rules`

```javascript
// Helper: Association ID 체크
function isSameAssociation(associationId) {
  return request.auth != null &&
    resource.data.associationId == associationId;
}

// Teams
match /teams/{teamId} {
  allow read: if true; // 공개 읽기
  allow write: if isSameAssociation(resource.data.associationId);
}

// Players
match /players/{playerId} {
  allow read: if true;
  allow write: if isSameAssociation(resource.data.associationId);
}

// Matches
match /matches/{matchId} {
  allow read: if true;
  allow write: if isSameAssociation(resource.data.associationId);
}
```

### 8-3. Context 기반 필터링

```typescript
// Frontend Context
interface AssociationContext {
  associationId: string;
  association: Association;
  userRole: "admin" | "member" | "viewer";
}

// 모든 Service 함수에 associationId 전달
async function getTeams(associationId: string) {
  return query(
    collection(db, "teams"),
    where("associationId", "==", associationId)
  );
}
```

---

## 9️⃣ Router 구조

### 9-1. Association Router

```
/a/[associationSlug]
```

**예시**:
```
/a/nowon-football
/a/dobong-football
/a/seoul-basketball
```

### 9-2. Platform Admin Router

```
/platform
```

**구조**:
```
/platform
 ├─ /dashboard              # 플랫폼 대시보드
 ├─ /associations           # 협회 관리
 │   └─ /[associationId]     # 협회 상세
 ├─ /users                  # 사용자 관리
 ├─ /billing                # 결제 관리
 ├─ /analytics              # 플랫폼 분석
 ├─ /settings               # 플랫폼 설정
 └─ /logs                   # 시스템 로그
```

### 9-3. Next.js App Router 구조

```
app/
├─ a/
│   └─ [associationSlug]/
│       ├─ page.tsx                    # 협회 홈
│       ├─ teams/
│       ├─ players/
│       ├─ tournaments/
│       ├─ matches/
│       └─ admin/
│
├─ platform/
│   ├─ dashboard/
│   ├─ associations/
│   ├─ users/
│   ├─ billing/
│   └─ analytics/
│
└─ auth/
    ├─ login/
    └─ signup/
```

---

## 🔟 Platform Admin vs Association Admin

### 10-1. 역할 정의

```typescript
// Platform Admin (플랫폼 전체 관리)
type PlatformRole = 
  | "super_admin"        // 슈퍼 관리자
  | "platform_admin"     // 플랫폼 관리자
  | "support"            // 고객 지원
  | "developer";         // 개발자

// Association Admin (협회 관리)
type AssociationRole = 
  | "association_admin"  // 협회 관리자
  | "league_admin"        // 리그 관리자
  | "referee"            // 심판
  | "team_manager"        // 팀 관리자
  | "player"             // 선수
  | "viewer";            // 조회자
```

### 10-2. Platform Admin 권한

```typescript
interface PlatformAdminPermissions {
  // 협회 관리
  createAssociation: boolean;
  updateAssociation: boolean;
  deleteAssociation: boolean;
  suspendAssociation: boolean;
  
  // 사용자 관리
  viewAllUsers: boolean;
  updateUser: boolean;
  deleteUser: boolean;
  
  // 결제 관리
  viewBilling: boolean;
  updateSubscription: boolean;
  refundPayment: boolean;
  
  // 시스템 관리
  viewSystemLogs: boolean;
  updateFeatureFlags: boolean;
  manageSystemSettings: boolean;
}
```

### 10-3. Association Admin 권한

```typescript
interface AssociationAdminPermissions {
  // 팀 관리
  approveTeam: boolean;
  rejectTeam: boolean;
  updateTeam: boolean;
  
  // 선수 관리
  approvePlayer: boolean;
  rejectPlayer: boolean;
  updatePlayer: boolean;
  
  // 경기 관리
  createMatch: boolean;
  updateMatch: boolean;
  deleteMatch: boolean;
  
  // 리그 관리
  createTournament: boolean;
  updateTournament: boolean;
  deleteTournament: boolean;
  
  // 미디어 관리
  approveMedia: boolean;
  rejectMedia: boolean;
  
  // 공지 관리
  createNotice: boolean;
  updateNotice: boolean;
  deleteNotice: boolean;
}
```

### 10-4. Platform Admin Dashboard

**기능**:
- 협회 목록 및 관리
- 사용자 관리
- 결제 및 구독 관리
- 플랫폼 통계
- 시스템 로그
- Feature Flags 관리
- 시스템 설정

### 10-5. Association Admin Dashboard

**기능**:
- 팀 승인/관리
- 선수 승인/관리
- 경기 생성/관리
- 리그 생성/관리
- 미디어 승인
- 공지 관리
- 협회 통계
- 협회 설정

---

## 1️⃣1️⃣ 확장 전략

### 11-1. 성장 단계

**1단계: 단일 협회 (MVP)**
```
노원구 축구협회
```

**2단계: 지역 확장**
```
서울 지역 협회 (노원구, 도봉구, 강북구...)
```

**3단계: 전국 확장**
```
전국 축구 협회
```

**4단계: Multi-Sport**
```
축구, 농구, 야구, 배구...
```

**5단계: 글로벌**
```
한국, 일본, 중국...
```

### 11-2. 기술 확장 전략

**초기 (1-10 협회)**
```
Next.js
Firebase
Firestore
Cloud Functions
```

**중기 (10-100 협회)**
```
+ Redis (캐싱)
+ CDN (Cloudflare)
+ Search Engine (Algolia/Elasticsearch)
```

**대규모 (100+ 협회)**
```
+ BigQuery (분석)
+ Kafka (이벤트 스트리밍)
+ Kubernetes (오케스트레이션)
+ Microservices
```

### 11-3. 데이터 확장 전략

**초기**
```
Firestore (모든 데이터)
```

**중기**
```
Firestore (핫 데이터)
+ BigQuery (콜드 데이터, 분석)
```

**대규모**
```
Firestore (실시간 데이터)
+ PostgreSQL (관계형 데이터)
+ BigQuery (분석)
+ Redis (캐시)
+ Elasticsearch (검색)
```

---

## 1️⃣2️⃣ Production Architecture 옵션

### 12-1. 옵션 A: Firebase 중심 (권장 - 초기/중기)

**스택**:
```
Frontend: Next.js
Backend: Firebase
Database: Firestore
Functions: Cloud Functions
Storage: Cloud Storage
Auth: Firebase Auth
Hosting: Vercel / Firebase Hosting
```

**장점**:
- ✅ 빠른 개발 속도
- ✅ 저비용 (초기)
- ✅ 서버리스 (확장 자동)
- ✅ 실시간 기능 내장
- ✅ 인증/보안 내장

**단점**:
- ❌ Firestore 쿼리 제한
- ❌ 대규모 트랜잭션 제한
- ❌ 복잡한 관계형 쿼리 어려움

**적합한 경우**:
- 스타트업 ~ 중소 규모
- 빠른 MVP 개발
- 실시간 기능 중요
- 예산 제한

---

### 12-2. 옵션 B: Full Backend (대규모/엔터프라이즈)

**스택**:
```
Frontend: Next.js
Backend: NestJS / Express
Database: PostgreSQL
Cache: Redis
Queue: Bull / RabbitMQ
Search: Elasticsearch
Analytics: BigQuery
Storage: S3 / Cloud Storage
Auth: Auth0 / Keycloak
Hosting: AWS / GCP
```

**장점**:
- ✅ 대규모 확장 가능
- ✅ 복잡한 쿼리 지원
- ✅ 트랜잭션 제어
- ✅ 엔터프라이즈급 기능
- ✅ 커스터마이징 자유도

**단점**:
- ❌ 높은 개발 비용
- ❌ 인프라 관리 필요
- ❌ 초기 설정 복잡
- ❌ DevOps 필요

**적합한 경우**:
- 대규모 서비스
- 엔터프라이즈 고객
- 복잡한 비즈니스 로직
- 높은 트래픽 예상

---

### 12-3. 옵션 C: 하이브리드 (권장 - 중기/대규모)

**스택**:
```
Frontend: Next.js
Backend: 
  - Firebase (실시간, 인증)
  - NestJS API (복잡한 로직)
Database:
  - Firestore (실시간 데이터)
  - PostgreSQL (관계형 데이터)
Cache: Redis
Search: Algolia / Elasticsearch
Analytics: BigQuery
Storage: Cloud Storage
```

**장점**:
- ✅ Firebase 장점 활용
- ✅ 복잡한 로직은 별도 API
- ✅ 점진적 마이그레이션 가능
- ✅ 최적의 성능/비용

**단점**:
- ❌ 시스템 복잡도 증가
- ❌ 데이터 동기화 필요

**적합한 경우**:
- 중규모 ~ 대규모
- 점진적 확장 계획
- 실시간 + 복잡한 로직 모두 필요

---

### 12-4. 추천 아키텍처 (단계별)

**Phase 1: MVP (0-10 협회)**
```
Next.js + Firebase
- 빠른 개발
- 저비용
- 실시간 기능
```

**Phase 2: 성장 (10-50 협회)**
```
Next.js + Firebase + Redis
- 캐싱 추가
- 성능 최적화
```

**Phase 3: 확장 (50-200 협회)**
```
Next.js + Firebase + PostgreSQL + Redis
- 관계형 데이터 추가
- 복잡한 쿼리 지원
```

**Phase 4: 대규모 (200+ 협회)**
```
Next.js + Microservices + PostgreSQL + Redis + BigQuery
- 마이크로서비스 전환
- 분석 시스템 추가
```

---

## 1️⃣3️⃣ 플랫폼 이름 제안

### 가능한 이름

1. **SportOS** - Sports Operating System
2. **LeagueOS** - League Operating System
3. **PlayLeague** - Play + League
4. **MatchHub** - Match Hub
5. **SportFlow** - Sports Flow
6. **TeamFlow** - Team Flow
7. **LeagueFlow** - League Flow
8. **SportSync** - Sports Sync

### 도메인 예시

```
sportos.io
leagueos.io
playleague.io
matchhub.io
```

### 서브도메인 구조

```
nowonfootball.sportos.io
dobongfootball.sportos.io
seoulbasketball.sportos.io
```

또는

```
sportos.io/a/nowon-football
sportos.io/a/dobong-football
```

---

## 1️⃣4️⃣ SaaS 플랫폼 완성 구조

### 최종 플랫폼 레이어

```
SportOS Platform

 ├─ Platform Core
 │   ├─ Authentication
 │   ├─ Authorization (RBAC)
 │   ├─ Tenant Management
 │   ├─ Billing & Subscriptions
 │   ├─ Feature Flags
 │   └─ Platform Analytics
 │
 ├─ Association Services
 │   ├─ Team Management
 │   ├─ Player Management
 │   ├─ Tournament Management
 │   ├─ Match Management
 │   ├─ Live Match
 │   ├─ Stats & Analytics
 │   ├─ Media Management
 │   ├─ Social Features
 │   └─ Activity Feed
 │
 ├─ Content Services
 │   ├─ Media Storage
 │   ├─ Activity Feed
 │   └─ Notifications
 │
 └─ Admin Services
     ├─ Platform Admin
     ├─ Association Admin
     └─ System Monitoring
```

---

## 1️⃣5️⃣ 구현 체크리스트

### Phase 1: Multi-Tenant 기반
- [ ] `associations` 컬렉션 확장 (plan, features, limits)
- [ ] 모든 컬렉션에 `associationId` 필드 추가
- [ ] Tenant Isolation 보안 규칙
- [ ] Association Context 구현

### Phase 2: Billing 시스템
- [ ] `subscriptions` 컬렉션
- [ ] `billing_history` 컬렉션
- [ ] Stripe 연동
- [ ] 플랜별 기능 제한

### Phase 3: Feature Flags
- [ ] Feature Flags 구조
- [ ] 플랜별 Feature 활성화
- [ ] Feature 체크 함수

### Phase 4: Multi-Sport 지원
- [ ] 스포츠 타입 확장
- [ ] 스포츠별 설정
- [ ] 스포츠별 UI 컴포넌트

### Phase 5: Platform Admin
- [ ] Platform Admin Dashboard
- [ ] 협회 관리 UI
- [ ] 사용자 관리 UI
- [ ] 결제 관리 UI

### Phase 6: Router 확장
- [ ] `/platform` 라우터
- [ ] Platform Admin 페이지
- [ ] Association 라우터 유지

---

## 📚 주요 참고 사례

### 유사 플랫폼

1. **Hudl** - 스포츠 비디오 분석 플랫폼
2. **TeamSnap** - 팀 관리 플랫폼
3. **LeagueApps** - 리그 관리 플랫폼
4. **GameChanger** - 스포츠 스코어링 플랫폼
5. **SportsEngine** - 스포츠 관리 플랫폼

이 플랫폼들은 모두 **Multi-Tenant SaaS 구조**를 사용합니다.

---

## ✅ 최종 정리

### 현재 설계 완료 항목

```
✅ 협회 시스템
✅ 팀 시스템
✅ 선수 시스템
✅ 리그 시스템
✅ 경기 시스템
✅ Live Match System
✅ Media System
✅ Social Features
✅ Activity Feed
✅ Admin Dashboard
✅ UI Design System
✅ Firestore Database Schema
✅ Multi-Tenant SaaS Architecture
```

### 플랫폼 완성도

```
Complete Sports SaaS Platform (100% 설계 완료)
```

---

**작성일**: 2024년  
**상태**: ✅ 설계 완료 (개발 시작 가능)
