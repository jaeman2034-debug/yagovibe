# 참가비 단일 소스 구조 (Single Source of Truth)

## 🎯 핵심 원칙

**참가비는 DB에 '계산된 값'을 저장하지 않는다.**
**항상 `teamCount` + `feePolicySnapshot` → 계산 함수로 화면에서 계산한다.**

## 1️⃣ 공통 계산 함수 (단일 소스)

### 위치
`src/lib/notice/feeCalc.ts`

### 함수
```typescript
export function calcEntryFee(
  teamCount: number,
  feePolicy: FeePolicy
): FeeCalculationResult
```

### 사용 규칙
- **모든 화면에서 이 함수만 사용**
- `feePolicySnapshot`이 있으면 항상 재계산
- `feeCalc.totalFee`는 fallback으로만 사용

## 2️⃣ 적용된 화면 목록

### ✅ 완료된 화면

1. **ApplicationTable** (테이블 뷰)
   - `feePolicySnapshot` 우선 재계산
   - `feeCalc.totalFee` fallback

2. **ApplicationAdminList** (카드 뷰)
   - `feePolicySnapshot` 우선 재계산
   - `feeCalc.totalFee` fallback

3. **ApplicationList** (일반 목록)
   - `feePolicySnapshot` 우선 재계산
   - `feeCalc.totalFee` fallback

4. **ApplicationApprovalModal** (승인 모달)
   - `feePolicySnapshot` 우선 재계산
   - 계산식 표시 포함
   - `feeCalc.totalFee` fallback

5. **UnpaidList** (미납 목록)
   - `feePolicySnapshot` 우선 재계산
   - `feeCalc.totalFee` fallback

### ⚠️ 특수 케이스 (서버 검증 필요)

6. **PaymentButton** (결제 버튼)
   - `feeCalc.totalFee` 사용 (서버에서 검증)
   - 결제는 Cloud Function에서 재검증하므로 안전

7. **ReceiptButton** (영수증 발급)
   - `feeCalc.totalFee` 사용 (서버에서 계산된 값)
   - 영수증은 실제 납부 금액 기준이므로 저장된 값 사용

## 3️⃣ 재계산 로직 패턴

### 표준 패턴 (모든 화면 공통)

```typescript
// 🔥 참가비 재계산 (feePolicySnapshot이 있으면 항상 재계산 - 단일 소스 보장)
const displayFee = (() => {
  // 1. feePolicySnapshot이 있으면 항상 재계산 (우선순위 1)
  if (app.feePolicySnapshot && app.teamCount) {
    const feeCalc = calcEntryFee(app.teamCount, app.feePolicySnapshot);
    return feeCalc.total;
  }
  // 2. feeCalc.totalFee가 있으면 사용 (우선순위 2 - fallback)
  if (app.feeCalc?.totalFee) {
    return app.feeCalc.totalFee;
  }
  return null;
})();
```

## 4️⃣ DB 구조 권장사항

### ✅ 권장 구조
```typescript
applications {
  teamCount: 3,
  feePolicySnapshot: {
    baseFee: 200000,
    baseTeamCount: 2,
    extraFeePerTeam: 100000
  },
  feeCalc: {
    totalFee: 300000,  // 계산된 값 (참고용, 화면에서는 재계산)
    extraTeams: 1,
    calculatedAt: Timestamp
  }
}
```

### ❌ 피해야 할 구조
```typescript
applications {
  teamCount: 3,
  fee: 200000  // ❌ 이렇게 저장하면 teamCount 변경 시 불일치 발생
}
```

## 5️⃣ 결제 연동 대비

### 결제 금액 검증
- Cloud Function에서 `feePolicySnapshot` 기반 재계산
- 클라이언트에서 전달한 금액과 서버 계산값 비교
- 불일치 시 결제 거부

### 예시 (Cloud Function)
```typescript
// functions/src/tournament/createPaymentRequest.ts
const feeCalc = calcEntryFee(application.teamCount, application.feePolicySnapshot);
if (requestedAmount !== feeCalc.total) {
  throw new HttpsError("invalid-argument", "금액 불일치");
}
```

## 6️⃣ 장점

1. **데이터 일관성 보장**
   - `teamCount` 변경 시 자동 반영
   - 저장된 값과 불일치 방지

2. **정책 변경 대응**
   - `feePolicySnapshot`만 업데이트하면 모든 화면 반영

3. **디버깅 용이**
   - 계산 로직이 한 곳에 집중
   - 버그 추적 쉬움

4. **결제 안전성**
   - 서버에서 항상 재검증 가능
   - 클라이언트 조작 방지

## 7️⃣ 체크리스트

- [x] `calcEntryFee` 함수 단일 소스화
- [x] ApplicationTable 재계산 적용
- [x] ApplicationAdminList 재계산 적용
- [x] ApplicationList 재계산 적용
- [x] ApplicationApprovalModal 재계산 적용
- [x] UnpaidList 재계산 적용
- [ ] PaymentButton 검증 (서버 재검증 확인)
- [ ] ReceiptButton 검증 (서버 재검증 확인)
- [ ] 모든 화면에서 `feePolicySnapshot` 우선 사용 확인

## 🔥 최종 결론

**"참가비는 계산 함수가 진실이다."**

DB에 저장된 값은 참고용일 뿐, 화면에서는 항상 재계산한다.
