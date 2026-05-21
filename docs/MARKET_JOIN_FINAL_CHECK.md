# 🔥 권한자 풀플로우 최종 체크 (실전 배포 기준)

## 테스트 목표

권한자 기능 완전 정상화 확인:
1. 승인 버튼 실제 동작
2. 무결성 체크
3. 채팅방 생성 에러 확인

---

## 테스트 1: 무결성 체크

### 브라우저 콘솔에서 실행

```javascript
(async () => {
  const { db } = await import("/src/lib/firebase.ts");
  const { doc, getDoc, collection, query, where, getDocs } = await import("firebase/firestore");
  
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
  
  const joins = joinsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const approved = joins.filter(j => j.status === "approved");
  
  const result = {
    currentPeople: post.currentPeople,
    approvedCount: approved.length,
    isSafe: post.currentPeople === approved.length,
  };
  
  console.log("=== 무결성 체크 결과 ===");
  console.log("currentPeople:", result.currentPeople);
  console.log("approved 수:", result.approvedCount);
  console.log("일치 여부:", result.isSafe ? "✅ 일치" : "❌ 불일치");
  
  return result;
})();
```

### 보고 형식

```
1) 무결성 체크 결과
currentPeople: ?
approved 수: ?
일치 여부: ?
```

---

## 테스트 2: 승인 버튼 클릭

### 준비

1. **권한자 계정으로 로그인** (게시글 작성자)
2. 브라우저 개발자 도구 열기 (F12) → Console 탭
3. 매칭 게시글 상세 페이지 접속
4. 참여 신청 목록에서 **승인 버튼 클릭**

### 수집할 로그

콘솔에서 아래 패턴의 로그를 모두 복사:

**성공 시:**
```javascript
🔥 [updateJoinStatus] 시작: { joinId, status: "approved", postId }
📋 [updateJoinStatus] 현재 상태: { currentStatus: "pending", ... }
📊 [updateJoinStatus] 게시글 현재 인원: { beforeCurrentPeople, maxPeople }
✅ [updateJoinStatus] join 문서 업데이트 예약: { newStatus: "approved" }
📈 [updateJoinStatus] 승인 → 인원수 유지: { currentPeople, maxPeople, remaining }
✅ [updateJoinStatus] 트랜잭션 완료: { joinId, status: "approved" }
✅ [MatchDetail] 승인 성공: { joinId }
```

**FULL 방어 시:**
```javascript
🔥 [updateJoinStatus] 시작: { joinId, status: "approved", postId }
📋 [updateJoinStatus] 현재 상태: { currentStatus: "pending", ... }
📊 [updateJoinStatus] 게시글 현재 인원: { beforeCurrentPeople, maxPeople }
⚠️ [updateJoinStatus] 최대 인원 초과 방지 (자동 거절): { currentPeople, maxPeople, ... }
❌ [updateJoinStatus] 트랜잭션 실패: { error: "모집 인원이 이미 마감되었습니다." }
```

### 보고 형식

```
2) 승인 클릭 후 콘솔 로그 전체
[전체 콘솔 로그 복사]
```

---

## 테스트 3: 채팅하기 버튼 클릭

### 준비

1. **승인된 일반 사용자 계정으로 로그인**
2. 브라우저 개발자 도구 열기 (F12) → Console 탭
3. 매칭 게시글 상세 페이지 접속
4. **"채팅하기" 버튼 클릭**

### 수집할 로그

**성공 시:**
```javascript
💬 [MatchDetail] 채팅 버튼 클릭: { postId, userId, authorId, joinStatus: "approved" }
✅ [MatchDetail] chatRoomId 생성: "..."
🔥 [MatchDetail] 채팅방 데이터 검증: { title, fee, feeType, ... }
🔥 [chat/room] 채팅방 데이터 검증: { chatRoomId, hasProductSnapshot, price, priceType }
✅ [chat/room] 새 채팅방 생성: "..."
✅ [MatchDetail] 채팅방 생성/확인 완료: "/app/chat/..."
```

**에러 시:**
```javascript
❌ [MatchDetail] 채팅방 생성 실패: { error: "..." }
```

### 보고 형식

```
3) 채팅하기 버튼 클릭 시 에러 있으면 그 로그
[에러 로그 또는 성공 로그 복사]
```

---

## 최종 보고 형식

아래 형식으로 보고해주세요:

```
=== 테스트 1: 무결성 체크 ===
currentPeople: ?
approved 수: ?
일치 여부: ?

=== 테스트 2: 승인 클릭 ===
[전체 콘솔 로그 복사]

=== 테스트 3: 채팅하기 버튼 ===
[에러 로그 또는 성공 로그]
```

---

## 다음 단계

테스트 결과를 받으면:
1. ✅ 권한자 기능 완결
2. ✅ 승인 → 채팅방 자동 연결
3. ✅ 알림 시스템 연결
4. ✅ 일반 사용자 플로우 확장

까지 풀세트 코드 작성합니다.
