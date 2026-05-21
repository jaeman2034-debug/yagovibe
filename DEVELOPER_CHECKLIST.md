# ✅ 회비 완납 처리 기능 — 개발 체크리스트 (실전)

## 🎯 목표

관리자가  
회비 / 회계 화면에서 회원 옆 [납부 완료] 버튼을 눌러  
해당 월 회비를 완납 처리한다.

---

## 0️⃣ 전제 조건

- ✅ 사용자: 관리자 권한 (OWNER)
- ✅ 대상: 팀 단위
- ✅ 월 기준: YYYY-MM
- ✅ 금액 예: 20,000원
- ✅ 과금: PRO 팀만 가능

---

## 1️⃣ 데이터 모델 (필수)

### Team

```typescript
team {
  id: string,
  plan: "FREE" | "PRO",  // 핵심 필드
  owners: string[],
  // ... 기타 필드
}
```

**파일**: `teams/{teamId}`

### Member

```typescript
member {
  id: string,
  teamId: string,
  name: string,
  status: "active" | "paused" | "expelled",
  feePlan: "monthly" | "annual" | "exempt",
  unpaidMonths: number,  // 계산 결과 (직접 저장 금지)
  // ... 기타 필드
}
```

**파일**: `teams/{teamId}/members/{memberId}`

**❗ 회원에 "미납/완납" 필드 저장 금지**  
→ 상태는 fee 기록으로 계산

### Fee (핵심)

```typescript
fee {
  teamId: string,
  memberId: string,
  month: "YYYY-MM",  // 예: "2025-07"
  amount: number,
  paid: boolean,
  paidAt: timestamp,
  processedBy: string,  // OWNER uid
  createdAt: timestamp,
}
```

**파일**: `teams/{teamId}/fees/{memberId}_{month}`  
**문서 ID**: `${memberId}_${month}` (예: `hong_2025-07`)

---

## 2️⃣ UI 구현 (프론트)

### 📍 위치

```
우리 팀 관리
 → 회비 / 회계
   → [월 선택]
     → 회원별 목록
```

**경로**: `/team/:teamId/fee`  
**파일**: `src/pages/team/TeamFeePaymentPage.tsx`

### 회원 행 UI

#### PRO 팀

```tsx
<button
  onClick={handlePayment}
  className="bg-blue-600 text-white hover:bg-blue-700"
>
  납부 완료
</button>
```

**상태**: 활성화, 클릭 가능

#### FREE 팀

```tsx
<button
  onClick={showUpgradeModal}
  disabled={true}
  className="bg-gray-300 text-gray-500 cursor-not-allowed"
  title="Pro 필요"
>
  🔒 납부 완료
</button>
```

**상태**: 비활성화, 클릭 시 업그레이드 모달

**체크리스트**:
- [x] PRO 팀: 버튼 활성화
- [x] FREE 팀: 버튼 비활성화
- [x] 업그레이드 모달 구현
- [x] Pro 여부 자동 확인

---

## 3️⃣ 확인 모달 (필수 UX)

### 버튼 클릭 시

```
┌─────────────────────────────────────┐
│ 회비 납부 확인                      │
│                                     │
│ 회원: 홍길동                        │
│ 월: 2025년 7월                      │
│ 금액: 20,000원                      │
│                                     │
│ 이 회원의 회비를                    │
│ '납부 완료'로 처리할까요?           │
│                                     │
│ [취소]   [확인]                    │
└─────────────────────────────────────┘
```

**체크리스트**:
- [x] 확인 다이얼로그 구현
- [x] 회원명, 월, 금액 표시
- [x] 확인 → 서버 요청
- [x] 취소 → 닫기

---

## 4️⃣ API / 서버 로직 (핵심)

### 요청

```typescript
POST /processFeePaymentCallable
{
  "teamId": "team1",
  "memberId": "hong",
  "month": "2025-07",
  "amount": 20000
}
```

**함수**: `processFeePaymentCallable`  
**파일**: `functions/src/feePayment.ts`

### 서버 체크 (순서 고정)

1. **관리자 권한 확인**
   ```typescript
   if (!owners.includes(ownerId)) {
     throw new Error("OWNER 권한이 필요합니다.");
   }
   ```

2. **team.plan === "PRO" 확인** (아니면 403)
   ```typescript
   if (teamData.plan !== "PRO") {
     throw new Error("PRO_REQUIRED: ...");
   }
   ```

3. **fee(teamId, memberId, month) 조회**
   ```typescript
   const feeRef = db
     .collection("teams")
     .doc(teamId)
     .collection("fees")
     .doc(`${memberId}_${month}`);
   ```

4. **있으면 update, 없으면 create**
   ```typescript
   await feeRef.set(feeData, { merge: true });
   ```

5. **저장**
   ```typescript
   {
     paid: true,
     paidAt: serverTimestamp(),
   }
   ```

### 응답

```json
{
  "success": true
}
```

**체크리스트**:
- [x] OWNER 권한 체크
- [x] Pro 체크 (서버 측)
- [x] fee 기록 생성/업데이트
- [x] unpaidMonths 재계산
- [x] 상태 자동 전환

---

## 5️⃣ 화면 반영 (즉시)

### 회비 / 회계

**Before**:
```
홍길동 | 미납 | 20,000원 | [납부 완료]
```

**After**:
```
홍길동 | 완납 | ✔ 완료
```

### 회원 관리

**Before**:
```
홍길동 | 재원 | 미납 1개월
```

**After**:
```
홍길동 | 재원 | 미납 0
```

### 관리보드 요약

**Before**:
```
이번 달 미납 인원: 1명
```

**After**:
```
이번 달 미납 인원: 0명
```

**❗ 별도 업데이트 로직 금지**  
→ 모두 fee 기준으로 재조회

**체크리스트**:
- [x] 즉시 화면 반영
- [x] 다른 화면 자동 반영
- [x] fee 기준 재조회

---

## 6️⃣ 보안 / 안정성

### 프론트: PRO 아닐 시 버튼 비활성

```typescript
const isPro = await isTeamProCallable({ teamId });
if (!isPro) {
  // 버튼 비활성화
}
```

### 서버: PRO 아닐 시 무조건 차단

```typescript
if (teamData.plan !== "PRO") {
  throw new Error("PRO_REQUIRED");
}
```

### 중복 클릭 방지

```typescript
// 이미 paid=true면 no-op
const feeDoc = await feeRef.get();
if (feeDoc.exists && feeDoc.data()?.paid === true) {
  return { success: true }; // 이미 처리됨
}
```

**체크리스트**:
- [x] 프론트 Pro 체크
- [x] 서버 Pro 체크
- [x] 중복 클릭 방지 (처리 중 상태)

---

## 7️⃣ 테스트 시나리오 (QA)

### ✅ FREE 팀 → 버튼 비활성 + 업그레이드 안내

**체크리스트**:
- [ ] 버튼이 "🔒 납부 완료"로 표시
- [ ] 버튼 비활성화
- [ ] 클릭 시 업그레이드 모달 표시

### ✅ PRO 팀 → 버튼 활성

**체크리스트**:
- [ ] 버튼이 "납부 완료"로 표시
- [ ] 버튼 활성화 (파란색)
- [ ] 클릭 가능

### ✅ 확인 클릭 → fee 저장

**체크리스트**:
- [ ] 확인 다이얼로그 표시
- [ ] 확인 클릭 시 서버 요청
- [ ] fee 기록 저장 확인

### ✅ 즉시 UI 변경

**체크리스트**:
- [ ] 버튼이 "✔ 완료"로 변경
- [ ] 배경색 초록색으로 변경
- [ ] 즉시 반영

### ✅ 새로고침 후 상태 유지

**체크리스트**:
- [ ] 페이지 새로고침
- [ ] 상태 유지 확인
- [ ] DB에서 재조회 확인

### ✅ 동일 월 재클릭 불가

**체크리스트**:
- [ ] 완납 후 버튼 사라짐
- [ ] 재클릭 불가능

---

## 8️⃣ 완료 기준 (Definition of Done)

✅ 관리자가 어디 들어가서  
✅ 버튼 한 번으로  
✅ 완납 처리 가능  
✅ 모든 화면에 즉시 반영  
✅ FREE/PRO 분기 명확  

---

## 🔑 한 줄 요약 (개발자용)

**완납은 회원 상태가 아니라 fee 기록이다. 버튼은 회비 화면에, 기준은 팀 PRO 여부다.**

---

## 📁 구현 파일 목록

### 백엔드

- `functions/src/feePayment.ts` - 회비 납부 처리 로직
- `functions/src/memberStatusTransition.ts` - 상태 자동 전환
- `functions/src/autoMonthlyReport.ts` - 월간 리포트 자동 생성

### 프론트엔드

- `src/pages/team/TeamFeePaymentPage.tsx` - 회비 납부 처리 페이지
- `src/App.tsx` - 라우팅

### 보안

- `firestore.rules` - Firestore 보안 규칙

### 문서

- `FEE_PAYMENT_SYSTEM.md` - DB 구조 및 API
- `FEE_PAYMENT_FLOW.md` - 납부 처리 흐름
- `PRO_FREE_FEATURE_GATING.md` - Pro/Free 분기
- `FEE_PAYMENT_TEST_SCENARIO.md` - 실전 테스트
- `IMPLEMENTATION_CHECKLIST.md` - 전체 구현 체크리스트

---

## 🚀 다음 단계 (자동 연결)

### 1. 월간 자동 리포트 연결

**이미 구현됨**: `autoMonthlyReport`  
- 매월 1일 00:05 (KST) 자동 실행
- 월간 리포트 생성 시 자동 상태 전환 트리거

### 2. 미납 자동 알림

**이미 구현됨**: `autoMonthlyReport` 내부  
- 2개월 이상 미납자 자동 알림
- FCM 푸시 알림 발송

### 3. 권한 제한 자동화

**이미 구현됨**: `memberStatusTransition`  
- 3개월: RESTRICTED (권한 제한)
- 4개월: PAUSED_AUTO (자동 휴원)
- 6개월: REMOVAL_CANDIDATE (제명 후보)

---

## ✅ 최종 확인

이 체크리스트를 모두 통과하면:

✅ **"운영 가능한 회비 관리 시스템"** 완성

