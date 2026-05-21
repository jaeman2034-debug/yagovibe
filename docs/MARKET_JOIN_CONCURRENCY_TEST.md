# 🔥 동시 승인 경쟁 상태 테스트 가이드 (운영급)

## 테스트 목표

**정원 초과 완전 방어** 검증:
- 동시 승인 시도 시 정확히 1명만 승인
- 나머지는 자동 거절 또는 에러 처리

---

## 시나리오 1: 동시 승인 테스트 (핵심)

### 준비 단계

1. **게시글 설정:**
   ```
   market/{postId}
     people: 2 (최대 인원)
     currentPeople: 0
   ```

2. **참여 신청 생성:**
   ```
   marketJoins/{postId}_{userIdA}: status = "pending"
   marketJoins/{postId}_{userIdB}: status = "pending"
   marketJoins/{postId}_{userIdC}: status = "pending"
   ```

3. **currentPeople 확인:**
   ```
   참여 신청 생성 후: currentPeople = 3
   (pending 상태로 증가)
   ```

---

### 테스트 절차

#### 1단계: 동시 승인 시도

1. **브라우저 2개 열기**
   - 브라우저 A: 권한자 계정
   - 브라우저 B: 권한자 계정 (같은 계정)

2. **동시에 승인 버튼 클릭**
   - 브라우저 A: userIdA 승인 클릭
   - 브라우저 B: userIdB 승인 클릭
   - **가능하면 userIdC도 동시에 승인 시도**

3. **콘솔 로그 확인**

---

### 예상 결과

#### 성공 케이스

**브라우저 A (승인 1):**
```javascript
🔥 [updateJoinStatus] 시작: { joinId: "postId_userIdA", status: "approved" }
📋 [updateJoinStatus] 현재 상태: { currentStatus: "pending" }
📊 [updateJoinStatus] 게시글 현재 인원: { beforeCurrentPeople: 3, maxPeople: 2 }
⚠️ [updateJoinStatus] 최대 인원 초과 방지 (자동 거절): {
  currentPeople: 3,
  maxPeople: 2,
  joinId: "postId_userIdA"
}
❌ 에러: "모집 인원이 이미 마감되었습니다."
```

**브라우저 B (승인 2):**
```javascript
🔥 [updateJoinStatus] 시작: { joinId: "postId_userIdB", status: "approved" }
📋 [updateJoinStatus] 현재 상태: { currentStatus: "pending" }
📊 [updateJoinStatus] 게시글 현재 인원: { beforeCurrentPeople: 3, maxPeople: 2 }
⚠️ [updateJoinStatus] 최대 인원 초과 방지 (자동 거절): {
  currentPeople: 3,
  maxPeople: 2,
  joinId: "postId_userIdB"
}
❌ 에러: "모집 인원이 이미 마감되었습니다."
```

**결과:**
- 모든 승인 시도 실패
- currentPeople = 3 (변화 없음)
- 모든 신청이 "rejected"로 변경됨 (자동 거절)

---

#### 정상 케이스 (currentPeople < maxPeople)

**게시글 상태:**
```
people: 2
currentPeople: 1 (pending 1개만 생성)
```

**브라우저 A (승인 1):**
```javascript
🔥 [updateJoinStatus] 시작: { joinId: "postId_userIdA", status: "approved" }
📋 [updateJoinStatus] 현재 상태: { currentStatus: "pending" }
📊 [updateJoinStatus] 게시글 현재 인원: { beforeCurrentPeople: 1, maxPeople: 2 }
✅ [updateJoinStatus] join 문서 업데이트 예약: { newStatus: "approved" }
📈 [updateJoinStatus] 승인 → 인원수 유지: {
  currentPeople: 1,
  maxPeople: 2,
  remaining: 1
}
✅ [updateJoinStatus] 트랜잭션 완료
```

**브라우저 B (승인 2):**
```javascript
🔥 [updateJoinStatus] 시작: { joinId: "postId_userIdB", status: "approved" }
📋 [updateJoinStatus] 현재 상태: { currentStatus: "pending" }
📊 [updateJoinStatus] 게시글 현재 인원: { beforeCurrentPeople: 1, maxPeople: 2 }
✅ [updateJoinStatus] join 문서 업데이트 예약: { newStatus: "approved" }
📈 [updateJoinStatus] 승인 → 인원수 유지: {
  currentPeople: 1,
  maxPeople: 2,
  remaining: 1
}
✅ [updateJoinStatus] 트랜잭션 완료
```

**결과:**
- 2명 모두 승인 성공
- currentPeople = 1 (유지, 이미 pending에서 증가했으므로)
- 실제 approved 상태: 2명

---

## 시나리오 2: 정원 초과 자동 거절 테스트

### 준비 단계

1. **게시글 설정:**
   ```
   people: 1 (최대 인원)
   currentPeople: 0
   ```

2. **참여 신청:**
   ```
   marketJoins/{postId}_{userIdA}: status = "pending"
   marketJoins/{postId}_{userIdB}: status = "pending"
   ```

3. **currentPeople 확인:**
   ```
   참여 신청 생성 후: currentPeople = 2
   ```

---

### 테스트 절차

1. **첫 번째 승인 시도:**
   - userIdA 승인 클릭
   - 확인: 성공 또는 실패?

2. **두 번째 승인 시도:**
   - userIdB 승인 클릭
   - 확인: 자동 거절 또는 에러?

---

### 예상 결과

**첫 번째 승인 (userIdA):**
```
⚠️ [updateJoinStatus] 최대 인원 초과 방지 (자동 거절): {
  currentPeople: 2,
  maxPeople: 1,
  joinId: "postId_userIdA"
}
❌ 에러: "모집 인원이 이미 마감되었습니다."
```

**Firestore 상태:**
```
marketJoins/{postId}_{userIdA}: status = "rejected" (자동 거절)
marketJoins/{postId}_{userIdB}: status = "pending"
market/{postId}: currentPeople = 1 (거절로 감소)
```

---

## 시나리오 3: 채팅 데이터 무결성 테스트

### 준비 단계

1. **게시글 데이터:**
   ```
   title: "5:5 매칭"
   fee: undefined (또는 null)
   images: undefined (또는 [])
   ```

2. **승인 후 채팅 버튼 클릭**

---

### 테스트 절차

1. 승인된 사용자가 "채팅하기" 버튼 클릭
2. 콘솔 로그 확인
3. Firestore `chatRooms` 문서 확인

---

### 예상 결과

**콘솔 로그:**
```javascript
🔥 [chat/room] 채팅방 데이터 검증: {
  chatRoomId: "...",
  hasProductSnapshot: true,
  price: null,  // ✅ undefined가 null로 변환됨
  priceType: "object"  // null의 타입
}
```

**Firestore 문서:**
```json
{
  "productSnapshot": {
    "productId": "...",
    "title": "5:5 매칭",  // ✅ 문자열
    "price": null,  // ✅ null (undefined 아님)
    "imageUrl": null,  // ✅ null (undefined 아님)
    "status": "ACTIVE"
  }
}
```

**확인 사항:**
- `undefined` 필드 0개
- `price`는 `null` 또는 `number`
- `title`은 항상 `string` (빈 문자열 가능)

---

## 검증 체크리스트

### 동시 승인 테스트

- [ ] 동시 승인 시도 시 정확히 처리됨
- [ ] 정원 초과 시 자동 거절 또는 에러
- [ ] currentPeople 정확성 유지
- [ ] 트랜잭션 충돌 없음

### 채팅 데이터 무결성

- [ ] `undefined` 필드 0개
- [ ] `price`는 `null` 또는 `number`
- [ ] `title`은 항상 `string`
- [ ] `participants` 배열 정확

---

## 문제 발생 시 확인 사항

### 트랜잭션 실패

1. **콘솔 에러 확인:**
   ```
   ❌ [updateJoinStatus] 트랜잭션 실패: {
     joinId,
     status,
     error: error.message,
     code: error.code,
   }
   ```

2. **일반적인 실패 원인:**
   - 동시 승인 시도 (정상 동작)
   - 네트워크 지연
   - 최대 인원 초과

### 채팅방 생성 실패

1. **콘솔 에러 확인:**
   ```
   ❌ [MatchDetail] 채팅방 생성 실패: {
     error: error.message
   }
   ```

2. **일반적인 실패 원인:**
   - `undefined` 필드 (sanitize로 해결됨)
   - Firestore 규칙 문제
   - 네트워크 지연

---

## 운영 모니터링

### 체크 포인트

1. **인원수 불일치 감지:**
   ```typescript
   const approvedCount = await getApprovedCount(postId);
   if (approvedCount !== post.currentPeople) {
     console.warn("인원수 불일치:", {
       approvedCount,
       currentPeople: post.currentPeople,
     });
   }
   ```

2. **트랜잭션 실패율:**
   - 정상: 5% 미만
   - 경고: 5-10%
   - 위험: 10% 이상

3. **채팅방 생성 실패율:**
   - 정상: 1% 미만
   - 경고: 1-3%
   - 위험: 3% 이상
