# 🔥 매칭 참여 상태 머신 (대회급 안정성)

## 상태 정의

### JoinStatus 타입 (8가지)

```typescript
type JoinStatus =
  | "pending"              // 대기 중
  | "approved"             // 승인됨
  | "rejected"             // 거절됨
  | "cancelled_by_user"    // 사용자 취소
  | "cancelled_by_author"  // 작성자 취소
  | "expired"              // 만료됨
  | "completed"            // 완료됨
  | "no_show"              // 노쇼
```

---

## 상태 전이 규칙

### pending → approved/rejected/cancelled_by_user/expired

**허용 전이:**
- `approved`: 작성자 승인
- `rejected`: 작성자 거절
- `cancelled_by_user`: 사용자 취소
- `expired`: 자동 만료

**차단 전이:**
- `completed`: 불가능 (승인 후에만 가능)
- `no_show`: 불가능 (승인 후에만 가능)

---

### approved → cancelled_by_user/cancelled_by_author/completed/no_show

**허용 전이:**
- `cancelled_by_user`: 사용자 취소
- `cancelled_by_author`: 작성자 취소
- `completed`: 매칭 완료
- `no_show`: 노쇼

**차단 전이:**
- `pending`: 불가능 (재신청은 rejected에서)
- `rejected`: 불가능 (이미 승인됨)

---

### rejected/cancelled_by_user/cancelled_by_author/expired → pending

**재신청 가능:**
- 모든 상태에서 `pending`으로 재신청 가능

---

### completed/no_show → (없음)

**최종 상태:**
- 더 이상 전이 불가능
- 재신청 불가능

---

## 사용 예시

### 상태 전이 검증

```typescript
import { validateStatusTransition } from "./marketJoinStateMachine";

// 승인 처리 전 검증
validateStatusTransition("pending", "approved"); // ✅ 성공

// 불가능한 전이
validateStatusTransition("rejected", "approved"); // ❌ 에러
```

### 허용 액션 확인

```typescript
import { JOIN_STATUS_ACTIONS } from "./marketJoinStateMachine";

const actions = JOIN_STATUS_ACTIONS["pending"];
console.log("사용자 취소 가능:", actions.userCanCancel); // true
console.log("작성자 관리 가능:", actions.authorCanManage); // true
console.log("재신청 가능:", actions.canReapply); // false
```

---

## 상태별 인원수 처리

| 상태 전이 | currentPeople 영향 |
|----------|-------------------|
| pending → approved | 유지 (이미 증가했으므로) |
| pending → rejected | -1 |
| approved → cancelled_by_user | -1 |
| approved → cancelled_by_author | -1 |
| approved → completed | 유지 |
| approved → no_show | 유지 (노쇼는 인원수 유지) |

---

## 운영 가이드

### 상태별 UI 표시

```typescript
const statusLabels = {
  pending: "대기중",
  approved: "승인됨",
  rejected: "거절됨",
  cancelled_by_user: "취소됨",
  cancelled_by_author: "작성자 취소",
  expired: "만료됨",
  completed: "완료됨",
  no_show: "노쇼",
};
```

### 재신청 가능 여부

```typescript
import { JOIN_STATUS_ACTIONS } from "./marketJoinStateMachine";

const canReapply = JOIN_STATUS_ACTIONS[status].canReapply;
```

---

## 다음 단계

1. **노쇼 처리 로직**
   - 매칭 일시 확인
   - 노쇼 자동 처리

2. **완료 처리 로직**
   - 매칭 완료 시 상태 변경
   - 후기 작성 가능

3. **재모집 로직**
   - 노쇼 발생 시 자동 재모집
   - 대기자 자동 승인
