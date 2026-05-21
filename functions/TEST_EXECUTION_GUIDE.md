# 🧪 updateTournamentPhaseCallable 테스트 실행 가이드

## 빠른 실행 (브라우저 콘솔)

### 1. 준비
```javascript
// 브라우저 DevTools 콘솔에서
// test-browser-console.js 파일 내용 복사-붙여넣기
```

### 2. 설정 수정
```javascript
const TEST_CONFIG = {
  associationId: "실제_협회_ID",
  tournamentId: "실제_대회_ID",
};
```

### 3. 실행
```javascript
// 전체 테스트
await runAllTests();

// 개별 테스트
await test1_ConcurrentClick();
await test2_RapidClick();
await test3_Retry();
await test6_ConcurrencyStress();
```

---

## 상세 테스트 시나리오

### 1️⃣ 동시 클릭 테스트

**목적**: 두 관리자가 동시에 잠금 요청 시 1회만 성공하는지 확인

**실행**:
```javascript
await test1_ConcurrentClick();
```

**합격 기준**:
- `phaseVersion === 1` (1회만 증가)
- `phaseEventsCount === 1` (1건만 생성)
- 하나는 `alreadyInState: false`, 다른 하나는 `alreadyInState: true`

---

### 2️⃣ 연타 테스트

**목적**: 같은 버튼을 5회 연속 클릭해도 1회만 성공하는지 확인

**실행**:
```javascript
await test2_RapidClick();
```

**합격 기준**:
- `phaseVersion === 1` (1회만 증가)
- `phaseEventsCount === 1` (1건만 생성)
- 1회 성공, 나머지 4회는 `alreadyInState: true`

---

### 3️⃣ 재시도 테스트

**목적**: 같은 requestId로 재요청 시 replay 동작 확인

**실행**:
```javascript
await test3_Retry();
```

**합격 기준**:
- 두 번째 요청: `replay: true` 또는 동일 결과
- `phaseEventsCount === 1` (1건만 생성)
- `phaseVersion === 1` (추가 변경 없음)

---

### 4️⃣ 조건 위반 테스트

**목적**: 승인 팀 0 상태에서 잠금 시도 시 차단 확인

**실행**:
```javascript
// 승인 팀을 0으로 만든 후
await test4_NoApprovedTeams();
```

**합격 기준**:
- 에러 발생: `code: "NO_APPROVED_TEAMS"`
- `nextActionHint` 포함
- Phase 변경 없음

---

### 5️⃣ 권한 테스트

**목적**: 비관리자 계정 호출 시 차단 확인

**실행**:
```javascript
// 비관리자 계정으로 로그인한 후
await test5_PermissionDenied();
```

**합격 기준**:
- 에러 발생: `code: "PERMISSION_DENIED"`
- Phase 변경 없음

---

### 6️⃣ 경합 스트레스 테스트

**목적**: 동시에 20개 요청 시 안정성 확인

**실행**:
```javascript
await test6_ConcurrencyStress();
```

**합격 기준**:
- `phaseVersion === 1` (1회만 증가)
- `phaseEventsCount === 1` (1건만 생성)
- 서버 에러 없음

---

## 합격 기준 (배포 허용 조건)

- ✅ `phaseVersion` 증가 1회만 발생
- ✅ `phaseEvents` 정확히 1건
- ✅ `NO_APPROVED_TEAMS` / `PERMISSION_DENIED` 정상 반환
- ✅ 동일 `requestId` replay 정상 동작
- ✅ 서버 에러 로그 없음

---

## 문제 발생 시

### Phase Version이 +2 이상
- 원인: 트랜잭션 재시도 실패 또는 동시성 처리 문제
- 확인: GCP Logs에서 `phaseVersion` 증가 추이 확인

### Phase Events가 2건 이상
- 원인: 트랜잭션 내 이벤트 로그 중복 기록
- 확인: `phaseEvents` 컬렉션에서 `requestId` 중복 확인

### 서버 에러 발생
- 원인: 트랜잭션 충돌 또는 권한 문제
- 확인: GCP Logs에서 에러 메시지 확인

---

## 다음 단계

테스트 통과 후:
👉 C) 운영 중 이상 징후 감지 포인트(알람 기준)
