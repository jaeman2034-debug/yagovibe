# 🔍 빠른 진단 가이드 (테스트 중 문제 발생 시)

## 문제별 즉시 확인 포인트

### 1️⃣ 승인했는데 버튼 비활성

**즉시 확인**:
```javascript
// 브라우저 콘솔
const statsRef = doc(db, `associations/${associationId}/tournaments/${tournamentId}/stats/teams`);
const statsSnap = await getDoc(statsRef);
console.log("Stats:", statsSnap.data());
```

**예상 원인**:
- Stats 업데이트 트랜잭션 실패
- `approveApplication` 함수에서 Stats 업데이트 누락

**해결**:
```typescript
// syncStatsFromTeams 함수 실행
import { syncStatsFromTeams } from "./utils/tournamentStats";
await syncStatsFromTeams(associationId, tournamentId);
```

---

### 2️⃣ 연타 시 phaseVersion +2 이상

**즉시 확인**:
```javascript
// Firestore Console
associations/{associationId}/tournaments/{tournamentId}
→ phaseVersion 값 확인
```

**예상 원인**:
- 트랜잭션 재시도 실패
- 동시성 제어 로직 문제

**해결**:
- GCP Logs에서 트랜잭션 충돌 로그 확인
- `phaseVersion` 증가 로직 점검

---

### 3️⃣ phaseEvents 2건 이상

**즉시 확인**:
```javascript
// Firestore Console
associations/{associationId}/tournaments/{tournamentId}/phaseEvents
→ 최근 이벤트 개수 확인
```

**예상 원인**:
- 트랜잭션 내 이벤트 로그 중복 기록
- 트랜잭션 재시도 시 이벤트 중복 생성

**해결**:
- 트랜잭션 내 이벤트 로그 기록 로직 점검
- Idempotency 로직 강화

---

### 4️⃣ requestId 재시도 실패

**즉시 확인**:
```javascript
// Network 탭
// 첫 번째 요청과 두 번째 요청의 requestId 동일한지 확인
// 두 번째 요청의 응답에 replay: true 또는 alreadyInState: true 있는지 확인
```

**예상 원인**:
- `lastPhaseUpdateRequestId` 저장 실패
- Idempotency 로직 누락

**해결**:
- `updateTournamentPhase.ts`의 requestId 처리 로직 점검
- 트랜잭션 내 `lastPhaseUpdateRequestId` 저장 확인

---

### 5️⃣ 에러 코드가 예상과 다름

**즉시 확인**:
```javascript
// Network 탭 → Response
// error.code 또는 error.details.code 확인
```

**예상 원인**:
- 에러 코드 매핑 오류
- 서버 에러 처리 로직 문제

**해결**:
- `updateTournamentPhase.ts`의 에러 코드 확인
- 클라이언트 에러 처리 로직 점검

---

## 🚨 Critical 문제 즉시 대응

### 문제: Phase가 예상과 다르게 변경됨

**즉시 조치**:
1. Phase 변경 기능 차단 (Feature Flag)
2. 상태 스냅샷 확보
3. 롤백 절차 진입

**확인**:
- `phaseEvents` 최근 이벤트 확인
- `phaseVersion` 증가 추이 확인

---

### 문제: Stats 데이터 손상 (approvedCount < 0)

**즉시 조치**:
1. `syncStatsFromTeams` 함수 실행
2. 모든 대회에 대해 Stats 재계산

**확인**:
- `stats/teams` 문서의 `approvedCount` 값
- 실제 APPROVED 팀 수와 비교

---

## 📞 문제 보고 형식

```
[문제 단계] 테스트 X단계
[증상] 구체적인 증상 설명
[확인한 값] phaseVersion, approvedCount, phaseEvents 등
[에러 메시지] Network 탭 에러 응답
[스크린샷] 있음/없음
```

이 형식으로 보고하면 즉시 해부해서 수정 지시 내릴게.
