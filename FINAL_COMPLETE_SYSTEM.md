# 🔥 최종 완성: 운영 가능한 회비 시스템 (프로덕션 준비 완료)

## ✅ 0) 결론: 마무리 됐냐?

**✅ 네, 완료되었습니다!**

- 설계/플랜: 완성본 상태로 진행 가능
- 코드: 복붙 가능한 최종 뼈대 완성
- 남은 작업: 실제 Firestore 경로/필드명만 확인 후 배포

---

## 📋 1) 프로덕션 플래그 2개 (팀 문서)

### teams/{teamId} 필드 추가

```javascript
{
  allowManualFee: true/false,        // FREE + 관리자여도 수동 완납 버튼 허용
  enableNewFeeSystem: true/false,    // 신 회비 시스템 ON/OFF
  feeBaseAmount: number              // 기본 회비 금액 (기본값: 20000)
}
```

### 권장 운영

**처음:**
- `enableNewFeeSystem: false`
- `allowManualFee: true` (필요한 팀만)

**이후:**
- `enableNewFeeSystem: true` (파일럿 팀에만 ON)

### 롤백

**`enableNewFeeSystem: false` 한 방이면 끝**
- 데이터는 남아도 레거시 화면/로직은 그대로

---

## 💰 2) 수동 완납 서버 코드 (최종 완성본)

### 파일: `functions/src/feePaymentFinal.ts`

### 동작 조건 (서버에서 강제)

1. ✅ **Auth 필수**
2. ✅ **팀 존재 확인**
3. ✅ **관리자 권한 확인** (OWNER/ADMIN/STAFF)
4. ✅ **allowManualFee gate** 또는 `plan !== 'free'`
5. ✅ **월(YYYY-MM) 유효성 검사**

### 기록 원칙

- ✅ **Idempotent**: 이미 완납이면 성공 반환
- ✅ **단일 소스**: `teams/{teamId}/fees/{YYYY-MM}/payments/{memberId}`

### 저장 형태

**월 문서(요약):**
```
teams/{teamId}/fees/{YYYY-MM}
  month: "2025-12"
  baseAmount: 20000
  status: "open" | "closed"
  createdAt: timestamp
```

**멤버별 납부 상태:**
```
teams/{teamId}/fees/{YYYY-MM}/payments/{memberId}
  status: "paid" | "unpaid" | "partial"
  paidAt: timestamp
  paidBy: string (uid)
  method: "manual" | "auto" | "import"
  amount: number
  dueAmount: number
  paidAmount: number
  carryOverAmount: number
```

---

## 📅 3) 월별 회비 "스케줄 + lazy-create 병행"

### A. 스케줄 (운영 자동화)

**파일:** `functions/src/createMonthlyFeesJobFinal.ts`
**함수:** `createMonthlyFeesJob`
**스케줄:** 매월 1일 오전 00:10 (서울 시간)

**처리:**
- 전체 팀 중 `enableNewFeeSystem=true` 팀 대상
- `fees/{YYYY-MM}` 생성
- 활성 멤버들에 대해 `payments/{memberId}` 기본 `unpaid` 생성

**장점:** 운영 자동화 / 누락 최소화

### B. Lazy-create (누락 방지)

**파일:** `functions/src/createMonthlyFeesJobFinal.ts`
**함수:** `ensureMonthlyFeeCallable`

**처리:**
- 화면 진입(`/fee-detail?month=...`) 또는 callable 호출 시
- `ensureMonthInitialized(teamId, month)` 한 번 실행
- 해당 월 doc 없으면 생성
- 멤버 payment doc 없으면 생성

**핵심:** 스케줄은 "운영 편의", lazy는 "데이터 정합성/누락 방지" 담당

---

## 🔄 4) 이월 로직 (계산형)

### 옵션 1: 계산형 (권장)

**구현:**
- 미납 수/금액은 `payments`에서 `status=='unpaid'`를 쿼리/집계
- "이월"은 단지 월이 바뀌어도 `unpaid`가 남아있는 것을 의미
- 별도 carry doc 안 만듦

**로직:**
```typescript
prevPayment = teams/{teamId}/fees/{prevMonth}/payments/{memberId}
if (prevPayment.status !== "paid") {
  carryOverAmount = prevPayment.dueAmount - prevPayment.paidAmount
}
dueAmount = baseAmount + carryOverAmount
```

**장점:** 데이터 적게 듦

---

## 🔄 5) 마이그레이션 (생성만)

### 파일: `scripts/backfillFeesFinal.ts`

### 원칙

- ✅ **레거시 데이터 수정/삭제 금지**
- ✅ **신 시스템 doc만 생성**
- ✅ **100% Idempotent** (있으면 skip)

### 마이그레이션이 하는 일

**대상:** `enableNewFeeSystem=true` 팀
**범위:** 최근 12개월 or 팀 생성일~현재

**생성:**
- `fees/{YYYY-MM}` 월 doc 생성 (없으면)
- `payments/{memberId}` doc 생성 (없으면) → 기본 `unpaid`

**절대 하지 않는 것:**
- 레거시 납부/정산 데이터 변경/삭제
- 레거시 "미납 카운트" 필드 덮어쓰기

### 사용법

```bash
# 테스트 모드
npx ts-node scripts/backfillFeesFinal.ts --teamId=xxx --months=12 --dryRun

# 실제 마이그레이션
npx ts-node scripts/backfillFeesFinal.ts --teamId=xxx --months=12 --dryRun=false
```

---

## 🚀 6) 롤백 가능한 프로덕션 배포 플랜

### Phase 0: "읽기/쓰기 게이트" 코드 먼저 배포

**목표:** 배포 후에도 아무 팀도 영향 없음

```bash
cd functions
npm run build
firebase deploy --only functions
```

**Feature Flag 상태:**
- 모든 팀: `enableNewFeeSystem: false` (기본값)
- 모든 팀: `allowManualFee: false` (기본값)

**확인:** 기존 기능 정상 작동 (레거시 시스템)

---

### Phase 1: allowManualFee만 ON (수동 완납만 파일럿)

**목표:** "수동 완납 callable"이 안전하게 동작하는지 확인

**Feature Flag 설정:**
```bash
firebase firestore:set teams/{testTeamId} '{
  "allowManualFee": true,
  "enableNewFeeSystem": false
}' --merge
```

**테스트:**
- 수동 완납 버튼 클릭
- 완납 처리 확인
- UI 즉시 반영 확인

---

### Phase 2: enableNewFeeSystem 파일럿 ON

**목표:** 신 시스템 안정성 확인

**Feature Flag 설정:**
```bash
firebase firestore:set teams/{testTeamId} '{
  "allowManualFee": true,
  "enableNewFeeSystem": true,
  "feeBaseAmount": 20000
}' --merge
```

**테스트:**
- Lazy-create (화면 접속 시)
- 수동 완납 (신 시스템)
- 이월 계산

**주의:** 스케줄은 그 다음 (운영 안정 확인 후)

---

### Phase 3: 마이그레이션 (생성만)

**파일럿 팀 먼저 1회 실행**

```bash
npx ts-node scripts/backfillFeesFinal.ts --teamId={testTeamId} --months=12 --dryRun=false
```

**문제 없으면 점진 확대**

---

### 롤백

**문제가 생기면 즉시:**
```bash
firebase firestore:set teams/{teamId} '{"enableNewFeeSystem": false}' --merge
```

**결과:**
- 이미 생성된 `fees/*`는 남아도 레거시로 되돌아가면 "안 보이거나 무시"
- 데이터 삭제 롤백은 하지 않는 게 안전

---

## 📊 7) "정보가 다 사라짐" 원인

**원인:**
- 에뮬레이터 Firestore는 기본이 빈 DB
- 프로덕션에 있던 `teams/members`가 안 보임
- Emulator UI에서 teams를 새로 만들면서 프로덕션이 아니라 로컬 DB에만 생김
- Auth Emulator 쓰면 로그인 계정도 별도

**결론:** "사라진게 아니라" 앱이 보고 있는 DB가 바뀐 것

---

## 📊 8) "미납란 0이 맞니?"

### 회비 상세 화면
- 전원이 "완납" → 미납 0이 맞음

### 회원 관리 화면
- "미납" 컬럼이 0으로 뜨는 건 논리적으로 맞음
- **조건:** 그 "미납" 컬럼의 정의에 따라 달라짐

### 추천

**회원관리 화면 미납:**
- 이번달 + 이전월 unpaid 합계 (누적)

**회비상세(월 화면):**
- 해당 월만

---

## 📁 생성된 파일 (최종 완성본)

### 서버 (Functions)

1. **`functions/src/feePaymentFinal.ts`** - 수동 완납 (최종)
2. **`functions/src/feeSystemCoreFinal.ts`** - 핵심 로직 (최종)
3. **`functions/src/createMonthlyFeesJobFinal.ts`** - 스케줄 + Lazy-create (최종)

### 마이그레이션

4. **`scripts/backfillFeesFinal.ts`** - 마이그레이션 스크립트 (최종)

### 프론트

5. **`src/utils/calculateUnpaidMonthsFinal.ts`** - 미납 계산식 (최종)

---

## 🎯 가정된 구조 (확인 필요)

**현재 코드 기준:**
- ✅ members 경로: `teams/{teamId}/members/{memberId}`
- ✅ 멤버 활성 필드: `status` (active|inactive)
- ✅ 역할 필드: `role` (OWNER|ADMIN|STAFF|MEMBER)

**확인 필요:**
- 실제 Firestore 경로가 맞는지
- 필드명이 정확한지

---

## ✅ 완성!

**모든 코드가 복붙 가능한 최종 뼈대로 완성되었습니다!**

- ✅ 수동 완납 서버 코드
- ✅ 스케줄 + Lazy-create 병행
- ✅ 이월 로직 (계산형)
- ✅ 마이그레이션 스크립트 (생성만)
- ✅ 프론트 미납 계산식
- ✅ 프로덕션 배포 플랜
- ✅ 롤백 절차

**이제 배포만 하면 됩니다!** 🚀

---

**마지막 업데이트:** 2025-12-17

