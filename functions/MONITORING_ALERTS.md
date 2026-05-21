# 🚨 updateTournamentPhaseCallable 운영 모니터링 & 알람 기준

## 1️⃣ Phase 전이 성공률 감시

### 지표
- **success**: 성공한 전이 수
- **alreadyInState**: 이미 해당 상태인 경우 (정상)
- **error**: 에러 발생 수

### 기대 패턴
```
success: 1
alreadyInState: 다수 가능 (정상)
error: 거의 0
```

### 알람 조건
```
phase_change_error_count > 0 (5분 내)
```

**의미**: FSM/권한/조건 로직이 깨졌다는 신호

**알람 레벨**: 🚨 Critical

**대응**:
1. GCP Logs에서 에러 메시지 확인
2. `phaseEvents` 최근 이벤트 확인
3. 에러 코드별 대응:
   - `INVALID_TRANSITION` → UI 상태 불일치 가능
   - `PERMISSION_DENIED` → 권한 설정 확인
   - `NO_APPROVED_TEAMS` → 운영 가이드 확인

---

## 2️⃣ 승인 팀 Stats 이상 탐지 (매우 중요)

### A. approvedCount 음수 / 불일치

#### 조건
```sql
-- 즉시 알람
approvedCount < 0

-- 논리적 불일치
approvedCount === 0 AND tournamentPhase >= "ROSTER_LOCKED"
```

**알람 레벨**: 🚨 Critical

**의미**: Stats 증감 로직 손상 or 마이그레이션 누락

**대응**:
1. `syncStatsFromTeams` 함수로 즉시 동기화
2. 최근 승인/거절 이벤트 확인
3. Stats 업데이트 로직 점검

---

### B. 승인팀 급변

#### 조건
```
1분 내 approvedCount ±5 이상 변화
```

**알람 레벨**: ⚠️ Warning

**의미**: 관리자 오조작 or 자동화 버그

**대응**:
1. 최근 승인/거절 이벤트 확인
2. 관리자 작업 로그 확인
3. 자동화 스크립트 점검

---

## 3️⃣ Phase Version 무결성

### 지표
```sql
max(phaseVersion) - min(phaseVersion) (동일 tournament 기준)
```

### 알람 조건
```
단일 전이에서 phaseVersion이 +2 이상 증가
```

**의미**: 트랜잭션 깨짐 or 이중 커밋

**알람 레벨**: 🚨 Critical

**대응**:
1. `phaseEvents` 로그에서 중복 이벤트 확인
2. 트랜잭션 재시도 로그 확인
3. 동시성 충돌 패턴 분석

---

## 4️⃣ 멱등성 이상 탐지

### A. requestId replay 실패

#### 조건
```
동일 requestId로 2회 이상 호출
AND replay 응답이 아닌 에러 반환
```

**알람 레벨**: ⚠️ Warning

**의미**: `lastPhaseUpdateRequestId` 로직 깨짐

**대응**:
1. `lastPhaseUpdateRequestId` 필드 확인
2. Idempotency 로직 점검
3. 트랜잭션 내 requestId 저장 확인

---

## 5️⃣ Phase Events 기반 감사 알람

### A. 중복 이벤트

#### 조건
```
동일 (fromPhase, toPhase) 이벤트가
1초 이내 2건 이상 생성
```

**알람 레벨**: 🚨 Critical

**의미**: 동시성 제어 붕괴

**대응**:
1. `phaseEvents` 컬렉션에서 중복 확인
2. 트랜잭션 내 이벤트 로그 기록 로직 점검
3. 동시 요청 패턴 분석

---

### B. 이벤트 없는 Phase 변경

#### 조건
```
tournamentPhase 변경됨
AND phaseEvents 최근 5초 내 생성 없음
```

**알람 레벨**: 🚨 Critical

**의미**: 비정상 경로로 DB 직접 수정 or 백도어

**대응**:
1. Firestore 감사 로그 확인
2. 관리자 작업 이력 확인
3. 보안 이벤트 조사

---

## 6️⃣ 에러 코드 비율 감시 (UX 신호)

### 집계 대상
- `NO_APPROVED_TEAMS`
- `PERMISSION_DENIED`
- `INVALID_TRANSITION`

### 알람 조건
```
특정 코드가 10분 내 급증
```

### 의미별 대응

#### NO_APPROVED_TEAMS ↑
- **의미**: 운영 가이드 부족
- **대응**: 관리자 교육 강화, UI 안내 개선

#### PERMISSION_DENIED ↑
- **의미**: 권한 설정 오류
- **대응**: 권한 매트릭스 점검, 관리자 권한 확인

#### INVALID_TRANSITION ↑
- **의미**: UI 상태 불일치
- **대응**: 프론트엔드 상태 동기화 로직 점검

---

## 7️⃣ 최소 운영 대시보드

### 보여줄 것 5개

1. **현재 tournamentPhase**
   - 실시간 Phase 상태
   - Phase 변경 이력

2. **phaseVersion**
   - 현재 버전
   - 증가 추이

3. **approvedCount**
   - 현재 승인 팀 수
   - 변화 추이

4. **최근 phaseEvents**
   - from → to
   - actor (관리자 UID)
   - time (타임스탬프)

5. **최근 phase 전이 에러 코드 Top 3**
   - 에러 코드별 발생 횟수
   - 최근 발생 시각

---

## 8️⃣ 알람 구현 예시 (GCP Logs 기반)

### Cloud Logging 쿼리

#### Phase 전이 에러
```
resource.type="cloud_function"
resource.labels.function_name="updateTournamentPhaseCallable"
severity>=ERROR
timestamp>="2024-01-01T00:00:00Z"
```

#### approvedCount 음수
```
jsonPayload.approvedCount<0
OR
(jsonPayload.approvedCount==0 AND jsonPayload.tournamentPhase>="ROSTER_LOCKED")
```

#### Phase Version 이상
```
jsonPayload.phaseVersionDelta>=2
```

#### 중복 Phase Events
```
jsonPayload.duplicatePhaseEvents=true
```

---

## 9️⃣ 배포 승인 조건 (운영 관점)

### 필수 체크리스트

- [ ] **Stats 기반 승인팀 수 사용 중**
  - 쿼리 대신 Stats 문서 사용 확인

- [ ] **phaseEvents 100% 기록**
  - 모든 Phase 변경에 이벤트 로그 생성 확인

- [ ] **phaseVersion 단조 증가**
  - 감소하거나 건너뛰는 경우 없음

- [ ] **Critical 알람 0**
  - 배포 후 24시간 내 Critical 알람 없음

- [ ] **첫 운영 전이 수동 확인 완료**
  - 실제 운영 환경에서 첫 전이 직접 확인

---

## 🔟 비상 대응 체크리스트

### Critical 알람 발생 시

1. **즉시 확인**
   - GCP Logs에서 에러 메시지 확인
   - `phaseEvents` 최근 이벤트 확인
   - `tournamentPhase` 현재 상태 확인

2. **영향 범위 파악**
   - 영향받은 대회 수
   - 사용자 영향도

3. **복구 조치**
   - Stats 동기화 (필요 시)
   - Phase 수동 복구 (최후의 수단)
   - 롤백 (필요 시)

4. **사후 분석**
   - 근본 원인 분석
   - 재발 방지 대책

---

## 📊 모니터링 대시보드 구성 예시

### Grafana / Data Studio 쿼리

```sql
-- Phase 전이 성공률
SELECT 
  COUNTIF(success = true) as success_count,
  COUNTIF(alreadyInState = true) as already_in_state_count,
  COUNTIF(error IS NOT NULL) as error_count
FROM phase_transitions
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)

-- approvedCount 추이
SELECT 
  tournament_id,
  approvedCount,
  timestamp
FROM tournament_stats
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
ORDER BY timestamp DESC

-- Phase Events 최근 10건
SELECT 
  fromPhase,
  toPhase,
  actorUid,
  createdAt
FROM phaseEvents
ORDER BY createdAt DESC
LIMIT 10
```

---

## 🎯 최종 배포 승인 조건

### 운영 관점 필수 조건

- ✅ Stats 기반 승인팀 수 사용 중
- ✅ phaseEvents 100% 기록
- ✅ phaseVersion 단조 증가
- ✅ Critical 알람 0
- ✅ 첫 운영 전이 수동 확인 완료

**이 조건들을 모두 만족해야 배포 승인 가능**

---

## 📞 연락 체계

### 알람 레벨별 대응

- **🚨 Critical**: 즉시 대응 (온콜 엔지니어)
- **⚠️ Warning**: 1시간 내 확인 (운영팀)
- **ℹ️ Info**: 일일 리포트 (관리자)

---

## 다음 단계

- D) 운영 가이드 문서 (관리자용)
- E) Phase FSM 시각 다이어그램
- F) 비상 롤백 시나리오 & 체크리스트
