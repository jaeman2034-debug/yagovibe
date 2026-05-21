# 📱 회원 상태 UI 흐름 가이드

## 🎯 핵심 설계 철학

**상태는 "계산된 결과"이지 "선택 가능한 값"이 아니다**

- ❌ 재원 버튼 클릭 → 상태 변경
- ✅ 회비 납부 → 상태 자동 계산 → 재원으로 표시

---

## 1️⃣ 미납이 생기면 화면이 어떻게 바뀌는지

### 시나리오: 정상 회원 → 미납 발생

#### **Before (정상 상태)**

```
┌─────────────────────────────────────┐
│ 홍길동                              │
│ 상태: 재원  [비활성화]               │
│ 미납: 0개월                          │
│ 비고: -                              │
│ ⋮ [비활성화]                        │
└─────────────────────────────────────┘
```

**UI 상태:**
- 재원 선택: 비활성화 (계산된 결과이므로)
- 점 3개 메뉴: 비활성화 (조치할 게 없음)

#### **After (미납 1개월)**

```
┌─────────────────────────────────────┐
│ 홍길동                              │
│ 상태: 재원  [비활성화]               │
│ 미납: 1개월  ⚠️                      │
│ 비고: -                              │
│ ⋮ [비활성화]                        │
└─────────────────────────────────────┘
```

**변화:**
- 미납 표시: `1개월` + 경고 아이콘
- 상태: 여전히 "재원" (2개월 미만이므로)
- 점 3개: 여전히 비활성화 (아직 조치 단계 아님)

#### **After (미납 2개월) - WARNED**

```
┌─────────────────────────────────────┐
│ 홍길동                              │
│ 상태: 재원  🟡 경고                  │
│ 미납: 2개월  ⚠️                      │
│ 비고: 장기 미납 경고                 │
│ ⋮ [활성화] ← 이제 활성화!            │
└─────────────────────────────────────┘
```

**변화:**
- 상태 뱃지: `재원` + `🟡 경고` 뱃지 추가
- 미납: `2개월` + 경고 아이콘
- **점 3개 메뉴: 활성화!** (이제 조치 가능)

**점 3개 메뉴 내용:**
```
┌─────────────────────┐
│ 회비 납부 처리      │
│ 미납 상세 보기       │
│ 알림 발송           │
└─────────────────────┘
```

#### **After (미납 3개월) - RESTRICTED**

```
┌─────────────────────────────────────┐
│ 홍길동                              │
│ 상태: 재원  🔴 제한                  │
│ 미납: 3개월  ⚠️                      │
│ 비고: 권한 제한 상태                 │
│ ⋮ [활성화]                          │
└─────────────────────────────────────┘
```

**변화:**
- 상태 뱃지: `재원` + `🔴 제한` 뱃지
- 권한 자동 제한:
  - ❌ 투표 불가
  - ❌ 이벤트 참여 불가
  - ❌ 게시글 작성 불가
  - ✔️ 조회만 가능

**점 3개 메뉴 내용:**
```
┌─────────────────────┐
│ 회비 납부 처리      │
│ 미납 상세 보기       │
│ 권한 제한 해제      │ ← 새로 추가
│ 알림 발송           │
└─────────────────────┘
```

#### **After (미납 4개월) - PAUSED_AUTO**

```
┌─────────────────────────────────────┐
│ 홍길동                              │
│ 상태: 휴원  ⏸️ 자동휴원              │
│ 미납: 4개월  ⚠️                      │
│ 비고: 자동 휴원 처리됨                │
│ ⋮ [활성화]                          │
└─────────────────────────────────────┘
```

**변화:**
- 상태: `재원` → `휴원` (자동 전환)
- 뱃지: `⏸️ 자동휴원`
- 회비 계산에서 제외
- 통계상 휴원으로 집계

**점 3개 메뉴 내용:**
```
┌─────────────────────┐
│ 회비 납부 처리      │
│ 복귀 처리           │ ← 새로 추가
│ 미납 상세 보기       │
│ 알림 발송           │
└─────────────────────┘
```

#### **After (미납 6개월) - REMOVAL_CANDIDATE**

```
┌─────────────────────────────────────┐
│ 홍길동                              │
│ 상태: 휴원  ⚠️ 제명검토              │
│ 미납: 6개월  ⚠️                      │
│ 비고: 제명 후보 상태                 │
│ ⋮ [활성화]                          │
└─────────────────────────────────────┘
```

**변화:**
- 뱃지: `⚠️ 제명검토`
- 플래그: `REMOVAL_REVIEW_REQUIRED`
- 운영진에게만 표시 (일반 회원에게는 숨김)

**점 3개 메뉴 내용:**
```
┌─────────────────────┐
│ 회비 납부 처리      │
│ 복귀 처리           │
│ 제명 검토           │ ← 새로 추가
│ 미납 상세 보기       │
│ 알림 발송           │
└─────────────────────┘
```

---

## 2️⃣ 회비 납부 처리하면 상태가 어떻게 복귀되는지

### 시나리오: RESTRICTED (3개월) → 회비 납부

#### **Before (납부 전)**

```
┌─────────────────────────────────────┐
│ 홍길동                              │
│ 상태: 재원  🔴 제한                  │
│ 미납: 3개월                          │
│ 비고: 권한 제한 상태                 │
└─────────────────────────────────────┘
```

#### **회비 납부 처리 (점 3개 → 회비 납부 처리)**

**백엔드 처리:**
```typescript
// 1. ledger에 납부 기록
await db.collection("teams").doc(teamId)
  .collection("ledger").add({
    memberId: memberId,
    month: "2025-05",
    paidAmount: 20000,
    dueAmount: 20000,
    paidAt: serverTimestamp(),
  });

// 2. member의 unpaidMonths 업데이트
await memberRef.update({
  unpaidMonths: 0,  // 납부 완료
  lastPaidMonth: "2025-05",
});

// 3. 자동 상태 전환 (다음 월간 리포트 생성 시)
// 또는 즉시 실행 가능
await autoTransitionMemberStatuses(teamId, "2025-05");
```

#### **After (납부 후)**

```
┌─────────────────────────────────────┐
│ 홍길동                              │
│ 상태: 재원  [비활성화]               │
│ 미납: 0개월                          │
│ 비고: -                              │
│ ⋮ [비활성화]                        │
└─────────────────────────────────────┘
```

**자동 복귀 과정:**
1. `unpaidMonths: 3` → `0` (납부 처리)
2. 상태 전환 로직 실행: `getStatusFromUnpaidMonths(0)` → `NORMAL`
3. 권한 자동 복구:
   - ✅ 투표 가능
   - ✅ 이벤트 참여 가능
   - ✅ 게시글 작성 가능
4. 뱃지 제거: `🔴 제한` → 없음
5. 점 3개 메뉴: 비활성화 (정상 상태)

**전환 기록:**
```
memberTransitions/{transitionId}
{
  fromStatus: "RESTRICTED",
  toStatus: "NORMAL",
  reason: "PAYMENT_RECEIVED",
  basedOnReport: "2025-05",
  executedAt: Timestamp,
}
```

---

## 3️⃣ 점 3개가 활성화되는 조건 실전 예시

### ✅ 활성화되는 경우

#### **케이스 1: 미납 2개월 이상 (WARNED 이상)**

```typescript
const shouldShowMenu = (member: Member) => {
  const unpaidMonths = member.unpaidMonths || 0;
  const unpaidStatus = member.unpaidStatus || "NORMAL";
  
  // 미납 2개월 이상이면 활성화
  if (unpaidMonths >= 2) return true;
  
  // WARNED 이상 상태면 활성화
  if (unpaidStatus !== "NORMAL") return true;
  
  // 휴원 상태면 활성화
  if (member.status === "paused") return true;
  
  // 제명 후보면 활성화
  if (member.flags?.includes("REMOVAL_REVIEW_REQUIRED")) return true;
  
  return false;
};
```

#### **케이스 2: 휴원 상태 (수동 또는 자동)**

```
상태: 휴원
미납: 0개월 (이미 휴원 처리됨)
비고: 휴원 사유

→ 점 3개 활성화
→ 메뉴: "복귀 처리", "상세 보기"
```

#### **케이스 3: 제명 후보**

```
상태: 휴원
미납: 6개월
비고: 제명 검토 필요

→ 점 3개 활성화
→ 메뉴: "제명 검토", "회비 납부 처리", "복귀 처리"
```

### ❌ 비활성화되는 경우

#### **케이스 1: 정상 재원 + 미납 0**

```
상태: 재원
미납: 0개월
비고: -

→ 점 3개 비활성화
→ 이유: 조치할 게 없음
```

#### **케이스 2: 미납 1개월**

```
상태: 재원
미납: 1개월

→ 점 3개 비활성화
→ 이유: 아직 경고 단계 아님 (2개월부터)
```

---

## 4️⃣ 운영자가 실제로 개입해야 하는 유일한 순간

### 🎯 자동화가 안 되는 경우

#### **케이스 1: 특별한 사정으로 인한 면제**

**시나리오:**
- 회원이 3개월 미납 → RESTRICTED 상태
- 하지만 특별한 사정 (질병, 가족 사정 등)으로 일시 면제 필요

**운영자 개입:**
```typescript
// Override 함수 호출
await overrideMemberStatus(
  teamId,
  memberId,
  "NORMAL",  // 면제 상태로 변경
  "질병으로 인한 3개월 일시 면제 (의사 진단서 제출)",  // 사유 필수
  ownerId
);
```

**UI에서:**
```
점 3개 → "상태 Override" → 사유 입력 → 확인
```

**결과:**
- 상태: `NORMAL` (면제)
- `isStatusOverridden: true` 플래그 설정
- 자동 전환 로직 스킵 (Override 해제 전까지)
- Override 로그 별도 저장

#### **케이스 2: 제명 처리 (6개월 후)**

**시나리오:**
- 회원이 6개월 미납 → REMOVAL_CANDIDATE 상태
- 운영진 회의에서 제명 결정

**운영자 개입:**
```
점 3개 → "제명 처리" → 사유 입력 → 확인
```

**처리:**
```typescript
await memberRef.update({
  status: "expelled",
  expelledAt: serverTimestamp(),
  expelledReason: "6개월 이상 미납",
  expelledBy: ownerId,
});
```

#### **케이스 3: 복귀 처리 (PAUSED_AUTO 후)**

**시나리오:**
- 회원이 4개월 미납 → PAUSED_AUTO (자동 휴원)
- 회비 납부 완료
- 하지만 자동 복귀는 안 됨 (수동 복귀 필요)

**운영자 개입:**
```
점 3개 → "복귀 처리" → 확인
```

**처리:**
```typescript
// 1. 회비 납부 확인
await memberRef.update({
  unpaidMonths: 0,
  lastPaidMonth: "2025-05",
});

// 2. 상태 복귀
await memberRef.update({
  status: "active",
  unpaidStatus: "NORMAL",
  pausedReason: FieldValue.delete(),
  pausedAt: FieldValue.delete(),
  permissions: {
    voting: true,
    eventJoin: true,
    writePost: true,
    viewOnly: false,
  },
});
```

---

## 📊 상태 전환 흐름도

```
정상 (NORMAL)
  ↓ [미납 2개월]
경고 (WARNED) 🟡
  ↓ [미납 3개월]
제한 (RESTRICTED) 🔴
  ↓ [미납 4개월]
자동휴원 (PAUSED_AUTO) ⏸️
  ↓ [미납 6개월]
제명검토 (REMOVAL_CANDIDATE) ⚠️
  ↓ [운영진 결정]
제명 (EXPELLED)
```

**복귀 경로:**
```
제명검토 → [회비 납부] → 자동휴원 → [복귀 처리] → 정상
자동휴원 → [회비 납부 + 복귀 처리] → 정상
제한 → [회비 납부] → 정상
경고 → [회비 납부] → 정상
```

---

## 🎨 UI 컴포넌트 구현 가이드

### 상태 뱃지 컴포넌트

```typescript
function StatusBadge({ member }: { member: Member }) {
  const { unpaidStatus, unpaidMonths, status } = member;
  
  if (status === "expelled") {
    return <span className="badge-red">제명</span>;
  }
  
  if (status === "paused") {
    if (unpaidStatus === "PAUSED_AUTO") {
      return (
        <>
          <span>휴원</span>
          <span className="badge-yellow">⏸️ 자동휴원</span>
        </>
      );
    }
    return <span>휴원</span>;
  }
  
  // 재원 상태
  if (unpaidStatus === "REMOVAL_CANDIDATE") {
    return (
      <>
        <span>재원</span>
        <span className="badge-red">⚠️ 제명검토</span>
      </>
    );
  }
  
  if (unpaidStatus === "RESTRICTED") {
    return (
      <>
        <span>재원</span>
        <span className="badge-red">🔴 제한</span>
      </>
    );
  }
  
  if (unpaidStatus === "WARNED") {
    return (
      <>
        <span>재원</span>
        <span className="badge-yellow">🟡 경고</span>
      </>
    );
  }
  
  return <span>재원</span>;
}
```

### 점 3개 메뉴 활성화 조건

```typescript
function shouldShowMemberMenu(member: Member): boolean {
  // 정상 재원 + 미납 0 → 비활성화
  if (member.status === "active" && 
      (member.unpaidMonths || 0) === 0 &&
      (member.unpaidStatus || "NORMAL") === "NORMAL") {
    return false;
  }
  
  // 미납 2개월 이상 → 활성화
  if ((member.unpaidMonths || 0) >= 2) {
    return true;
  }
  
  // 휴원 상태 → 활성화
  if (member.status === "paused") {
    return true;
  }
  
  // 제명 후보 → 활성화
  if (member.flags?.includes("REMOVAL_REVIEW_REQUIRED")) {
    return true;
  }
  
  return false;
}
```

---

## ✅ 정리

### 운영자가 "직접 상태를 바꾸는" 경우는 없음

모든 상태 변경은:
1. **회비 납부** → 자동 상태 계산
2. **미납 누적** → 자동 상태 전환 (월간 리포트 생성 시)
3. **복귀 처리** → 수동 복귀 (PAUSED_AUTO 후)
4. **Override** → 특별한 사정 (사유 필수)
5. **제명** → 운영진 결정 (6개월 후)

### UI는 "결과를 보는" 화면

- 상태 선택 버튼: 비활성화 (계산된 결과)
- 점 3개 메뉴: 조건부 활성화 (조치 가능할 때만)

이 구조가 **자동화 가능한 구조**입니다.

