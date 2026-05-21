# 🔥 매칭 참여 자동 취소 시스템 (운영 안정화)

## 개요

무응답 참여 신청을 자동으로 거절하여 시스템 안정성을 확보합니다.

---

## 기능

### 1. 자동 거절 (무응답 처리)

**조건:**
- `status = "pending"` 상태
- 생성 후 10분 경과 (기본값)
- 작성자가 승인/거절하지 않음

**처리:**
- `status = "rejected"`로 변경
- `rejectedReason = "AUTO_TIMEOUT"` 기록
- `currentPeople -1` (인원수 감소)

---

### 2. 승인 취소 처리

**조건:**
- `status = "approved"` 상태
- 본인만 취소 가능

**처리:**
- `status = "cancelled"`로 변경
- `currentPeople -1` (인원수 감소)
- 채팅방 권한 제거 (추후 구현)

---

## 사용 방법

### 자동 거절 실행

```typescript
import { autoRejectPendingJoins } from "@/features/market/services/marketJoinAutoCancel";

// 게시글의 무응답 신청 자동 거절
const result = await autoRejectPendingJoins(postId, 10); // 10분 타임아웃

console.log("자동 거절 완료:", {
  rejected: result.rejected,
  rejectedIds: result.rejectedIds,
});
```

### 승인 취소

```typescript
import { cancelApprovedJoin } from "@/features/market/services/marketJoinAutoCancel";

// 승인된 참여 신청 취소
await cancelApprovedJoin(joinId, postId, userId);
```

---

## 스케줄링 (Cloud Function 권장)

### 주기적 실행

```typescript
// functions/src/scheduled/autoRejectPendingJoins.ts
import * as functions from "firebase-functions";
import { autoRejectPendingJoins } from "./marketJoinAutoCancel";

export const autoRejectPendingJoinsScheduled = functions.pubsub
  .schedule("every 5 minutes")
  .onRun(async (context) => {
    // 모든 게시글의 무응답 신청 자동 거절
    // (구현 필요: 게시글 목록 조회 후 각각 실행)
  });
```

---

## 로깅

모든 자동 거절 및 취소 작업은 콘솔에 로그를 남깁니다:

```javascript
🔥 [autoRejectPendingJoins] 시작: { postId, timeoutMinutes }
📋 [autoRejectPendingJoins] 만료된 신청: { total, expired }
✅ [autoRejectPendingJoins] 자동 거절 완료: { joinId, userId }
✅ [autoRejectPendingJoins] 완료: { rejected, rejectedIds }
```

---

## 다음 단계

1. **Cloud Function 스케줄러 구현**
2. **로깅 시스템 연동**
3. **관리자 대시보드 연동**
