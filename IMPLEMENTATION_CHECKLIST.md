# ✅ 회비 관리 시스템 구현 체크리스트

## 🎯 최종 목표

**관리자는 회비 / 회계에서 회원 옆 버튼 한 번 누르면 납부 처리가 끝난다.**

---

## 📋 구현 완료 체크리스트

### 1️⃣ DB 구조

- [x] `teams/{teamId}` - `plan: "FREE" | "PRO"` 필드
- [x] `teams/{teamId}/members/{memberId}` - 회원 정보 (회비 상태 없음)
- [x] `teams/{teamId}/fees/{memberId}_{month}` - 회비 기록 (핵심)

**검증**:
```typescript
// fee 기록 예시
{
  teamId: "team1",
  memberId: "hong",
  month: "2025-07",
  amount: 20000,
  paid: true,
  paidAt: Timestamp,
  processedBy: "owner-uid",
}
```

### 2️⃣ 백엔드 함수

- [x] `processFeePaymentCallable` - 회비 납부 처리
  - [x] OWNER 권한 체크
  - [x] Pro 체크 (서버 측 보안)
  - [x] fee 기록 생성/업데이트
  - [x] unpaidMonths 재계산
  - [x] 상태 자동 전환

- [x] `getFeeStatusCallable` - 회비 상태 조회

- [x] `isTeamProCallable` - Pro 여부 확인

**파일**: `functions/src/feePayment.ts`

### 3️⃣ 프론트엔드 페이지

- [x] `TeamFeePaymentPage.tsx` - 회비 납부 처리 페이지
  - [x] 경로: `/team/:teamId/fee`
  - [x] 회원별 목록 표시
  - [x] Pro 여부 확인
  - [x] 납부 완료 버튼 (Pro/Free 분기)
  - [x] 확인 다이얼로그
  - [x] 업그레이드 모달 (Free 팀)
  - [x] 즉시 화면 반영

**파일**: `src/pages/team/TeamFeePaymentPage.tsx`

### 4️⃣ 상태 자동 전환 시스템

- [x] `memberStatusTransition.ts` - 장기 미납 자동 상태 전환
  - [x] WARNED (2개월)
  - [x] RESTRICTED (3개월)
  - [x] PAUSED_AUTO (4개월)
  - [x] REMOVAL_CANDIDATE (6개월)
  - [x] 상태별 권한 제어
  - [x] 전환 기록 저장
  - [x] OWNER Override 기능

**파일**: `functions/src/memberStatusTransition.ts`

### 5️⃣ 월간 리포트 자동 생성

- [x] `autoMonthlyReport` - 매월 1일 자동 실행
  - [x] 월간 리포트 생성
  - [x] 자동 상태 전환 트리거
  - [x] 미납 알림 발송

**파일**: `functions/src/autoMonthlyReport.ts`

### 6️⃣ 보안 규칙

- [x] `fees` 컬렉션 규칙
  - [x] 읽기: 팀 멤버 모두 가능
  - [x] 쓰기: OWNER만 가능

- [x] `memberTransitions` 컬렉션 규칙
  - [x] 읽기: OWNER/관리자만
  - [x] 쓰기: Functions에서만

**파일**: `firestore.rules`

### 7️⃣ 라우팅

- [x] `/team/:teamId/fee` 경로 추가
- [x] `TeamFeePaymentPage` lazy load

**파일**: `src/App.tsx`

### 8️⃣ 함수 Export

- [x] `processFeePaymentCallable` export
- [x] `getFeeStatusCallable` export
- [x] `isTeamProCallable` export
- [x] `overrideMemberStatusCallable` export
- [x] `removeStatusOverrideCallable` export

**파일**: `functions/src/exports/reporting.ts`

---

## 🧪 테스트 체크리스트

### 기본 기능 테스트

- [ ] FREE 팀: 버튼 비활성화 확인
- [ ] FREE 팀: 업그레이드 모달 표시 확인
- [ ] PRO 팀: 버튼 활성화 확인
- [ ] PRO 팀: 확인 다이얼로그 표시 확인
- [ ] 납부 처리 성공 확인
- [ ] 화면 즉시 반영 확인
- [ ] DB 저장 확인

### 보안 테스트

- [ ] 서버 측 Pro 체크 동작 확인
- [ ] OWNER 권한 체크 동작 확인
- [ ] 비OWNER 접근 차단 확인

### 자동화 테스트

- [ ] unpaidMonths 재계산 확인
- [ ] 상태 자동 전환 확인
- [ ] 다른 화면 자동 반영 확인

---

## 📊 시스템 흐름도

```
관리자 액션
  ↓
[납부 완료] 버튼 클릭
  ↓
확인 다이얼로그
  ↓
[확인] 클릭
  ↓
서버 처리
  ├─ OWNER 권한 체크
  ├─ Pro 체크
  ├─ fee 기록 저장
  ├─ unpaidMonths 재계산
  └─ 상태 자동 전환
  ↓
화면 즉시 반영
  ├─ 회비/회계 화면
  ├─ 회원 관리 화면
  └─ 관리보드 요약
```

---

## 🔑 핵심 원칙

1. **회원은 사람이고, 회비는 기록이다**
   - member에 회비 상태 저장 ❌
   - fee에 기록만 저장 ✅

2. **상태는 항상 계산 결과**
   - 직접 저장 ❌
   - 계산으로 도출 ✅

3. **Pro/Free는 팀 기준**
   - 사용자 기준 ❌
   - 팀 기준 ✅

4. **프론트 + 서버 이중 방어**
   - 프론트만 체크 ❌
   - 서버도 체크 ✅

---

## 🎉 완성 기준

이 시스템은 이제:

✅ 관리자가 어디 들어가야 하는지 명확  
✅ "완납 처리" 버튼 존재  
✅ 클릭 → 기록 저장  
✅ 모든 화면 자동 반영  
✅ Pro/Free 분기 명확  
✅ 운영 가능  

**→ "운영 가능한 회비 관리 시스템"**

---

## 📝 다음 단계 (선택)

1. **월간 자동 리포트 연결**
   - 이미 구현됨 (`autoMonthlyReport`)
   - 매월 1일 자동 실행
   - 상태 전환 자동 트리거

2. **추가 기능**
   - 일괄 납부 처리
   - 납부 내역 내보내기
   - 통계 대시보드

---

## 🔗 관련 문서

- `FEE_PAYMENT_SYSTEM.md` - DB 구조 및 API
- `FEE_PAYMENT_FLOW.md` - 납부 처리 흐름
- `PRO_FREE_FEATURE_GATING.md` - Pro/Free 분기
- `FEE_PAYMENT_TEST_SCENARIO.md` - 실전 테스트
- `AUTO_STATUS_TRANSITION_SYSTEM.md` - 상태 전환 시스템
- `MEMBER_STATUS_UI_FLOW.md` - UI 흐름

