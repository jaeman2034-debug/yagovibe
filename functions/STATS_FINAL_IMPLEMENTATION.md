# ✅ approvedCount Stats 최적화 - 최종 적용 코드

## 1. Stats 문서 스키마 (초기화 필수)

### 경로
```
associations/{associationId}/tournaments/{tournamentId}/stats/teams
```

### 문서 구조
```typescript
{
  approvedCount: number,  // 기본 0
  updatedAt: Timestamp,
  createdAt?: Timestamp   // 초기 생성 시
}
```

### 🔒 규칙
- Phase 전이에서는 이 문서만 읽는다
- Teams 컬렉션 count 쿼리 금지

---

## 2. 팀 승인/취소 시 approvedCount 증감 (트랜잭션)

### 핵심 함수
```typescript
// functions/src/tournament/utils/tournamentStats.ts

export function updateApprovedCountOnStatusChange(
  tx: admin.firestore.Transaction,
  associationId: string,
  tournamentId: string,
  prevStatus: string | null | undefined,
  nextStatus: string
): void {
  const statsRef = getStatsRef(associationId, tournamentId);
  
  const prevApproved = prevStatus === "APPROVED";
  const nextApproved = nextStatus === "APPROVED";
  
  // 상태 변경이 없으면 무시 (멱등)
  if (prevApproved === nextApproved) {
    return;
  }
  
  // delta 계산: APPROVED가 되면 +1, APPROVED에서 벗어나면 -1
  const delta = nextApproved ? 1 : -1;
  
  // Stats 문서 읽기 (트랜잭션 내에서)
  const statsSnap = tx.get(statsRef);
  
  // Stats 문서가 없으면 초기화
  if (!statsSnap.exists) {
    tx.set(statsRef, {
      approvedCount: Math.max(0, delta),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } else {
    // increment 사용 (원자적 연산)
    tx.update(statsRef, {
      approvedCount: admin.firestore.FieldValue.increment(delta),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}
```

### 적용 위치

#### A. 승인 시 (approveApplication.ts)
```typescript
await db.runTransaction(async (tx) => {
  // ... application 상태 업데이트 ...
  
  // Stats 업데이트: PENDING → APPROVED
  updateApprovedCountOnStatusChange(
    tx,
    associationId,
    tournamentId,
    "PENDING",
    "APPROVED"
  );
});
```

#### B. 거절 시 (updateApplicationStatus.ts)
```typescript
if (isApprovedToRejected) {
  await db.runTransaction(async (tx) => {
    // Stats 업데이트: APPROVED → REJECTED
    updateApprovedCountOnStatusChange(
      tx,
      associationId,
      tournamentId,
      "APPROVED",
      "REJECTED"
    );
    
    // ... application 상태 업데이트 ...
  });
}
```

---

## 3. Phase 전이에서 Stats 사용

### 위치: updateTournamentPhase.ts (Line 343-375)

```typescript
// ROSTER_OPEN -> ROSTER_LOCKED 조건 검사
if (currentPhase === "ROSTER_OPEN" && phase === "ROSTER_LOCKED") {
  // 🔥 Stats 문서에서 O(1) 조회 (쿼리 금지)
  const statsRef = tournamentRef.collection("stats").doc("teams");
  const statsSnap = await tx.get(statsRef);
  
  let approvedCount = 0;
  if (statsSnap.exists) {
    const statsData = statsSnap.data()!;
    approvedCount = Number(statsData.approvedCount ?? 0);
  } else {
    // Stats 문서가 없으면 초기화 (트랜잭션 내에서)
    tx.set(statsRef, {
      approvedCount: 0,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    approvedCount = 0;
  }
  
  if (approvedCount < 1) {
    throw new HttpsError(
      "failed-precondition",
      "승인된 팀이 1개 이상 필요합니다.",
      {
        code: "NO_APPROVED_TEAMS",
        approvedCount,
        minRequired: 1,
        nextActionHint: "참가 신청 관리 탭에서 팀을 승인해주세요.",
      }
    );
  }
}
```

---

## 4. 마이그레이션 (1회 실행)

### 단일 대회 마이그레이션
```typescript
import { migrateTournamentStats } from "./utils/migrateStats";

await migrateTournamentStats(associationId, tournamentId);
```

### 전체 대회 마이그레이션
```typescript
import { migrateAllTournamentsStats } from "./utils/migrateStats";

await migrateAllTournamentsStats(associationId);
```

### 동작
1. 모든 tournament에 대해 `stats/teams` 생성
2. `approvedCount = 현재 APPROVED 팀 수` (쿼리로 계산)
3. 이후부터는 증감만 사용

---

## 5. 배포 전 체크 (30초 컷)

### ✅ 체크리스트

- [ ] **팀 승인/취소 → stats 숫자 즉시 반영**
  - 승인 시: `approvedCount +1`
  - 거절 시: `approvedCount -1`
  - Firestore Console에서 확인

- [ ] **Phase 전이 시 teams 쿼리 없음**
  - GCP Logs에서 `teams.where("status", "==", "APPROVED")` 검색
  - Phase 전이 로그에 쿼리 없음 확인

- [ ] **approvedCount 음수 불가**
  - `Math.max(0, delta)` 적용 확인
  - 또는 `increment(-1)` 후에도 음수 방지 로직 확인

- [ ] **동시 승인/취소에서도 숫자 일관성 유지**
  - 두 관리자가 동시에 승인/거절 시도
  - Stats 문서의 `approvedCount`가 정확히 반영되는지 확인

---

## 📊 구현 파일 목록

1. `functions/src/tournament/utils/tournamentStats.ts`
   - Stats 유틸리티 함수
   - `updateApprovedCountOnStatusChange` 핵심 함수

2. `functions/src/tournament/utils/migrateStats.ts`
   - 마이그레이션 함수

3. `functions/src/tournament/updateTournamentPhase.ts`
   - Phase 전이 시 Stats 사용

4. `functions/src/tournament/approveApplication.ts`
   - 승인 시 Stats 증감

5. `functions/src/tournament/updateApplicationStatus.ts`
   - 거절 시 Stats 감소

---

## 🚀 배포 준비 완료

**Stats 최적화**: ✅ 완료

다음 단계: B) 자동 테스트 스크립트
