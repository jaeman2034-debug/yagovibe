# 🏛️ 노원구 축구협회 구조 및 아키텍처 요약

## 📋 개요

현재 설계된 **노원구 축구협회** 시스템의 전체 구조와 아키텍처를 요약합니다.

---

## 1️⃣ 전체 아키텍처 구조

### 시스템 레이어

```
┌─────────────────────────────────────────┐
│         Client Layer                    │
│  (Web / Mobile Browser)                  │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Frontend Layer                   │
│  React + TypeScript                      │
│  - Public Pages (Event/Team/Player)      │
│  - Admin Console                         │
│  - Association Pages                     │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         API Layer                        │
│  - Firebase Auth                         │
│  - Cloud Functions                       │
│  - Firestore SDK                         │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Database Layer                   │
│  - Firestore (NoSQL)                     │
│  - Cloud Storage                         │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Aggregation Engine               │
│  - Cloud Functions                       │
│  - Summary Documents                     │
│  - Leaderboards                          │
└─────────────────────────────────────────┘
```

---

## 2️⃣ 노원구 축구협회 구조

### 협회 계층 구조

```
노원구 축구협회 (Association)
 ├─ 대회 (Tournaments)
 │   ├─ 조별 리그 (Group Stage)
 │   ├─ 토너먼트 (Knockout)
 │   └─ 경기 (Matches)
 │
 ├─ 회원 팀 (Member Teams)
 │   ├─ 정회원 (member)
 │   ├─ 승인 대기 (pending)
 │   └─ 비회원 (non-member)
 │
 ├─ 시설 (Facilities)
 │   └─ 경기장 관리
 │
 └─ 공지 (Notices)
     └─ 협회 공지사항
```

### Firestore 컬렉션 구조

```
associations/{associationId}
  ├─ id: "assoc-nowon-football"
  ├─ name: "노원구축구협회"
  ├─ region: "서울 노원구"
  ├─ adminUids: [uid1, uid2, ...]
  └─ superAdminUids: [uid1, ...]
  
  ├─ tournaments/{tournamentId}
  │   ├─ name: "2026 노원구청장기 축구대회"
  │   ├─ startDate, endDate
  │   ├─ status: "PREPARE" | "LIVE" | "END"
  │   ├─ organizer: "노원구 축구협회"
  │   │
  │   ├─ brackets/{division}
  │   │   └─ matches: Match[]
  │   │
  │   ├─ matches/{matchId}
  │   │   ├─ homeTeam, awayTeam
  │   │   ├─ date, time, venueId
  │   │   ├─ status: "WAIT" | "LIVE" | "END"
  │   │   └─ score: { home, away }
  │   │
  │   └─ applications/{applicationId}
  │       ├─ teamId, teamName
  │       ├─ status: "pending" | "approved" | "rejected"
  │       └─ rosterStatus: "draft" | "submitted"
  │
  ├─ notices/{noticeId}
  │   ├─ title, content
  │   ├─ publishedAt
  │   └─ isPinned
  │
  └─ facilities/{facilityId}
      ├─ name, address
      └─ accessPolicy
```

---

## 3️⃣ 팀 구성 구조

### 팀 계층 구조

```
팀 (Team)
 ├─ 기본 정보
 │   ├─ name: "공릉 FC"
 │   ├─ sportType: "football"
 │   ├─ region: "서울시 노원구"
 │   └─ status: "active" | "inactive"
 │
 ├─ 협회 회원 상태
 │   ├─ membership: "non-member" | "pending" | "member" | "academy"
 │   └─ associationId: "assoc-nowon-football" | null
 │
 ├─ 멤버 (Members)
 │   ├─ owner (팀장)
 │   ├─ admin (코치/부팀장)
 │   └─ member (팀원)
 │
 └─ 기능
     ├─ 일정 관리
     ├─ 경기 기록
     └─ 회비 관리
```

### Firestore 컬렉션 구조

```
teams/{teamId}
  ├─ id: string
  ├─ name: string
  ├─ sportType: "football"
  ├─ region: "서울시 노원구"
  │
  ├─ 상태
  │   ├─ status: "active" | "inactive"
  │   ├─ membership: "non-member" | "pending" | "member" | "academy"
  │   └─ associationId: string | null
  │
  ├─ 소유자
  │   ├─ ownerUid: string
  │   └─ owners: string[]
  │
  └─ /members/{uid}          ⭐️ 핵심 (권한의 기준)
      ├─ uid: string (문서 ID = uid)
      ├─ role: "owner" | "admin" | "member"
      ├─ status: "active" | "inactive"
      └─ joinedAt: Timestamp
```

### 팀 멤버 역할

| 역할 | 권한 | 설명 |
|------|------|------|
| **owner** | 최고 권한 | 팀 생성자, 모든 권한 |
| **admin** | 관리 권한 | 코치/부팀장, 멤버 관리 가능 |
| **member** | 일반 권한 | 팀원, 기본 기능 사용 |

### 팀 상태 전이

```
STEP 1: 팀 생성
  → status: "active"
  → membership: "non-member"
  → associationId: null

STEP 2: 협회 회원 신청
  → membership: "pending"
  → associationId: "assoc-nowon-football"

STEP 3: 관리자 승인
  → membership: "member"
  → associationId: "assoc-nowon-football"
```

---

## 4️⃣ 권한 구조

### 플랫폼 레벨 권한

```
users/{uid}
  └─ role: "ADMIN" | "USER"
```

- **ADMIN**: 플랫폼 전체 관리
- **USER**: 일반 사용자

### 협회 레벨 권한

```
associations/{associationId}
  ├─ adminUids: [uid1, uid2, ...]
  └─ superAdminUids: [uid1, ...]
```

- **superAdmin**: 협회 최고 관리자
- **admin**: 협회 관리자

### 팀 레벨 권한

```
teams/{teamId}/members/{uid}
  └─ role: "owner" | "admin" | "member"
```

- **owner**: 팀장 (팀 생성자)
- **admin**: 코치/부팀장
- **member**: 팀원

### 권한 우선순위

```
SUPER_ADMIN (플랫폼)
   ↓
superAdmin (협회)
   ↓
admin (협회)
   ↓
owner (팀)
   ↓
admin (팀)
   ↓
member (팀)
   ↓
USER (플랫폼)
```

---

## 5️⃣ 대회 운영 구조

### 대회 생성 플로우

```
1. 협회 관리자가 대회 생성
   → associations/{associationId}/tournaments/{tournamentId}

2. 팀 참가 신청
   → associations/{associationId}/tournaments/{tournamentId}/applications/{applicationId}
   → status: "pending"

3. 관리자 승인
   → status: "approved"

4. 선수 명단 제출
   → rosterStatus: "submitted"

5. 대진표 생성
   → brackets/{division}
   → matches: Match[]

6. 경기 진행
   → matches/{matchId}
   → status: "LIVE" → "END"

7. 결과 집계
   → 자동 집계 (Cloud Functions)
   → leaderboards 업데이트
```

### 경기 구조

```
Match (경기)
 ├─ 기본 정보
 │   ├─ tournamentId
 │   ├─ division: "youth" | "middle" | "senior" | "silver"
 │   ├─ round: number (라운드)
 │   └─ matchNumber: string
 │
 ├─ 팀 정보
 │   ├─ homeTeam, homeTeamId
 │   ├─ awayTeam, awayTeamId
 │   └─ homeSlot, awaySlot (토너먼트 참조)
 │
 ├─ 일정
 │   ├─ date: "2026-08-19"
 │   ├─ startTime: "10:00"
 │   ├─ endTime: "10:40"
 │   └─ venueId, courtNo
 │
 ├─ 상태
 │   └─ status: "WAIT" | "LIVE" | "END" | "CANCELLED"
 │
 └─ 결과
     ├─ score: { home, away }
     ├─ winner: "HOME" | "AWAY"
     └─ resultType: "FT" | "PK" | "ET"
```

---

## 6️⃣ 멀티 테넌트 SaaS 구조

### 핵심 원칙

1. **Association이 최상위 엔티티**
   - 모든 하위 데이터는 `associationId` 포함
   - 협회 간 데이터 완전 분리

2. **동일 코드베이스로 무제한 확장**
   - 노원구 → 강남구 → 서울시 → 전국 확장 가능

3. **데이터 격리 보장**
   - 쿼리 레벨: `where("associationId", "==", associationId)`
   - Rules 레벨: `isAssociationAdmin(associationId)`
   - Functions 레벨: `associationId` 검증

### 확장 예시

```
현재: 노원구 축구협회
  ↓
확장 1: 강남구 축구협회
  ↓
확장 2: 서울시 축구협회 (상위 협회)
  ↓
확장 3: 대한축구협회 (중앙 협회)
```

---

## 7️⃣ 데이터 흐름

### 팀 → 협회 연동

```
1. 팀 생성 (비회원)
   teams/{teamId}
   → membership: "non-member"
   → associationId: null

2. 협회 회원 신청
   teams/{teamId}
   → membership: "pending"
   → associationId: "assoc-nowon-football"
   
   membershipRequests/{requestId}
   → status: "pending"

3. 관리자 승인
   teams/{teamId}
   → membership: "member"
   → associationId: "assoc-nowon-football"
   
   membershipRequests/{requestId}
   → status: "approved"
```

### 대회 → 팀 연동

```
1. 협회가 대회 생성
   associations/{associationId}/tournaments/{tournamentId}

2. 팀이 참가 신청
   associations/{associationId}/tournaments/{tournamentId}/applications/{applicationId}
   → teamId, teamName
   → status: "pending"

3. 관리자 승인
   → status: "approved"

4. 대진표 생성
   → brackets/{division}
   → matches 자동 생성

5. 경기 진행
   → matches/{matchId}
   → 결과 입력
   → 자동 집계 (Cloud Functions)
```

---

## 8️⃣ 핵심 규칙 (절대 규칙)

### 팀 멤버 구조

1. **members 문서 ID = uid**
   - `teams/{teamId}/members/{uid}` 형식
   - 랜덤 ID 금지

2. **team_members는 보조 인덱스**
   - 조회 최적화용
   - 권한 판단에 사용 안 함

3. **팀/멤버 생성은 서버 only**
   - Cloud Functions에서만 생성
   - 프론트엔드 직접 생성 금지

### 협회 구조

1. **associationId 필수**
   - 모든 하위 문서에 `associationId` 포함
   - 데이터 격리 보장

2. **권한 체크**
   - `associations/{associationId}/admins/{uid}` 존재 여부
   - 또는 `associations/{associationId}.adminUids` 배열 확인

---

## 9️⃣ 주요 기능

### 협회 기능

- ✅ 대회 생성 및 관리
- ✅ 팀 회원 승인/거절
- ✅ 공지사항 관리
- ✅ 시설 관리
- ✅ 대진표 생성 및 관리
- ✅ 경기 결과 집계

### 팀 기능

- ✅ 팀 생성 (비회원 가능)
- ✅ 협회 회원 신청
- ✅ 대회 참가 신청
- ✅ 선수 명단 제출
- ✅ 경기 일정 조회
- ✅ 경기 결과 조회

### 플랫폼 기능

- ✅ 통계 집계 (Cloud Functions)
- ✅ 리더보드 자동 업데이트
- ✅ 알림 시스템
- ✅ 이메일 알림
- ✅ 미디어 시스템
- ✅ 소셜 기능 (Like/Comment/Share/Follow)

---

## 🔟 현재 플랫폼 상태

### 완성된 레이어

```
✅ 운영 플랫폼 (Admin / Stats / Realtime)
✅ 콘텐츠 플랫폼 (Media System)
✅ 커뮤니케이션 플랫폼 (Notifications + Email)
✅ 소셜 플랫폼 (Like / Comment / Share / Follow)
✅ 분석 플랫폼 (Analytics Dashboard)
✅ 검색 플랫폼 (Search / Directory)
✅ 기록 플랫폼 (Team / Player Pages)
```

**총 7개 레이어가 구축된 상태**입니다.

---

## 📊 노원구 축구협회 특화 구조

### 협회 ID

```
assoc-nowon-football
```

### 협회 정보

```typescript
{
  id: "assoc-nowon-football",
  name: "노원구축구협회",
  region: "서울 노원구",
  adminUids: [uid1, uid2, ...],
  superAdminUids: [uid1, ...],
  createdAt: Timestamp
}
```

### 회원 팀 조회

```typescript
// 협회 회원 팀 목록
query(
  collection(db, "teams"),
  where("associationId", "==", "assoc-nowon-football"),
  where("membership", "==", "member")
)
```

### 대회 조회

```typescript
// 협회 대회 목록
query(
  collection(db, `associations/assoc-nowon-football/tournaments`),
  orderBy("startDate", "desc")
)
```

---

## 🎯 아키텍처 특징

### 1. 멀티 테넌트 SaaS

- 협회별 데이터 완전 분리
- 동일 코드베이스로 무제한 확장
- 권한 기반 접근 제어

### 2. 자동화 엔진

- Cloud Functions 기반 자동 집계
- 대진표 자동 생성
- 승자 자동 진출
- 통계 자동 업데이트

### 3. 실시간 시스템

- 라이브 스코어
- 실시간 리더보드
- 실시간 알림

### 4. 확장 가능한 구조

- 플러그인 방식 기능 추가
- 레이어별 독립 확장
- 마이크로서비스 아키텍처 준비

---

## 📝 요약

### 노원구 축구협회 구조

1. **협회**: 최상위 엔티티 (`associations/assoc-nowon-football`)
2. **대회**: 협회 하위 (`associations/{associationId}/tournaments/{tournamentId}`)
3. **팀**: 독립 컬렉션 (`teams/{teamId}`) + `associationId` 연결
4. **회원 상태**: `membership` 필드로 관리

### 팀 구성 구조

1. **멤버**: `teams/{teamId}/members/{uid}` (문서 ID = uid)
2. **역할**: `owner` | `admin` | `member`
3. **상태**: `active` | `inactive`
4. **협회 연동**: `membership` + `associationId`

### 아키텍처 특징

1. **멀티 테넌트**: 협회별 데이터 격리
2. **자동화**: Cloud Functions 기반 자동 처리
3. **실시간**: Firestore 실시간 업데이트
4. **확장성**: 레이어별 독립 확장 가능

---

**작성일**: 2024년  
**상태**: ✅ 완료 (운영 중)
