# 💰 회비 납부 처리 시스템

## 🎯 목표

관리자가 **"홍길동 20,000원 냈다"**를 시스템에 체크할 수 있게 만든다.

## 🧠 천재 설계 - 최소 DB 구조

### 1️⃣ 팀 (team)

```typescript
team {
  id: "team1",
  plan: "FREE" | "PRO",  // Pro 여부 판단용
  owners: [uid1, uid2],  // OWNER 목록
}
```

**용도**: Pro 여부 판단 → 버튼 활성화/비활성화

### 2️⃣ 회원 (member)

```typescript
member {
  id: "hong",
  name: "홍길동",
  status: "active" | "paused" | "expelled",
  feePlan: "monthly" | "annual" | "exempt",
  unpaidMonths: 0,  // 계산된 결과
  unpaidStatus: "NORMAL",  // 계산된 결과
}
```

**핵심**: 회비 상태는 **member에 직접 저장하지 않음** (계산 결과만)

### 3️⃣ 회비 기록 (fee) - 핵심!

```typescript
fee {
  teamId: "team1",
  memberId: "hong",
  memberName: "홍길동",
  month: "2025-07",  // YYYY-MM
  amount: 20000,
  paid: true,
  paidAt: Timestamp,
  processedBy: "owner_uid",
  createdAt: Timestamp,
}
```

**문서 ID**: `${memberId}_${month}` (예: `hong_2025-07`)

## 🔥 천재 포인트

- ❌ member에 "미납/완납" 안 적음
- ✅ 회비는 fee 테이블에만 기록
- ✅ 상태는 항상 계산 결과

## 🔁 화면에서 일어나는 일 (실전)

### 관리자 행동

```
회비 / 회계 화면
→ 홍길동 옆 [납부 완료] 클릭
```

### 시스템 동작

1. `fee.paid = true` 저장
2. 이번 달 fee 조회
3. `paid=true`면 → 회원 관리 화면에 미납 0 표시
4. `unpaidMonths` 자동 재계산
5. 상태 자동 전환 (필요 시)

**끝.**

## 🧩 왜 이 구조가 천재냐?

- ✔️ 실수로 상태 조작 불가
- ✔️ 기록 남음 (언제 누가 처리했는지)
- ✔️ 월별 관리 가능
- ✔️ 자동화 100% 가능
- ✔️ 분쟁 없음

## 📊 DB 구조 다이어그램

```
teams/{teamId}
  ├── plan: "FREE" | "PRO"
  └── owners: [uid1, uid2]

teams/{teamId}/members/{memberId}
  ├── name: "홍길동"
  ├── status: "active"
  ├── feePlan: "monthly"
  ├── unpaidMonths: 0  ← 계산 결과
  └── unpaidStatus: "NORMAL"  ← 계산 결과

teams/{teamId}/fees/{memberId}_{month}
  ├── teamId: "team1"
  ├── memberId: "hong"
  ├── month: "2025-07"
  ├── amount: 20000
  ├── paid: true
  ├── paidAt: Timestamp
  └── processedBy: "owner_uid"
```

## 🚀 API 함수

### 1. 회비 납부 처리

```typescript
processFeePaymentCallable({
  teamId: "team1",
  memberId: "hong",
  month: "2025-07",
  amount: 20000
})
```

**동작**:
1. OWNER 권한 확인
2. fee 문서 생성/업데이트 (`paid: true`)
3. `unpaidMonths` 재계산
4. 상태 자동 전환

### 2. 회비 상태 조회

```typescript
getFeeStatusCallable({
  teamId: "team1",
  memberId: "hong",
  month: "2025-07"
})
```

**반환**:
```typescript
{
  paid: true,
  amount: 20000,
  paidAt: Timestamp
}
```

### 3. Pro 여부 확인

```typescript
isTeamProCallable({
  teamId: "team1"
})
```

**반환**:
```typescript
{
  isPro: true
}
```

## 🔑 한 문장 요약

**회원은 사람이고, 회비는 기록이다. 기록이 바뀌면 상태는 자동으로 바뀐다.**

## 📝 다음 단계

납부 완료 버튼 UX 설계 + 클릭 시 동작 흐름

