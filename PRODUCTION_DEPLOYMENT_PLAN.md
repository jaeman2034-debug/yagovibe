# 🚀 프로덕션 배포 플랜 (Feature Flag + 롤백)

## 📋 배포 전 체크리스트

### 1️⃣ 코드 준비

- [x] Feature Flag 구현 (`enableNewFeeSystem`)
- [x] 스케줄 함수 구현 (`generateMonthlyFees`)
- [x] Lazy-create 함수 구현 (`ensureMonthlyFeeCallable`)
- [x] 이월 로직 구현 (`calcCarryOver`)
- [x] 마이그레이션 스크립트 (`scripts/backfillFees.js`)
- [ ] Functions 빌드 테스트
- [ ] 로컬 테스트

### 2️⃣ 데이터베이스 준비

- [ ] Firestore 보안 규칙 업데이트
- [ ] 기존 데이터 백업
- [ ] 마이그레이션 스크립트 테스트 (dryRun=true)

### 3️⃣ Feature Flag 설정

- [ ] 모든 팀의 `enableNewFeeSystem` 기본값: `false`
- [ ] 테스트 팀 1개의 `enableNewFeeSystem`: `true`

---

## 🎯 배포 순서 (안전 + 롤백 가능)

### STEP 1: Functions 배포 (Feature Flag 기본값: false)

```bash
# 모든 Functions 배포
cd functions
npm run build
firebase deploy --only functions
```

**확인 사항:**
- [ ] 배포 성공
- [ ] Functions 로그 확인
- [ ] 기존 기능 정상 작동 확인 (레거시 시스템)

---

### STEP 2: 테스트 팀 1개만 새 시스템 활성화

**Firebase Console → Firestore:**

```
teams/{testTeamId}
  enableNewFeeSystem: true  ← 이 값만 true로 설정
```

**또는 CLI:**

```bash
firebase firestore:set teams/{testTeamId} '{"enableNewFeeSystem": true}' --merge
```

**확인 사항:**
- [ ] 테스트 팀만 새 시스템 사용
- [ ] 다른 팀은 레거시 시스템 유지

---

### STEP 3: 테스트 케이스 실행

#### 3-1. 수동 완납 테스트

1. 테스트 팀의 회비 상세 페이지 접속
2. 미납 회원 선택
3. "납부 완료(수동)" 버튼 클릭
4. 확인 모달 → 확인

**예상 결과:**
- ✅ 새 구조로 fee 저장 (`teams/{teamId}/fees/{YYYY-MM}/members/{memberId}`)
- ✅ `status: "paid"`, `paidAmount` 업데이트
- ✅ Audit 로그 생성

#### 3-2. Lazy-create 테스트

1. 테스트 팀의 회비 상세 페이지 접속 (해당 월 fee 없을 때)
2. `ensureMonthlyFeeCallable` 자동 호출

**예상 결과:**
- ✅ 월별 헤더 생성 (`teams/{teamId}/fees/{YYYY-MM}`)
- ✅ 회원별 fee 항목 생성 (`members/{memberId}`)
- ✅ 이월 금액 계산 (`carryOverAmount`)

#### 3-3. 이월 테스트

1. 이전 월에 미납 회원 생성
2. 현재 월 fee 생성 (Lazy-create 또는 스케줄)
3. 이월 금액 확인

**예상 결과:**
- ✅ `carryOverAmount` 정확히 계산
- ✅ `dueAmount = baseAmount + carryOverAmount`

---

### STEP 4: 문제 발생 시 롤백

**즉시 롤백 (재배포 불필요):**

```
teams/{testTeamId}
  enableNewFeeSystem: false  ← 이 값만 false로 변경
```

**확인 사항:**
- [ ] 즉시 레거시 시스템으로 전환
- [ ] 기존 기능 정상 작동

---

### STEP 5: 모든 팀 활성화 (테스트 성공 후)

**주의:** 단계적으로 확장

1. **1단계:** 테스트 팀 1개 → 3개
2. **2단계:** 3개 → 10개
3. **3단계:** 10개 → 모든 팀

**각 단계마다:**
- [ ] 24시간 모니터링
- [ ] 에러 로그 확인
- [ ] 사용자 피드백 수집

---

## 🔄 롤백 절차

### 시나리오 1: Functions 배포 실패

```bash
# 이전 버전으로 롤백
firebase functions:rollback --only processFeePaymentCallable
```

### 시나리오 2: 새 시스템 문제 발생

**즉시 롤백 (Feature Flag):**

```
teams/{teamId}
  enableNewFeeSystem: false
```

**재배포 불필요** - 즉시 레거시 시스템으로 전환

### 시나리오 3: 데이터 문제

- 기존 데이터는 건드리지 않음 (읽기 전용)
- 새 구조에만 데이터 추가
- 문제 발생 시 새 구조 데이터 무시하고 레거시 사용

---

## 📊 모니터링

### 배포 후 확인 사항

#### 1. Functions 로그

```bash
firebase functions:log --only processFeePaymentCallable
firebase functions:log --only generateMonthlyFees
firebase functions:log --only ensureMonthlyFeeCallable
```

#### 2. Firestore 데이터 확인

- [ ] 새 구조로 fee 생성 확인
- [ ] 이월 금액 정확성 확인
- [ ] Audit 로그 생성 확인

#### 3. 프론트 동작 확인

- [ ] 회비 상세 페이지 정상 표시
- [ ] 수동 완납 버튼 정상 작동
- [ ] Lazy-create 정상 작동

---

## 🎯 성공 기준

### 완전 성공

1. ✅ 모든 Functions 정상 배포
2. ✅ Feature Flag 정상 작동
3. ✅ 테스트 케이스 모두 통과
4. ✅ 롤백 테스트 성공
5. ✅ 에러 없음

### 부분 성공 (문제 있음)

1. ✅ Functions 배포 성공
2. ⚠️ 일부 기능 문제
3. ✅ Feature Flag로 즉시 롤백 가능

---

## 📝 배포 체크리스트 요약

### 배포 전

- [ ] 코드 검증 완료
- [ ] 로컬 테스트 완료
- [ ] 데이터 백업 완료
- [ ] Feature Flag 기본값: `false`

### 배포 중

- [ ] Functions 배포
- [ ] 테스트 팀 1개만 활성화
- [ ] 테스트 케이스 실행

### 배포 후

- [ ] 프로덕션 테스트
- [ ] 모니터링 설정
- [ ] 사용자 피드백 수집

---

## 🚨 비상 대응

### 문제 발생 시 즉시 조치

1. **Feature Flag 롤백**
   ```
   enableNewFeeSystem: false
   ```

2. **Functions 로그 확인**
   ```bash
   firebase functions:log
   ```

3. **데이터 확인**
   - Firestore Console에서 새 구조 데이터 확인
   - 문제 발견 시 레거시 시스템으로 전환

---

## 💡 권장 사항

1. **단계적 확장**
   - 테스트 팀 1개 → 3개 → 10개 → 모든 팀

2. **모니터링 강화**
   - 각 단계마다 24시간 모니터링
   - 에러 로그 실시간 확인

3. **롤백 준비**
   - Feature Flag로 즉시 롤백 가능
   - 재배포 불필요

---

**마지막 업데이트:** 2025-12-17

