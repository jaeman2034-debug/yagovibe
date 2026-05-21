# 🚀 프로덕션 배포 플랜 (최종 완성본)

## 📋 배포 전 체크리스트

### 1️⃣ 코드 준비

- [x] Feature Flag 구현 (`allowManualFee`, `enableNewFeeSystem`)
- [x] 수동 완납 서버 코드 (`processFeePaymentCallable`)
- [x] 스케줄 함수 (`createMonthlyFeesJob`)
- [x] Lazy-create 함수 (`ensureMonthlyFeeCallable`)
- [x] 이월 로직 (계산형)
- [x] 마이그레이션 스크립트 (`backfillFeesFinal.ts`)
- [x] 프론트 미납 계산식 (`calculateUnpaidMonthsFinal.ts`)
- [ ] Functions 빌드 테스트
- [ ] 로컬 테스트

### 2️⃣ 데이터베이스 준비

- [ ] Firestore 보안 규칙 업데이트
- [ ] 기존 데이터 백업
- [ ] 마이그레이션 스크립트 테스트 (dryRun=true)

### 3️⃣ Feature Flag 설정

- [ ] 모든 팀의 `enableNewFeeSystem`: 기본값 `false`
- [ ] 모든 팀의 `allowManualFee`: 기본값 `false` (필요한 팀만 `true`)
- [ ] 모든 팀의 `feeBaseAmount`: 기본값 `20000` (필요시 설정)

---

## 🎯 배포 순서 (단계별 안전 배포)

### Phase 0: "읽기/쓰기 게이트" 코드 먼저 배포

**목표:** 코드 배포 후에도 아무 팀도 영향 없음

```bash
cd functions
npm run build
firebase deploy --only functions
```

**확인 사항:**
- [ ] 배포 성공
- [ ] Functions 로그 확인
- [ ] 기존 기능 정상 작동 확인 (레거시 시스템)

**Feature Flag 상태:**
- 모든 팀: `enableNewFeeSystem: false` (기본값)
- 모든 팀: `allowManualFee: false` (기본값)

---

### Phase 1: allowManualFee만 ON (수동 완납만 파일럿)

**목표:** "수동 완납 callable"이 안전하게 동작하는지 확인

**Feature Flag 설정:**
```bash
# 테스트 팀 1개만
firebase firestore:set teams/{testTeamId} '{
  "allowManualFee": true,
  "enableNewFeeSystem": false
}' --merge
```

**테스트 케이스:**
1. 회비 상세 페이지 접속
2. 미납 회원 선택
3. "납부 완료(수동)" 버튼 클릭
4. 확인 모달 → 확인

**예상 결과:**
- ✅ 레거시 시스템으로 납부 처리
- ✅ UI가 "완납 ✔"으로 변경
- ✅ 에러 없음

**확인 사항:**
- [ ] 수동 완납 정상 작동
- [ ] UI 즉시 반영
- [ ] Functions 로그 확인
- [ ] Firestore 데이터 확인

---

### Phase 2: enableNewFeeSystem 파일럿 ON

**목표:** 신 시스템 안정성 확인

**Feature Flag 설정:**
```bash
# 동일 테스트 팀에
firebase firestore:set teams/{testTeamId} '{
  "allowManualFee": true,
  "enableNewFeeSystem": true,
  "feeBaseAmount": 20000
}' --merge
```

**테스트 케이스:**

#### 2-1. Lazy-create 테스트
1. 회비 상세 페이지 접속 (해당 월 fee 없을 때)
2. `ensureMonthlyFeeCallable` 자동 호출

**예상 결과:**
- ✅ 월별 헤더 생성 (`teams/{teamId}/fees/{YYYY-MM}`)
- ✅ 회원별 fee 항목 생성 (`payments/{memberId}`)
- ✅ 이월 금액 계산 (`carryOverAmount`)

#### 2-2. 수동 완납 테스트 (신 시스템)
1. 미납 회원 선택
2. "납부 완료(수동)" 버튼 클릭
3. 확인 모달 → 확인

**예상 결과:**
- ✅ 신 구조로 fee 저장 (`payments/{memberId}`)
- ✅ `status: "paid"`, `paidAmount` 업데이트
- ✅ Audit 로그 생성

#### 2-3. 이월 테스트
1. 이전 월에 미납 회원 생성
2. 현재 월 fee 생성 (Lazy-create)
3. 이월 금액 확인

**예상 결과:**
- ✅ `carryOverAmount` 정확히 계산
- ✅ `dueAmount = baseAmount + carryOverAmount`

**확인 사항:**
- [ ] Lazy-create 정상 작동
- [ ] 수동 완납 정상 작동 (신 시스템)
- [ ] 이월 금액 정확성
- [ ] Functions 로그 확인
- [ ] Firestore 데이터 확인

**주의:**
- 스케줄 함수는 아직 활성화하지 않음
- Lazy-create만 먼저 운영
- 안정성 확인 후 스케줄 활성화

---

### Phase 3: 스케줄 함수 활성화

**목표:** 운영 자동화

**확인 사항:**
- [ ] Phase 2 테스트 모두 통과
- [ ] 24시간 이상 안정 운영
- [ ] 에러 로그 없음

**스케줄 함수:**
- 이미 배포되어 있음
- `enableNewFeeSystem=true`인 팀만 자동 처리
- 매월 1일 00:10 자동 실행

**모니터링:**
- [ ] 첫 실행 로그 확인
- [ ] 모든 팀 정상 처리 확인
- [ ] 에러 없음 확인

---

### Phase 4: 마이그레이션 (생성만)

**목표:** 기존 데이터를 신 구조로 이전

**사전 준비:**
- [ ] Phase 2, 3 모두 통과
- [ ] 마이그레이션 스크립트 테스트 (dryRun=true)

**실행:**
```bash
# 테스트 모드
npx ts-node scripts/backfillFeesFinal.ts --teamId={testTeamId} --months=12 --dryRun

# 실제 마이그레이션
npx ts-node scripts/backfillFeesFinal.ts --teamId={testTeamId} --months=12 --dryRun=false
```

**확인 사항:**
- [ ] 마이그레이션 완료
- [ ] 신 구조로 데이터 생성 확인
- [ ] 레거시 데이터 변경 없음 확인
- [ ] 프론트에서 정상 표시 확인

**단계적 확대:**
1. 파일럿 팀 1개 → 3개
2. 3개 → 10개
3. 10개 → 모든 팀

---

### Phase 5: 프론트 "읽기 전환"

**목표:** 프론트가 신 구조 기준으로 표시

**변경 사항:**
- 회원관리 화면: `calculateUnpaidMonths()` 사용
- 회비 상세 화면: `getFeeStatus()` 사용
- 미납 카운트: 신 구조 기준으로 계산

**확인 사항:**
- [ ] 회원관리 화면 미납 카운트 정확
- [ ] 회비 상세 화면 정상 표시
- [ ] 이월 금액 정상 표시

---

## 🔄 롤백 절차

### 시나리오 1: Phase 1 실패 (수동 완납 문제)

**즉시 롤백:**
```bash
firebase firestore:set teams/{testTeamId} '{"allowManualFee": false}' --merge
```

**결과:**
- 즉시 레거시 시스템으로 전환
- 기존 기능 정상 작동

---

### 시나리오 2: Phase 2 실패 (신 시스템 문제)

**즉시 롤백:**
```bash
firebase firestore:set teams/{testTeamId} '{"enableNewFeeSystem": false}' --merge
```

**결과:**
- 즉시 레거시 시스템으로 전환
- 새 구조 데이터는 남아있지만 무시됨
- 기존 기능 정상 작동

---

### 시나리오 3: 스케줄 함수 문제

**롤백:**
```bash
# 모든 팀의 enableNewFeeSystem을 false로
firebase firestore:set teams/{teamId} '{"enableNewFeeSystem": false}' --merge
```

**또는:**
- Firebase Console → Cloud Scheduler → `createMonthlyFeesJob` 비활성화

---

### 시나리오 4: 마이그레이션 문제

**롤백:**
- 마이그레이션은 "생성만" 하므로 데이터 삭제 불필요
- `enableNewFeeSystem: false`로 전환
- 프론트가 레거시 구조로 읽기 전환

---

## 📊 모니터링

### 배포 후 확인 사항

#### 1. Functions 로그

```bash
firebase functions:log --only processFeePaymentCallable
firebase functions:log --only createMonthlyFeesJob
firebase functions:log --only ensureMonthlyFeeCallable
```

#### 2. Firestore 데이터 확인

- [ ] 신 구조로 fee 생성 확인
- [ ] 이월 금액 정확성 확인
- [ ] Audit 로그 생성 확인

#### 3. 프론트 동작 확인

- [ ] 회비 상세 페이지 정상 표시
- [ ] 수동 완납 버튼 정상 작동
- [ ] Lazy-create 정상 작동
- [ ] 미납 카운트 정확

---

## 🎯 성공 기준

### 완전 성공

1. ✅ 모든 Functions 정상 배포
2. ✅ Feature Flag 정상 작동
3. ✅ Phase 1-5 모두 통과
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

- [ ] Phase 0: Functions 배포
- [ ] Phase 1: allowManualFee만 ON
- [ ] Phase 2: enableNewFeeSystem ON
- [ ] Phase 3: 스케줄 활성화
- [ ] Phase 4: 마이그레이션
- [ ] Phase 5: 프론트 전환

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
   allowManualFee: false
   ```

2. **Functions 로그 확인**
   ```bash
   firebase functions:log
   ```

3. **데이터 확인**
   - Firestore Console에서 신 구조 데이터 확인
   - 문제 발견 시 레거시 시스템으로 전환

---

## 💡 권장 사항

1. **단계적 확장**
   - 파일럿 팀 1개 → 3개 → 10개 → 모든 팀

2. **모니터링 강화**
   - 각 Phase마다 24시간 모니터링
   - 에러 로그 실시간 확인

3. **롤백 준비**
   - Feature Flag로 즉시 롤백 가능
   - 재배포 불필요

---

**마지막 업데이트:** 2025-12-17

