# ✅ 채팅 연결 + 인원 초과 차단 완료 보고서

## 🎯 작업 목표

1. **채팅 연결**: 승인된 사용자만 채팅방 자동 연결, 취소 시 자동 제거
2. **인원 초과 차단**: 3중 방어 (클라이언트 + Rules + Functions)

---

## ✅ 완료된 작업

### 1️⃣ 채팅 연결 구현

#### A. 승인 시 채팅방 자동 연결

**위치**: `functions/src/market/onMarketJoinStatusChanged.ts:101-133`

**구현 내용**:
- ✅ 승인 시 채팅방 자동 생성 (`chatRooms/{postId}_{userId}_{authorId}`)
- ✅ 기존 채팅방이 있으면 `participants`에 추가 (`arrayUnion`)
- ✅ 중복 방지 로직 포함

```typescript
if (!chatRoomSnap.exists) {
  // 채팅방 생성
  await chatRoomRef.set({
    productId: postId,
    buyerId: userId,
    sellerId: post.authorId,
    participants: [userId, post.authorId],
    // ...
  });
} else {
  // 기존 채팅방이 있으면 participants에 추가
  if (!existingParticipants.includes(userId)) {
    await chatRoomRef.update({
      participants: admin.firestore.FieldValue.arrayUnion(userId),
    });
  }
}
```

#### B. 취소 시 채팅방에서 제거

**위치**: `functions/src/market/onMarketJoinStatusChanged.ts:418-433`

**구현 내용**:
- ✅ 취소 시 채팅방에서 참여자 제거 (`arrayRemove`)
- ✅ 시스템 메시지 발송 (작성자가 남아있는 경우만)
- ✅ 안전 가드 포함

```typescript
if (chatRoomSnap.exists) {
  const existingParticipants = existingData?.participants || [];
  
  if (existingParticipants.includes(userId)) {
    await chatRoomRef.update({
      participants: admin.firestore.FieldValue.arrayRemove(userId),
    });
  }
}
```

#### C. Firestore Rules 보안 강화

**위치**: `firestore.rules:392-401`

**구현 내용**:
- ✅ 승인된 사용자만 채팅방 읽기/쓰기 가능
- ✅ `isApprovedForPost()` Helper 함수 사용
- ✅ 일반 채팅방은 `participants` 배열 체크

```javascript
// 채팅방 읽기: 참여자만 가능
allow read: if isSignedIn() && (
  // market 매칭 채팅방 - approved 상태 필수
  (resource.data.get('productId', null) != null && isApprovedForPost(resource.data.get('productId', null)))
  ||
  // 일반 채팅방 - participants 배열 체크
  (resource.data.get('productId', null) == null && isParticipant())
);
```

---

### 2️⃣ 인원 초과 차단 구현

#### A. Functions에서 승인 시 이중 체크

**위치**: `functions/src/market/onMarketJoinStatusChanged.ts:78-99`

**구현 내용**:
- ✅ 승인 시 인원 초과 체크 (race condition 방어)
- ✅ 인원 초과 시 자동 거절로 롤백
- ✅ 자동 거절 알림 발송

```typescript
// 🔥 인원 초과 시 자동 거절로 롤백
if (maxPeople > 0 && beforeCurrentPeople >= maxPeople) {
  // 자동 거절로 롤백
  await db.doc(`marketJoins/${joinId}`).update({
    status: "rejected",
    rejectedReason: "FULL_AUTO",
  });
  
  // 자동 거절 알림 발송
  await notifyMarketJoin(userId, {
    type: "JOIN_REJECTED_FULL",
    title: "매칭 참여 자동 거절",
    body: `"${postTitle}" 매칭이 모집 인원이 마감되어 자동 거절되었습니다.`,
  });
  
  return; // 여기서 종료
}
```

#### B. Firestore Rules에 인원 초과 차단

**위치**: `firestore.rules:195-203`

**구현 내용**:
- ✅ `isNotFull()` Helper 함수 추가
- ✅ `marketJoins` 생성 시 인원 초과 체크
- ✅ `approved` 기준으로만 카운트

```javascript
// 🔥 Helper: 인원 초과 체크 (approved 기준으로만 카운트)
function isNotFull(postId) {
  let marketDoc = get(/databases/$(database)/documents/market/$(postId));
  let currentPeople = marketDoc.data.currentPeople;
  let maxPeople = marketDoc.data.people;
  // people이 0이면 무제한 모집
  return maxPeople == 0 || currentPeople < maxPeople;
}

// 생성 시 인원 초과 차단
allow create: if isSignedIn()
  && request.auth.uid == request.resource.data.userId
  && request.resource.data.status == "pending"
  // ... 기타 조건
  && isNotFull(request.resource.data.postId); // 🔥 인원 초과 차단
```

#### C. 클라이언트에서 인원 초과 체크 (이미 구현됨)

**위치**: `src/features/market/services/marketJoinService.ts:141-159`

**구현 내용**:
- ✅ 신청 전 인원수 체크
- ✅ 트랜잭션 내부에서 재확인 (race condition 방어)

---

## 🔒 보안 및 안정성

### 3중 방어 체계 ✅

1. **클라이언트**: 신청 전 체크 + 트랜잭션 내부 재확인
2. **Firestore Rules**: 생성 시 인원 초과 차단
3. **Functions**: 승인 시 이중 체크 + 자동 거절

### 멱등성 보장 ✅
- ✅ `once()` 헬퍼로 중복 실행 방지
- ✅ Idempotency 키 기반 처리

### Race Condition 방어 ✅
- ✅ 트랜잭션으로 원자성 보장
- ✅ Functions에서 승인 시 재확인
- ✅ 인원 초과 시 자동 거절

---

## 📊 구현 상태

| 기능 | 상태 | 비고 |
|------|------|------|
| 승인 시 채팅방 자동 연결 | ✅ 완료 | participants 추가 |
| 취소 시 채팅방에서 제거 | ✅ 완료 | arrayRemove 사용 |
| Firestore Rules 보안 강화 | ✅ 완료 | approved 상태 체크 |
| 인원 초과 차단 (Rules) | ✅ 완료 | isNotFull() 함수 |
| 인원 초과 차단 (Functions) | ✅ 완료 | 자동 거절 로직 |
| 인원 초과 차단 (클라이언트) | ✅ 완료 | 이미 구현됨 |

---

## 🎯 사용자 플로우

### 승인 플로우

1. **참여 신청** → `status: "pending"`
2. **작성자 승인** → `status: "approved"`
3. **Functions 트리거**:
   - 인원 초과 체크 (이중 체크)
   - 인원 초과 시 → 자동 거절
   - 인원 정상 시 → `currentPeople +1`
   - 채팅방 자동 생성/연결 (`participants`에 추가)
   - 시스템 메시지 발송
   - 알림 발송
4. **UI 업데이트**:
   - "참여 확정됨" → "채팅하기" 버튼 표시
5. **채팅하기 클릭**:
   - 채팅방 이동 (`/app/chat/${chatRoomId}`)

### 취소 플로우

1. **참여 취소** → `status: "cancelled_by_user"` 또는 `cancelled_by_author`
2. **Functions 트리거**:
   - `currentPeople -1`
   - 채팅방에서 참여자 제거 (`arrayRemove`)
   - 시스템 메시지 발송 (작성자가 남아있는 경우만)
   - 알림 발송

### 인원 초과 플로우

1. **신청 시도** → 클라이언트에서 체크
2. **인원 초과** → "모집 인원이 마감되었습니다." 에러
3. **Firestore Rules** → 추가 방어 (클라이언트 우회 시도 차단)
4. **Functions 승인 시** → 최종 체크 + 자동 거절

---

## ✅ 결론

**채팅 연결 + 인원 초과 차단이 완료되었습니다.**

- 승인된 사용자만 채팅 가능 (자동 연결)
- 취소 시 채팅방에서 자동 제거
- 인원 초과 시 3중 방어 (클라이언트 + Rules + Functions)
- 자동 거절 및 알림 발송

**모집 기능 완성 단계 도달** 🚀
