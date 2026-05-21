# 🚀 updateTournamentPhaseCallable 운영 가이드

## 📋 관리자 실수 방지 룰

### ✅ 서버에서 강제되는 안전 장치

1. **FSM 강제**: 허용된 Phase 전이만 성공
   - 잘못된 전이 시도 시 자동 차단
   - 에러 메시지에 허용된 전이 목록 표시

2. **승인 팀 조건 강제**: 서버에서 최종 검증
   - 승인된 팀이 0개면 잠금 불가
   - UI에서 버튼 비활성화 + 서버에서도 차단

3. **중복 호출 방지**: Idempotent 처리
   - 같은 Phase로의 요청은 자동 무시
   - 연타/재시도에도 안전

---

## 🔍 이상 징후 감지 포인트

### 1. Phase Version 불일치

**징후**:
- `phaseVersion`이 예상보다 크게 증가
- 예: 1회 변경했는데 `phaseVersion`이 3 이상

**원인 가능성**:
- 동시 요청이 많아 트랜잭션 재시도 빈번
- 클라이언트에서 중복 호출 방지 실패

**대응**:
1. `phaseEvents` 로그 확인
2. 동일 `requestId`로 여러 번 기록되었는지 확인
3. 클라이언트 중복 호출 방지 로직 점검

**예방**:
- UI에서 버튼 즉시 disable (이미 구현됨)
- `requestId` 사용 권장

---

### 2. Stats 문서 누락

**징후**:
- `stats/teams` 문서가 생성되지 않음
- 승인 팀 수 조회 실패

**원인 가능성**:
- 트랜잭션 실패 후 stats 초기화 누락
- 권한 문제

**대응**:
1. 수동 동기화:
   ```typescript
   // 브라우저 콘솔에서
   await syncStatsFromTeams(associationId, tournamentId);
   ```
2. 또는 첫 승인/거절 시 자동 생성 확인

**예방**:
- Stats 문서는 자동 초기화됨 (트랜잭션 내에서)
- 문제 발생 시 `syncStatsFromTeams` 함수로 복구 가능

---

### 3. Phase Events 누락

**징후**:
- Phase 변경은 되었지만 `phaseEvents`에 로그 없음

**원인 가능성**:
- 트랜잭션 내 이벤트 로그 기록 실패 (권한 문제 가능)

**대응**:
- Firestore Security Rules 확인
- 로그 기록 실패는 경고만 (메인 로직에는 영향 없음)

**예방**:
- Firestore Security Rules에서 `phaseEvents` 쓰기 권한 확인

---

### 4. 승인 팀 수 불일치

**징후**:
- Stats 문서의 `approvedCount`와 실제 팀 수 불일치

**원인 가능성**:
- 승인/거절 시 stats 업데이트 실패
- 트랜잭션 실패 후 stats 미업데이트

**대응**:
1. `syncStatsFromTeams` 함수로 수동 동기화
2. 이후 승인/거절 시 자동 업데이트 확인

**예방**:
- 승인/거절은 모두 트랜잭션 내에서 stats 업데이트
- 문제 발생 시 수동 동기화로 복구 가능

---

## 🛠️ 수동 복구 방법

### Stats 문서 동기화

```typescript
// Cloud Functions에서 실행
import { syncStatsFromTeams } from "./utils/tournamentStats";

await syncStatsFromTeams(associationId, tournamentId);
```

또는 브라우저 콘솔에서:
```javascript
// 임시 함수 추가 후
await syncStatsFromTeams(associationId, tournamentId);
```

---

### Phase 수동 복구

**주의**: Phase 수동 변경은 최후의 수단입니다.

1. `phaseEvents` 로그 확인하여 올바른 Phase 확인
2. Firestore Console에서 직접 수정:
   ```
   associations/{associationId}/tournaments/{tournamentId}
   → tournamentPhase: "ROSTER_LOCKED" (예시)
   ```
3. `phaseVersion`도 함께 증가시켜야 함

---

## 📊 모니터링 지표

### 정상 범위
- **에러율**: < 1%
- **평균 응답 시간**: < 2초
- **트랜잭션 재시도율**: < 5%

### 이상 징후
- 에러율 > 5%
- 평균 응답 시간 > 5초
- `INVALID_TRANSITION` 에러 빈번
- `NO_APPROVED_TEAMS` 에러 빈번

---

## 🔄 업그레이드 가이드

### Stats 최적화 적용 후

1. **기존 대회 Stats 동기화** (선택사항):
   ```typescript
   // 모든 대회에 대해 실행
   for (const tournament of tournaments) {
     await syncStatsFromTeams(associationId, tournament.id);
   }
   ```

2. **모니터링 강화**:
   - Stats 문서 자동 생성 확인
   - 승인/거절 시 stats 업데이트 확인

---

## 📞 문제 발생 시 체크리스트

1. **GCP Logs 확인**
   - `updateTournamentPhase` 로그 검색
   - 에러 메시지 확인
   - `phaseVersion` 증가 추이 확인

2. **Firestore 데이터 확인**
   - `tournamentPhase` 현재 값 확인
   - `phaseEvents` 최신 이벤트 확인
   - `stats/teams` 문서 존재 및 값 확인

3. **클라이언트 확인**
   - Network 탭에서 실제 요청 확인
   - 에러 응답의 `code` 필드 확인
   - UI 에러 메시지 확인

4. **복구 실행**
   - Stats 동기화 (필요 시)
   - Phase 수동 복구 (최후의 수단)

---

## ✅ 정기 점검 항목

### 주간 점검
- [ ] `phaseEvents` 로그 정상 기록 확인
- [ ] Stats 문서 자동 생성 확인
- [ ] 에러율 모니터링

### 월간 점검
- [ ] Stats 문서와 실제 팀 수 일치 확인
- [ ] Phase Version 증가 추이 분석
- [ ] 트랜잭션 재시도율 분석

---

## 🎯 성공 기준

- ✅ 모든 Phase 전이가 정상 동작
- ✅ 동시 요청에도 안전하게 처리
- ✅ 중복 호출/재시도에도 멱등성 보장
- ✅ 에러 메시지가 명확하고 행동 가능
- ✅ 모든 변경 이력이 `phaseEvents`에 기록
