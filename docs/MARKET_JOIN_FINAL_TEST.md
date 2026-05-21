# 🔥 매칭 시스템 최종 테스트 가이드 (실전 배포 기준)

## 테스트 1: 무결성 체크

### 브라우저 콘솔에서 실행

```javascript
(async () => {
  const { doc, getDoc, collection, query, where, getDocs } = await import("firebase/firestore");
  const { db } = await import("/src/lib/firebase.ts");
  
  const postId = window.location.pathname.split("/").pop();
  
  // 게시글 조회
  const postRef = doc(db, "market", postId);
  const postSnap = await getDoc(postRef);
  const post = postSnap.data();
  
  // 참여 신청 조회
  const joinsQuery = query(
    collection(db, "marketJoins"),
    where("postId", "==", postId)
  );
  const joinsSnap = await getDocs(joinsQuery);
  
  const joins = joinsSnap.docs.map(d => ({
    id: d.id,
    ...d.data(),
  }));
  
  const approved = joins.filter(j => j.status === "approved");
  const rejected = joins.filter(j => j.status === "rejected");
  const pending = joins.filter(j => j.status === "pending");
  const autoRejected = rejected.filter(j => j.rejectedReason === "FULL_AUTO");
  
  const result = {
    maxPeople: post.people,
    currentPeople: post.currentPeople,
    approvedCount: approved.length,
    rejectedCount: rejected.length,
    pendingCount: pending.length,
    autoRejectedCount: autoRejected.length,
    isSafe: post.currentPeople === approved.length,
    difference: post.currentPeople - approved.length,
  };
  
  console.log("=== 무결성 체크 결과 ===");
  console.log("maxPeople:", result.maxPeople);
  console.log("currentPeople:", result.currentPeople);
  console.log("approved 수:", result.approvedCount);
  console.log("일치 여부:", result.isSafe ? "✅ 일치" : "❌ 불일치");
  console.log("차이:", result.difference);
  console.log("자동 거절 수:", result.autoRejectedCount);
  
  return result;
})();
```

### 보고할 정보

```
currentPeople: ?
approved 수: ?
일치 여부: ?
```

---

## 테스트 2: 승인 버튼 클릭 로그

### 준비

1. 권한자 계정으로 로그인
2. 브라우저 개발자 도구 열기 (F12) → Console 탭
3. 참여 신청 목록에서 승인 버튼 클릭

### 수집할 로그

콘솔에서 아래 패턴의 로그를 모두 복사:

```javascript
🔥 [updateJoinStatus] 시작: { ... }
📋 [updateJoinStatus] 현재 상태: { ... }
📊 [updateJoinStatus] 게시글 현재 인원: { ... }
✅ [updateJoinStatus] join 문서 업데이트 예약: { ... }
📈 [updateJoinStatus] 승인 → 인원수 유지: { ... }
✅ [updateJoinStatus] 트랜잭션 완료: { ... }
```

또는 FULL 방어 시:

```javascript
⚠️ [updateJoinStatus] 최대 인원 초과 방지 (자동 거절): { ... }
❌ [updateJoinStatus] 트랜잭션 실패: { ... }
```

### 보고할 정보

```
[승인 버튼 클릭 시 전체 콘솔 로그 복사]
```

---

## 테스트 3: 채팅 버튼 클릭

### 준비

1. 승인된 일반 사용자 계정으로 로그인
2. 브라우저 개발자 도구 열기 (F12) → Console 탭
3. "채팅하기" 버튼 클릭

### 수집할 로그

에러가 있으면:

```javascript
❌ [MatchDetail] 채팅방 생성 실패: { ... }
```

성공하면:

```javascript
💬 [MatchDetail] 채팅 버튼 클릭: { ... }
✅ [MatchDetail] chatRoomId 생성: { ... }
🔥 [chat/room] 채팅방 데이터 검증: { ... }
✅ [chat/room] 새 채팅방 생성: { ... }
✅ [MatchDetail] 채팅방 생성/확인 완료: { ... }
```

### 보고할 정보

```
[채팅 버튼 클릭 시 전체 콘솔 로그 또는 에러 메시지]
```

---

## 테스트 4: 동시 승인 테스트 (선택)

### 준비

1. 게시글: `maxPeople = 2`
2. 참여 신청: 3명 (pending)
3. 브라우저 2개 열기
4. 권한자 계정으로 동시에 승인 버튼 클릭 (1초 이내)

### 예상 결과

- 2명만 승인 성공
- 1명은 자동 거절 (`rejectedReason: "FULL_AUTO"`)

### 보고할 정보

```
[브라우저 A 콘솔 로그]
[브라우저 B 콘솔 로그]
```

---

## 최종 보고 형식

아래 형식으로 보고해주세요:

```
=== 테스트 1: 무결성 체크 ===
currentPeople: ?
approved 수: ?
일치 여부: ?

=== 테스트 2: 승인 버튼 클릭 ===
[전체 콘솔 로그 복사]

=== 테스트 3: 채팅 버튼 클릭 ===
[전체 콘솔 로그 또는 에러 메시지]
```

---

## 다음 단계

테스트 결과를 받으면:
1. 알림 시스템 통합
2. 채팅방 자동 생성 강화
3. 롤백 전략 구현
4. FULL 시 자동 거절 UX 개선

까지 풀세트 코드 작성합니다.
