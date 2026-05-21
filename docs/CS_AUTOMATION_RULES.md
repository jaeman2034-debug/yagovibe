# 🤖 CS 자동화 룰셋

**목표**: 운영 효율화, CS 응답 시간 90% 감소  
**적용 범위**: 배송/만남, 노쇼, 분쟁 처리  
**자동화율**: 80% 이상

---

## 📋 자동화 룰 구조

### 룰 엔진 프레임워크

```typescript
interface AutomationRule {
  id: string;
  name: string;
  trigger: TriggerCondition;
  conditions: Condition[];
  actions: Action[];
  priority: number;
  enabled: boolean;
}

interface TriggerCondition {
  type: "event" | "schedule" | "threshold";
  event?: string;
  schedule?: string;
  threshold?: {
    metric: string;
    operator: ">" | "<" | ">=" | "<=" | "==";
    value: number;
  };
}

interface Condition {
  field: string;
  operator: string;
  value: any;
}

interface Action {
  type: "notification" | "status_update" | "penalty" | "escalate";
  target: string;
  message?: string;
  data?: any;
}
```

---

## 🚚 배송/만남 자동화

### 룰 #1: 배송 지연 알림

**트리거**: 거래 생성 후 24시간 경과

**조건**:
- 거래 상태 = "PAID"
- 배송 상태 = "PENDING" 또는 "SHIPPING"
- 배송 예정일 경과

**액션**:
1. 판매자에게 푸시 알림: "배송이 지연되고 있습니다. 배송 상태를 업데이트해주세요."
2. 구매자에게 알림: "배송이 지연되고 있습니다. 판매자에게 문의하거나 환불을 요청할 수 있습니다."
3. 48시간 후 자동 에스컬레이션 (CS 팀)

**우선순위**: 높음

---

### 룰 #2: 만남 장소 미설정 알림

**트리거**: 거래 생성 후 12시간 경과

**조건**:
- 거래 상태 = "PAID"
- 만남 장소 = null 또는 ""
- 거래 타입 = "DIRECT_TRADE"

**액션**:
1. 판매자에게 푸시 알림: "만남 장소를 설정해주세요. 24시간 내 미설정 시 자동 환불됩니다."
2. 24시간 후 자동 환불 처리

**우선순위**: 높음

---

### 룰 #3: 만남 체크인 미완료 알림

**트리거**: 만남 예정 시간 30분 전

**조건**:
- 거래 상태 = "PAID"
- 만남 예정 시간 ≤ 30분
- 체크인 상태 = false

**액션**:
1. 양쪽 사용자에게 푸시 알림: "만남 시간이 30분 남았습니다. 만남 장소로 이동해주세요."
2. 만남 예정 시간 10분 전 재알림
3. 만남 예정 시간 경과 후 자동 노쇼 체크 시작

**우선순위**: 높음

---

## ⚠️ 노쇼 자동 판정

### 룰 #4: 노쇼 자동 판정 (만남)

**트리거**: 만남 예정 시간 + 30분 경과

**조건**:
- 거래 상태 = "PAID"
- 만남 예정 시간 + 30분 경과
- 체크인 상태 = false (양쪽 모두)
- 또는 한쪽만 체크인 + 다른 쪽 미체크인

**액션**:
1. 노쇼 사용자 자동 판정
2. 평판 자동 감점 (-0.5)
3. 노쇼 사용자에게 알림: "노쇼로 판정되었습니다. 평판이 감소했습니다."
4. 상대방에게 알림: "상대방이 노쇼했습니다. 환불을 요청할 수 있습니다."
5. 노쇼 카운트 +1 (3회 시 계정 제한)
6. 자동 환불 처리 (구매자 보호)

**우선순위**: 매우 높음

---

### 룰 #5: 노쇼 자동 판정 (배송)

**트리거**: 배송 완료 후 3일 경과

**조건**:
- 거래 상태 = "SHIPPED"
- 배송 완료일 + 3일 경과
- 구매 확정 = false

**액션**:
1. 구매자에게 알림: "배송이 완료되었습니다. 3일 내 확정하지 않으면 자동 확정됩니다."
2. 7일 후 자동 구매 확정
3. 판매자에게 정산 알림

**우선순위**: 중간

---

### 룰 #6: 노쇼 패널티 누적

**트리거**: 노쇼 발생 시

**조건**:
- 노쇼 카운트 = 3회
- 계정 상태 = "ACTIVE"

**액션**:
1. 계정 상태 = "RESTRICTED" (제한)
2. 알림: "노쇼 3회로 인해 계정이 제한되었습니다. CS에 문의하세요."
3. CS 팀에 자동 에스컬레이션
4. 거래 제한 (신규 거래 불가)

**우선순위**: 매우 높음

---

## 🔄 분쟁 단계화

### 룰 #7: 분쟁 자동 생성

**트리거**: 환불 요청 또는 신고 접수

**조건**:
- 환불 요청 = true
- 또는 신고 접수 = true
- 분쟁 상태 = null

**액션**:
1. 분쟁 티켓 자동 생성
2. 분쟁 상태 = "PENDING"
3. 양쪽 사용자에게 알림: "분쟁이 접수되었습니다. 24시간 내 응답해주세요."
4. CS 팀에 자동 할당
5. 24시간 내 응답 없으면 자동 판정 시작

**우선순위**: 높음

---

### 룰 #8: 분쟁 1단계 - 자동 조정

**트리거**: 분쟁 생성 후 24시간 경과

**조건**:
- 분쟁 상태 = "PENDING"
- 양쪽 사용자 응답 = true
- 분쟁 타입 = "REFUND" 또는 "QUALITY_ISSUE"

**액션**:
1. 자동 조정 시도:
   - 환불 요청 → 에스크로 자동 환불 (구매자 보호)
   - 품질 문제 → 부분 환불 제안 (50% 환불)
   - 배송 지연 → 배송비 환불
2. 양쪽 사용자에게 조정안 제시
3. 48시간 내 수락/거부 대기
4. 수락 시 자동 처리, 거부 시 2단계 에스컬레이션

**우선순위**: 중간

---

### 룰 #9: 분쟁 2단계 - CS 개입

**트리거**: 분쟁 1단계 거부 또는 48시간 경과

**조건**:
- 분쟁 상태 = "PENDING"
- 자동 조정 실패 또는 거부

**액션**:
1. 분쟁 상태 = "ESCALATED"
2. CS 팀에 자동 할당 (우선순위 높음)
3. 양쪽 사용자에게 알림: "CS 팀이 검토 중입니다. 3일 내 처리됩니다."
4. CS 팀 대시보드에 분쟁 티켓 표시
5. 3일 내 수동 처리 필요

**우선순위**: 높음

---

### 룰 #10: 분쟁 3단계 - 최종 판정

**트리거**: CS 개입 후 3일 경과

**조건**:
- 분쟁 상태 = "ESCALATED"
- CS 처리 = false

**액션**:
1. 자동 최종 판정:
   - 구매자 보호 우선 (환불 처리)
   - 평판 점수 기반 판정 (높은 평판 우선)
   - 거래 내역 기반 판정 (증거 우선)
2. 양쪽 사용자에게 최종 판정 알림
3. 분쟁 상태 = "RESOLVED"
4. 필요 시 자동 환불/정산 처리

**우선순위**: 중간

---

## 📞 템플릿 메시지

### 배송/만남 템플릿

#### 템플릿 #1: 배송 지연 알림

```
[배송 지연 알림]

안녕하세요, {판매자명}님.

{구매자명}님의 주문이 배송 지연 중입니다.
배송 상태를 업데이트해주세요.

- 주문번호: {거래ID}
- 주문일: {주문일}
- 예상 배송일: {예상배송일}

24시간 내 업데이트하지 않으면 자동 환불될 수 있습니다.
```

#### 템플릿 #2: 만남 장소 미설정 알림

```
[만남 장소 설정 필요]

안녕하세요, {판매자명}님.

직거래를 위한 만남 장소가 설정되지 않았습니다.
24시간 내 설정하지 않으면 자동 환불됩니다.

- 거래번호: {거래ID}
- 만남 예정일: {만남일}

만남 장소를 설정해주세요.
```

#### 템플릿 #3: 만남 체크인 알림

```
[만남 시간 알림]

안녕하세요, {사용자명}님.

만남 시간이 30분 남았습니다.
만남 장소로 이동해주세요.

- 만남 장소: {장소명}
- 만남 시간: {만남시간}
- 상대방: {상대방명}

체크인을 완료하면 거래가 진행됩니다.
```

---

### 노쇼 템플릿

#### 템플릿 #4: 노쇼 판정 알림

```
[노쇼 판정 알림]

안녕하세요, {사용자명}님.

{날짜} {시간} 예정된 만남에서 노쇼로 판정되었습니다.

- 거래번호: {거래ID}
- 상대방: {상대방명}
- 노쇼 시간: {노쇼시간}

노쇼로 인해 평판이 -0.5 감소했습니다.
노쇼 3회 시 계정이 제한될 수 있습니다.
```

#### 템플릿 #5: 노쇼 누적 경고

```
[노쇼 누적 경고]

안녕하세요, {사용자명}님.

현재 노쇼 {횟수}회가 누적되었습니다.
노쇼 3회 시 계정이 제한됩니다.

- 현재 노쇼 횟수: {횟수}회
- 남은 기회: {남은기회}회

정상적인 거래를 위해 만남 시간을 준수해주세요.
```

---

### 분쟁 템플릿

#### 템플릿 #6: 분쟁 접수 알림

```
[분쟁 접수 알림]

안녕하세요, {사용자명}님.

{상대방명}님으로부터 분쟁이 접수되었습니다.

- 거래번호: {거래ID}
- 분쟁 사유: {사유}
- 접수일: {접수일}

24시간 내 응답해주세요.
응답하지 않으면 자동 판정될 수 있습니다.
```

#### 템플릿 #7: 분쟁 조정안 제시

```
[분쟁 조정안]

안녕하세요, {사용자명}님.

분쟁에 대한 조정안이 제시되었습니다.

- 거래번호: {거래ID}
- 조정안: {조정안}
- 제시일: {제시일}

48시간 내 수락/거부를 선택해주세요.
수락하지 않으면 CS 팀이 개입합니다.
```

#### 템플릿 #8: 분쟁 최종 판정

```
[분쟁 최종 판정]

안녕하세요, {사용자명}님.

분쟁에 대한 최종 판정이 완료되었습니다.

- 거래번호: {거래ID}
- 판정 결과: {결과}
- 판정 사유: {사유}
- 처리일: {처리일}

판정 결과에 이의가 있으시면 CS에 문의해주세요.
```

---

## 🔧 자동화 실행 로직

### Cloud Function 구조

```typescript
// functions/src/cs/automationEngine.ts

import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { db, FieldValue } from "../firebase";

/**
 * 거래 생성 시 자동화 룰 실행
 */
export const onTradeCreated = onDocumentCreated(
  "trades/{tradeId}",
  async (event) => {
    const trade = event.data?.data();
    if (!trade) return;

    // 룰 #2: 만남 장소 미설정 알림 (12시간 후)
    if (trade.type === "DIRECT_TRADE" && !trade.meetingPlace) {
      await scheduleNotification(trade.id, "seller", "MEETING_PLACE_REQUIRED", 12 * 60 * 60 * 1000);
    }

    // 룰 #1: 배송 지연 알림 (24시간 후)
    if (trade.type === "SHIPPING" && trade.status === "PAID") {
      await scheduleNotification(trade.id, "seller", "SHIPPING_DELAY", 24 * 60 * 60 * 1000);
    }
  }
);

/**
 * 거래 업데이트 시 자동화 룰 실행
 */
export const onTradeUpdated = onDocumentUpdated(
  "trades/{tradeId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    // 룰 #4: 노쇼 자동 판정
    if (after.status === "PAID" && after.meetingTime) {
      const meetingTime = after.meetingTime.toDate();
      const now = new Date();
      const diff = meetingTime.getTime() - now.getTime();

      if (diff <= 30 * 60 * 1000 && !after.checkInStatus) {
        await checkNoShow(after.id, after);
      }
    }
  }
);

/**
 * 노쇼 체크 함수
 */
async function checkNoShow(tradeId: string, trade: any) {
  const tradeRef = db.collection("trades").doc(tradeId);
  const tradeSnap = await tradeRef.get();
  const currentTrade = tradeSnap.data();

  if (!currentTrade) return;

  const meetingTime = currentTrade.meetingTime.toDate();
  const now = new Date();
  const diff = now.getTime() - meetingTime.getTime();

  // 만남 예정 시간 + 30분 경과
  if (diff >= 30 * 60 * 1000) {
    const buyerCheckIn = currentTrade.buyerCheckIn || false;
    const sellerCheckIn = currentTrade.sellerCheckIn || false;

    // 양쪽 모두 미체크인 또는 한쪽만 체크인
    if (!buyerCheckIn || !sellerCheckIn) {
      const noShowUserId = !buyerCheckIn ? currentTrade.buyerId : currentTrade.sellerId;

      // 노쇼 판정
      await applyNoShowPenalty(noShowUserId, tradeId);
    }
  }
}

/**
 * 노쇼 패널티 적용
 */
async function applyNoShowPenalty(userId: string, tradeId: string) {
  // 평판 감점
  await db.collection("users").doc(userId).update({
    reputation: FieldValue.increment(-0.5),
    noShowCount: FieldValue.increment(1),
  });

  // 노쇼 카운트 확인
  const userSnap = await db.collection("users").doc(userId).get();
  const user = userSnap.data();
  const noShowCount = user?.noShowCount || 0;

  // 룰 #6: 노쇼 3회 시 계정 제한
  if (noShowCount >= 3) {
    await db.collection("users").doc(userId).update({
      accountStatus: "RESTRICTED",
      restrictedAt: FieldValue.serverTimestamp(),
    });

    // CS 팀에 에스컬레이션
    await db.collection("cs_tickets").add({
      type: "ACCOUNT_RESTRICTION",
      userId,
      reason: "NO_SHOW_3_TIMES",
      status: "PENDING",
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  // 알림 전송
  await sendNotification(userId, "NO_SHOW_PENALTY", {
    tradeId,
    noShowCount,
  });

  logger.info("[applyNoShowPenalty] 노쇼 패널티 적용:", { userId, tradeId, noShowCount });
}

/**
 * 알림 스케줄링
 */
async function scheduleNotification(
  tradeId: string,
  target: "buyer" | "seller",
  type: string,
  delay: number
) {
  const executeAt = new Date(Date.now() + delay);

  await db.collection("scheduled_notifications").add({
    tradeId,
    target,
    type,
    executeAt,
    status: "PENDING",
    createdAt: FieldValue.serverTimestamp(),
  });
}

/**
 * 알림 전송
 */
async function sendNotification(userId: string, type: string, data: any) {
  // FCM 알림 전송 로직
  // (기존 push.ts 활용)
}
```

---

## 📊 모니터링 지표

### CS 자동화 효과 지표

- **자동화율**: 80% 이상
- **평균 응답 시간**: 5분 이하
- **CS 티켓 수**: 50% 감소
- **사용자 만족도**: 4.5/5.0 이상

### 룰별 실행 통계

- 배송/만남 알림: 일 100건
- 노쇼 판정: 일 10건
- 분쟁 처리: 일 5건

---

## 🎯 우선순위 실행 계획

### Week 1: 핵심 룰 구현

**Day 1-2**: 룰 #4, #6 (노쇼 자동 판정)
**Day 3-4**: 룰 #1, #2, #3 (배송/만남 알림)
**Day 5-7**: 룰 #7, #8, #9 (분쟁 처리)

### Week 2: 고도화

**Day 8-10**: 템플릿 메시지 최적화
**Day 11-14**: 모니터링 대시보드 구축

---

**CS 자동화 룰셋 완성**
