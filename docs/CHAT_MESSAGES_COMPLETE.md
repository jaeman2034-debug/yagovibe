# ✅ 채팅 메시지 + UI + 실시간 구독 완성본 세트

## 🎯 목표 달성

> 채팅방 생성은 됨 → 이제 "대화"만 붙이면 끝

---

## ✅ 완료된 작업

### 1️⃣ 메시지 구조 (기존 구조 유지)

**구조**: `chatRooms/{roomId}/messages` 서브컬렉션

**장점**:
- 채팅방과 메시지가 논리적으로 그룹화됨
- 쿼리 성능 최적화
- 규칙 관리 용이

**메시지 스키마**:
```typescript
{
  senderId: string
  text: string
  type?: "text" | "system"
  systemType?: "JOIN_APPROVED" | "JOIN_CANCELLED"
  createdAt: Timestamp
  metadata?: {
    postId?: string
    postTitle?: string
    approvedUserId?: string
  }
}
```

---

### 2️⃣ Firestore Rules 보안 강화

**파일**: `firestore.rules:407-425`

**변경 사항**:
- ✅ `members` 배열 기반 접근 제어
- ✅ 본인이 보낸 메시지만 수정/삭제 가능
- ✅ 채팅방 members만 읽기 가능

```javascript
match /messages/{messageId} {
  // 🔥 Helper: 채팅방 members 확인
  function isChatRoomMember() {
    return request.auth != null
      && request.auth.uid in get(/databases/$(database)/documents/chatRooms/$(roomId)).data.get('members', []);
  }
  
  // 🔥 읽기: 채팅방 members만 가능
  allow read: if isSignedIn() && isChatRoomMember();
  
  // 🔥 생성: 본인이 senderId이고, 채팅방 members여야 함
  allow create: if isSignedIn()
    && request.auth.uid == request.resource.data.senderId
    && isChatRoomMember();
  
  // 🔥 수정/삭제: 본인이 보낸 메시지만 가능
  allow update, delete: if isSignedIn()
    && request.auth.uid == resource.data.senderId
    && isChatRoomMember();
}
```

---

### 3️⃣ 실시간 구독 (이미 구현됨)

**파일**: `src/pages/chat/ChatPage.tsx:366-381`

**구현**:
```typescript
useEffect(() => {
  if (!chatRoomId) return;

  const msgsRef = collection(db, "chatRooms", chatRoomId, "messages");
  const q = query(msgsRef, orderBy("createdAt", "asc"), limit(200));
  const unsub = onSnapshot(q, (snap) => {
    const rows: MessageDoc[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    }));
    setMessages(rows);
  });

  return () => unsub();
}, [chatRoomId]);
```

**특징**:
- ✅ 실시간 동기화
- ✅ 최대 200개 메시지 제한
- ✅ 자동 정리 (unsubscribe)

---

### 4️⃣ 권한 체크 강화

**파일**: `src/pages/chat/ChatPage.tsx:393-423`

**변경 사항**:
- ✅ `members` 배열 우선 확인 (실전급 설계)
- ✅ 하위 호환 (`participants` 배열도 체크)
- ✅ 접근 차단 시 자동 리다이렉트

```typescript
// 🔥 members 배열 확인 (실전급 설계 우선, 하위 호환)
const members = (room as any).members || room.participants || [];
const isMember = members.includes(myUid);

if (!isMember) {
  alert("이 채팅방에 접근할 권한이 없습니다.");
  navigate("/app/market");
}
```

---

### 5️⃣ 시스템 메시지 발송 (이미 구현됨)

**파일**: `functions/src/market/onMarketJoinStatusChanged.ts:145-190`

**구현**:
```typescript
// 🔥 시스템 메시지 발송 (중복 방지)
if (chatRoomId) {
  const messagesRef = chatRoomRef.collection("messages");
  
  // 🔥 같은 시스템 메시지가 이미 있는지 확인
  const existingMsgSnap = await messagesRef
    .where("type", "==", "system")
    .where("systemType", "==", "JOIN_APPROVED")
    .where("metadata.postId", "==", postId)
    .where("metadata.approvedUserId", "==", userId)
    .limit(1)
    .get();

  if (existingMsgSnap.empty) {
    await messagesRef.add({
      text: `🎉 "${postTitle}" 모집에 승인되었습니다!\n호스트와 일정을 조율하세요.`,
      type: "system",
      systemType: "JOIN_APPROVED",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        postId,
        postTitle,
        approvedUserId: userId,
        idempotencyKey,
      },
    });
  }
}
```

**특징**:
- ✅ 중복 방지 (idempotency)
- ✅ 승인 시 자동 발송
- ✅ 채팅방 lastMessage 업데이트

---

### 6️⃣ 메시지 전송 (이미 구현됨)

**파일**: `src/pages/chat/ChatPage.tsx:425-468`

**구현**:
```typescript
async function sendMessage() {
  if (!chatRoomId || !myUid || !room) return;
  const trimmed = text.trim();
  if (!trimmed) return;

  // messages 추가
  const msgsRef = collection(db, "chatRooms", chatRoomId, "messages");
  await addDoc(msgsRef, {
    senderId: myUid,
    text: trimmed,
    createdAt: serverTimestamp(),
  });

  // room lastMessage 갱신 + unreadCount 업데이트
  const roomRef = doc(db, "chatRooms", chatRoomId);
  await updateDoc(roomRef, {
    lastMessage: trimmed,
    lastMessageAt: serverTimestamp(),
    [`unreadCount.${myUid}`]: 0,
    [`unreadCount.${currentOtherUid}`]: increment(1),
  });
}
```

**특징**:
- ✅ 실시간 전송
- ✅ 읽지 않은 메시지 카운트 업데이트
- ✅ 알림 발송

---

## 📊 최종 흐름

```
승인 →
  chatRooms 생성 →
  chatRooms/{roomId}/messages 시스템 메시지 →
  UI 실시간 구독 →
  대화 시작
```

---

## 🔒 보안 및 안정성

### 3중 방어 체계 ✅

1. **클라이언트**: `members` 배열 체크
2. **Firestore Rules**: `members` 배열 기반 접근 제어
3. **Functions**: 서버에서만 채팅방 생성

### 중복 방지 ✅

- ✅ 시스템 메시지 중복 방지 (idempotency)
- ✅ 실시간 구독 자동 정리
- ✅ 메시지 전송 실패 시 복원

---

## ✅ 완료 체크리스트

| 항목 | 상태 | 비고 |
|------|------|------|
| 메시지 구조 | ✅ | 서브컬렉션 사용 |
| Firestore Rules 보안 | ✅ | members 배열 기반 |
| 실시간 구독 | ✅ | onSnapshot 사용 |
| 권한 체크 | ✅ | members 배열 우선 |
| 시스템 메시지 | ✅ | 중복 방지 포함 |
| 메시지 전송 | ✅ | 읽지 않은 메시지 카운트 |

---

## 🎯 결론

**채팅 메시지 + UI + 실시간 구독 완성** 🚀

- ✅ 메시지 구조 확인 및 통합
- ✅ Firestore Rules 보안 강화
- ✅ 실시간 구독 최적화
- ✅ 권한 체크 강화
- ✅ 시스템 메시지 발송 확인

**다음 단계**: 인원 초과 차단 또는 알림 연동 💪
