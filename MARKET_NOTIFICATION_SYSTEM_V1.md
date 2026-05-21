# 🔥 마켓 알림 시스템 v1 구현 완료

## ✅ 완료된 작업

### 1. 알림 타입 추가
- **파일**: `src/types/notification.ts`
- **추가된 타입**:
  - `MARKET_CHAT_MESSAGE` - 채팅 메시지 수신
  - `MARKET_TRANSACTION_COMPLETE` - 거래 완료 요청
  - `MARKET_POST_UPDATED` - 찜한 글 업데이트
  - `MARKET_POST_LIKED` - 내 글에 찜하기

### 2. 마켓 알림 서비스 생성
- **파일**: `src/services/marketNotificationService.ts`
- **함수**:
  - `notifyChatMessage` - 채팅 메시지 수신 알림
  - `notifyTransactionComplete` - 거래 완료 알림
  - `notifyPostUpdated` - 찜한 글 업데이트 알림
  - `notifyPostLiked` - 내 글에 찜하기 알림

### 3. 알림 생성 트리거 연결

#### 채팅 메시지 수신 시
- **위치**: `src/lib/chat/sendMessageCommon.ts`
- **조건**: `room.type === "trade"` (마켓 거래 채팅방)
- **알림**: 상대방에게 `MARKET_CHAT_MESSAGE` 알림 생성

#### 거래 완료 요청 시
- **위치**: `src/features/market/components/CompleteTransactionButton.tsx`
- **알림**: 구매자에게 `MARKET_TRANSACTION_COMPLETE` 알림 생성
- **구매자 조회**: 채팅방에서 `buyerId` 조회

#### 찜하기 클릭 시
- **위치**: `src/features/market/components/VisitorActions.tsx`
- **조건**: 찜하기 추가 시 (`newLiked === true`)
- **알림**: 작성자에게 `MARKET_POST_LIKED` 알림 생성

### 4. UI 통합
- **알림 아이콘**: `src/components/notification/NotificationBell.tsx` (기존 사용)
- **알림 리스트**: `src/pages/notification/NotificationsPage.tsx` (마켓 알림 타입 아이콘 추가)

## 📐 구조 설계

### 알림 생성 플로우

```
사용자 행동 발생
  ↓
트리거 함수 호출
  ↓
marketNotificationService.* 호출
  ↓
createNoti() 호출 (기존 알림 서비스)
  ↓
notifications 컬렉션에 저장
  ↓
실시간 구독으로 UI 업데이트
```

### 알림 타입별 처리

1. **채팅 메시지 수신**
   - 트리거: `sendMessageCommon` (메시지 전송 시)
   - 수신자: 상대방 (`otherParticipants`)
   - 딥링크: `screen: "chat", id: chatRoomId`

2. **거래 완료 요청**
   - 트리거: `CompleteTransactionButton` (거래 완료 처리 시)
   - 수신자: 구매자 (채팅방에서 조회)
   - 딥링크: `screen: "trade", id: postId`

3. **찜한 글 업데이트**
   - 트리거: 게시글 업데이트 시 (v2에서 구현 예정)
   - 수신자: 찜한 사용자들 (찜 목록에서 조회)
   - 딥링크: `screen: "trade", id: postId`

4. **내 글에 찜하기**
   - 트리거: `VisitorActions` (찜하기 추가 시)
   - 수신자: 글 작성자
   - 딥링크: `screen: "trade", id: postId`

## 🔗 통합 지점

### 기존 알림 시스템 활용
- `src/lib/notifications/service.ts`의 `createNoti` 함수 재사용
- `src/components/notification/NotificationBell.tsx` 자동 표시
- `src/pages/notification/NotificationsPage.tsx` 자동 표시

### 비동기 로딩
- 모든 알림 호출은 `import()` 동적 로딩 사용
- 에러 발생 시에도 UX 영향 없음 (catch로 무시)

## 🎯 효과

### 사용자 관점

1. **재방문 유도**
   - 새 메시지 도착 시 즉시 알림
   - 거래 완료 시 리뷰 작성 유도
   - 찜한 상품 업데이트 시 재확인 유도

2. **거래 진행 상황 즉시 전달**
   - 채팅 메시지 수신 알림
   - 거래 완료 알림
   - 상품 상태 변경 알림

3. **참여도 증가**
   - 내 글에 찜하기 알림으로 관심도 파악
   - 실시간 알림으로 빠른 응답 유도

## ✅ 검증 체크리스트

- [x] 알림 타입 추가 (MARKET_CHAT_MESSAGE, MARKET_TRANSACTION_COMPLETE, MARKET_POST_UPDATED, MARKET_POST_LIKED)
- [x] 마켓 알림 서비스 생성
- [x] 채팅 메시지 수신 알림 트리거 연결
- [x] 거래 완료 알림 트리거 연결
- [x] 찜하기 알림 트리거 연결
- [x] 알림 리스트 페이지에 마켓 알림 아이콘 추가
- [x] 비동기 로딩으로 UX 영향 없음

## 🚀 다음 단계

### 1️⃣ 찜한 글 업데이트 알림 (v2)
- 게시글 업데이트 시 찜한 사용자 조회
- 가격 변경, 상태 변경 등에 따른 알림

### 2️⃣ 푸시 알림
- Firebase Cloud Messaging 연동
- 앱 백그라운드 시 푸시 알림 전송

### 3️⃣ 가격 하락 알림
- 찜한 상품 가격 하락 시 알림
- 가격 모니터링 시스템 구축

### 4️⃣ 관심 종목 신규 글 알림
- 사용자 관심 종목 기반 신규 글 알림
- 개인화된 알림 설정

---

**마켓 알림 시스템 v1 구현 완료! 이제 사용자 행동 발생 시 알림이 생성되고, 사용자가 다시 앱에 돌아오게 유도됩니다.** 🎉
