# 🔥 매칭 참여 상태 머신 (대회급 안정성)

## 상태 정의

### JoinStatus 타입

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

### pending (대기 중)

**전이 가능:**
- `approved` (작성자 승인)
- `rejected` (작성자 거절)
- `cancelled_by_user` (사용자 취소)
- `expired` (자동 만료)

**허용 액션:**
- 사용자: 취소 가능
- 작성자: 승인/거절 가능

---

### approved (승인됨)

**전이 가능:**
- `cancelled_by_user` (사용자 취소)
- `cancelled_by_author` (작성자 취소)
- `completed` (매칭 완료)
- `no_show` (노쇼)

**허용 액션:**
- 사용자: 취소 가능
- 작성자: 취소 가능

---

### rejected (거절됨)

**전이 가능:**
- `pending` (재신청)

**허용 액션:**
- 사용자: 재신청 가능
- 작성자: 관리 불가

---

### cancelled_by_user (사용자 취소)

**전이 가능:**
- `pending` (재신청)

**허용 액션:**
- 사용자: 재신청 가능
- 작성자: 관리 불가

---

### cancelled_by_author (작성자 취소)

**전이 가능:**
- `pending` (재신청)

**허용 액션:**
- 사용자: 재신청 가능
- 작성자: 관리 불가

---

### expired (만료됨)

**전이 가능:**
- `pending` (재신청)

**허용 액션:**
- 사용자: 재신청 가능
- 작성자: 관리 불가

---

### completed (완료됨)

**전이 가능:**
- 없음 (최종 상태)

**허용 액션:**
- 사용자: 관리 불가
- 작성자: 관리 불가

---

### no_show (노쇼)

**전이 가능:**
- 없음 (최종 상태)

**허용 액션:**
- 사용자: 관리 불가
- 작성자: 관리 불가

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
```

---

## 상태별 인원수 처리

| 상태 | currentPeople 영향 |
|------|-------------------|
| pending → approved | 유지 (이미 증가했으므로) |
| pending → rejected | -1 |
| approved → cancelled_by_user | -1 |
| approved → cancelled_by_author | -1 |
| approved → completed | 유지 |
| approved → no_show | 유지 (노쇼는 인원수 유지) |

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
