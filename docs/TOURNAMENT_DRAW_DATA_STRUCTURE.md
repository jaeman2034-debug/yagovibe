# 🔥 조 추첨 실행 API + 데이터 구조 정의 (완전판)

## 📋 목적
조 추첨 실행 API의 입력/출력 데이터 구조와 실행 조건을 명확히 정의합니다.

---

## 1️⃣ 조 추첨 실행 조건 (필수 검증)

### 실행 가능 조건 (모두 충족 필요)

1. **참가 접수 닫힘** ✅
   - `tournament.registrationPeriod.endDate` < 현재 시각
   - 마감일 종료 시각(23:59:59) 이후

2. **사무국 검수 완료** ✅
   - `tournament.reviewPeriod.endDate` < 현재 시각
   - 검수 기간이 설정되지 않은 경우: 참가 접수 종료일 + 최소 1일 경과

3. **승인 팀 수 ≥ 최소 팀 수** ✅
   - 최소 팀 수 = `max(2, floor(maxTeams * 0.5))`
   - 기본값: 최소 2팀

4. **조 추첨 미실행** ✅
   - `tournament.drawExecuted === false`

5. **조 추첨일 확인** (선택적, 있으면 우선 적용)
   - `tournament.drawDate.date` ≤ 현재 날짜

### 실행 불가 조건

- ❌ 이미 조 추첨 완료 (`drawExecuted === true`)
- ❌ 참가 접수 진행 중
- ❌ 검수 기간 진행 중
- ❌ 승인 팀 수 부족
- ❌ 조 추첨일 이전

---

## 2️⃣ API 인터페이스

### 요청 (Request)

```typescript
interface ExecuteDrawRequest {
  associationId: string;        // 협회 ID
  tournamentId: string;          // 대회 ID
  adminId: string;               // 실행한 관리자 UID
  divisionCount?: number;        // 조 수 (미지정 시 자동 계산)
  seedTeamIds?: string[];        // 시드팀 목록 (선택, 각 조에 1팀씩 먼저 배치)
  distributeByClub?: boolean;    // 동일 클럽/지역 분산 (선택, 기본 false)
  publishMode?: "immediate" | "scheduled"; // 공개 모드 (즉시/예약)
}
```

### 응답 (Response)

```typescript
interface DrawResult {
  success: boolean;
  divisionCount: number;          // 최종 조 수
  teamsPerDivision: number;      // 조당 평균 팀 수
  divisions: Array<{
    division: string;             // "A조", "B조", ...
    teams: Array<{
      teamId: string;
      teamName: string;
      seed: number;              // 추첨 순서 (1, 2, 3, ...)
      isSeedTeam?: boolean;      // 시드팀 여부
    }>;
  }>;
  executedAt: Timestamp;        // 실행 시각
  executedBy: string;            // 실행자 UID
  logId: string;                // 추첨 로그 문서 ID
}
```

---

## 3️⃣ Firestore 데이터 구조

### 대회 문서 업데이트 (`associations/{associationId}/tournaments/{tournamentId}`)

```typescript
{
  // 조 추첨 실행 상태
  drawExecuted: true,                    // ✅ 실행 완료 플래그
  drawExecutedAt: Timestamp,             // 실행 시각
  drawExecutedBy: string,                 // 실행자 UID
  drawLogId: string,                     // 추첨 로그 문서 ID
  
  // 조 배정 결과
  drawDivisions: [
    {
      division: "A조",                   // 조 이름
      teams: [
        {
          teamId: "team1",
          teamName: "팀명1",
          seed: 1,                        // 추첨 순서
          isSeedTeam?: true              // 시드팀 여부 (선택)
        },
        // ...
      ],
      published: boolean                 // 공개 여부
    },
    // ...
  ],
  
  // 대진표 상태
  bracketStatus: "preparing"            // "preparing" | "confirmed" | "published"
}
```

### 추첨 로그 (`associations/{associationId}/tournaments/{tournamentId}/drawLogs/{logId}`)

```typescript
{
  // 실행 정보
  executedAt: Timestamp,
  executedBy: string,
  executedByEmail: string,
  
  // 입력 데이터 (스냅샷)
  input: {
    totalTeams: number,
    divisionCount: number,
    approvedTeamIds: string[],           // 정렬된 팀 ID 목록
    approvedTeamNames: string[],         // 정렬된 팀명 목록
    inputHash: string                    // SHA256 해시 (무결성 검증용)
  },
  
  // 알고리즘 정보 (재현 가능성)
  algorithm: {
    method: "Fisher-Yates Shuffle",
    seed: string,                        // SHA256 해시
    seedString: string,                  // 원본 시드 문자열 (재현용)
    timestamp: number,                   // 실행 타임스탬프
    distributionMethod: "random" | "club_aware",
    clubDistributionLog: string | null
  },
  
  // 시드팀 정보 (있을 경우)
  seedTeams: {
    count: number,
    teamIds: string[],
    teamNames: string[]
  } | null,
  
  // 결과
  result: {
    divisionCount: number,
    teamsPerDivision: {
      base: number,                      // 기본 팀 수
      remainder: number,                 // 나머지
      distribution: Array<{
        division: string,
        teamCount: number
      }>
    },
    divisions: Array<{
      division: string,
      teamIds: string[],
      teamNames: string[],
      seeds: number[]
    }>
  },
  
  status: "completed",
  version: "1.0"                         // 알고리즘 버전
}
```

---

## 4️⃣ 조 수 자동 계산 규칙

```typescript
function calculateOptimalDivisionCount(totalTeams: number): number {
  if (totalTeams < 4) return 1;      // 4팀 미만: 1조
  if (totalTeams < 8) return 2;      // 4~7팀: 2조
  if (totalTeams < 16) return 4;     // 8~15팀: 4조
  if (totalTeams < 32) return 8;     // 16~31팀: 8조
  return 8;                           // 32팀 이상: 8조 (최대)
}
```

---

## 5️⃣ 조별 팀 수 균형 분배 규칙

### 기본 원칙

1. **시드팀 배치**: 각 조에 1팀씩 먼저 배치 (최대 조 수만큼)
2. **나머지 팀 균형 분배**: 조 간 최대 편차 = 1
3. **예시**: 14팀, 4조, 시드 2팀
   - 시드 2팀 → A조, B조에 1팀씩
   - 나머지 12팀 → 각 조에 3팀씩 (3+3+3+3)

### 분배 공식

```typescript
const baseTeamsPerDivision = Math.floor(totalTeams / divisionCount);
const remainder = totalTeams % divisionCount;

// 각 조의 목표 팀 수
// 앞 조부터 remainder만큼 +1
for (let i = 0; i < divisionCount; i++) {
  const targetTeams = baseTeamsPerDivision + (i < remainder ? 1 : 0);
  // ...
}
```

---

## 6️⃣ 랜덤 시드 생성 (감사용 재현 가능성)

### 시드 생성 규칙

```typescript
const timestamp = Date.now();
const seedString = `${tournamentId}_${timestamp}_${uid}`;
const randomSeedHash = crypto.createHash("sha256")
  .update(seedString)
  .digest("hex");
```

### 재현 가능성

- 동일한 `seedString`으로 동일한 결과 재현 가능
- 로그에 `seedString` 저장 → 감사 대응 가능

---

## 7️⃣ 운영 로그 자동 기록

### 로그 위치

`associations/{associationId}/tournaments/{tournamentId}/opsLogs/{logId}`

### 로그 구조

```typescript
{
  action: "조 추첨 실행",
  executor: string,                    // 실행자 UID
  executorName: string,                 // 실행자 이메일
  timestamp: Timestamp,
  details: string,                      // "4조, 16팀"
  metadata: {
    divisionCount: number,
    totalTeams: number,
    seedTeamIds: string[] | null,
    distributeByClub: boolean,
    publishMode: string
  }
}
```

---

## 8️⃣ UI 상태 변화 (실행 후)

### 즉시 반영

1. **조 추첨 상태**: "미실행" → "완료 ✅"
2. **실행 정보 표시**:
   - 실행 일시: `drawExecutedAt`
   - 실행자: `drawExecutedBy` (이메일 표시)
3. **버튼 비활성화**: `[조 추첨 실행]` → 비활성 (재실행 불가)
4. **다음 단계 활성화**: `[경기 자동 생성]` 버튼 활성화

### 대진표 관리 연결

- **조 추첨 완료 전**: 대진표 업로드/확정 불가
- **조 추첨 완료 후**: 
  - `[경기 자동 생성]` 활성화 (시스템 대진표)
  - `[대진표 업로드]` 활성화 (협회 커스텀)
  - 둘 중 하나만 선택 가능

---

## 9️⃣ 에러 코드

| 에러 코드 | 메시지 | 원인 |
|---------|--------|------|
| `unauthenticated` | 인증이 필요합니다. | 로그인되지 않음 |
| `not-found` | 대회를 찾을 수 없습니다. | 대회 ID 오류 |
| `failed-precondition` | 이미 조 추첨이 완료되었습니다. | 재실행 시도 |
| `failed-precondition` | 참가 접수가 아직 마감되지 않았습니다. | 접수 진행 중 |
| `failed-precondition` | 검수 기간이 아직 종료되지 않았습니다. | 검수 진행 중 |
| `failed-precondition` | 승인된 팀 수가 최소 팀 수보다 적습니다. | 팀 수 부족 |
| `invalid-argument` | 조 수는 1~8조만 가능합니다. | 조 수 범위 초과 |
| `invalid-argument` | 시드팀 수가 조 수보다 많습니다. | 시드팀 수 오류 |

---

## 🎯 핵심 원칙

1. **비가역성**: 조 추첨은 1회만 실행 가능, 재실행 불가
2. **재현 가능성**: 랜덤 시드 저장 → 감사 대응 가능
3. **무결성**: 입력 데이터 해시 저장 → 사후 변경 불가 증명
4. **순서 강제**: 참가 접수 → 검수 → 조 추첨 → 경기 생성
5. **감사 대응**: 모든 과정을 로그로 기록

---

## ✅ 완료 체크리스트

- [x] 조 추첨 실행 조건 확정 (참가 접수 닫힘, 검수 완료, 최소 팀 수)
- [x] API 인터페이스 정의 (Request/Response)
- [x] Firestore 데이터 구조 정의
- [x] 조 수 자동 계산 규칙
- [x] 조별 팀 수 균형 분배 규칙
- [x] 랜덤 시드 생성 (재현 가능성)
- [x] 운영 로그 자동 기록
- [x] UI 상태 변화 정의
- [x] 대진표 관리 연결 규칙
- [x] 에러 코드 정의

