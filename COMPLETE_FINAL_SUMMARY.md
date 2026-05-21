# 🔥 최종 완성: 운영 가능한 회비 시스템

## ✅ 완료된 모든 작업

### 1. Feature Flag + 롤백 설계 ✅

**구현:**
- `enableNewFeeSystem`: 신규 로직 ON/OFF
- `allowManualFee`: 수동 완납 허용
- `feeBaseAmount`: 기본 회비 금액 (기본값: 20000)

**롤백:**
- 재배포 불필요
- Firestore에서 `enableNewFeeSystem: false`만 변경

---

### 2. 스케줄 + Lazy-create 병행 ✅

**스케줄 함수 (정석):**
- `createMonthlyFeesJob`: 매월 1일 오전 00:10 자동 실행
- 모든 팀 순회, `enableNewFeeSystem=true`인 팀만 처리

**Lazy-create (보완):**
- `ensureMonthlyFeeCallable`: 화면 접속 시 호출
- 누락/신규팀/테스트에 강함

---

### 3. 이월 로직 완벽 구현 ✅

**핵심 함수:**
- `calcCarryOver()`: 이전 월 미납 금액 계산
- `createMonthlyFeeMembers()`: 회원별 fee 생성 + 이월 반영

**로직:**
```
prevMonth = prevYm(month)
prevFee = teams/{teamId}/fees/{prevMonth}/members/{memberId}

if (prevFee.status !== "paid") {
  carryOverAmount = prevFee.dueAmount - prevFee.paidAmount
}

dueAmount = baseAmount + carryOverAmount
```

---

### 4. 마이그레이션 스크립트 완성 ✅

**파일:** `scripts/backfillFees.ts`

**사용법:**
```bash
# 테스트 모드
npx ts-node scripts/backfillFees.ts --teamId=xxx --months=12 --dryRun

# 실제 마이그레이션
npx ts-node scripts/backfillFees.ts --teamId=xxx --months=12 --dryRun=false
```

**원칙:**
- 기존 데이터 삭제 금지
- 신규 구조에 `method: "import"`로 기록
- 검증 끝나면 프론트 "읽기 전환"

---

### 5. 프론트 미납 계산식 완성 ✅

**파일:** `src/utils/calculateUnpaidMonths.ts`

**함수:**
- `calculateUnpaidMonths()`: 미납 개월 수 계산
- `getFeeStatus()`: 납부 상태 조회
- `getTeamUnpaidStatus()`: 팀 전체 현황

**사용:**
```typescript
import { calculateUnpaidMonths } from "../utils/calculateUnpaidMonths";

const unpaidMonths = await calculateUnpaidMonths(teamId, memberId);
// "미납 0" 또는 "미납 3개월" 표시
```

---

## 📁 생성된 파일 목록

### 서버 (Functions)

1. **`functions/src/feeSystemCore.ts`** - 핵심 로직
   - `ym()`, `prevYm()` - 월 유틸
   - `ensureMonthlyFee()` - 월별 헤더 생성
   - `createMonthlyFeeMembers()` - 회원별 fee 생성 + 이월
   - `ensureFeeMember()` - 단일 회원 fee 생성

2. **`functions/src/feePaymentV2.ts`** - 새 시스템 납부 처리
   - `processFeePaymentCallable` - Feature Flag 기반
   - `ensureMonthlyFeeCallable` - Lazy-create

3. **`functions/src/createMonthlyFeesJob.ts`** - 스케줄 함수
   - `createMonthlyFeesJob` - 매월 1일 00:10 자동 실행

### 마이그레이션

4. **`scripts/backfillFees.ts`** - TypeScript 완성본
   - CLI 인자 파싱
   - Dry-run 모드
   - 배치 처리

### 프론트

5. **`src/utils/calculateUnpaidMonths.ts`** - 미납 계산
   - 새 구조 기준 계산
   - 회원별/팀별 현황 조회

### 문서

6. **`FINAL_ARCHITECTURE.md`** - 최종 아키텍처 문서
7. **`COMPLETE_FINAL_SUMMARY.md`** - 이 문서

---

## 🎯 Firestore 구조 (최종 확정)

### 월 헤더

```
teams/{teamId}/fees/{YYYY-MM}
  month: "2025-12"
  baseAmount: 20000
  status: "open" | "closed"
  createdAt: timestamp
  updatedAt: timestamp
```

### 회원 납부 상태

```
teams/{teamId}/fees/{YYYY-MM}/members/{memberId}
  memberId: string
  memberName: string
  baseAmount: number
  carryOverAmount: number
  dueAmount: number (= base + carryOver)
  paidAmount: number
  status: "unpaid" | "paid" | "partial"
  paidAt?: timestamp
  method?: "manual" | "import" | "auto"
  processedBy?: string (uid)
  createdAt: timestamp
  updatedAt: timestamp
```

---

## 🚀 배포 순서

### 1. Functions 배포

```bash
cd functions
npm run build
firebase deploy --only functions
```

### 2. Feature Flag 설정

```bash
# 테스트 팀 1개만 활성화
firebase firestore:set teams/{testTeamId} '{
  "enableNewFeeSystem": true,
  "allowManualFee": true,
  "feeBaseAmount": 20000
}' --merge
```

### 3. 테스트

- 수동 완납 테스트
- Lazy-create 테스트
- 이월 테스트

### 4. 마이그레이션 (선택)

```bash
# 테스트 모드
npx ts-node scripts/backfillFees.ts --teamId=xxx --months=12 --dryRun

# 실제 마이그레이션
npx ts-node scripts/backfillFees.ts --teamId=xxx --months=12 --dryRun=false
```

### 5. 단계적 확장

- 1개 팀 → 3개 팀 → 10개 팀 → 모든 팀

---

## 🔄 롤백 절차

### 즉시 롤백 (재배포 불필요)

```bash
firebase firestore:set teams/{teamId} '{"enableNewFeeSystem": false}' --merge
```

**결과:**
- 즉시 레거시 시스템으로 전환
- 새 구조 데이터는 남아있지만 무시됨
- 기존 기능 정상 작동

---

## 📊 미납 계산 (프론트)

### 회원별 미납 개월 수

```typescript
// 최근 12개월 fee 조회
// 최근 월부터 역순으로 확인
// status !== "paid" 또는 paidAmount < dueAmount → 미납 카운트
// status === "paid" && paidAmount >= dueAmount → 중단 (연속 미납만 카운트)
```

### 회원관리 화면 표시

```typescript
const unpaidMonths = await calculateUnpaidMonths(teamId, memberId);
// "미납 0" 또는 "미납 3개월" 표시
```

---

## ✅ 완성!

**모든 코드가 복붙 가능한 최종 뼈대로 완성되었습니다!**

- ✅ 스케줄 + Lazy-create 병행
- ✅ Feature Flag 기반 롤백
- ✅ 이월 로직 완벽 구현
- ✅ 마이그레이션 스크립트 완성
- ✅ 프론트 미납 계산식 완성
- ✅ 빌드 성공 확인

**이제 배포만 하면 됩니다!** 🚀

---

**마지막 업데이트:** 2025-12-17

