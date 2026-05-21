# 🔥 채팅방 구조 수정 완료 요약

## ✅ 완료된 수정사항 (우선순위 순)

### 1순위 (P0): Recruit 방 생성 로직 통합 - **완료**

**변경 내용:**
- ✅ `connectRecruitGroup` 함수를 **트랜잭션 기반**으로 변경
- ✅ **idempotent** 보장: 몇 번 호출해도 결과 동일
- ✅ **중복 생성 방지**: 트랜잭션으로 레이스 컨디션 완전 차단
- ✅ 클라이언트 생성 로직 제거:
  - `marketJoinService.ts`에서 방 생성 코드 제거
  - `ChatPage.tsx`의 응급 패치 제거
- ✅ 서버가 유일한 생성자: `onMarketJoinStatusChanged` Cloud Function에서만 생성

**핵심 개선:**
```typescript
// 🔥 트랜잭션으로 안전하게 생성/업데이트
await db.runTransaction(async (transaction) => {
  const roomSnap = await transaction.get(roomRef);
  
  if (!roomSnap.exists) {
    // 없으면 생성
    transaction.set(roomRef, roomData);
  } else {
    // 있으면 멤버만 추가
    transaction.update(roomRef, updateData);
  }
});
```

---

### 2순위 (P0): postSnapshot 추가 - **완료**

**변경 내용:**
- ✅ Recruit 방 생성 시 `postSnapshot` 저장
- ✅ Trade의 `productSnapshot`과 대칭 구조
- ✅ 모집글 삭제되어도 채팅방에서 정보 표시 가능

**postSnapshot 필드:**
```typescript
postSnapshot: {
  postId: string;
  authorId: string;
  title: string;
  category: string;
  location: string;
  time: string;
  maxPeople: number;
  currentPeople: number;
  status: "OPEN" | "CLOSED";
  imageUrl: string;
  postDeletedAt: null | timestamp; // 모집글 삭제 시 업데이트
}
```

---

### 3순위 (P1): 방 상태 필드 통일 - **완료**

**변경 내용:**
- ✅ `status` 필드로 통일: `"active" | "closed" | "archived" | "blocked"`
- ✅ `isDeletedRoom` 로직 개선: status 필드 우선, 하위 호환 유지
- ✅ Trade/Recruit 공통 상태 필드 사용

**상태 판단 로직:**
```typescript
// 1순위: status 필드
if (roomStatus === "closed" || roomStatus === "deleted" || ...) return true;

// 2순위: 하위 호환 (마이그레이션 전)
// Trade: productSnapshot.status
// Recruit: postSnapshot.status + postDeletedAt
```

---

### 4순위 (P1): 메시지 타입 분리 - **타입 정의 완료**

**변경 내용:**
- ✅ 2단계 구조: `type` (큰 분류) + `systemType` (도메인 분류)
- ✅ Trade 전용: `offer_price`, `accept_offer`, `deal_confirmed`, `deal_cancelled`
- ✅ Recruit 전용: `notice`, `schedule_updated`, `member_joined`, `member_approved`, `role_changed`

**다음 단계:**
- 실제 메시지 생성 시 `systemType` 사용
- UI 렌더링에서 `systemType` 기반 분기
- 알림 템플릿에서 `systemType` 활용

---

### 5순위 (P1): 알림 구조 분리 - **완료**

**변경 내용:**
- ✅ `createChatNoti`에 `roomType` 파라미터 추가
- ✅ payload에 `roomType` 저장 (라우팅 규칙 분리용)
- ✅ Trade/Recruit에 따라 알림 내용/우선순위 분기

**알림 분기:**
```typescript
// Trade: 우선순위 high, "새 메시지"
// Recruit: 우선순위 normal, "모집 단체방 새 메시지"
const title = roomType === "recruit_group" ? "모집 단체방 새 메시지" : "새 메시지";
const priority = roomType === "recruit_group" ? "normal" : "high";
```

---

## 📋 변경된 파일

1. **`functions/src/market/chatRoomService.ts`**
   - 트랜잭션 기반 `connectRecruitGroup` 구현
   - postSnapshot 추가
   - status 필드 통일

2. **`src/features/market/services/marketJoinService.ts`**
   - 클라이언트 방 생성 로직 제거
   - 서버로 위임

3. **`src/pages/chat/ChatPage.tsx`**
   - 응급 패치 제거
   - 상태 필드 통일 로직 개선
   - 알림에 roomType 전달

4. **`src/lib/chat/sendMessageCommon.ts`**
   - 메시지 타입 확장 (systemType 추가)

5. **`src/features/notifications/service.ts`**
   - 알림 구조 분리 (roomType 추가)

---

## 🚀 다음 단계 (선택사항)

### 마이그레이션 전략

1. **서버 배포**
   - `functions/src/market/chatRoomService.ts` 변경사항 배포
   - 기존 클라이언트 생성 로직은 이미 제거됨

2. **기존 Recruit 방 backfill (선택)**
   - 기존 Recruit 방에 postSnapshot 추가 스크립트
   - 기존 방의 status 필드 통일

3. **메시지 타입 마이그레이션 (선택)**
   - 새 메시지부터 systemType 사용
   - 구 메시지는 렌더링 호환 레이어로 처리

---

## ✅ 검증 체크리스트

- [x] Recruit 방 생성이 서버에서만 처리됨
- [x] 트랜잭션으로 중복 생성 방지
- [x] postSnapshot이 생성 시 저장됨
- [x] 상태 필드가 통일됨
- [x] 알림에 roomType이 전달됨
- [ ] 서버 배포 완료 (수동)
- [ ] 기존 방 마이그레이션 (선택)
