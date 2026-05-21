# 🔥 경기장·시간 자동 배정 API (일정표 자동 생성)

## 📋 목적
이미 생성된 경기(match)를 기준으로 규칙에 따라 '경기장/날짜/시간'을 1회 자동 배정합니다.
(생성 ≠ 배정, 책임 분리)

---

## 1️⃣ 트리거 API

### Endpoint
`POST /api/admin/tournaments/{tournamentId}/schedule/auto-assign`

### 권한
관리자(admin)만 가능

### 사전 조건 (서버 강제)
1. ✅ 조 추첨 완료 (`drawExecuted === true`)
2. ✅ 경기(match) 생성 완료 (`matches.length > 0`)
3. ✅ 시설(facility) ≥ 1개
4. ✅ 기존 SCHEDULED 경기 = 0건 (중복 방지)

**조건 실패 시**: `409 Conflict` + 사유 메시지

---

## 2️⃣ 입력 파라미터

```typescript
interface AutoAssignScheduleRequest {
  associationId: string;
  tournamentId: string;
  adminId: string;
  
  dateRange: {
    start: string;  // ISO date (YYYY-MM-DD)
    end: string;    // ISO date (YYYY-MM-DD)
  };
  
  timeSlots: string[];  // ["09:00", "10:30", "12:00", "13:30", "15:00"]
  
  facilities: string[];  // ["FAC_A", "FAC_B"]
  
  restRule?: {
    minRestMinutes: number;  // 동일 팀 최소 휴식 시간 (분, 기본 90분)
  };
  
  priority?: {
    groupFirst: boolean;  // 조별 우선 배정 여부 (기본 true)
  };
}
```

---

## 3️⃣ 자동 배정 알고리즘

### A) 기본 흐름

1. **미배정 경기(UNSCHEDULED)만 대상**
   ```typescript
   const unscheduledMatches = matches.filter(m => m.status === "UNSCHEDULED");
   ```

2. **날짜 × 경기장 × 시간슬롯 그리드 생성**
   ```typescript
   const grid: ScheduleSlot[] = [];
   for (const date of dateRange) {
     for (const facility of facilities) {
       for (const timeSlot of timeSlots) {
         grid.push({ date, facility, timeSlot, available: true });
       }
     }
   }
   ```

3. **경기 순서 정렬**
   - 조별리그 → 토너먼트
   - 같은 조 내에서 seed 순서

4. **그리드에 앞에서부터 순차 배치**
   - 휴식 규칙 위반 시 다음 슬롯으로 스킵
   - 전부 배정되면 종료

### B) 충돌 처리

#### 슬롯 부족
```typescript
if (unscheduledMatches.length > availableSlots.length) {
  throw new Error(
    `슬롯 부족: ${unscheduledMatches.length}개 경기 중 ${availableSlots.length}개만 배정 가능`
  );
}
```

#### 휴식 규칙 불가
```typescript
// 경고 로그 기록
warnings.push(
  `일부 경기의 휴식 규칙(${minRestMinutes}분)을 충족하지 못했습니다.`
);
```

---

## 4️⃣ 배정 결과 데이터 반영

### matches 업데이트

```typescript
// 각 경기에 배정 정보 업데이트
await matchRef.update({
  schedule: {
    date: "2026-03-15",
    time: "10:30",
    facilityId: "FAC_A"
  },
  status: "SCHEDULED",
  scheduledAt: serverTimestamp(),
  scheduledBy: adminId
});
```

### 일정표 뷰 자동 업데이트

- `matchSchedule/{date}` 업데이트
- `venueSchedule/{venueId}/{date}` 업데이트

---

## 5️⃣ 운영 로그 & 시스템 공지

### 운영 로그

```typescript
{
  action: "일정 자동 배정",
  executor: string,
  executorName: string,
  timestamp: Timestamp,
  details: "32경기 배정 완료 (2일, 2개 경기장)",
  metadata: {
    totalMatches: 32,
    days: 2,
    facilities: 2,
    timeSlots: 5,
    restRule: { minRestMinutes: 90 }
  }
}
```

### 시스템 공지 (권장)

```typescript
{
  type: "SYSTEM",
  title: "[경기 일정 자동 생성 완료]",
  content: `
배정 일시: ${new Date().toLocaleString("ko-KR")}
경기 수: ${totalMatches}경기
적용 규칙:
- 경기장: ${facilities.length}개
- 시간 슬롯: ${timeSlots.length}개
- 최소 휴식: ${minRestMinutes}분
  `,
  link: `/association/${associationId}/admin/tournaments/${tournamentId}/ops#schedule`,
  createdAt: serverTimestamp()
}
```

---

## 6️⃣ 응답 (Response)

```typescript
interface AutoAssignScheduleResponse {
  success: boolean;
  totalMatches: number;
  scheduledMatches: number;
  failedMatches: number;
  warnings: string[];
  schedule: {
    dateRange: { start: string; end: string };
    facilities: string[];
    timeSlots: string[];
  };
  logId: string;
}
```

---

## 7️⃣ 알고리즘 상세

### 휴식 규칙 검증

```typescript
function canAssignMatch(
  match: Match,
  slot: ScheduleSlot,
  previousAssignments: Map<string, ScheduleSlot[]>
): boolean {
  const teamId = match.homeTeamId;
  const previousSlots = previousAssignments.get(teamId) || [];
  
  if (previousSlots.length === 0) return true;
  
  const lastSlot = previousSlots[previousSlots.length - 1];
  const timeDiff = getTimeDifference(lastSlot, slot);
  
  return timeDiff >= minRestMinutes;
}
```

### 우선순위 정렬

```typescript
function sortMatchesByPriority(
  matches: Match[],
  priority: { groupFirst: boolean }
): Match[] {
  return matches.sort((a, b) => {
    // 1. 조별 우선
    if (priority.groupFirst) {
      if (a.phase === "GROUP" && b.phase === "KNOCKOUT") return -1;
      if (a.phase === "KNOCKOUT" && b.phase === "GROUP") return 1;
    }
    
    // 2. 같은 조 내에서 seed 순서
    if (a.groupId === b.groupId) {
      return (a.seed || 0) - (b.seed || 0);
    }
    
    return 0;
  });
}
```

---

## 8️⃣ 에러 코드

| 에러 코드 | 메시지 | 원인 |
|---------|--------|------|
| `unauthenticated` | 인증이 필요합니다. | 로그인되지 않음 |
| `not-found` | 대회를 찾을 수 없습니다. | 대회 ID 오류 |
| `failed-precondition` | 조 추첨이 완료되지 않았습니다. | 조 추첨 미실행 |
| `failed-precondition` | 경기가 생성되지 않았습니다. | 경기 미생성 |
| `failed-precondition` | 경기장이 등록되지 않았습니다. | 경기장 없음 |
| `failed-precondition` | 이미 일정이 배정되었습니다. | 중복 배정 시도 |
| `resource-exhausted` | 슬롯 부족: X개 경기 중 Y개만 배정 가능 | 슬롯 부족 |

---

## 9️⃣ UX 반영

### ops 화면

**버튼**:
```tsx
<Button
  onClick={handleAutoAssign}
  disabled={!canAssign || assigning}
>
  {assigning ? "배정 중..." : "일정 자동 생성"}
</Button>
```

**안내 문구**:
```
※ 일정은 자동 생성되었으며, 필요 시 일부 수동 조정이 가능합니다.
```

### 경기장별 일정표 화면

- 즉시 렌더링
- 날짜/경기장 탭 활성
- "등록된 경기가 없습니다" 메시지 제거

---

## 🔟 수동 보정 허용 범위

### 허용
- ✅ 시간/경기장 드래그 이동
- ✅ 시간 수정
- ✅ 경기장 변경

### 불가
- ❌ 경기 삭제
- ❌ 재자동배정 (1회만 실행)

### 변경 시 운영 로그 자동 기록

```typescript
{
  action: "일정 수동 수정",
  executor: string,
  timestamp: Timestamp,
  details: `경기 ${matchId}: ${oldSchedule} → ${newSchedule}`,
  metadata: { matchId, oldSchedule, newSchedule }
}
```

---

## 🎯 핵심 원칙

1. **책임 분리**: 경기 생성 ≠ 일정 배정
2. **1회성**: 자동 배정은 1회만 실행
3. **규칙 기반**: 휴식 규칙, 우선순위 명확히 정의
4. **수동 보정**: 자동 배정 후 필요 시 수동 조정 가능
5. **감사 대응**: 모든 배정 과정 로그 기록

---

## ✅ 완료 체크리스트

- [x] 트리거 API 정의
- [x] 입력 파라미터 정의
- [x] 자동 배정 알고리즘 정의
- [x] 충돌 처리 규칙
- [x] 배정 결과 데이터 반영
- [x] 운영 로그 & 시스템 공지
- [x] UX 반영 가이드
- [x] 수동 보정 허용 범위
- [x] 에러 코드 정의

