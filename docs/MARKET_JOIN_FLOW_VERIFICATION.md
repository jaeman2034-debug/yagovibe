# 🔥 매칭 참여 플로우 검증 체크리스트

## ✅ Phase 1: 권한자 플로우 완성 (현재 단계)

### 검증 포인트 3가지

#### 1. marketJoins 문서 상태 확인

**Firebase Console → Firestore → marketJoins 컬렉션**

확인 사항:
- 문서 ID: `{postId}_{userId}` 형식
- 필드:
  - `postId`: 게시글 ID
  - `userId`: 참여자 UID (`4v8PjTtVbWhpMYIVx8ZQ0AdmU23`)
  - `postAuthorId`: 작성자 UID (`iUZB8RjKlEhb3uotZ6yqtpWtUQE2`)
  - `status`: `"pending"` → 승인 후 `"approved"`
  - `createdAt`: 타임스탬프
  - `updatedAt`: 타임스탬프 (승인 시 업데이트됨)

**예상 결과:**
```
승인 전: status = "pending"
승인 후: status = "approved"
```

---

#### 2. market 문서 currentPeople 확인

**Firebase Console → Firestore → market 컬렉션 → {postId} 문서**

확인 사항:
- `currentPeople` 필드 값
- `people` 필드 값 (최대 인원)

**예상 결과:**
```
참여 신청 생성 시: currentPeople = 1 (증가)
승인 시: currentPeople = 1 (유지)
거절 시: currentPeople = 0 (감소)
```

**로직:**
- `joinMarketPost`: pending 생성 시 +1
- `updateJoinStatus` (승인): 유지
- `updateJoinStatus` (거절): -1

---

#### 3. 콘솔 로그 확인

**브라우저 개발자 도구 → Console 탭**

승인 버튼 클릭 시 예상 로그:

```javascript
🔥 [MatchDetail] 승인 버튼 클릭: {
  joinId: "postId_userId",
  postId: "...",
  isAuthor: true,
  userUid: "iUZB8RjKlEhb3uotZ6yqtpWtUQE2"
}

🔥 [updateJoinStatus] 시작: {
  joinId: "postId_userId",
  status: "approved",
  postId: "..."
}

📋 [updateJoinStatus] 현재 상태: {
  joinId: "postId_userId",
  currentStatus: "pending",
  userId: "4v8PjTtVbWhpMYIVx8ZQ0AdmU23",
  postAuthorId: "iUZB8RjKlEhb3uotZ6yqtpWtUQE2"
}

📊 [updateJoinStatus] 게시글 현재 인원: {
  postId: "...",
  beforeCurrentPeople: 1,
  maxPeople: 10
}

✅ [updateJoinStatus] join 문서 업데이트 예약: {
  joinId: "postId_userId",
  newStatus: "approved"
}

📈 [updateJoinStatus] 승인 → 인원수 유지: {
  currentPeople: 1,
  maxPeople: 10,
  remaining: 9
}

✅ [updateJoinStatus] 트랜잭션 완료: {
  joinId: "postId_userId",
  status: "approved"
}

✅ [MatchDetail] 승인 성공: {
  joinId: "postId_userId"
}
```

**에러가 있으면:**
- `❌ [updateJoinStatus] 트랜잭션 실패:` 로그 확인
- 에러 메시지와 코드 확인

---

## 🔥 현재 코드 구조 (운영급)

### 데이터 흐름

```
일반 사용자 참여 신청
  ↓
joinMarketPost()
  → marketJoins/{postId}_{userId} 생성 (status: "pending")
  → market/{postId}.currentPeople +1
  ↓
권한자 승인
  ↓
updateJoinStatus({ status: "approved" })
  → marketJoins/{postId}_{userId}.status = "approved"
  → market/{postId}.currentPeople 유지
  ↓
일반 사용자 실시간 반영
  ↓
joinStatus = "approved"
  → canChat = true
  → 채팅 버튼 활성화
```

### 트랜잭션 보장

1. **참여 신청 생성**: `joinMarketPost`
   - marketJoins 문서 생성
   - currentPeople 증가
   - 원자성 보장

2. **승인/거절**: `updateJoinStatus`
   - status 변경
   - currentPeople 조정 (거절 시만)
   - 원자성 보장

3. **취소**: `cancelMarketJoin`
   - marketJoins 문서 삭제
   - currentPeople 감소
   - 원자성 보장

---

## ✅ 검증 완료 기준

### 권한자 플로우

- [x] 참여 신청 목록 표시
- [x] 승인/거절 버튼 표시
- [x] 승인 클릭 시 status 변경
- [x] UI 실시간 반영
- [x] currentPeople 정합성

### 일반 사용자 플로우

- [x] 참여 신청 생성
- [x] 상태 실시간 반영
- [x] 승인 후 채팅 활성화
- [x] 채팅방 생성/이동

---

## 🎯 다음 단계

1. **인원 카운트 정합성 검증**
   - 여러 참여 신청 동시 처리
   - 최대 인원 초과 방어

2. **예외 처리 강화**
   - 중복 승인 방지
   - 트랜잭션 충돌 처리

3. **운영 모니터링**
   - 로그 수집
   - 에러 추적
