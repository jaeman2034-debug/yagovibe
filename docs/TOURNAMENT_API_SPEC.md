# 🔌 대회 운영 API 명세서 (개발자용)

**기준**: Cloud Functions (Firebase Functions v2)  
**인증**: Firebase Auth (Bearer Token)

---

## 📌 공통 사항

### Base URL
```
https://asia-northeast3-yago-vibe-spt.cloudfunctions.net
```

### 인증
모든 API는 `Authorization: Bearer {idToken}` 헤더 필요

### 에러 응답
```typescript
{
  error: string;
  code: string;
  details?: any;
}
```

---

## 🟦 Tournament APIs

### `createTournament`
**엔드포인트**: `POST /createTournament`

**요청**:
```typescript
{
  associationId: string;
  name: string;
  startDate: string;              // "2026-08-19"
  endDate: string;                // "2026-08-19"
  organizer: string;
  location: string;
}
```

**응답**:
```typescript
{
  success: true;
  tournamentId: string;
}
```

**에러**:
- `INVALID_DATE`: 종료일이 시작일보다 이전
- `MISSING_FIELD`: 필수 필드 누락

---

### `getTournament`
**엔드포인트**: `GET /getTournament`

**쿼리 파라미터**:
```
?associationId={id}&tournamentId={id}
```

**응답**:
```typescript
{
  id: string;
  name: string;
  startDate: Timestamp;
  endDate: Timestamp;
  status: "PREPARE" | "LIVE" | "END";
  organizer: string;
  location: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

### `getTournamentStats`
**엔드포인트**: `GET /getTournamentStats`

**쿼리 파라미터**:
```
?associationId={id}&tournamentId={id}
```

**응답**:
```typescript
{
  todayMatches: number;
  unassignedReferees: number;
  unverifiedPlayers: number;
}
```

**로직**:
- `todayMatches`: 오늘 날짜 기준 `status: "WAIT" | "LIVE"` 경기 수
- `unassignedReferees`: `referees.main`이 없는 경기 수
- `unverifiedPlayers`: `checked: false`인 출전 선수 수

---

## 🟩 Venue APIs

### `createVenue`
**엔드포인트**: `POST /createVenue`

**요청**:
```typescript
{
  associationId: string;
  tournamentId: string;
  name: string;
  courtCount: number;
  address?: string;
}
```

**응답**:
```typescript
{
  success: true;
  venueId: string;
}
```

---

### `getVenues`
**엔드포인트**: `GET /getVenues`

**쿼리 파라미터**:
```
?associationId={id}&tournamentId={id}
```

**응답**:
```typescript
{
  venues: Array<{
    id: string;
    name: string;
    courtCount: number;
    address?: string;
  }>;
}
```

---

## 🟨 Match APIs

### `createMatchesBulk`
**엔드포인트**: `POST /createMatchesBulk`

**요청**:
```typescript
{
  associationId: string;
  tournamentId: string;
  venueId: string;
  matches: Array<{
    date: string;                 // "2026-08-19"
    startTime: string;             // "10:00"
    endTime: string;               // "10:40"
    courtNo: number;
    homeTeam: string;
    awayTeam: string;
  }>;
}
```

**응답**:
```typescript
{
  success: true;
  matchIds: string[];
}
```

**검증**:
- 시간 중복 체크 (같은 경기장, 같은 코트, 같은 시간대)
- 날짜 범위 체크 (대회 기간 내)

---

### `getMatches`
**엔드포인트**: `GET /getMatches`

**쿼리 파라미터**:
```
?associationId={id}&tournamentId={id}&venueId={id}&date=2026-08-19
```

**응답**:
```typescript
{
  matches: Array<{
    id: string;
    venueId: string;
    courtNo: number;
    date: string;
    startTime: string;
    endTime: string;
    homeTeam: string;
    awayTeam: string;
    referees: {
      main?: string;
      assistant1?: string;
      assistant2?: string;
    };
    status: "WAIT" | "LIVE" | "END" | "CANCELLED";
    score?: {
      home: number;
      away: number;
    };
  }>;
}
```

---

### `getMatch`
**엔드포인트**: `GET /getMatch`

**쿼리 파라미터**:
```
?associationId={id}&tournamentId={id}&matchId={id}
```

**응답**:
```typescript
{
  match: {
    id: string;
    venueId: string;
    courtNo: number;
    date: string;
    startTime: string;
    endTime: string;
    homeTeam: string;
    awayTeam: string;
    referees: {
      main?: string;
      assistant1?: string;
      assistant2?: string;
    };
    status: "WAIT" | "LIVE" | "END" | "CANCELLED";
    score?: {
      home: number;
      away: number;
    };
    startedAt?: Timestamp;
    endedAt?: Timestamp;
  };
  players: Array<{
    id: string;
    playerId: string;
    team: "HOME" | "AWAY";
    isStarter: boolean;
    name: string;
    jerseyNumber: number;
    position?: string;
    checked: boolean;
    checkedAt?: Timestamp;
  }>;
  checkins: Array<{
    id: string;
    playerId: string;
    method: "QR" | "MANUAL";
    result: "SUCCESS" | "NOT_REGISTERED" | "INELIGIBLE";
    checkedAt: Timestamp;
    checkedBy: string;
  }>;
  cards: Array<{
    id: string;
    playerId: string;
    type: "YELLOW" | "RED";
    minute?: number;
    reason?: string;
    recordedAt: Timestamp;
  }>;
  memos: Array<{
    id: string;
    content: string;
    createdAt: Timestamp;
    createdBy: string;
  }>;
}
```

---

### `checkInPlayer`
**엔드포인트**: `POST /checkInPlayer`

**요청**:
```typescript
{
  associationId: string;
  tournamentId: string;
  matchId: string;
  playerId: string;
  method: "QR" | "MANUAL";
  qrToken?: string;               // QR 스캔 시 필수
}
```

**응답**:
```typescript
{
  success: boolean;
  result: "SUCCESS" | "NOT_REGISTERED" | "INELIGIBLE";
  message?: string;
  checkinId?: string;
}
```

**로직**:
1. `method === "QR"`인 경우 `qrToken` 검증
2. `playerId`로 선수 정보 조회
3. JoinKFA 검증 (선택)
4. `MatchPlayer.checked = true` 업데이트
5. `CheckInLog` 생성

---

### `recordCard`
**엔드포인트**: `POST /recordCard`

**요청**:
```typescript
{
  associationId: string;
  tournamentId: string;
  matchId: string;
  playerId: string;
  type: "YELLOW" | "RED";
  minute?: number;
  reason?: string;
}
```

**응답**:
```typescript
{
  success: true;
  cardId: string;
}
```

---

### `startMatch`
**엔드포인트**: `POST /startMatch`

**요청**:
```typescript
{
  associationId: string;
  tournamentId: string;
  matchId: string;
}
```

**응답**:
```typescript
{
  success: true;
  startedAt: Timestamp;
}
```

**로직**:
- `Match.status = "LIVE"`
- `Match.startedAt = now()`

---

### `endMatch`
**엔드포인트**: `POST /endMatch`

**요청**:
```typescript
{
  associationId: string;
  tournamentId: string;
  matchId: string;
  score?: {
    home: number;
    away: number;
  };
}
```

**응답**:
```typescript
{
  success: true;
  endedAt: Timestamp;
}
```

**로직**:
- `Match.status = "END"`
- `Match.endedAt = now()`
- `score` 있으면 업데이트

---

### `addRefereeMemo`
**엔드포인트**: `POST /addRefereeMemo`

**요청**:
```typescript
{
  associationId: string;
  tournamentId: string;
  matchId: string;
  content: string;
}
```

**응답**:
```typescript
{
  success: true;
  memoId: string;
}
```

---

## 🟫 QR APIs

### `verifyQR`
**엔드포인트**: `POST /verifyQR`

**요청**:
```typescript
{
  token: string;
  matchId: string;
}
```

**응답**:
```typescript
{
  valid: boolean;
  playerId?: string;
  playerName?: string;
  message?: string;
}
```

**로직**:
1. `QRToken` 조회 (`token`, `expiresAt` 체크)
2. `usedAt` 체크 (중복 사용 방지)
3. `playerId` 반환

---

### `generateQR`
**엔드포인트**: `POST /generateQR`

**요청**:
```typescript
{
  associationId: string;
  tournamentId: string;
  playerId: string;
}
```

**응답**:
```typescript
{
  token: string;
  qrCode: string;                 // Base64 이미지
  expiresAt: Timestamp;
}
```

**로직**:
1. `QRToken` 생성 (만료: 대회 종료일 23:59)
2. QR 코드 이미지 생성 (Base64)
3. 반환

---

## 🔐 권한 체크

모든 API는 다음 권한 체크 필요:

1. **인증**: Firebase Auth `idToken` 유효성
2. **협회 관리자**: `associations/{associationId}/admins/{userId}` 존재 여부
3. **대회 접근**: `tournaments/{tournamentId}` 조회 권한

---

## 📝 에러 코드

| 코드 | 설명 |
|------|------|
| `UNAUTHORIZED` | 인증 실패 |
| `FORBIDDEN` | 권한 없음 |
| `NOT_FOUND` | 리소스 없음 |
| `INVALID_DATE` | 날짜 형식 오류 |
| `DUPLICATE_TIME` | 시간 중복 |
| `INVALID_QR` | QR 토큰 무효 |
| `MISSING_FIELD` | 필수 필드 누락 |

---

**다음**: Cloud Functions 구현 시작

