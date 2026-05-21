# 🔥 경기 자동 생성 API + 데이터 구조 정의 (완전판)

## 📋 목적
조 추첨 완료 후 경기를 자동 생성하는 API와 데이터 구조를 명확히 정의합니다.

---

## 1️⃣ 경기 자동 생성 API

### 실행 트리거 (API)

**Endpoint**: `POST /api/admin/tournaments/{tournamentId}/generate-matches`

**권한**: 관리자(admin)만 가능

**사전 조건 (서버에서 강제 체크)**:
1. ✅ 조 추첨 완료 (`drawExecuted === true`)
2. ✅ 조 배정 결과 존재 (`drawDivisions.length > 0`)
3. ✅ 기존 경기 없음 (중복 생성 방지)
4. ✅ 최소 팀 수 충족 (조당 최소 2팀)

**조건 미충족 시**: `403 / 409` 에러 + 사유 메시지

---

## 2️⃣ 입력값 (Request Body)

```typescript
interface GenerateMatchesRequest {
  associationId: string;
  tournamentId: string;
  adminId: string;                    // 실행한 관리자 UID
  
  // 경기 형식 설정
  format: "GROUP_LEAGUE" | "KNOCKOUT_ONLY";  // 조별 리그 | 토너먼트만
  groupCount?: number;                // 조 수 (GROUP_LEAGUE일 때)
  roundRobin: "SINGLE" | "DOUBLE";    // 1회전 | 2회전
  includeKnockout?: boolean;          // 조별 후 토너먼트 생성 여부
  knockoutFrom?: "TOP_1" | "TOP_2";   // 진출 규칙 (TOP_1/TOP_2 등)
  seed?: string;                      // 자동 생성 (재현용)
  
  // 선택적 옵션
  venueId?: string;                   // 기본 경기장 ID (없으면 첫 번째 경기장 사용)
  courtNo?: number;                   // 기본 코트 번호 (기본값: 1)
  startDate?: string;                 // 대회 시작일 (ISO string, 없으면 tournament.startDate)
  defaultMatchDuration?: number;       // 기본 경기 시간 (분, 기본 40분)
  defaultMatchInterval?: number;       // 경기 간격 (분, 기본 20분)
}
```

---

## 3️⃣ 생성되는 핵심 데이터 구조

### 📦 matches 컬렉션

**위치**: `associations/{associationId}/tournaments/{tournamentId}/matches/{matchId}`

```typescript
interface Match {
  id: string;                         // 경기 ID (자동 생성)
  tournamentId: string;               // 대회 ID
  phase: "GROUP" | "KNOCKOUT";        // 조별 | 토너먼트
  groupId?: string;                  // 조 ID (GROUP일 때, 예: "G1")
  division?: string;                  // 조 이름 (예: "A조")
  round: number;                      // 라운드 (1, 2, ...)
  
  // 팀 정보
  homeTeam: string;                   // 홈팀 이름
  homeTeamId: string;                 // 홈팀 ID
  awayTeam: string;                   // 원정팀 이름
  awayTeamId: string;                 // 원정팀 ID
  
  // 일정 정보
  schedule: {
    date: string | null;              // 경기 날짜 (YYYY-MM-DD, 배정 전 null)
    time: string | null;              // 시작 시간 (HH:mm, 배정 전 null)
    facilityId: string | null;        // 경기장 ID (배정 전 null)
  };
  
  // 경기장 정보 (하위 호환성)
  date?: string;                      // 경기 날짜 (YYYY-MM-DD)
  startTime?: string;                 // 시작 시간 (HH:mm)
  endTime?: string;                   // 종료 시간 (HH:mm)
  venueId?: string;                   // 경기장 ID
  courtNo?: number;                   // 코트 번호
  
  // 경기 상태
  status: "UNSCHEDULED" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  
  // 심판 정보
  referees: {
    main?: string;                    // 주심 UID
    assistant1?: string;              // 부심1 UID
    assistant2?: string;              // 부심2 UID
    fourth?: string;                  // 대기심 UID
  };
  
  // 경기 결과
  homeScore?: number;
  awayScore?: number;
  winner?: "HOME" | "AWAY";
  resultType?: "FT" | "PK" | "ET";   // 전반/승부차기/연장
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;                 // 생성자 UID
}
```

### 📦 match_schedule (일정표 뷰)

**위치**: `associations/{associationId}/tournaments/{tournamentId}/matchSchedule/{date}`

```typescript
interface MatchSchedule {
  date: string;                       // 날짜 (YYYY-MM-DD)
  tournamentId: string;
  matches: Array<{
    matchId: string;
    division: string;
    homeTeam: string;
    awayTeam: string;
    startTime: string;
    endTime: string;
    venueId?: string;
    courtNo: number;
    status: string;
  }>;
  totalMatches: number;
  updatedAt: Timestamp;
}
```

### 📦 venue_schedule (경기장별 일정표)

**위치**: `associations/{associationId}/tournaments/{tournamentId}/venueSchedule/{venueId}/{date}`

```typescript
interface VenueSchedule {
  venueId: string;
  date: string;                       // 날짜 (YYYY-MM-DD)
  tournamentId: string;
  matches: Array<{
    matchId: string;
    division: string;
    homeTeam: string;
    awayTeam: string;
    startTime: string;
    endTime: string;
    courtNo: number;
    status: string;
  }>;
  totalMatches: number;
  updatedAt: Timestamp;
}
```

### 📦 match_generation_log (감사 핵심)

**위치**: `associations/{associationId}/tournaments/{tournamentId}/matchGenerationLogs/{logId}`

```typescript
interface MatchGenerationLog {
  tournamentId: string;
  executedAt: Timestamp;
  executedBy: string;                 // 실행자 UID
  executedByEmail: string;            // 실행자 이메일
  
  // 입력 데이터
  input: {
    divisionCount: number;
    totalTeams: number;
    drawDivisions: Array<{
      division: string;
      teamCount: number;
    }>;
  };
  
  // 생성 결과
  result: {
    totalMatches: number;
    matchesByDivision: Array<{
      division: string;
      matchCount: number;
    }>;
    createdMatchIds: string[];
    warnings: string[];
  };
  
  // 설정
  settings: {
    venueId?: string;
    courtNo: number;
    defaultMatchDuration: number;
    defaultMatchInterval: number;
    startDate: string;
  };
  
  status: "completed" | "failed";
  version: "1.0";
}
```

---

## 4️⃣ 운영 로그 자동 기록

**위치**: `associations/{associationId}/tournaments/{tournamentId}/opsLogs/{logId}`

```typescript
{
  action: "경기 자동 생성",
  executor: string,                    // 실행자 UID
  executorName: string,                 // 실행자 이메일
  timestamp: Timestamp,
  details: string,                      // "총 28경기 생성 (4개 조)"
  metadata: {
    totalMatches: number,
    divisions: number,
    matchIds: string[],
    venueId?: string,
    courtNo: number
  }
}
```

---

## 5️⃣ 경기 생성 알고리즘

### 조별 리그 방식

**공식**: `n * (n-1) / 2` (n = 조 내 팀 수)

**예시**:
- 2팀: 1경기 (A vs B)
- 3팀: 3경기 (A vs B, A vs C, B vs C)
- 4팀: 6경기
- 6팀: 15경기
- 8팀: 28경기

### 홈/어웨이 결정 규칙

```typescript
// seed 순서대로 홈/어웨이 교대
// 홀수 번째 경기: 낮은 seed = 홈, 높은 seed = 어웨이
// 짝수 번째 경기: 높은 seed = 홈, 낮은 seed = 어웨이
const isOddMatch = matchIndex % 2 === 0;
const homeTeam = isOddMatch ? teamA : teamB;
const awayTeam = isOddMatch ? teamB : teamA;
```

### 시간 배정 규칙

1. **시작 시간**: 대회 시작일 오전 9시 (기본값)
2. **경기 시간**: 기본 40분
3. **경기 간격**: 기본 20분
4. **일일 종료 시간**: 오후 6시 (18:00)
5. **다음 날 이동**: 오후 6시 이후 경기는 다음 날 오전 9시로 배정

**예시**:
```
2026-03-08 09:00 - 09:40: A조 팀1 vs 팀2
2026-03-08 10:00 - 10:40: A조 팀1 vs 팀3
2026-03-08 11:00 - 11:40: A조 팀2 vs 팀3
...
2026-03-08 17:00 - 17:40: A조 마지막 경기
2026-03-09 09:00 - 09:40: B조 첫 경기 (다음 날)
```

---

## 6️⃣ 일정표 자동 연결

### 경기 생성 후 자동 생성되는 뷰

1. **전체 일정표** (`matchSchedule`)
   - 날짜별로 모든 경기 그룹화
   - 날짜별 조회 최적화

2. **경기장별 일정표** (`venueSchedule`)
   - 경기장 + 날짜별로 경기 그룹화
   - 경기장별 조회 최적화

3. **조별 일정표** (쿼리로 조회)
   - `matches` 컬렉션에서 `division` 필터링

### 일정표 업데이트 트리거

경기 생성 시 자동으로 다음 뷰가 업데이트됩니다:

```typescript
// 경기 생성 후 자동 실행
async function updateScheduleViews(
  associationId: string,
  tournamentId: string,
  matches: Match[]
) {
  // 1. 날짜별 그룹화
  const matchesByDate = groupBy(matches, 'date');
  
  // 2. 경기장별 그룹화
  const matchesByVenue = groupBy(matches, 'venueId');
  
  // 3. 각 뷰 업데이트
  for (const [date, dateMatches] of Object.entries(matchesByDate)) {
    await updateMatchSchedule(associationId, tournamentId, date, dateMatches);
  }
  
  for (const [venueId, venueMatches] of Object.entries(matchesByVenue)) {
    for (const [date, dateMatches] of Object.entries(groupBy(venueMatches, 'date'))) {
      await updateVenueSchedule(associationId, tournamentId, venueId, date, dateMatches);
    }
  }
}
```

---

## 7️⃣ 응답 (Response)

```typescript
interface GenerateMatchesResponse {
  success: boolean;
  totalMatches: number;
  matchesByDivision: Array<{
    division: string;
    matchCount: number;
  }>;
  createdMatchIds: string[];
  warnings: string[];
  logId: string;                      // 생성 로그 문서 ID
}
```

---

## 8️⃣ 실행 후 UI 상태 변경

### 즉시 반영

1. **경기 생성 상태**: "미생성" → "완료 ✅"
2. **생성 정보 표시**:
   - 총 경기 수: `totalMatches`
   - 조별 경기 수: `matchesByDivision`
3. **버튼 비활성화**: `[경기 자동 생성]` → 비활성 (재생성 불가)
4. **다음 단계 활성화**: `[경기장별 일정표]` 자동 표시

### 일정표 자동 반영

- 경기 생성 완료 → 일정표 섹션 자동 업데이트
- 날짜별 필터링 가능
- 경기장별 필터링 가능
- 조별 필터링 가능

---

## 9️⃣ 실패/중단 방지 포인트

### 트랜잭션 처리 (all-or-nothing)

```typescript
// 배치 쓰기로 모든 경기를 한 번에 저장
const batch = writeBatch(db);
for (const match of allMatches) {
  const matchRef = doc(matchesRef);
  batch.set(matchRef, match);
}
await batch.commit(); // 모두 성공하거나 모두 실패
```

### 중복 실행 방지 락

```typescript
// 1. 기존 경기 존재 확인
const existingMatches = await getMatches(associationId, tournamentId, {});
if (existingMatches.length > 0) {
  throw new Error("이미 경기가 생성되어 있습니다.");
}

// 2. 대회 문서에 생성 플래그 설정
await tournamentRef.update({
  matchesGenerated: true,
  matchesGeneratedAt: serverTimestamp(),
  matchesGeneratedBy: uid
});
```

### 실행 중 로딩 스피너 + 버튼 잠금

```typescript
// 프론트엔드
const [generating, setGenerating] = useState(false);

<Button
  onClick={handleGenerate}
  disabled={generating || !canGenerate}
>
  {generating ? (
    <>
      <Loader2 className="animate-spin" />
      생성 중...
    </>
  ) : (
    "경기 자동 생성"
  )}
</Button>
```

---

## 🔟 에러 코드

| 에러 코드 | 메시지 | 원인 |
|---------|--------|------|
| `unauthenticated` | 인증이 필요합니다. | 로그인되지 않음 |
| `not-found` | 대회를 찾을 수 없습니다. | 대회 ID 오류 |
| `failed-precondition` | 조 추첨이 완료되지 않았습니다. | 조 추첨 미실행 |
| `failed-precondition` | 이미 경기가 생성되어 있습니다. | 중복 생성 시도 |
| `failed-precondition` | 조당 최소 2팀이 필요합니다. | 팀 수 부족 |
| `internal` | 경기 생성 중 오류가 발생했습니다. | 시스템 오류 |

---

## 🎯 핵심 원칙

1. **비가역성**: 경기 생성은 1회만 실행 가능, 재생성 불가
2. **자동화**: 조 추첨 결과 → 경기 생성 → 일정표 자동 연결
3. **일정표 뷰**: 날짜별, 경기장별, 조별 조회 최적화
4. **감사 대응**: 모든 과정을 로그로 기록
5. **트랜잭션**: all-or-nothing 보장

---

## ✅ 완료 체크리스트

- [x] 경기 자동 생성 API 정의
- [x] 매치 데이터 구조 정의
- [x] 일정표 연결 로직 정의
- [x] 경기 생성 알고리즘 (조별 리그)
- [x] 시간 배정 규칙
- [x] 홈/어웨이 결정 규칙
- [x] 운영 로그 자동 기록
- [x] UI 상태 변화 정의
- [x] 트랜잭션 처리
- [x] 중복 실행 방지
- [x] 에러 코드 정의

---

## 📊 데이터 흐름

```
조 추첨 완료 (drawDivisions)
    ↓
경기 자동 생성 API 호출
    ↓
조별 리그 경기 생성 (n * (n-1) / 2)
    ↓
시간 배정 (오전 9시 시작, 40분 경기, 20분 간격)
    ↓
matches 컬렉션 저장 (배치 쓰기)
    ↓
일정표 뷰 자동 생성 (matchSchedule, venueSchedule)
    ↓
운영 로그 기록 (opsLogs)
    ↓
UI 자동 반영 (경기장별 일정표 표시)
```

---

## 🔥 토너먼트/리그 공용

이 API는 **조별 리그 방식**을 사용하므로:
- ✅ 토너먼트 (조별 리그 → 토너먼트)
- ✅ 리그 (조별 리그 → 전체 리그)

모두 동일한 알고리즘으로 처리 가능합니다.

