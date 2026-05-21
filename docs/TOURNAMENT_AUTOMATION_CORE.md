# 🔥 대회 운영 자동화 코어 - 설계 문서

**목적**: 대회 하나를 하루 굴리는 데 필요한 최소 코어  
**원칙**: ❌ 거대한 ERP | ✅ 실무 하루 운영 자동화

---

## 📊 1. 핵심 도메인 구조 (관계 한 장 요약)

```
대회 (Tournament)
 ├─ 경기장 (Venue)
 │   └─ 경기 (Match)
 │       ├─ 출전명단 (MatchPlayer)
 │       ├─ 검인기록 (CheckInLog)
 │       ├─ 경고/퇴장 (CardLog)
 │       └─ 심판메모 (RefereeMemo)
 ├─ 심판 (Referee)
 ├─ 참가신청 (Registration)
 │   └─ 선수 (Player) [JoinKFA 연동]
 └─ QR (QRToken)
```

---

## 🗄️ 2. Firestore 스키마 (실제 컬렉션 구조)

### 🟦 Tournament (대회)

**경로**: `associations/{associationId}/tournaments/{tournamentId}`

```typescript
{
  id: string;
  name: string;                    // "2026 노원구청장기 축구대회"
  startDate: Timestamp;            // 2026-08-19
  endDate: Timestamp;              // 2026-08-19
  status: "PREPARE" | "LIVE" | "END";
  organizer: string;               // "노원구 축구협회"
  location: string;                 // "마들스타디움"
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;               // userId
  tenantId: string;                 // associationId
}
```

### 🟩 Venue (경기장)

**경로**: `associations/{associationId}/tournaments/{tournamentId}/venues/{venueId}`

```typescript
{
  id: string;
  tournamentId: string;
  name: string;                    // "마들 A구장"
  courtCount: number;              // 2
  address?: string;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 🟨 Match (경기)

**경로**: `associations/{associationId}/tournaments/{tournamentId}/matches/{matchId}`

```typescript
{
  id: string;
  tournamentId: string;
  venueId: string;
  courtNo: number;                 // 1, 2, ...
  
  // 일정
  date: string;                    // "2026-08-19"
  startTime: string;               // "10:00"
  endTime: string;                 // "10:40"
  
  // 팀 정보
  homeTeam: string;                // "A팀"
  homeTeamId?: string;
  awayTeam: string;                // "B팀"
  awayTeamId?: string;
  
  // 심판
  referees: {
    main?: string;                 // refereeId
    assistant1?: string;
    assistant2?: string;
  };
  
  // 상태
  status: "WAIT" | "LIVE" | "END" | "CANCELLED";
  
  // 경기 결과
  score?: {
    home: number;
    away: number;
  };
  
  // 메타
  createdAt: Timestamp;
  updatedAt: Timestamp;
  startedAt?: Timestamp;
  endedAt?: Timestamp;
}
```

### 🟥 MatchPlayer (출전 명단)

**경로**: `associations/{associationId}/tournaments/{tournamentId}/matches/{matchId}/players/{playerId}`

```typescript
{
  id: string;
  matchId: string;
  playerId: string;                // 참조: registrations/{registrationId}/players/{playerId}
  team: "HOME" | "AWAY";
  isStarter: boolean;
  
  // 선수 정보 (스냅샷)
  name: string;
  jerseyNumber: number;
  position?: string;               // "GK", "DF", "MF", "FW"
  
  // 검인 상태
  checked: boolean;                // 검인 완료 여부
  checkedAt?: Timestamp;
  checkedBy?: string;             // refereeId
  
  createdAt: Timestamp;
}
```

### 🟪 CheckInLog (검인 기록)

**경로**: `associations/{associationId}/tournaments/{tournamentId}/matches/{matchId}/checkins/{checkinId}`

```typescript
{
  id: string;
  matchId: string;
  playerId: string;
  method: "QR" | "MANUAL";
  
  // 검인 결과
  result: "SUCCESS" | "NOT_REGISTERED" | "INELIGIBLE";
  message?: string;                // 실패 사유
  
  checkedAt: Timestamp;
  checkedBy: string;               // refereeId
  
  // JoinKFA 검증 정보
  joinKfaId?: string;
  verified: boolean;
}
```

### 🟧 CardLog (경고/퇴장)

**경로**: `associations/{associationId}/tournaments/{tournamentId}/matches/{matchId}/cards/{cardId}`

```typescript
{
  id: string;
  matchId: string;
  playerId: string;
  type: "YELLOW" | "RED";
  minute?: number;                 // 경고/퇴장 시간 (분)
  reason?: string;
  
  recordedAt: Timestamp;
  recordedBy: string;               // refereeId
}
```

### 🟫 QRToken (QR 토큰)

**경로**: `associations/{associationId}/tournaments/{tournamentId}/qr_tokens/{tokenId}`

```typescript
{
  id: string;
  tournamentId: string;
  playerId: string;
  token: string;                   // 암호화된 토큰
  expiresAt: Timestamp;
  
  createdAt: Timestamp;
  usedAt?: Timestamp;              // 사용 시각
}
```

### 🟦 Referee (심판)

**경로**: `associations/{associationId}/referees/{refereeId}`

```typescript
{
  id: string;
  name: string;
  phone?: string;
  level?: string;                  // "1급", "2급", ...
  
  // 대회별 배정
  tournamentAssignments?: string[]; // tournamentId[]
  
  createdAt: Timestamp;
}
```

### 🟩 Registration (참가 신청)

**경로**: `associations/{associationId}/tournaments/{tournamentId}/registrations/{registrationId}`

```typescript
{
  id: string;
  tournamentId: string;
  teamId: string;
  teamName: string;
  
  status: "PENDING" | "APPROVED" | "REJECTED";
  
  // 선수 목록
  players: Player[];
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 🟨 Player (선수)

**경로**: `associations/{associationId}/tournaments/{tournamentId}/registrations/{registrationId}/players/{playerId}`

```typescript
{
  id: string;
  registrationId: string;
  name: string;
  birthDate: string;               // "1990-01-01"
  jerseyNumber: number;
  position?: string;
  
  // JoinKFA 연동
  joinKfaId?: string;
  verified: boolean;                // JoinKFA 검증 완료 여부
  verifiedAt?: Timestamp;
  
  createdAt: Timestamp;
}
```

### 🟥 RefereeMemo (심판 메모)

**경로**: `associations/{associationId}/tournaments/{tournamentId}/matches/{matchId}/memos/{memoId}`

```typescript
{
  id: string;
  matchId: string;
  content: string;
  
  createdAt: Timestamp;
  createdBy: string;                // refereeId
  editedAt?: Timestamp;
  editedBy?: string;
}
```

---

## 🔌 3. 필수 API 목록 (Cloud Functions 기준)

### ▶️ 대회 관리

#### `createTournament`
```typescript
POST /tournaments
Body: {
  associationId: string;
  name: string;
  startDate: string;
  endDate: string;
  organizer: string;
  location: string;
}
Returns: { tournamentId: string }
```

#### `getTournament`
```typescript
GET /tournaments/{tournamentId}
Query: { associationId: string }
Returns: Tournament
```

#### `getTournamentStats`
```typescript
GET /tournaments/{tournamentId}/stats
Query: { associationId: string }
Returns: {
  todayMatches: number;
  unassignedReferees: number;
  unverifiedPlayers: number;
}
```

### ▶️ 경기장 / 일정

#### `createVenue`
```typescript
POST /venues
Body: {
  associationId: string;
  tournamentId: string;
  name: string;
  courtCount: number;
}
Returns: { venueId: string }
```

#### `getVenues`
```typescript
GET /venues
Query: { associationId: string; tournamentId: string }
Returns: Venue[]
```

#### `createMatchesBulk`
```typescript
POST /matches/bulk
Body: {
  associationId: string;
  tournamentId: string;
  venueId: string;
  matches: Array<{
    date: string;
    startTime: string;
    endTime: string;
    courtNo: number;
    homeTeam: string;
    awayTeam: string;
  }>;
}
Returns: { matchIds: string[] }
```

#### `getMatches`
```typescript
GET /matches
Query: {
  associationId: string;
  tournamentId: string;
  venueId?: string;
  date?: string;                    // "2026-08-19"
}
Returns: Match[]
```

### ▶️ 경기 운영

#### `getMatch`
```typescript
GET /matches/{matchId}
Query: { associationId: string; tournamentId: string }
Returns: Match & {
  players: MatchPlayer[];
  checkins: CheckInLog[];
  cards: CardLog[];
  memos: RefereeMemo[];
}
```

#### `checkInPlayer`
```typescript
POST /matches/{matchId}/checkin
Body: {
  associationId: string;
  tournamentId: string;
  playerId: string;
  method: "QR" | "MANUAL";
  qrToken?: string;                 // QR 스캔 시
}
Returns: {
  success: boolean;
  result: "SUCCESS" | "NOT_REGISTERED" | "INELIGIBLE";
  message?: string;
}
```

#### `recordCard`
```typescript
POST /matches/{matchId}/card
Body: {
  associationId: string;
  tournamentId: string;
  playerId: string;
  type: "YELLOW" | "RED";
  minute?: number;
  reason?: string;
}
Returns: { cardId: string }
```

#### `startMatch`
```typescript
POST /matches/{matchId}/start
Body: {
  associationId: string;
  tournamentId: string;
}
Returns: { startedAt: Timestamp }
```

#### `endMatch`
```typescript
POST /matches/{matchId}/end
Body: {
  associationId: string;
  tournamentId: string;
  score?: { home: number; away: number };
}
Returns: { endedAt: Timestamp }
```

#### `addRefereeMemo`
```typescript
POST /matches/{matchId}/memo
Body: {
  associationId: string;
  tournamentId: string;
  content: string;
}
Returns: { memoId: string }
```

### ▶️ QR

#### `verifyQR`
```typescript
POST /qr/verify
Body: {
  token: string;
  matchId: string;
}
Returns: {
  valid: boolean;
  playerId?: string;
  playerName?: string;
  message?: string;
}
```

#### `generateQR`
```typescript
POST /qr/generate
Body: {
  associationId: string;
  tournamentId: string;
  playerId: string;
}
Returns: {
  token: string;
  qrCode: string;                   // Base64 이미지
  expiresAt: Timestamp;
}
```

---

## 🎨 4. UI 컴포넌트 구조 (최소 수정 설계)

### 현재 상태
- ✅ `TournamentSection`: 빈 상태 → 자동화 허브 완료
- ✅ 대회 카드: 실무 대시보드 정보 표시 완료
- ✅ 대회 카드 클릭: 운영 모드 진입 완료

### 추가 필요 컴포넌트

#### 1. `TournamentOpsPage` (전창 운영 모드)
**경로**: `/association/{associationId}/admin/tournaments/{tournamentId}/ops`

**구성**:
```
┌─────────────────────────────────────┐
│ ← 뒤로    [대회명]    [현재 시간]    │
├─────────────────────────────────────┤
│ [경기장 탭] [경기장 탭] [경기장 탭]  │
├─────────────────────────────────────┤
│ 10:00  A팀 vs B팀  [심판 배정] ⚠️   │
│ 10:40  C팀 vs D팀  [시작]          │
│ 11:20  E팀 vs F팀  [대기]          │
└─────────────────────────────────────┘
```

**기능**:
- 경기장별 탭 전환
- 경기 카드 클릭 → 경기 상세 모달
- 실시간 상태 업데이트

#### 2. `MatchDetailModal` (경기 상세)
**트리거**: 경기 카드 클릭

**구성**:
```
┌─────────────────────────────────────┐
│ A팀 vs B팀                    [닫기]│
├─────────────────────────────────────┤
│ [출전 명단] [검인] [경고/퇴장]      │
├─────────────────────────────────────┤
│ 홈팀 출전 명단                      │
│ [QR 스캔] [수동 검인]               │
│                                     │
│ 원정팀 출전 명단                    │
│ [QR 스캔] [수동 검인]               │
├─────────────────────────────────────┤
│ [경기 시작] [경기 종료]              │
└─────────────────────────────────────┘
```

#### 3. `QRScanner` (모바일 검인)
**경로**: `/association/{associationId}/tournaments/{tournamentId}/matches/{matchId}/scan`

**기능**:
- 카메라 QR 스캔
- 즉시 검인 결과 표시
- 검인 이력 저장

---

## 📋 5. 개발 우선순위

### Phase 1: 현장 운영 핵심 (1주)
1. ✅ TournamentSection 빈 상태 → 자동화 허브
2. ✅ 대회 카드 실무 대시보드
3. 🔄 `TournamentOpsPage` 구현
4. 🔄 `MatchDetailModal` 구현
5. 🔄 `QRScanner` 최소 기능

### Phase 2: 준비 단계 (1주)
6. 경기장 등록 단계 UI
7. 경기 편성 UI
8. 심판 배정 UI

### Phase 3: 검증 & 보고 (1주)
9. JoinKFA API 연동
10. 자동 리포트 생성

---

## ✅ 체크리스트

### 데이터 구조
- [ ] Firestore 컬렉션 구조 생성
- [ ] 타입 정의 (`src/types/tournament.ts` 확장)
- [ ] 인덱스 설정 (날짜, 경기장별 조회)

### API
- [ ] Cloud Functions 핸들러 구현
- [ ] 인증/권한 체크
- [ ] 에러 핸들링

### UI
- [ ] `TournamentOpsPage` 컴포넌트
- [ ] `MatchDetailModal` 컴포넌트
- [ ] `QRScanner` 컴포넌트
- [ ] 실시간 업데이트 (onSnapshot)

### 테스트
- [ ] 대회 생성 → 운영 모드 진입
- [ ] 경기 카드 클릭 → 상세 모달
- [ ] QR 스캔 → 검인 완료
- [ ] 경고/퇴장 기록

---

**다음 단계**: Phase 1 구현 시작

