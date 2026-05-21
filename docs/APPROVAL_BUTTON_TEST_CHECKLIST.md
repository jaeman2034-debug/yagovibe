# ✅ 승인 버튼 클릭 시 검증 체크리스트

## 🎯 테스트 목표

**작성자가 "승인" 버튼을 클릭했을 때** 다음이 정상 동작하는지 확인

---

## 📋 실전 테스트 시나리오

### 준비 사항

1. **테스트 계정 2개 준비**
   - 작성자 계정 (host)
   - 참여자 계정 (u1)

2. **모집글 생성**
   - 최대 인원: 10명
   - 현재 인원: 0명
   - 상태: `active` 또는 `open`

3. **참여 신청 생성**
   - u1 계정으로 참여 신청
   - 상태: `pending`
   - `currentPeople`: 1 (신청 시 증가)

---

## 🔥 승인 버튼 클릭 시 검증 항목

### 1️⃣ 클라이언트 측 (즉시 확인)

#### ✅ UI 반응
- [ ] 승인 버튼 클릭 시 로딩 상태 표시 (`processingJoinId` 설정)
- [ ] 확인 다이얼로그 표시 ("이 참여 신청을 승인하시겠습니까?")
- [ ] 승인 성공 시 "참여 신청을 승인했습니다." 알림 표시
- [ ] 승인 실패 시 에러 메시지 표시

#### ✅ 실시간 업데이트
- [ ] 승인 후 `joinList` 자동 업데이트 (실시간 구독)
- [ ] 신청자 카드 상태 변경: `pending` → `approved`
- [ ] 카드 색상 변경: 노란색 → 초록색
- [ ] "대기중" → "승인됨" 텍스트 변경

#### ✅ 인원수 표시
- [ ] `currentPeople` 표시 업데이트 (1 → 1 유지, 이미 증가했으므로)
- [ ] 프로그레스 바 업데이트 (10% → 10% 유지)
- [ ] "승인 1명" 카운트 증가

---

### 2️⃣ Firestore 데이터 검증 (콘솔 확인)

#### ✅ marketJoins 문서
```javascript
// marketJoins/{postId}_{userId}
{
  status: "approved",  // ✅ pending → approved 변경
  updatedAt: Timestamp, // ✅ 업데이트 시간 기록
}
```

#### ✅ market 문서
```javascript
// market/{postId}
{
  currentPeople: 1,  // ✅ 유지 (이미 pending에서 증가했으므로)
  status: "active",  // ✅ 유지 (아직 마감 안 됨)
  updatedAt: Timestamp,
}
```

#### ✅ 자동 마감 테스트 (선택)
- [ ] 10명 모두 승인 시 `status: "done"` 자동 변경
- [ ] 11번째 신청 시도 시 "모집 인원이 마감되었습니다." 에러

---

### 3️⃣ 서버 트리거 검증 (Cloud Functions)

#### ✅ onMarketJoinStatusChanged 트리거 실행

**확인 방법:**
```bash
firebase functions:log --only onMarketJoinStatusChanged
```

**예상 로그:**
```
[onMarketJoinStatusChanged] 상태 변경 감지: {
  joinId: "...",
  postId: "...",
  userId: "...",
  oldStatus: "pending",
  newStatus: "approved"
}
```

#### ✅ 채팅방 생성
```javascript
// chatRooms/{postId}_{userId}_{authorId}
{
  productId: postId,
  buyerId: userId,
  sellerId: authorId,
  participants: [userId, authorId],
  createdAt: Timestamp,
}
```

#### ✅ 시스템 메시지 발송
```javascript
// chatRooms/{chatRoomId}/messages/{messageId}
{
  text: "🎉 \"{postTitle}\" 모집에 승인되었습니다!\n호스트와 일정을 조율하세요.",
  type: "system",
  systemType: "JOIN_APPROVED",
  createdAt: Timestamp,
  metadata: {
    postId: "...",
    approvedUserId: "...",
  }
}
```

#### ✅ 인앱 알림 생성
```javascript
// notifications/{notificationId}
{
  userId: "...",
  type: "MARKET_JOIN_APPROVED",
  title: "매칭 참여 승인",
  message: "\"{postTitle}\" 매칭 참여가 승인되었습니다. 채팅방이 열렸습니다.",
  target: {
    screen: "chat",
    id: chatRoomId,
  },
  isRead: false,
  createdAt: Timestamp,
}
```

#### ✅ FCM 푸시 알림 발송
- [ ] `notifyMarketJoin` 함수 호출 확인
- [ ] 푸시 알림 수신 확인 (모바일 앱)

#### ✅ 운영 로그 기록
```javascript
// _marketJoinLogs/{logId}
{
  type: "APPROVED",
  joinId: "...",
  postId: "...",
  userId: "...",
  postAuthorId: "...",
  chatRoomId: "...",
  timestamp: Timestamp,
}
```

---

### 4️⃣ 멱등성 검증 (중복 실행 방지)

#### ✅ 중복 승인 방지
- [ ] 같은 신청서를 2번 승인 시도 시 에러 ("이미 처리된 참여 신청입니다.")
- [ ] `_idempotency` 컬렉션에 키 기록 확인

#### ✅ 중복 알림 방지
- [ ] 같은 알림이 2번 생성되지 않음
- [ ] 같은 시스템 메시지가 2번 발송되지 않음

---

## 🧪 실전 테스트 절차

### Step 1: 준비
1. 작성자 계정으로 로그인
2. 모집글 상세 페이지 열기
3. 참여 신청 목록 확인 (u1의 pending 신청 확인)

### Step 2: 승인 실행
1. "✓ 승인" 버튼 클릭
2. 확인 다이얼로그에서 "확인" 클릭
3. 로딩 상태 확인
4. 성공 메시지 확인

### Step 3: 즉시 확인
1. 신청자 카드 상태 변경 확인 (pending → approved)
2. 카드 색상 변경 확인 (노란색 → 초록색)
3. 인원수 표시 확인 (1/10명)
4. "승인 1명" 카운트 확인

### Step 4: Firestore 확인
1. Firebase Console → Firestore
2. `marketJoins/{postId}_{userId}` 문서 확인
   - `status: "approved"` 확인
3. `market/{postId}` 문서 확인
   - `currentPeople: 1` 확인
   - `status: "active"` 확인

### Step 5: 서버 트리거 확인
1. Firebase Console → Functions → Logs
2. `onMarketJoinStatusChanged` 로그 확인
3. 채팅방 생성 확인 (`chatRooms` 컬렉션)
4. 시스템 메시지 확인 (`messages` 서브컬렉션)
5. 알림 생성 확인 (`notifications` 컬렉션)

### Step 6: 참여자 계정 확인
1. u1 계정으로 로그인
2. 알림 확인 (인앱 알림 + FCM 푸시)
3. 채팅방 확인 (시스템 메시지 확인)

---

## ✅ 합격 기준

다음 조건 **모두 만족** 시 합격:

- [ ] 승인 버튼 클릭 시 UI 정상 반응
- [ ] `marketJoins` 문서 `status: "approved"` 변경
- [ ] `market` 문서 `currentPeople` 유지 (1)
- [ ] 서버 트리거 정상 실행
- [ ] 채팅방 생성 확인
- [ ] 시스템 메시지 발송 확인
- [ ] 인앱 알림 생성 확인
- [ ] FCM 푸시 알림 발송 확인 (선택)
- [ ] 운영 로그 기록 확인
- [ ] 중복 실행 방지 확인

---

## 🚨 문제 발생 시 체크리스트

### 문제 1: 승인 버튼이 동작하지 않음
- [ ] 콘솔 에러 확인
- [ ] `isAuthor` 계산 확인
- [ ] `joinList` 구독 확인
- [ ] Firestore Rules 확인

### 문제 2: 승인 후 상태가 업데이트되지 않음
- [ ] 실시간 구독 확인 (`onSnapshot`)
- [ ] `realPost` 상태 확인
- [ ] 네트워크 연결 확인

### 문제 3: 서버 트리거가 실행되지 않음
- [ ] Cloud Functions 배포 확인
- [ ] Functions 로그 확인
- [ ] 트리거 설정 확인

### 문제 4: 알림이 발송되지 않음
- [ ] `notifications` 컬렉션 확인
- [ ] FCM 토큰 확인 (모바일)
- [ ] `notifyMarketJoin` 함수 확인

---

## 📊 테스트 결과 기록

### 테스트 일시
- 날짜: ___________
- 시간: ___________
- 테스터: ___________

### 결과
- [ ] ✅ 통과
- [ ] ❌ 실패 (상세 내용: ________________)

### 발견된 문제
1. ________________
2. ________________
3. ________________

---

## 🚀 다음 단계

승인 플로우 검증 완료 후:

1. **거절 플로우 검증** (`handleReject`)
2. **보류 플로우 검증** (향후 구현)
3. **승인 취소 플로우 검증** (`cancelApprovedJoin`)
4. **자동 마감 검증** (10명 모두 승인 시)

---

**작성일**: 2024년 (현재 날짜)  
**버전**: 1.0  
**상태**: ✅ 검증 준비 완료
