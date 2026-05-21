# 🔥 현장 운영 API (QR 체크인 → 경기 시작/종료 → 결과 반영)

## 📋 목적
승인된 선수만 현장에 입장하고, 체크인 → 경기 → 결과가 하나의 로그 체인으로 이어집니다.

---

## 1️⃣ 선수 현장 체크인 (QR)

### A) QR 생성 (선수)

**조건**:
- 선수 승인 상태 = 승인
- 해당 경기 참가 선수

**UX**: `[QR 생성]` (유효 5분)

**보안**:
- 1회성 토큰
- 만료 시 자동 폐기

**API**: `POST /api/tournaments/{tournamentId}/matches/{matchId}/qr/generate`

```typescript
interface GenerateQRRequest {
  tournamentId: string;
  matchId: string;
  playerId: string;
}

interface GenerateQRResponse {
  qrToken: string;        // 1회성 토큰
  expiresAt: Timestamp;   // 만료 시각 (5분 후)
  playerName: string;
  teamName: string;
}
```

### B) QR 스캔 (운영자)

**스캔 결과**:
- ✅ 체크인 완료
- ❌ 미승인/중복/만료 차단

**API**: `POST /api/tournaments/{tournamentId}/matches/{matchId}/qr/scan`

```typescript
interface ScanQRRequest {
  tournamentId: string;
  matchId: string;
  qrToken: string;
  scannedBy: string;  // referee_uid
}

interface ScanQRResponse {
  success: boolean;
  playerId: string;
  playerName: string;
  teamName: string;
  checkedInAt: Timestamp;
  reason?: string;  // 실패 시 사유
}
```

**저장 데이터**:
```typescript
{
  matchId: string;
  playerId: string;
  checkedInAt: Timestamp;
  by: string;  // referee_uid
  status: "CHECKED_IN" | "REJECTED";
  reason?: string;
}
```

---

## 2️⃣ 경기 시작/종료 트리거

### A) 경기 시작

**조건**:
- 양 팀 최소 출전 인원 체크인 완료

**API**: `POST /api/tournaments/{tournamentId}/matches/{matchId}/start`

```typescript
interface StartMatchRequest {
  tournamentId: string;
  matchId: string;
  startedBy: string;  // referee_uid
}

interface StartMatchResponse {
  success: boolean;
  startedAt: Timestamp;
  checkedInPlayers: {
    home: number;
    away: number;
  };
}
```

**자동 기록**:
```typescript
{
  type: "MATCH_STARTED",
  matchId: string,
  startedAt: Timestamp,
  startedBy: string,
  checkedInPlayers: {
    home: number,
    away: number
  }
}
```

### B) 경기 종료

**심판 입력**:
- 스코어
- 특이사항(선택)

**API**: `POST /api/tournaments/{tournamentId}/matches/{matchId}/finish`

```typescript
interface FinishMatchRequest {
  tournamentId: string;
  matchId: string;
  finishedBy: string;  // referee_uid
  homeScore: number;
  awayScore: number;
  resultType?: "FT" | "PK" | "ET";  // 전반/승부차기/연장
  notes?: string;
}

interface FinishMatchResponse {
  success: boolean;
  finishedAt: Timestamp;
  winner: "HOME" | "AWAY" | "DRAW";
  nextMatchId?: string;  // 토너먼트일 경우
}
```

**자동 처리**:
1. 결과 확정
2. 승자 계산
3. 다음 라운드 반영 (토너먼트일 경우)

---

## 3️⃣ 결과 반영 로직 (자동)

### 조별리그

**자동 계산**:
- 승/무/패
- 득실차
- 순위 자동 계산

**API**: `POST /api/tournaments/{tournamentId}/divisions/{divisionId}/calculate-standings`

```typescript
interface Standing {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  rank: number;
}
```

### 토너먼트

**자동 처리**:
- 승자 다음 경기 자동 배정
- 다음 경기 상태 활성

**API**: `POST /api/tournaments/{tournamentId}/matches/{matchId}/advance-winner`

```typescript
interface AdvanceWinnerRequest {
  tournamentId: string;
  matchId: string;
  winner: "HOME" | "AWAY";
}

interface AdvanceWinnerResponse {
  success: boolean;
  nextMatchId?: string;
  nextMatchUpdated: boolean;
}
```

---

## 4️⃣ 운영 로그 & 시스템 공지

### 운영 로그

```typescript
{
  type: "MATCH_RESULT_CONFIRMED",
  matchId: string,
  actor: string,  // referee_uid
  timestamp: Timestamp,
  details: {
    homeScore: number,
    awayScore: number,
    winner: "HOME" | "AWAY" | "DRAW"
  }
}
```

### 시스템 공지 (선택)

```typescript
{
  type: "SYSTEM",
  title: "[경기 결과 반영 완료]",
  content: `
경기: ${homeTeam} vs ${awayTeam}
결과: ${homeScore} - ${awayScore}
승자: ${winner}
  `,
  link: `/tournaments/${tournamentId}/matches/${matchId}`,
  createdAt: Timestamp
}
```

---

## 5️⃣ UX 변화 (즉시 반영)

### 경기장별 일정표

**상태 변화**:
- `SCHEDULED` → `IN_PROGRESS` → `COMPLETED`

### 대회 대진표

**승자 자동 표시**:
- 토너먼트: 승자 다음 경기 자동 배정
- 조별리그: 순위 자동 업데이트

### 팀/선수 화면

**개인 출전 기록 누적**:
- 출전 경기 수
- 득점/도움
- 경고/퇴장

---

## 6️⃣ 사고 방지 장치

### 경기 종료 후 수정 제한

```typescript
// 경기 종료 후 수정 불가 (관리자만 예외)
if (match.status === "COMPLETED" && !isAdmin) {
  throw new Error("경기 종료 후 수정할 수 없습니다.");
}
```

### 수정 시 변경 이력 자동 기록

```typescript
{
  type: "MATCH_RESULT_MODIFIED",
  matchId: string,
  actor: string,
  timestamp: Timestamp,
  changes: {
    before: { homeScore: number, awayScore: number },
    after: { homeScore: number, awayScore: number }
  },
  reason?: string
}
```

### 네트워크 끊김 대비

**로컬 큐 → 재연결 시 동기화**:
```typescript
// 체크인/결과 입력 로컬 큐
const localQueue = {
  checkIns: [],
  results: []
};

// 재연결 시 동기화
async function syncLocalQueue() {
  for (const checkIn of localQueue.checkIns) {
    await submitCheckIn(checkIn);
  }
  for (const result of localQueue.results) {
    await submitResult(result);
  }
}
```

---

## 7️⃣ 에러 코드

| 에러 코드 | 메시지 | 원인 |
|---------|--------|------|
| `unauthenticated` | 인증이 필요합니다. | 로그인되지 않음 |
| `not-found` | 경기를 찾을 수 없습니다. | 경기 ID 오류 |
| `failed-precondition` | 선수가 승인되지 않았습니다. | 미승인 선수 |
| `failed-precondition` | 이미 체크인되었습니다. | 중복 체크인 |
| `failed-precondition` | QR 토큰이 만료되었습니다. | 토큰 만료 |
| `failed-precondition` | 최소 출전 인원이 부족합니다. | 인원 부족 |
| `failed-precondition` | 경기가 이미 종료되었습니다. | 종료된 경기 |

---

## 🎯 핵심 원칙

1. **승인된 선수만 입장**: QR 체크인으로 강제
2. **1회성 토큰**: 보안 강화
3. **자동 계산**: 사람 계산 ❌ / 시스템 계산 ⭕
4. **로그 체인**: 체크인 → 시작 → 종료 → 결과 반영
5. **사고 방지**: 수정 제한, 변경 이력 기록

---

## ✅ 완료 체크리스트

- [x] QR 생성/스캔 API
- [x] 경기 시작/종료 API
- [x] 결과 반영 로직 (조별리그/토너먼트)
- [x] 운영 로그 & 시스템 공지
- [x] UX 변화 정의
- [x] 사고 방지 장치
- [x] 네트워크 끊김 대비

