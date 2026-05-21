# 🔥 updateTournamentPhaseCallable 배포 체크리스트

## ✅ 사전 배포 확인

### 1. 코드 검증
- [x] FSM 전이 규칙 정의 완료
- [x] Transaction 기반 원자적 처리 구현
- [x] requestId 기반 멱등성 구현
- [x] Stats 최적화 (쿼리 대신 O(1) 조회)
- [x] Phase 이벤트 로그 구현
- [x] 에러코드 표준화

### 2. Firestore 인덱스
- [ ] `phaseEvents` 컬렉션 자동 인덱스 생성 확인
  - 경로: `associations/{associationId}/tournaments/{tournamentId}/phaseEvents`
  - 필드: `createdAt` (자동 생성됨)

### 3. Stats 문서 초기화
- [ ] 기존 대회에 stats 문서 자동 생성 확인
  - 경로: `associations/{associationId}/tournaments/{tournamentId}/stats/teams`
  - 첫 승인/거절 시 자동 생성됨

### 4. 마이그레이션
- [x] 기존 데이터 영향 없음 (자동 초기화)
- [x] `phaseVersion` 필드 자동 초기화 (없으면 0부터 시작)
- [x] `lastPhaseUpdateRequestId`, `lastPhaseUpdateResult` 새 필드 (기존 동작에 영향 없음)

## 🧪 테스트 시나리오 (6종)

### 1. 동시성 테스트
**시나리오**: 관리자 A와 B가 동시에 ROSTER_OPEN → ROSTER_LOCKED 전이 시도

**예상 결과**:
- 하나만 성공 (200 OK)
- 다른 하나는 `alreadyInState: true` 또는 `INVALID_TRANSITION` 에러

**확인 방법**:
1. 두 브라우저에서 동시에 "팀원 명단 잠금" 버튼 클릭
2. Network 탭에서 하나는 200, 다른 하나는 409 또는 200 (alreadyInState)
3. GCP Logs에서 `phaseVersion`이 1만 증가했는지 확인

---

### 2. 연타 테스트
**시나리오**: 같은 버튼을 5회 연속 클릭

**예상 결과**:
- 첫 번째 요청만 성공 (200 OK, `alreadyInState: false`)
- 나머지 4개는 모두 성공 (200 OK, `alreadyInState: true`)

**확인 방법**:
1. "팀원 명단 잠금" 버튼을 빠르게 5회 클릭
2. Network 탭에서 모든 요청이 200 OK
3. GCP Logs에서 phase 변경이 1회만 발생했는지 확인
4. Firestore에서 `tournamentPhase`가 한 번만 변경되었는지 확인

---

### 3. 재시도 테스트 (requestId replay)
**시나리오**: 네트워크 끊김 후 같은 requestId로 재요청

**예상 결과**:
- 첫 번째 요청: 성공 (200 OK)
- 재요청: 동일한 응답 반환 (`replay: true`)

**확인 방법**:
1. 프론트엔드에서 `requestId` 생성하여 전송
2. 첫 요청 성공 후 네트워크 끊김 시뮬레이션
3. 같은 `requestId`로 재요청
4. 응답에 `replay: true` 포함 확인
5. Firestore에서 phase 변경이 1회만 발생했는지 확인

---

### 4. 조건 검증 테스트
**시나리오**: 승인된 팀이 0개 상태에서 잠금 시도

**예상 결과**:
- `NO_APPROVED_TEAMS` 에러 (400 또는 409)
- 에러 메시지에 "참가 신청 관리 탭에서 팀을 승인해주세요" 포함

**확인 방법**:
1. 승인된 팀이 0개인 대회에서 "팀원 명단 잠금" 시도
2. Network 탭에서 400/409 에러 확인
3. 에러 응답에 `code: "NO_APPROVED_TEAMS"` 포함 확인
4. UI에서 명확한 안내 메시지 표시 확인

---

### 5. 권한 테스트
**시나리오**: 관리자가 아닌 계정으로 호출

**예상 결과**:
- `PERMISSION_DENIED` 에러 (403)

**확인 방법**:
1. 일반 사용자 계정으로 로그인
2. "팀원 명단 잠금" 버튼 클릭 (버튼이 보이면 UI 버그)
3. Network 탭에서 403 에러 확인
4. 에러 응답에 `code: "PERMISSION_DENIED"` 포함 확인

---

### 6. 로그 테스트
**시나리오**: Phase 변경 후 이벤트 로그 확인

**예상 결과**:
- `phaseEvents` 서브컬렉션에 이벤트 기록
- `fromPhase`, `toPhase`, `actorUid`, `requestId`, `createdAt` 모두 정확히 기록

**확인 방법**:
1. Phase 변경 성공
2. Firestore Console에서 `phaseEvents` 서브컬렉션 확인
3. 최신 이벤트 문서에 모든 필드가 정확히 기록되었는지 확인
4. `requestId`가 전달된 경우 해당 값이 기록되었는지 확인

---

## 🚀 배포 절차

### 1. Functions 빌드 및 배포
```bash
cd functions
npm run build
firebase deploy --only functions:updateTournamentPhaseCallable
```

### 2. 배포 후 즉시 확인
- [ ] Firebase Console → Functions → `updateTournamentPhaseCallable` 상태 확인
- [ ] GCP Cloud Run에서 함수가 정상 실행 중인지 확인
- [ ] 첫 번째 전이 (ROSTER_OPEN → ROSTER_LOCKED) 직접 테스트

### 3. 모니터링 포인트
- [ ] GCP Logs에서 `phaseVersion` 증가 추이 확인
- [ ] `phaseEvents` 컬렉션에 이벤트가 정상 기록되는지 확인
- [ ] Stats 문서가 자동 생성되는지 확인
- [ ] 에러율 모니터링 (특히 `INVALID_TRANSITION`, `NO_APPROVED_TEAMS`)

---

## 🔄 롤백 절차

### 문제 발생 시
1. **이전 버전 확인**:
   ```bash
   firebase functions:list
   ```

2. **롤백 배포**:
   ```bash
   # 이전 버전 태그가 있다면
   firebase deploy --only functions:updateTournamentPhaseCallable --version <previous-version>
   ```

3. **데이터 복구** (필요 시):
   - `phaseEvents` 로그를 통해 변경 이력 확인
   - 필요시 `tournamentPhase` 수동 복구

---

## 📊 운영 중 이상 징후 감지 포인트

### 1. Phase Version 불일치
**징후**: `phaseVersion`이 예상보다 크게 증가

**원인 가능성**:
- 동시 요청이 많아 트랜잭션 재시도 빈번
- 클라이언트에서 중복 호출 방지 실패

**대응**:
- `phaseEvents` 로그 확인
- 클라이언트 중복 호출 방지 로직 점검

---

### 2. Stats 문서 누락
**징후**: `stats/teams` 문서가 생성되지 않음

**원인 가능성**:
- 트랜잭션 실패 후 stats 초기화 누락
- 권한 문제

**대응**:
- `syncStatsFromTeams` 함수로 수동 동기화
- 또는 첫 승인/거절 시 자동 생성 확인

---

### 3. Phase Events 누락
**징후**: Phase 변경은 되었지만 `phaseEvents`에 로그 없음

**원인 가능성**:
- 트랜잭션 내 이벤트 로그 기록 실패 (권한 문제 가능)

**대응**:
- Firestore Security Rules 확인
- 로그 기록 실패는 경고만 (메인 로직에는 영향 없음)

---

## ✅ 배포 완료 체크리스트

- [ ] 모든 테스트 시나리오 통과
- [ ] 첫 번째 프로덕션 전이 성공 확인
- [ ] GCP Logs에서 정상 로그 확인
- [ ] `phaseEvents` 로그 정상 기록 확인
- [ ] Stats 문서 자동 생성 확인
- [ ] 에러율 정상 범위 내

---

## 📝 참고사항

- **Stats 최적화**: 팀 수가 많아져도 O(1) 조회로 성능 유지
- **Idempotent**: 네트워크 재전송/재시도에도 안전
- **Transaction**: 동시 요청에도 원자적 처리 보장
- **FSM**: 잘못된 전이 시도는 서버에서 차단
