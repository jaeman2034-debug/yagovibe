# 🔥 승인 버튼 클릭 시 전체 흐름도

## 📊 전체 플로우 다이어그램

```
[작성자 화면]
  │
  ├─ [승인 버튼 클릭]
  │   └─ handleApprove(joinId)
  │       │
  │       ├─ 확인 다이얼로그
  │       │   └─ "이 참여 신청을 승인하시겠습니까?"
  │       │
  │       └─ updateJoinStatus({ joinId, status: "approved", postId })
  │           │
  │           └─ [트랜잭션 시작]
  │               │
  │               ├─ 1. marketJoins 문서 조회
  │               │   └─ 현재 상태: "pending"
  │               │
  │               ├─ 2. market 문서 조회
  │               │   └─ currentPeople: 1 (이미 pending에서 증가)
  │               │   └─ people: 10
  │               │
  │               ├─ 3. 상태 검증
  │               │   └─ currentStatus === "pending" ✅
  │               │   └─ validateStatusTransition("pending", "approved") ✅
  │               │
  │               ├─ 4. 정원 초과 체크
  │               │   └─ currentPeople (1) < maxPeople (10) ✅
  │               │
  │               ├─ 5. marketJoins 문서 업데이트
  │               │   └─ status: "approved"
  │               │   └─ updatedAt: serverTimestamp()
  │               │
  │               ├─ 6. currentPeople 처리
  │               │   └─ 유지 (이미 pending에서 증가했으므로)
  │               │
  │               ├─ 7. 자동 마감 체크
  │               │   └─ currentPeople (1) < maxPeople (10) ❌
  │               │   └─ status: "active" 유지
  │               │
  │               └─ [트랜잭션 커밋]
  │
  ├─ [트랜잭션 완료 후]
  │   │
  │   ├─ 로그 기록
  │   │   └─ _marketJoinLogs 컬렉션
  │   │       └─ type: "JOIN_APPROVED"
  │   │
  │   └─ UI 업데이트
  │       └─ "참여 신청을 승인했습니다." 알림
  │
  └─ [실시간 구독 자동 업데이트]
      │
      ├─ joinList 업데이트
      │   └─ pending → approved 상태 변경
      │
      └─ UI 자동 반영
          └─ 카드 색상: 노란색 → 초록색
          └─ 텍스트: "대기중" → "승인됨"


[서버 트리거 - onMarketJoinStatusChanged]
  │
  ├─ [marketJoins 문서 업데이트 감지]
  │   └─ before.status: "pending"
  │   └─ after.status: "approved"
  │
  ├─ [멱등성 체크]
  │   └─ idempotencyKey 생성
  │   └─ once() 헬퍼로 중복 실행 방지
  │
  ├─ [1. 채팅방 생성/확인]
  │   │
  │   └─ chatRoomId = `${postId}_${userId}_${authorId}`
  │       │
  │       ├─ 채팅방 없으면 생성
  │       │   └─ participants: [userId, authorId]
  │       │   └─ productSnapshot: { title, price, images }
  │       │
  │       └─ 채팅방 있으면 재사용
  │
  ├─ [2. 시스템 메시지 발송]
  │   │
  │   └─ 중복 체크
  │       └─ 같은 시스템 메시지가 이미 있는지 확인
  │       └─ 없으면 생성
  │           └─ type: "system"
  │           └─ systemType: "JOIN_APPROVED"
  │           └─ text: "🎉 \"{postTitle}\" 모집에 승인되었습니다!"
  │
  ├─ [3. 인앱 알림 생성]
  │   │
  │   └─ 중복 체크
  │       └─ 같은 알림이 이미 있는지 확인
  │       └─ 없으면 생성
  │           └─ type: "MARKET_JOIN_APPROVED"
  │           └─ title: "매칭 참여 승인"
  │           └─ message: "\"{postTitle}\" 매칭 참여가 승인되었습니다."
  │
  ├─ [4. FCM 푸시 알림 발송]
  │   │
  │   └─ notifyMarketJoin(userId, {
  │         type: "JOIN_APPROVED",
  │         title: "매칭 참여 승인",
  │         body: "\"{postTitle}\" 매칭 참여가 승인되었습니다."
  │       })
  │
  └─ [5. 운영 로그 기록]
      └─ _marketJoinLogs 컬렉션
          └─ type: "APPROVED"
          └─ joinId, postId, userId, chatRoomId 기록


[참여자 화면 - 실시간 업데이트]
  │
  ├─ [알림 수신]
  │   │
  │   ├─ 인앱 알림
  │   │   └─ "매칭 참여 승인" 알림 표시
  │   │
  │   └─ FCM 푸시 알림 (모바일)
  │       └─ 푸시 알림 수신
  │
  ├─ [채팅방 자동 생성]
  │   │
  │   └─ 채팅 목록에 새 채팅방 표시
  │       └─ 시스템 메시지 확인 가능
  │
  └─ [상태 업데이트]
      │
      └─ 모집글 상세 페이지
          └─ "참여 확정되었습니다" 표시
          └─ "이제 채팅으로 작성자와 소통할 수 있습니다" 안내
```

---

## 🔍 상세 코드 흐름

### 1. 클라이언트: `handleApprove` 함수

```typescript
// RecruitDetail.tsx:801
const handleApprove = async (joinId: string) => {
  // 1. 확인 다이얼로그
  if (!confirm("이 참여 신청을 승인하시겠습니까?")) return;
  
  // 2. 중복 클릭 방지
  if (processingJoinId) return;
  
  setProcessingJoinId(joinId);
  
  try {
    // 3. updateJoinStatus 호출
    await updateJoinStatus({
      joinId,
      status: "approved",
      postId: data.id,
    });
    
    // 4. 성공 메시지
    alert("참여 신청을 승인했습니다.");
  } catch (err) {
    // 5. 에러 처리
    alert("승인에 실패했습니다.");
  } finally {
    setProcessingJoinId(null);
  }
};
```

### 2. 서비스: `updateJoinStatus` 함수

```typescript
// marketJoinService.ts:398
export async function updateJoinStatus({ joinId, status, postId }) {
  return await runTransaction(db, async (transaction) => {
    // 1. 병렬 조회
    const [joinSnap, postSnap] = await Promise.all([
      transaction.get(joinRef),
      transaction.get(postRef),
    ]);
    
    // 2. 상태 검증
    if (joinData.status !== "pending") {
      throw new Error("이미 처리된 참여 신청입니다.");
    }
    
    // 3. 정원 초과 체크
    if (status === "approved") {
      if (currentPeople >= maxPeople) {
        // 자동 거절 처리
        transaction.update(joinRef, { status: "rejected" });
        throw new Error("모집 인원이 이미 마감되었습니다.");
      }
    }
    
    // 4. 상태 업데이트
    transaction.update(joinRef, {
      status: "approved",
      updatedAt: serverTimestamp(),
    });
    
    // 5. 자동 마감 처리
    if (currentPeople >= maxPeople) {
      transaction.update(postRef, {
        status: "done",
        updatedAt: serverTimestamp(),
      });
    }
  });
}
```

### 3. 서버 트리거: `onMarketJoinStatusChanged`

```typescript
// onMarketJoinStatusChanged.ts:24
export const onMarketJoinStatusChanged = onDocumentUpdated(
  { document: "marketJoins/{joinId}" },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    
    // 1. 상태 변경 감지
    if (before.status === after.status) return;
    
    // 2. 승인 처리
    if (after.status === "approved" && before.status === "pending") {
      // 3. 멱등성 보장
      const idempotencyKey = buildIdempotencyKey("approved", postId, userId, joinId);
      
      await once(idempotencyKey, async () => {
        // 4. 채팅방 생성
        const chatRoomId = `${postId}_${userId}_${authorId}`;
        await ensureChatRoom(chatRoomId);
        
        // 5. 시스템 메시지 발송
        await sendSystemMessage(chatRoomId, {
          type: "JOIN_APPROVED",
          text: "🎉 \"{postTitle}\" 모집에 승인되었습니다!",
        });
        
        // 6. 인앱 알림 생성
        await createNotification(userId, {
          type: "MARKET_JOIN_APPROVED",
          title: "매칭 참여 승인",
          message: "\"{postTitle}\" 매칭 참여가 승인되었습니다.",
        });
        
        // 7. FCM 푸시 알림 발송
        await notifyMarketJoin(userId, {
          type: "JOIN_APPROVED",
          title: "매칭 참여 승인",
          body: "\"{postTitle}\" 매칭 참여가 승인되었습니다.",
        });
        
        // 8. 운영 로그 기록
        await logApproval(joinId, postId, userId, chatRoomId);
      });
    }
  }
);
```

---

## ⏱️ 타이밍 다이어그램

```
시간축 →
│
├─ [0ms] 작성자: 승인 버튼 클릭
│   └─ handleApprove() 호출
│
├─ [100ms] 확인 다이얼로그 표시
│   └─ 사용자: "확인" 클릭
│
├─ [200ms] updateJoinStatus() 호출
│   └─ 트랜잭션 시작
│
├─ [300ms] Firestore 트랜잭션 실행
│   ├─ marketJoins 문서 업데이트
│   │   └─ status: "approved"
│   └─ market 문서 확인
│       └─ currentPeople 유지
│
├─ [500ms] 트랜잭션 커밋 완료
│   └─ UI 업데이트: "참여 신청을 승인했습니다."
│
├─ [600ms] 실시간 구독 업데이트
│   └─ joinList 자동 업데이트
│   └─ 카드 색상 변경 (노란색 → 초록색)
│
├─ [700ms] 서버 트리거 실행
│   └─ onMarketJoinStatusChanged 감지
│
├─ [800ms] 채팅방 생성
│   └─ chatRooms/{chatRoomId} 생성
│
├─ [900ms] 시스템 메시지 발송
│   └─ messages/{messageId} 생성
│
├─ [1000ms] 인앱 알림 생성
│   └─ notifications/{notificationId} 생성
│
├─ [1100ms] FCM 푸시 알림 발송
│   └─ 참여자 기기로 푸시 전송
│
└─ [1200ms] 운영 로그 기록
    └─ _marketJoinLogs/{logId} 생성
```

---

## 🔐 보안 검증 포인트

### 1. 권한 검증
- ✅ 작성자만 승인 가능 (`postAuthorId` 검증)
- ✅ Firestore Rules에서 일반 유저 승인 차단

### 2. 상태 검증
- ✅ `pending` 상태만 승인 가능
- ✅ 이미 처리된 신청은 승인 불가

### 3. 정원 검증
- ✅ 트랜잭션 내부에서 정원 초과 체크
- ✅ 동시 승인 시 한 명만 승인 (레이스 컨디션 방지)

### 4. 멱등성 보장
- ✅ `once()` 헬퍼로 중복 실행 방지
- ✅ 시스템 메시지/알림 중복 생성 방지

---

## 📊 데이터 변화 추적

### Before (승인 전)
```javascript
// marketJoins/{postId}_{userId}
{
  status: "pending",
  createdAt: Timestamp,
  updatedAt: Timestamp,
}

// market/{postId}
{
  currentPeople: 1,  // pending 신청 시 증가
  people: 10,
  status: "active",
}
```

### After (승인 후)
```javascript
// marketJoins/{postId}_{userId}
{
  status: "approved",  // ✅ 변경
  createdAt: Timestamp,
  updatedAt: Timestamp,  // ✅ 업데이트
}

// market/{postId}
{
  currentPeople: 1,  // ✅ 유지 (이미 증가했으므로)
  people: 10,
  status: "active",  // ✅ 유지 (아직 마감 안 됨)
}

// chatRooms/{postId}_{userId}_{authorId}  // ✅ 새로 생성
{
  productId: postId,
  buyerId: userId,
  sellerId: authorId,
  participants: [userId, authorId],
  createdAt: Timestamp,
}

// messages/{messageId}  // ✅ 새로 생성
{
  text: "🎉 \"{postTitle}\" 모집에 승인되었습니다!",
  type: "system",
  systemType: "JOIN_APPROVED",
  createdAt: Timestamp,
}

// notifications/{notificationId}  // ✅ 새로 생성
{
  userId: userId,
  type: "MARKET_JOIN_APPROVED",
  title: "매칭 참여 승인",
  message: "\"{postTitle}\" 매칭 참여가 승인되었습니다.",
  isRead: false,
  createdAt: Timestamp,
}
```

---

## ✅ 검증 체크리스트

실제 승인 버튼을 눌렀을 때 다음을 확인:

- [ ] UI 즉시 반응 (로딩 상태)
- [ ] 확인 다이얼로그 표시
- [ ] 성공 메시지 표시
- [ ] 카드 상태 변경 (pending → approved)
- [ ] 카드 색상 변경 (노란색 → 초록색)
- [ ] Firestore 문서 업데이트 확인
- [ ] 서버 트리거 실행 확인
- [ ] 채팅방 생성 확인
- [ ] 시스템 메시지 발송 확인
- [ ] 인앱 알림 생성 확인
- [ ] FCM 푸시 알림 발송 확인 (선택)
- [ ] 운영 로그 기록 확인

---

**작성일**: 2024년 (현재 날짜)  
**버전**: 1.0  
**상태**: ✅ 검증 준비 완료
