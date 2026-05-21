# 🔥 최종 아키텍처 확정 (복붙 가능한 뼈대)

## ✅ 확정 사항

### 1. 두 가지 모두 구현 ✅

- **스케줄 자동 생성 (정석)**: 매월 1일 00:10(KST) 자동 실행
- **Lazy-create 보조 (안전망)**: 화면 접속 시 자동 생성

### 2. Feature Flag 기반 롤백 ✅

```
teams/{teamId}
  allowManualFee: true (수동 완납 허용)
  enableNewFeeSystem: true/false (신규 로직 ON/OFF)
  feeBaseAmount: number (기본 회비 금액, 없으면 20000 fallback)
```

**롤백 방법:**
- `enableNewFeeSystem: false` 한 방이면 끝
- 재배포 불필요

### 3. Firestore 구조 확정 ✅

**월 헤더:**
```
teams/{teamId}/fees/{YYYY-MM}
  month, baseAmount, createdAt, status: open|closed
```

**회원 납부 상태:**
```
teams/{teamId}/fees/{YYYY-MM}/members/{memberId}
  baseAmount
  carryOverAmount
  dueAmount (= base + carryOver)
  paidAmount
  status: unpaid|paid|partial
  paidAt?
  method?: manual|import|auto
  processedBy?: uid
```

---

## 📁 생성된 파일

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
   - `--teamId=xxx` - 특정 팀만
   - `--months=12` - 과거 N개월
   - `--dryRun` - 테스트 모드

### 프론트

5. **`src/utils/calculateUnpaidMonths.ts`** - 미납 계산
   - `calculateUnpaidMonths()` - 미납 개월 수
   - `getFeeStatus()` - 납부 상태 조회
   - `getTeamUnpaidStatus()` - 팀 전체 현황

---

## 🚀 사용법

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

### 3. 마이그레이션 실행

```bash
# 테스트 모드
npx ts-node scripts/backfillFees.ts --teamId=xxx --months=12 --dryRun

# 실제 마이그레이션
npx ts-node scripts/backfillFees.ts --teamId=xxx --months=12 --dryRun=false
```

### 4. 프론트에서 미납 계산

```typescript
import { calculateUnpaidMonths } from "../utils/calculateUnpaidMonths";

const unpaidMonths = await calculateUnpaidMonths(teamId, memberId);
console.log(`미납: ${unpaidMonths}개월`);
```

---

## 🎯 핵심 로직

### 월별 회비 생성 플로우

1. **스케줄 함수** (매월 1일 00:10)
   ```
   createMonthlyFeesJob()
   → 모든 팀 순회
   → enableNewFeeSystem=true인 팀만
   → ensureMonthlyFee() (월별 헤더)
   → createMonthlyFeeMembers() (회원별 fee + 이월)
   ```

2. **Lazy-create** (화면 접속 시)
   ```
   ensureMonthlyFeeCallable()
   → enableNewFeeSystem 체크
   → ensureMonthlyFee() (월별 헤더)
   → createMonthlyFeeMembers() (회원별 fee + 이월)
   ```

### 납부 처리 플로우

```
processFeePaymentCallable()
→ enableNewFeeSystem 체크
→ allowManualFee 체크 (수동 완납 시)
→ ensureMonthlyFee() (월별 헤더)
→ ensureFeeMember() (회원 fee 문서)
→ paidAmount = dueAmount, status = "paid"
→ Audit 로그 생성
```

### 이월 계산 로직

```
prevMonth = prevYm(month)
prevFee = teams/{teamId}/fees/{prevMonth}/members/{memberId}

if (prevFee.status !== "paid") {
  carryOverAmount = prevFee.dueAmount - prevFee.paidAmount
}

dueAmount = baseAmount + carryOverAmount
```

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

## 🔄 롤백 절차

### 즉시 롤백 (재배포 불필요)

```bash
# Firestore에서만 변경
firebase firestore:set teams/{teamId} '{"enableNewFeeSystem": false}' --merge
```

**결과:**
- 즉시 레거시 시스템으로 전환
- 새 구조 데이터는 남아있지만 무시됨
- 기존 기능 정상 작동

---

## ✅ 완성!

**모든 코드가 복붙 가능한 최종 뼈대로 완성되었습니다!**

- ✅ 스케줄 + Lazy-create 병행
- ✅ Feature Flag 기반 롤백
- ✅ 이월 로직 완벽 구현
- ✅ 마이그레이션 스크립트 완성
- ✅ 프론트 미납 계산식 완성

**이제 배포만 하면 됩니다!** 🚀

---

**마지막 업데이트:** 2025-12-17

