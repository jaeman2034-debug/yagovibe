# 채팅 아키텍처 검증 문서 (1~5번)

실제 코드·Firestore·Cloud Functions 기준으로 5가지 항목을 점검·정리한 문서입니다.

---

## 1️⃣ 채팅 Firestore 전체 DB 구조 (실서비스 설계)

### 컬렉션 구조

| 경로 | 용도 | 비고 |
|------|------|------|
| `chatRooms/{roomId}` | 채팅방 메타 (1:1 거래 / 모집 단체방) | 루트 문서 |
| `chatRooms/{roomId}/messages/{messageId}` | 메시지 서브컬렉션 | 실시간 구독·페이지네이션 |
| `users/{uid}/devices/{deviceId}` | FCM 토큰 (디바이스별) | 푸시 알림용 |

### chatRooms 문서 스키마

```typescript
// Trade (거래 채팅)
{
  productId: string;
  buyerId: string;
  sellerId: string;
  type: "trade";
  members: string[];           // [buyerId, sellerId]
  participants: string[];      // 하위 호환
  roles: { [uid]: "seller" | "buyer" };
  lastMessage: string;
  lastMessageAt: Timestamp;
  lastReadAt?: { [uid]: Timestamp };
  unreadCount?: { [uid]: number };
  createdAt: Timestamp;
  productSnapshot?: {
    productId: string;
    title: string;
    price: number;
    imageUrl: string;
    location: string;
    category: string;
    status: "ACTIVE" | "SOLD" | ...;
  };
  status?: "open" | "closed";  // 모집 마감 시 푸시 스킵
}

// Recruit (모집 단체방)
// roomId = teamRecruit_{postId}
{
  type: "recruit_group";
  postId: string;
  members: string[];
  participants: string[];
  roles?: { [uid]: string };
  lastMessage, lastMessageAt, lastReadAt, unreadCount, ...
}
```

### messages 서브컬렉션 스키마

```typescript
{
  seq: number;                 // 방 내 단조 증가 (unread 계산·정렬 보조)
  senderId: string;
  text: string;
  type: "message" | "image" | "video" | "location" | "system";
  systemType?: "offer_price" | "accept_offer" | "deal_confirmed" | ...;
  createdAt: Timestamp;
  readBy?: string[];          // 읽음 표시
  clientId?: string;           // Optimistic UI 매칭용
  clientMessageId?: string;
  images?: ChatImage[];
  videos?: ChatVideo[];
  location?: { lat, lng, address? };
  inputMode?: "typing" | "voice";
  stt?: { provider, confidence?, language?, durationMs? };
}
```

### roomId 규칙

- **거래**: `trade_${productId}_${sortedUserIds}` (buyerId, sellerId 정렬)
- **모집**: `teamRecruit_${postId}`

### ⚠️ Firestore Rules

- **현재 `firestore.rules`에는 `chatRooms` / `chatRooms/.../messages` 규칙이 없음.**
- 클라이언트가 해당 경로로 읽기·쓰기 시 규칙에 의해 거부될 수 있으므로, 실서비스 전에 아래와 같은 규칙 추가 필요.

```javascript
// 권장 추가 규칙 (예시)
match /chatRooms/{roomId} {
  allow read, write: if isAuthenticated() &&
    request.auth.uid in resource.data.members;  // 또는 get() 기반 참여자 체크
  match /messages/{messageId} {
    allow read: if isAuthenticated();  // 방 접근 통과 후
    allow create: if isAuthenticated() &&
      request.auth.uid in get(/databases/$(database)/documents/chatRooms/$(roomId)).data.members;
    allow update, delete: if isAuthor(resource.data.senderId);
  }
}
```

---

## 2️⃣ Cloud Functions 이벤트 구조

### 채팅 관련 트리거 (실제 export 기준)

| 함수명 | 트리거 경로 | 역할 |
|--------|-------------|------|
| **onMessageCreated** | `chatRooms/{roomId}/messages/{messageId}` **onCreate** | 메시지 생성 시 발신자 제외 멤버에게 FCM 푸시 |
| **onChatRoomCreated** (ranking) | `chatRooms/{roomId}` **onCreate** (또는 market 연동) | 채팅방 생성 시 마켓 랭킹 점수 갱신 |
| **syncTeamChatMembers** | 팀 멤버 **onWrite** | 팀 멤버 변경 시 팀 채팅방 멤버 동기화 |
| **onTeamCreated** | 팀 생성 시 | 팀 채팅방 생성 등 |
| **onNoticeCreated** | 팀 공지 생성 시 | 채팅방에 공지 카드 메시지 생성 |
| **onEventCreated** | 팀 이벤트 생성 시 | 채팅방에 이벤트 카드 메시지 생성 |
| **onMessageScore** | 팀 채팅 메시지 관련 | 활동 점수 |
| **dailyChatSummary** | 스케줄 등 | 일일 채팅 요약 |

### 레거시/미사용 (참고)

- **notifyNewMessage**: `chatRooms/{roomId}/messages/{messageId}` onCreate → 현재 **index.ts에서 주석 처리** (배포 안 함).  
  - 수신자 계산, 시스템 메시지 스킵, `users/{uid}/devices` 기반 FCM, 무효 토큰 제거 등 더 세밀한 로직 포함.
- **onChatMessageCreated**: `chats/{chatId}/messages/{messageId}` onCreate → **다른 경로(chats)** 사용. 현재 앱은 `chatRooms` 사용하므로 이 트리거는 미사용 가능성 있음.

### 이벤트 흐름 요약

```
[클라이언트] 메시지 전송
    → Firestore: chatRooms/{roomId}/messages addDoc
        → onMessageCreated (v2) 실행
            → room 조회 → members에서 발신자 제외
            → users/{uid} 에서 fcmTokens 조회
            → FCM sendEachForMulticast
            → (선택) 실패 토큰 arrayRemove
```

- 메시지 **수정/삭제**용 전용 트리거는 없음 (필요 시 추가).
- **읽음/typing**은 클라이언트가 `chatRooms/{roomId}` 업데이트로 처리하며, 별도 CF 트리거 없음.

---

## 3️⃣ Push Notification 흐름

### 단계별 플로우

1. **토큰 등록 (클라이언트)**
   - Capacitor: `PushNotifications.register()` → `registration` 리스너에서 `saveDeviceToken(token, platform)` 호출.
   - `saveDeviceToken`: `users/{uid}/devices/{deviceId}` 에 `{ token, platform, updatedAt }` 저장 (merge).
   - 웹은 스킵; 네이티브(iOS/Android)만 등록.

2. **메시지 작성 (클라이언트)**
   - `sendMessageCommon()` → `chatRooms/{roomId}/messages` 에 문서 추가 (트랜잭션 내).
   - 동시에 room의 `lastMessage`, `lastMessageAt`, `unreadCount` 등 갱신.

3. **트리거 (서버)**
   - `onMessageCreated` (chatRooms/…/messages onCreate) 실행.
   - room 문서에서 `members` / `participants` 조회, 발신자 제외 → 수신자 목록.

4. **FCM 전송 (서버)**
   - 각 수신자에 대해 `users/{uid}` 의 `fcmTokens` 배열 사용 (onMessageCreated 기준).
   - `notifyNewMessage`(주석)는 `users/{uid}/devices` 서브컬렉션 사용.
   - `messaging.sendEachForMulticast({ tokens, notification, data })` 호출.
   - data: `type: "chat"`, `roomId`, `messageId`, `senderId` 등 (딥링크/라우팅용).

5. **미전송 조건**
   - 시스템 메시지: `onMessageCreated`에서는 type 필드로 필터링하지 않음. `notifyNewMessage`에서는 `type === "system"` 또는 `!senderId` 시 스킵.
   - room `status === "closed"`: `notifyNewMessage`에서만 스킵.
   - 수신자 FCM 토큰 없음: 스킵.
   - (앱) 알림 설정 꺼짐: `onChatMessageCreated`는 `users/{uid}/settings/notifications` 에서 `chatNotificationsEnabled === false` 이면 스킵. `onMessageCreated`에는 해당 로직 없음.

6. **알림 클릭 (클라이언트)**
   - Capacitor `pushNotificationActionPerformed`: `data.route` 또는 `data.chatId` → `/chat/${chatId}` 또는 route로 이동.

### 정리

- **실제 배포된 푸시**: `onMessageCreated` 한 경로 (chatRooms/…/messages onCreate).
- **토큰 저장**: 클라이언트는 `users/{uid}/devices/{deviceId}` 사용; `onMessageCreated`는 `users/{uid}.fcmTokens` 사용 → 토큰 저장 방식을 한쪽으로 통일할 필요 있음 (devices 권장).

---

## 4️⃣ 채팅 트래픽 10만 명 대응 구조

### 현재 구현 요약

| 항목 | 구현 | 위치 |
|------|------|------|
| 메시지 실시간 구독 | 최신 N개만 구독 (기본 50) | `useMessagesRealtime`: orderBy(createdAt, desc), limit(50) |
| 과거 메시지 | 커서 기반 페이지네이션 (30개씩) | `useMessagesPagination` |
| 메시지 합치기/정렬 | realtime + pagination merge, createdAt 기준 정렬 | `useMessageGrouping` |
| 리스트 렌더링 | 가상화 (react-virtuoso) | `VirtualizedMessageList` |
| 전송 | 트랜잭션 + 재시도 (최대 3회, 지수 백오프) | `sendMessageCommon` |

### 10만 DAU/동시 접속 가정 시 권장 구조

- **클라이언트**
  - 동시 실시간 리스너 수 제한: “현재 열린 채팅방 1개”만 메시지 리스너 유지, 리스트는 lastMessage만 구독 또는 주기 폴링.
  - 메시지 창: windowed realtime(이미 50 제한) + 위로 스크롤 시 과거 30개씩 로드 유지.
  - 가상화 유지로 DOM 노드 수 제한.

- **Firestore**
  - `chatRooms/{roomId}/messages` 복합 인덱스: `(createdAt desc)` 또는 `(seq desc)` (이미 orderBy 사용 중이면 인덱스 필요).
  - `firestore.indexes.json` 현재 비어 있음 → 실제 쿼리 기준으로 인덱스 추가 필요.

- **Cloud Functions**
  - onMessageCreated: 멤버 수만큼 FCM 호출. 그룹 방이 크면 배치/큐 고려.
  - 콜드 스타트 완화: 최소 인스턴스 또는 호출 패턴에 맞춘 튜닝.

- **확장 시 고려**
  - 매우 큰 방(예: 수천 명): 메시지를 샤딩하거나 채널/스레드 분리 검토.
  - 읽음/타이핑: 대규모 시 전용 서버/웹소켓로 이전 검토.

---

## 5️⃣ 메신저 UI 구조 (Slack/Discord 수준)

### 현재 프로젝트 레이어

- **라우트/페이지**
  - `ChatListPage`: 방 목록.
  - `ChatPage`: 단일 채팅방 (거래/모집 공통).
  - `ChatRoom`: 팀 채팅 등 다른 컨텍스트용 룸.

- **레이아웃**
  - 상단: 방 타입별 헤더 (Trade: `TradeChatHeader`, 모집: `RecruitGroupChatHeader` 등).
  - 중앙: 메시지 영역 (`VirtualizedMessageList` / `MessageListContainer`).
  - 하단: 입력 (`ChatInputBar`, `ChatInput`, 음성/STT 등).

### 기능별 컴포넌트 매핑 (Slack/Discord 대비)

| 기능 | Slack/Discord 개념 | 현재 구현 |
|------|---------------------|-----------|
| 채널/DM 목록 | 사이드바 채널 리스트 | `ChatListPage` (방 목록) |
| 채널 헤더 | 채널명·멤버·설정 | `TradeChatHeader`, `RecruitGroupChatHeader`, `TeamChatHeader` |
| 메시지 목록 | 메인 타임라인 | `VirtualizedMessageList`, `MessageListContainer` |
| 메시지 한 줄 | 메시지 블록 | `TradeMessageRenderer`, `RecruitGroupMessageRenderer`, `ChatBubble`, `TextMessage`, `ImageMessage`, `VideoMessage`, `LocationMessage`, `SystemMessage` |
| 입력 영역 | 메시지 작성 + 첨부 | `ChatInputBar`, `ChatInput`, `SuggestionBar`, `ChatSuggestions` |
| 스레드 | 스레드 뷰 | 미구현 |
| 반응/이모지 | 리액션 | `MessageReactions` |
| 고정/공지 | 핀/공지 | `PinnedNoticeHeader`, `NoticeMessageCard` |
| 상품/거래 컨텍스트 | 임베드/링크 미리보기 | `ProductInfo`, `ReservationActions`, `TradeStatusBadge` |

### 디렉터리 구조 요약

```
src/
├── pages/chat/
│   ├── ChatPage.tsx          # 메인 채팅 페이지 (거래/모집)
│   ├── ChatListPage.tsx
│   ├── ChatRoom.tsx
│   ├── chat.types.ts
│   ├── chat-layout.css
│   ├── components/          # 헤더, 버블, 입력, 카드, 가이드 등
│   └── hooks/               # useChatNotification, useKeyboardViewport, useChatScroll, useSpeechInput
└── features/chat/
    ├── hooks/               # useMessagesRealtime, useMessagesPagination, useMessageGrouping,
    │                        # useChatSend, useChatRoom, useTradeReservation, useChatInput
    └── components/          # VirtualizedMessageList, TradeChatHeader, ProductInfo,
                             # ReservationActions, Message* (Text/Image/Video/System/Location), ChatInputBar
```

### Slack/Discord에 가까워지려면

- **사이드바**: 방 목록을 항상 보이는 2단 레이아웃 (채널 리스트 | 메시지 영역).
- **스레드**: 메시지별 답글 스레드 UI + 필요 시 `messages` 또는 별도 컬렉션에 threadId.
- **채널/DM 구분**: 리스트에서 “채널 / DM” 탭 또는 필터.
- **검색**: 방/메시지 검색 (Firestore 쿼리 또는 Algolia/전문 검색).
- **멘션/봇**: @멘션, 봇 메시지 타입 확장.

---

## 요약 체크리스트

| # | 항목 | 상태 | 비고 |
|---|------|------|------|
| 1 | Firestore 채팅 DB 구조 | ✅ 설계 반영됨 | chatRooms + messages 서브컬렉션, roomId 규칙 일치. **Rules에 chatRooms 규칙 없음 → 추가 필요** |
| 2 | Cloud Functions 이벤트 | ✅ 정리됨 | onMessageCreated(실사용), onChatRoomCreated, syncTeamChatMembers 등. notifyNewMessage 주석, onChatMessageCreated는 chats 경로로 미사용 가능 |
| 3 | Push 흐름 | ✅ 정리됨 | 등록 → 메시지 write → onCreate → FCM. **토큰 저장: devices vs fcmTokens 불일치** 해결 권장 |
| 4 | 10만 명 대응 | ⚠️ 기반 있음 | windowed realtime, pagination, 가상화, 트랜잭션 재시도. 인덱스·리스너 수·대형 방 정책 보완 필요 |
| 5 | 메신저 UI 구조 | ✅ 매핑됨 | Slack/Discord 대비 컴포넌트·페이지 매핑 완료. 스레드/사이드바/검색은 미구현 |

이 문서는 코드베이스와 `firestore.rules`를 기준으로 한 검증 결과이며, 실서비스 전에 Rules·인덱스·푸시 토큰 통일을 적용하는 것을 권장합니다.
