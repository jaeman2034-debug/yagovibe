# 🚀 프로덕션 롤백 가능한 배포 플랜

## 📋 배포 전 체크리스트

### 1️⃣ 코드 검증

- [ ] `feePayment.ts` 최종 정리 완료
- [ ] `monthlyFeeAutoGeneration.ts` 구현 완료
- [ ] `migrateFeeData.ts` 구현 완료
- [ ] 모든 Functions 타입 체크 통과 (`npm run build`)
- [ ] 로컬 테스트 완료

### 2️⃣ 데이터베이스 준비

- [ ] Firestore 보안 규칙 업데이트
- [ ] 기존 데이터 백업 완료
- [ ] 마이그레이션 스크립트 테스트 완료 (dryRun=true)

### 3️⃣ 환경 변수 확인

- [ ] `.env` 파일 확인
- [ ] Firebase 프로젝트 설정 확인
- [ ] Functions region 설정 확인 (`asia-northeast3`)

---

## 🎯 배포 단계

### STEP 1: Functions 배포 (단계별)

#### 1-1. 수동 완납 함수만 먼저 배포

```bash
# 수동 완납 함수만 배포 (기존 코드 정리 버전)
firebase deploy --only functions:processFeePaymentCallable
```

**확인 사항:**
- [ ] 배포 성공
- [ ] Functions 로그 확인
- [ ] 실제 테스트 (프론트에서 버튼 클릭)

#### 1-2. 월별 회비 자동 생성 함수 배포

```bash
# 월별 회비 자동 생성 함수 배포
firebase deploy --only functions:generateMonthlyFees
```

**확인 사항:**
- [ ] 배포 성공
- [ ] Scheduler 설정 확인 (Firebase Console)
- [ ] 수동 실행 테스트

#### 1-3. 마이그레이션 함수 배포

```bash
# 마이그레이션 함수 배포
firebase deploy --only functions:migrateFeeData,functions:checkMigrationStatus
```

**확인 사항:**
- [ ] 배포 성공
- [ ] dryRun=true로 테스트
- [ ] 결과 확인

---

### STEP 2: 데이터 마이그레이션

#### 2-1. 마이그레이션 테스트 (dryRun=true)

```bash
# 프론트에서 또는 Functions 콘솔에서 호출
# dryRun: true
```

**확인 사항:**
- [ ] 마이그레이션 대상 데이터 확인
- [ ] 에러 없음
- [ ] 결과 로그 확인

#### 2-2. 실제 마이그레이션 (dryRun=false)

```bash
# 프론트에서 또는 Functions 콘솔에서 호출
# dryRun: false
```

**확인 사항:**
- [ ] 마이그레이션 완료
- [ ] 새 구조로 데이터 확인
- [ ] 기존 데이터 백업 확인

---

### STEP 3: 프론트엔드 배포

#### 3-1. 프론트 빌드 및 배포

```bash
# 프론트 빌드
npm run build

# 배포 (Vercel 또는 Firebase Hosting)
vercel deploy --prod
# 또는
firebase deploy --only hosting
```

**확인 사항:**
- [ ] 빌드 성공
- [ ] 배포 성공
- [ ] 프로덕션 환경에서 테스트

---

## 🔄 롤백 절차

### 롤백 시나리오 1: Functions 배포 실패

#### 1-1. 이전 버전으로 롤백

```bash
# 이전 Functions 버전 확인
firebase functions:list

# 특정 버전으로 롤백
firebase functions:rollback --only processFeePaymentCallable
```

#### 1-2. 수동 롤백 (필요시)

```bash
# 이전 코드로 복원
git checkout <previous-commit>
firebase deploy --only functions:processFeePaymentCallable
```

---

### 롤백 시나리오 2: 데이터 마이그레이션 실패

#### 2-1. 마이그레이션 롤백

```bash
# 마이그레이션 함수에서 rollback 기능 사용 (구현 필요)
# 또는 수동으로 기존 데이터 복원
```

#### 2-2. Firestore 백업 복원

```bash
# Firebase Console → Firestore → 백업 복원
# 또는 gcloud 명령어 사용
```

---

### 롤백 시나리오 3: 프론트 배포 실패

#### 3-1. Vercel 롤백

```bash
# Vercel Dashboard → Deployments → 이전 버전으로 롤백
```

#### 3-2. Firebase Hosting 롤백

```bash
# Firebase Console → Hosting → 이전 버전으로 롤백
```

---

## 📊 모니터링 및 검증

### 배포 후 확인 사항

#### 1. Functions 로그 확인

```bash
# 실시간 로그 확인
firebase functions:log --only processFeePaymentCallable

# 또는 Firebase Console → Functions → Logs
```

#### 2. Firestore 데이터 확인

- [ ] 새 구조로 데이터 생성 확인
- [ ] 기존 데이터 정상 작동 확인
- [ ] 마이그레이션 데이터 확인

#### 3. 프론트 동작 확인

- [ ] 회비 상세 페이지 정상 표시
- [ ] 수동 완납 버튼 정상 작동
- [ ] 에러 없음

---

## 🚨 비상 대응

### 문제 발생 시 즉시 조치

1. **Functions 에러**
   - Functions 로그 확인
   - 이전 버전으로 롤백
   - 문제 원인 파악

2. **데이터 손실**
   - Firestore 백업 복원
   - 마이그레이션 롤백
   - 데이터 복구

3. **프론트 에러**
   - 이전 버전으로 롤백
   - 브라우저 캐시 클리어
   - 문제 원인 파악

---

## 📝 배포 체크리스트 요약

### 배포 전

- [ ] 코드 검증 완료
- [ ] 로컬 테스트 완료
- [ ] 데이터 백업 완료
- [ ] 마이그레이션 테스트 완료

### 배포 중

- [ ] Functions 단계별 배포
- [ ] 각 단계별 테스트
- [ ] 로그 확인

### 배포 후

- [ ] 프로덕션 테스트
- [ ] 모니터링 설정
- [ ] 사용자 피드백 수집

---

## 🎯 성공 기준

✅ **배포 성공 기준:**

1. ✅ 모든 Functions 정상 배포
2. ✅ 데이터 마이그레이션 완료
3. ✅ 프론트 정상 작동
4. ✅ 실제 사용자 테스트 통과
5. ✅ 에러 없음

---

## 📞 연락처

문제 발생 시:
- Functions 로그: Firebase Console
- 데이터 문제: Firestore Console
- 프론트 문제: Vercel/Firebase Hosting Console

---

**마지막 업데이트:** 2025-12-17

