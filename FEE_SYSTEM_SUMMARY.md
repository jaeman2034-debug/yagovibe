# 💰 회비 시스템 최종 정리

## 📋 개요

회비 시스템의 모든 구성 요소를 정리한 문서입니다.

---

## 🏗️ 시스템 구조

### Firestore 데이터 구조

#### 새 구조 (권장)

```
teams/{teamId}/
  ├── fees/
  │   ├── {YYYY-MM}/              # 월별 fee 문서
  │   │   ├── month: string
  │   │   ├── teamId: string
  │   │   ├── totalMembers: number
  │   │   ├── totalAmount: number
  │   │   └── items/              # 회원별 fee 항목
  │   │       └── {memberId}/
  │   │           ├── teamId: string
  │   │           ├── memberId: string
  │   │           ├── memberName: string
  │   │           ├── month: string (YYYY-MM)
  │   │           ├── amount: number
  │   │           ├── paid: boolean
  │   │           ├── paidAt: timestamp
  │   │           ├── processedBy: string (UID)
  │   │           └── createdAt: timestamp
  │   └── ...
  └── members/
      └── {memberId}/
          ├── name: string
          ├── status: string (active/inactive)
          ├── monthlyFee: number
          ├── unpaidMonths: number
          └── feePlan: string (exempt/normal)
```

#### 기존 구조 (마이그레이션 대상)

```
teams/{teamId}/
  └── fees/
      └── {memberId}_{YYYY-MM}/   # 예: member1_2025-12
          ├── paid: boolean
          ├── amount: number
          └── ...
```

---

## 🔧 주요 함수

### 1. 수동 완납 처리

**파일:** `functions/src/feePayment.ts`

#### `processFeePaymentCallable`

- **타입:** HTTP Callable Function
- **용도:** 관리자가 "납부 완료" 버튼 클릭 시 실행
- **권한:** 
  - Pro 플랜: 항상 허용
  - Free 플랜: `allowManualFee === true` 일 때만 허용
- **처리 내용:**
  1. 팀 정보 조회 및 권한 확인
  2. 회원 정보 조회
  3. fee 문서 생성/업데이트 (트랜잭션)
  4. audit 로그 생성
  5. 미납 개월 수 재계산
  6. 회원 상태 자동 전환

**호출 예시:**
```typescript
const processFeePayment = httpsCallable(functions, 'processFeePaymentCallable');
await processFeePayment({
  teamId: 'xxx',
  memberId: 'yyy',
  month: '2025-12',
  amount: 20000
});
```

---

### 2. 월별 회비 자동 생성

**파일:** `functions/src/monthlyFeeAutoGeneration.ts`

#### `generateMonthlyFees`

- **타입:** Scheduled Function (Cloud Scheduler)
- **스케줄:** 매월 1일 오전 9시 (서울 시간)
- **용도:** 모든 팀의 활성 회원에게 해당 월 회비 항목 자동 생성
- **처리 내용:**
  1. 모든 팀 조회
  2. 각 팀의 활성 회원 조회
  3. 현재 월 fee 문서 생성
  4. 각 회원별 items 문서 생성 (paid: false 기본값)
  5. 이월 처리 (이전 월 미납 회원의 unpaidMonths 증가)

**수동 실행:**
```bash
# Firebase Console → Functions → generateMonthlyFees → 수동 실행
```

---

### 3. 데이터 마이그레이션

**파일:** `functions/src/migrateFeeData.ts`

#### `migrateFeeData`

- **타입:** HTTP Callable Function
- **용도:** 기존 구조에서 새 구조로 데이터 이전
- **파라미터:**
  - `teamId` (선택): 특정 팀만 마이그레이션 (없으면 모든 팀)
  - `dryRun` (기본값: true): 테스트 모드 (true: 테스트만, false: 실제 실행)

**호출 예시:**
```typescript
// 테스트 모드
const migrateFeeData = httpsCallable(functions, 'migrateFeeData');
await migrateFeeData({ teamId: 'xxx', dryRun: true });

// 실제 마이그레이션
await migrateFeeData({ teamId: 'xxx', dryRun: false });
```

#### `checkMigrationStatus`

- **타입:** HTTP Callable Function
- **용도:** 마이그레이션 상태 확인 (기존 데이터와 새 데이터 비교)

---

## 🔐 권한 및 보안

### 수동 완납 처리 권한

1. **Pro 플랜:** 항상 허용
2. **Free 플랜:** `allowManualFee === true` 일 때만 허용
3. **관리자 권한:** 
   - 팀 owners 목록에 포함
   - team_members에서 role이 "admin", "treasurer", "총무" 중 하나

### Firestore 보안 규칙

```javascript
// teams/{teamId}/fees/{month}/items/{memberId}
match /teams/{teamId}/fees/{month}/items/{memberId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null 
    && (isTeamOwner(teamId) || isTeamAdmin(teamId));
}
```

---

## 📊 Audit 로그

### auditLogs 컬렉션

```
auditLogs/{autoId}
  ├── type: "fee_payment_manual"
  ├── teamId: string
  ├── memberId: string
  ├── memberName: string
  ├── month: string (YYYY-MM)
  ├── amount: number
  ├── processedBy: string (UID)
  ├── method: "manual"
  ├── feeDocumentPath: string
  ├── rollbackable: true
  ├── rollbackPath: string
  └── createdAt: timestamp
```

**롤백 가능:** `rollbackable: true`인 경우 나중에 롤백 가능

---

## 🔄 이월 처리

### 미납 개월 수 계산

1. 현재 월 기준으로 최근 12개월 fee 조회
2. 최근 월부터 역순으로 확인
3. fee 기록이 없거나 `paid: false`이면 미납으로 카운트
4. 납부 완료된 월을 만나면 중단 (연속 미납만 카운트)
5. `member.unpaidMonths` 업데이트

### 상태 자동 전환

- 미납 개월 수에 따라 회원 상태 자동 전환
- `memberStatusTransition.ts` 참고

---

## 🚀 배포 절차

### 1. Functions 배포

```bash
# 수동 완납 함수
firebase deploy --only functions:processFeePaymentCallable

# 월별 회비 자동 생성 함수
firebase deploy --only functions:generateMonthlyFees

# 마이그레이션 함수
firebase deploy --only functions:migrateFeeData,functions:checkMigrationStatus
```

### 2. 데이터 마이그레이션

```bash
# 1. 테스트 모드 (dryRun=true)
# 2. 실제 마이그레이션 (dryRun=false)
# 3. 결과 확인
```

### 3. 프론트 배포

```bash
npm run build
vercel deploy --prod
# 또는
firebase deploy --only hosting
```

자세한 내용은 `DEPLOYMENT_PLAN.md` 참고

---

## 🧪 테스트

### 로컬 테스트

```bash
# Functions 에뮬레이터 실행
firebase emulators:start --only functions

# 프론트에서 테스트
# localhost:5173 (또는 설정한 포트)
```

### 프로덕션 테스트

1. 수동 완납 버튼 클릭
2. Functions 로그 확인
3. Firestore 데이터 확인
4. Audit 로그 확인

---

## 📝 참고 문서

- `DEPLOYMENT_PLAN.md`: 배포 플랜
- `functions/src/feePayment.ts`: 수동 완납 처리
- `functions/src/monthlyFeeAutoGeneration.ts`: 월별 회비 자동 생성
- `functions/src/migrateFeeData.ts`: 데이터 마이그레이션

---

**마지막 업데이트:** 2025-12-17

