# 🧪 updateTournamentPhaseCallable 테스트 시나리오

## 테스트 환경 준비

1. **테스트 대회 생성**
   - 최소 1개 이상의 승인된 팀 필요
   - Phase: `ROSTER_OPEN` 상태

2. **관리자 계정 준비**
   - 협회 관리자 권한이 있는 계정 2개 (A, B)

3. **브라우저 준비**
   - Chrome DevTools 열기 (Network 탭)
   - 시크릿 모드 권장 (캐시 영향 최소화)

---

## 테스트 시나리오 1: 동시성 테스트

### 목적
두 관리자가 동시에 Phase 변경을 시도할 때 하나만 성공하는지 확인

### 절차
1. 관리자 A 브라우저에서 대회 상세 페이지 열기
2. 관리자 B 브라우저에서 같은 대회 상세 페이지 열기
3. **동시에** "팀원 명단 잠금" 버튼 클릭 (가능한 한 동시에)

### 예상 결과
- ✅ 하나는 성공 (200 OK)
- ✅ 다른 하나는:
  - `alreadyInState: true` (이미 변경된 경우)
  - 또는 `INVALID_TRANSITION` (이미 다른 phase인 경우)

### 확인 포인트
- [ ] Network 탭에서 하나는 200, 다른 하나는 200 (alreadyInState) 또는 409
- [ ] GCP Logs에서 `phaseVersion`이 1만 증가
- [ ] Firestore에서 `tournamentPhase`가 한 번만 변경
- [ ] `phaseEvents`에 이벤트가 1개만 기록

---

## 테스트 시나리오 2: 연타 테스트

### 목적
같은 버튼을 빠르게 여러 번 클릭해도 Phase가 한 번만 변경되는지 확인

### 절차
1. "팀원 명단 잠금" 버튼을 **5회 연속 클릭** (가능한 한 빠르게)
2. Network 탭에서 모든 요청 확인

### 예상 결과
- ✅ 첫 번째 요청: `alreadyInState: false`, phase 변경 성공
- ✅ 나머지 4개 요청: `alreadyInState: true`, phase 변경 없음

### 확인 포인트
- [ ] 모든 요청이 200 OK
- [ ] 첫 번째만 `alreadyInState: false`
- [ ] 나머지는 모두 `alreadyInState: true`
- [ ] GCP Logs에서 phase 변경이 1회만 발생
- [ ] Firestore에서 `tournamentPhase`가 한 번만 변경

---

## 테스트 시나리오 3: 재시도 테스트 (requestId replay)

### 목적
네트워크 재전송 시 같은 requestId로 재요청해도 멱등하게 동작하는지 확인

### 절차
1. 프론트엔드 코드에 `requestId` 추가:
   ```typescript
   const requestId = crypto.randomUUID();
   await updatePhaseFn({
     associationId,
     tournamentId,
     phase: "ROSTER_LOCKED",
     requestId, // 🔥 추가
   });
   ```
2. 첫 번째 요청 성공 확인
3. 같은 `requestId`로 수동 재요청 (브라우저 콘솔에서)

### 예상 결과
- ✅ 첫 번째 요청: 성공, `replay: false`
- ✅ 재요청: 동일한 응답, `replay: true`

### 확인 포인트
- [ ] 두 요청 모두 200 OK
- [ ] 재요청 응답에 `replay: true` 포함
- [ ] Firestore에서 phase 변경이 1회만 발생
- [ ] `lastPhaseUpdateRequestId`에 `requestId` 저장 확인

---

## 테스트 시나리오 4: 조건 검증 테스트

### 목적
승인된 팀이 없을 때 잠금이 차단되는지 확인

### 절차
1. 승인된 팀이 0개인 대회 준비 (모든 팀을 거절하거나 승인 취소)
2. "팀원 명단 잠금" 버튼 클릭

### 예상 결과
- ✅ `NO_APPROVED_TEAMS` 에러 (400 또는 409)
- ✅ 에러 메시지에 "참가 신청 관리 탭에서 팀을 승인해주세요" 포함

### 확인 포인트
- [ ] Network 탭에서 400/409 에러
- [ ] 에러 응답에 `code: "NO_APPROVED_TEAMS"` 포함
- [ ] `approvedCount: 0` 포함
- [ ] UI에서 명확한 안내 메시지 표시
- [ ] Phase가 변경되지 않음

---

## 테스트 시나리오 5: 권한 테스트

### 목적
관리자가 아닌 사용자의 요청이 차단되는지 확인

### 절차
1. 일반 사용자 계정으로 로그인
2. 관리자 페이지 접근 시도 (또는 API 직접 호출)

### 예상 결과
- ✅ `PERMISSION_DENIED` 에러 (403)

### 확인 포인트
- [ ] Network 탭에서 403 에러
- [ ] 에러 응답에 `code: "PERMISSION_DENIED"` 포함
- [ ] Phase가 변경되지 않음

---

## 테스트 시나리오 6: 로그 테스트

### 목적
Phase 변경 시 이벤트 로그가 정확히 기록되는지 확인

### 절차
1. Phase 변경 성공 (ROSTER_OPEN → ROSTER_LOCKED)
2. Firestore Console에서 `phaseEvents` 서브컬렉션 확인

### 예상 결과
- ✅ 최신 이벤트 문서에 다음 필드 모두 포함:
  - `fromPhase: "ROSTER_OPEN"`
  - `toPhase: "ROSTER_LOCKED"`
  - `actorUid: "user-id"`
  - `requestId: "uuid"` (전달한 경우)
  - `createdAt: Timestamp`
  - `timestamp: number`

### 확인 포인트
- [ ] `phaseEvents` 컬렉션에 이벤트 기록
- [ ] 모든 필드가 정확히 기록
- [ ] `actorUid`가 현재 사용자와 일치
- [ ] `requestId`가 전달된 경우 해당 값 기록

---

## 테스트 시나리오 7: FSM 전이 검증

### 목적
허용되지 않은 Phase 전이가 차단되는지 확인

### 절차
1. 현재 Phase: `ROSTER_OPEN`
2. 직접 `MATCHES_RUNNING`으로 변경 시도 (브라우저 콘솔에서)

### 예상 결과
- ✅ `INVALID_TRANSITION` 에러 (409)
- ✅ 에러 메시지에 허용된 전이 목록 포함

### 확인 포인트
- [ ] Network 탭에서 409 에러
- [ ] 에러 응답에 `code: "INVALID_TRANSITION"` 포함
- [ ] `allowedTransitions: ["ROSTER_LOCKED"]` 포함
- [ ] Phase가 변경되지 않음

---

## 테스트 시나리오 8: Stats 최적화 검증

### 목적
Stats 문서를 사용하여 승인 팀 수를 O(1)로 조회하는지 확인

### 절차
1. 승인된 팀 3개 생성
2. Phase 변경 (ROSTER_OPEN → ROSTER_LOCKED)
3. GCP Logs에서 쿼리 대신 stats 문서 읽기 확인

### 예상 결과
- ✅ `approvedSnap.size` 대신 `statsSnap.data().approvedCount` 사용
- ✅ 로그에 "승인 팀 수 검증 통과 (Stats)" 메시지

### 확인 포인트
- [ ] GCP Logs에서 "Stats" 키워드 확인
- [ ] 쿼리 로그 없음 (teams 컬렉션 쿼리 없음)
- [ ] Stats 문서가 자동 생성되었는지 확인

---

## 통합 테스트 체크리스트

모든 시나리오 통과 후:
- [ ] 모든 테스트 시나리오 통과
- [ ] GCP Logs에서 에러 없음
- [ ] Firestore 데이터 정합성 확인
- [ ] UI에서 모든 에러 메시지 정상 표시
- [ ] `phaseEvents` 로그 정상 기록

---

## 문제 발생 시 디버깅

### Phase가 변경되지 않음
1. GCP Logs에서 `updateTournamentPhase` 로그 확인
2. `phaseVersion` 증가 여부 확인
3. `phaseEvents` 로그 확인
4. Firestore Security Rules 확인

### Stats 문서 누락
1. `syncStatsFromTeams` 함수로 수동 동기화
2. 첫 승인/거절 시 자동 생성 확인

### 에러 코드가 예상과 다름
1. GCP Logs에서 실제 에러 확인
2. 에러 응답의 `code` 필드 확인
3. 클라이언트 에러 처리 로직 확인
