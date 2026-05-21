# ✅ 채팅 연결 + 인원 초과 차단 완료 보고서

## 🎯 작업 목표

1. **채팅 연결**: 승인된 사용자만 채팅방 자동 생성 및 접근
2. **인원 초과 차단**: approved 기준으로만 카운트, maxPeople >= currentPeople 시 신청 불가

---

## ✅ 완료된 작업

### 1️⃣ 채팅 연결 구현

#### A. 승인된 사용자에게 "채팅하기" 버튼 표시

**위치**: `src/features/market/components/details/RecruitDetail.tsx:1524-1533`

**변경 내용**:
- 기존: 승인 시 "참여 확정됨" (비활성 버튼)
- 개선: 승인 시 "채팅하기" (활성 버튼, 클릭 시 채팅방 이동)

```tsx
// 케이스 4: 승인됨 → 채팅하기 버튼 표시
if (normalizedStatus === "approved") {
  return (
    <button
      onClick={handleChat}
      className="w-full py-3 rounded-xl bg-green-600 text-white font-medium transition-all hover:bg-green-700 active:scale-95 flex items-center justify-center gap-2"
    >
      <MessageCircle className="w-5 h-5" />
      채팅하기
    </button>
  );
}
```

#### B. 채팅방 자동 생성 (Functions)

**위치**: `functions/src/market/onMarketJoinStatusChanged.ts:101-133`

**구현 내용**:
- ✅ 승인 시 채팅방 자동 생성 (`chatRooms/{postId}_{userId}_{authorId}`)
- ✅ 이미 방 있으면 재사용
- ✅ 시스템 메시지 자동 발송

**채팅방 구조**:
```typescript
{
  productId: postId,
  buyerId: userId,
  sellerId: post.authorId,
  participants: [userId, post.authorId],
  createdAt: serverTimestamp(),
  unreadCount: {
    [userId]: 0,
    [post.authorId]: 0,
  },
  productSnapshot: {
    productId: postId,
    title: postTitle,
    price: post.price || post.fee || 0,
    imageUrl: post.images?.[0] || "",
  },
}
```

#### C. 채팅 버튼 클릭 시 채팅방 이동

**위치**: `src/features/market/components/details/RecruitDetail.tsx:741-820`

**구현 내용**:
- ✅ 승인된 사용자만 채팅 가능
- ✅ 채팅방 ID 생성 (`buildChatRoomId`)
- ✅ 채팅방 생성/재사용 (`ensureChatRoom`)
- ✅ 채팅 페이지로 이동 (`/app/chat/${chatRoomId}`)

---

### 2️⃣ 인원 초과 차단 구현

#### A. Firestore Rules에 인원 초과 차단 추가

**위치**: `firestore.rules:195-203`

**구현 내용**:
- ✅ `isNotFull()` Helper 함수 추가
- ✅ `marketJoins` 생성 시 인원 초과 체크
- ✅ `approved` 기준으로만 카운트 (서버에서 처리하지만 Rules에서도 방어)

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

#### B. 클라이언트에서 인원 초과 체크 (이미 구현됨)

**위치**: `src/features/market/services/marketJoinService.ts:141-159`

**구현 내용**:
- ✅ 신청 전 인원수 체크
- ✅ 트랜잭션 내부에서 재확인 (race condition 방어)

```typescript
// 5. 인원수 체크
if (post.people && post.currentPeople && post.currentPeople >= post.people) {
  throw new Error("모집 인원이 마감되었습니다.");
}

// 트랜잭션 내부에서 재확인
const currentPost = currentPostSnap.data() as MarketPost;
if (currentPost.people && currentPost.currentPeople && currentPost.currentPeople >= currentPost.people) {
  throw new Error("모집 인원이 마감되었습니다.");
}
```

#### C. Functions에서 인원 증가 처리 (이미 구현됨)

**위치**: `functions/src/market/onMarketJoinStatusChanged.ts:79-99`

**구현 내용**:
- ✅ 승인 시 `currentPeople` 증가 (서버 권한)
- ✅ `currentPeople >= maxPeople` 시 자동 마감 (`status: "done"`)
- ✅ 트랜잭션으로 원자성 보장

---

## 🔒 보안 및 안정성

### 멱등성 보장 ✅
- ✅ `once()` 헬퍼로 중복 실행 방지
- ✅ Idempotency 키 기반 처리

### Race Condition 방어 ✅
- ✅ Firestore Rules에서 인원 초과 차단
- ✅ 클라이언트에서 트랜잭션 내부 재확인
- ✅ Functions에서 서버 권한으로 처리

### Fail-safe 처리 ✅
- ✅ 채팅방 생성 실패해도 에러 메시지 표시
- ✅ 인원 초과 시 명확한 에러 메시지

---

## 📊 구현 상태

| 기능 | 상태 | 비고 |
|------|------|------|
| 승인 시 채팅방 자동 생성 | ✅ 완료 | Functions에서 처리 |
| 승인된 사용자 채팅하기 버튼 | ✅ 완료 | UI에 표시 |
| 인원 초과 차단 (Rules) | ✅ 완료 | Firestore Rules에 추가 |
| 인원 초과 차단 (클라이언트) | ✅ 완료 | 이미 구현됨 |
| 인원 초과 차단 (Functions) | ✅ 완료 | 이미 구현됨 |

---

## 🎯 사용자 플로우

### 승인된 사용자 플로우

1. **참여 신청** → `status: "pending"`
2. **작성자 승인** → `status: "approved"`
3. **Functions 트리거**:
   - `currentPeople +1`
   - 채팅방 자동 생성
   - 시스템 메시지 발송
   - 알림 발송
4. **UI 업데이트**:
   - "참여 확정됨" → "채팅하기" 버튼 표시
5. **채팅하기 클릭**:
   - 채팅방 이동 (`/app/chat/${chatRoomId}`)

### 인원 초과 시 플로우

1. **신청 시도** → 클라이언트에서 체크
2. **인원 초과** → "모집 인원이 마감되었습니다." 에러
3. **Firestore Rules** → 추가 방어 (클라이언트 우회 시도 차단)
4. **Functions** → 서버 권한으로 최종 보호

---

## ✅ 결론

**채팅 연결 + 인원 초과 차단이 완료되었습니다.**

- 승인된 사용자만 채팅 가능
- 인원 초과 시 신청 불가 (3중 방어: 클라이언트 + Rules + Functions)
- 채팅방 자동 생성 및 시스템 메시지 발송

**모집 기능 완성 단계 도달** 🚀
