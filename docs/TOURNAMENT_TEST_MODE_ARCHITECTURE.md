# 🔥 테스트 모드 아키텍처 (검증용 완전 분리 구조)

## 📋 목적
운영 규칙은 그대로 유지하면서, 테스트 전용 조 추첨 및 대진표 확인이 가능한 안전한 테스트 루트 제공.

---

## 1️⃣ 테스트 모드 진입 방법

### A) UI 토글 (권장)
**위치**: 조 추첨 관리 영역 상단

```tsx
<Checkbox
  id="test-mode-toggle"
  checked={isTestMode}
  onCheckedChange={(checked) => setIsTestMode(checked as boolean)}
/>
<label htmlFor="test-mode-toggle">
  테스트 모드로 조 추첨 실행 (운영 기록 미반영)
</label>
```

### B) URL 파라미터 (개발자 전용)
```
/admin/tournaments/{id}/ops?mode=test
```

```typescript
const isTestMode = searchParams.get("mode") === "test";
```

---

## 2️⃣ 데이터 구조 (완전 분리)

### 테스트 모드 컬렉션

#### 📦 test_groups
```
associations/{associationId}/tournaments/{tournamentId}/test_groups/{docId}
{
  createdAt: Timestamp,
  algorithmVersion: "v1.0",
  groups: [
    {
      groupId: "A",
      division: "A조",
      teams: [
        { teamId, teamName, seed }
      ]
    }
  ],
  metadata: {
    divisionCount, totalTeams, seedTeamIds, ...
  }
}
```

#### 📦 test_matches
```
associations/{associationId}/tournaments/{tournamentId}/test_matches/{matchId}
{
  tournamentId,
  division: "A조",
  homeTeam, homeTeamId,
  awayTeam, awayTeamId,
  date, startTime, endTime,
  venueId, courtNo,
  status: "UNSCHEDULED" | "SCHEDULED" | ...,
  createdAt, updatedAt
}
```

#### 📦 test_drawLogs
```
associations/{associationId}/tournaments/{tournamentId}/test_drawLogs/{logId}
{
  executedAt, executedBy, executedByEmail,
  input, algorithm, seedTeams, result, ...
}
```

---

## 3️⃣ 알고리즘 분기

### 조 추첨 실행

```typescript
// Cloud Function
if (testMode) {
  // test_groups 컬렉션에 저장
  await testGroupsRef.set({ ... });
} else {
  // 대회 문서에 저장
  await tournamentRef.update({ drawExecuted: true, ... });
}
```

### 경기 생성

```typescript
if (testMode) {
  // test_groups에서 조 정보 조회
  const testGroups = await getTestGroups(...);
  // test_matches에 저장
  await testMatchesRef.set({ ... });
} else {
  // tournament.drawDivisions에서 조 정보 조회
  // matches에 저장
  await matchesRef.set({ ... });
}
```

---

## 4️⃣ UI 분기

### 경기 목록 조회

```typescript
const loadMatches = async () => {
  if (isTestMode) {
    const testMatches = await getTestMatches(associationId, tournamentId);
    setMatches(testMatches);
  } else {
    const matches = await getMatches(associationId, tournamentId, {});
    setMatches(matches);
  }
};
```

### 대진표 화면

```typescript
{isTestMode && (
  <Alert>
    ⚠️ 현재 화면은 테스트용 대진표입니다.
    운영 기록에는 반영되지 않습니다.
  </Alert>
)}
```

---

## 5️⃣ 검증 가능 항목

### ✅ 검증 가능
- 조 추첨 알고리즘 검증
- 팀 수 / 조 수 엣지 케이스 확인
- 리그 ↔ 토너먼트 전환 검증
- 경기 수 자동 계산 검증
- UI/UX 흐름 검증

### ❌ 민원 리스크 없음
- 운영 기록 미반영
- 공문 깨짐 없음
- 감사 로그 오염 없음

---

## 6️⃣ 테스트 → 공식 승격 (선택)

### 승격 로직

```typescript
async function promoteTestToOfficial(
  associationId: string,
  tournamentId: string
) {
  // 1. test_groups → drawDivisions 복사
  const testGroups = await getTestGroups(...);
  await tournamentRef.update({
    drawExecuted: true,
    drawDivisions: testGroups.groups.map(...),
    ...
  });
  
  // 2. test_matches → matches 복사
  const testMatches = await getTestMatches(...);
  await createMatchesBulk(...);
  
  // 3. 운영 로그 기록
  await logPromotion(...);
}
```

---

## ✅ 완료 체크리스트

- [x] 테스트 모드 토글 UI
- [x] test_groups 컬렉션 구조
- [x] test_matches 컬렉션 구조
- [x] Cloud Function 테스트 모드 분기
- [x] 경기 생성 테스트 모드 분기
- [x] UI 경기 목록 분기
- [x] 테스트 모드 표시

---

## 🎯 핵심 원칙

1. **완전 분리**: test_* 컬렉션으로 운영 데이터와 완전 분리
2. **동일 로직**: 알고리즘은 동일, 저장 위치만 분리
3. **안전 보장**: 운영 기록에 영향 없음
4. **검증 가능**: 모든 기능을 안전하게 검증

