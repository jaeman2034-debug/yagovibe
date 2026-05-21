# 🔥 무결성 자동 복구기 (권한자 전용)

## 기능

### 1. 무결성 상태 표시

**위치:** MatchDetail 컴포넌트 (권한자 화면)

**표시 내용:**
- 🟢 무결성 정상: `currentPeople === 실제 승인 수`
- 🔴 무결성 불일치: `currentPeople !== 실제 승인 수`

**자동 체크:**
- 권한자 화면 진입 시 자동 체크
- 30초마다 자동 재체크

---

### 2. 강제 복구 버튼

**조건:**
- 권한자만 표시
- 무결성 불일치 시에만 표시

**기능:**
- `currentPeople`을 실제 승인 수로 보정
- 트랜잭션으로 안전하게 처리

---

## 사용 방법

### 권한자 화면에서

1. 무결성 상태 확인
   - 화면 상단에 무결성 상태 표시
   - 🟢 정상 또는 🔴 불일치

2. 불일치 시 복구
   - "강제 복구" 버튼 클릭
   - 확인 다이얼로그에서 "확인"
   - 자동으로 `currentPeople` 보정

---

## 테스트 스크립트

### 브라우저 콘솔에서 실행

```javascript
// 무결성 체크 스크립트
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
  
  console.log("=== 무결성 체크 ===");
  console.log("maxPeople:", post.people);
  console.log("currentPeople:", post.currentPeople);
  console.log("approved 수:", approved.length);
  console.log("rejected 수:", rejected.length);
  console.log("pending 수:", pending.length);
  console.log("일치 여부:", post.currentPeople === approved.length);
  console.log("불일치 문서:", approved.filter(d => d.postId !== postId));
  
  // 자동 거절 확인
  const autoRejected = rejected.filter(j => j.rejectedReason === "FULL_AUTO");
  console.log("자동 거절 수:", autoRejected.length);
  
  return {
    maxPeople: post.people,
    currentPeople: post.currentPeople,
    approvedCount: approved.length,
    rejectedCount: rejected.length,
    pendingCount: pending.length,
    isSafe: post.currentPeople === approved.length,
    autoRejectedCount: autoRejected.length,
  };
})();
```

---

## 보고할 정보

테스트 후 아래 정보를 알려주세요:

### 1. 무결성 체크 결과
```
maxPeople: ?
currentPeople: ?
approved 수: ?
일치 여부: ?
```

### 2. 승인 테스트
```
FULL 방어 로그: (콘솔 로그 복사)
```

### 3. 채팅 버튼 테스트
```
에러 전문: (에러 메시지 복사)
```
