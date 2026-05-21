# 🔥 거절 기능 테스트 가이드

## 테스트 시나리오 1: 거절 버튼 클릭

### 준비 단계

1. **권한자 계정으로 로그인** (게시글 작성자)
2. **일반 사용자가 참여 신청한 상태** (status: "pending")
3. **권한자 화면에서 참여 신청 목록 확인**

---

### 테스트 절차

#### 1단계: 거절 버튼 클릭

1. 권한자 화면에서 "거절" 버튼 클릭
2. 확인 다이얼로그에서 "확인" 클릭
3. 브라우저 개발자 도구 열기 (F12) → Console 탭

---

### 예상 콘솔 로그

```javascript
🔥 [MatchDetail] 거절 버튼 클릭: {
  joinId: "postId_userId",
  postId: "...",
  isAuthor: true,
  userUid: "iUZB8RjKlEhb3uotZ6yqtpWtUQE2"
}

🔥 [updateJoinStatus] 시작: {
  joinId: "postId_userId",
  status: "rejected",
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
  newStatus: "rejected"
}

📉 [updateJoinStatus] 거절 → 인원수 감소: {
  before: 1,
  after: 0
}

✅ [updateJoinStatus] 트랜잭션 완료: {
  joinId: "postId_userId",
  status: "rejected"
}

✅ [MatchDetail] 거절 성공: {
  joinId: "postId_userId"
}
```

---

### 확인 사항

#### 1. Firestore 문서 상태

**marketJoins/{postId}_{userId}**

```
status: "rejected"
updatedAt: [타임스탬프]
```

#### 2. market 문서 currentPeople

**market/{postId}**

```
currentPeople: 0 (거절 전 1이었다면)
```

**로직:**
- 참여 신청 생성 시: currentPeople +1
- 거절 시: currentPeople -1
- 결과: 원래 상태로 복원

#### 3. UI 상태

- 참여 신청 목록에서 해당 항목 제거 또는 "거절됨" 표시
- 일반 사용자 화면에서 "거절됨" 상태 표시

---

## 테스트 시나리오 2: 여러 계정 동시 참여

### 준비 단계

1. **계정 A**: 권한자 (게시글 작성자)
2. **계정 B**: 일반 사용자 1
3. **계정 C**: 일반 사용자 2

---

### 테스트 절차

#### 1단계: 계정 B 참여 신청

1. 계정 B로 로그인
2. 매칭 게시글 접속
3. "참여하기" 클릭
4. 확인: status = "pending"

#### 2단계: 계정 C 참여 신청

1. 계정 C로 로그인 (또는 시크릿 창)
2. 같은 매칭 게시글 접속
3. "참여하기" 클릭
4. 확인: status = "pending"

#### 3단계: 권한자 화면 확인

1. 계정 A로 로그인
2. 매칭 게시글 접속
3. 확인:
   - 참여 신청 목록에 2명 표시
   - 각각 "대기중" 배지
   - 각각 승인/거절 버튼 표시

---

### 예상 결과

**Firestore 상태:**

```
marketJoins/{postId}_{userIdB}
  status: "pending"

marketJoins/{postId}_{userIdC}
  status: "pending"

market/{postId}
  currentPeople: 2
```

---

## 테스트 시나리오 3: maxPeople 제한 테스트

### 준비 단계

1. **게시글 설정:**
   - `people`: 2 (최대 인원)
   - `currentPeople`: 0

2. **참여 신청:**
   - 계정 B: pending
   - 계정 C: pending
   - 계정 D: pending (3번째)

---

### 테스트 절차

#### 1단계: 2명 승인

1. 권한자 계정으로 로그인
2. 계정 B 승인
3. 확인: currentPeople = 1
4. 계정 C 승인
5. 확인: currentPeople = 2

#### 2단계: 3번째 승인 시도

1. 계정 D 승인 버튼 클릭
2. 확인:
   - 에러 메시지: "모집 인원이 이미 마감되었습니다."
   - 콘솔 로그: `⚠️ [updateJoinStatus] 최대 인원 초과 방지`

---

### 예상 결과

**콘솔 로그:**

```javascript
⚠️ [updateJoinStatus] 최대 인원 초과 방지: {
  currentPeople: 2,
  maxPeople: 2
}

❌ [updateJoinStatus] 트랜잭션 실패: {
  joinId: "postId_userIdD",
  status: "approved",
  error: "모집 인원이 이미 마감되었습니다."
}
```

**Firestore 상태:**

```
marketJoins/{postId}_{userIdD}
  status: "pending" (승인 실패로 유지)

market/{postId}
  currentPeople: 2 (변화 없음)
```

---

## 검증 체크리스트

### 거절 기능

- [ ] 거절 버튼 클릭 시 status = "rejected"
- [ ] currentPeople 감소 (거절 전 -1)
- [ ] UI 실시간 반영
- [ ] 콘솔 에러 없음

### 여러 계정 동시 참여

- [ ] 2명 이상 참여 신청 가능
- [ ] 권한자 화면에 모두 표시
- [ ] 각각 독립적으로 승인/거절 가능

### maxPeople 제한

- [ ] 최대 인원 도달 시 승인 차단
- [ ] 에러 메시지 표시
- [ ] currentPeople 초과 방지

---

## 문제 발생 시 확인 사항

### 거절 실패 시

1. **콘솔 에러 확인:**
   - `❌ [MatchDetail] 거절 실패:` 로그
   - 에러 메시지와 코드

2. **Firestore 규칙 확인:**
   - `marketJoins` update 권한
   - `market` update 권한

3. **트랜잭션 충돌:**
   - 동시 거절 시도
   - 네트워크 지연

### 인원수 불일치 시

1. **currentPeople 값 확인**
2. **pending 상태 참여 신청 개수 확인**
3. **approved 상태 참여 신청 개수 확인**

**수식 검증:**
```
currentPeople = approved 상태 참여 신청 개수
```
