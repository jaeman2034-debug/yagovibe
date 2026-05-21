# 🔥 매칭 참여 테스트 체크리스트 (즉시 실행 가능)

## 📋 테스트 전 확인 사항

### 1. 현재 게시글 상태 확인

**Firebase Console → Firestore → market 컬렉션 → {postId} 문서**

확인할 필드:
```
people: ? (최대 인원)
currentPeople: ? (현재 인원)
```

**또는 브라우저 콘솔에서:**
```javascript
// 게시글 ID 확인 (URL에서)
const postId = "YOUR_POST_ID";

// Firestore에서 직접 조회
const { doc, getDoc } = await import("firebase/firestore");
const { db } = await import("/src/lib/firebase.ts");

const postRef = doc(db, "market", postId);
const postSnap = await getDoc(postRef);

if (postSnap.exists()) {
  const post = postSnap.data();
  console.log("📊 게시글 상태:", {
    postId,
    maxPeople: post.people,
    currentPeople: post.currentPeople,
    title: post.title,
  });
}
```

---

## 🧪 테스트 시나리오: 동시 승인 테스트

### 준비 단계

1. **참여 신청 생성:**
   - 계정 B: 참여 신청 (pending)
   - 계정 C: 참여 신청 (pending)
   - 계정 D: 참여 신청 (pending) (선택)

2. **권한자 계정으로 로그인:**
   - 게시글 작성자 계정

---

### 테스트 절차

#### 1단계: 현재 상태 확인

**브라우저 개발자 도구 (F12) → Console 탭**

```javascript
// 현재 게시글 상태 확인
const postId = "YOUR_POST_ID"; // URL에서 확인
const { doc, getDoc, collection, query, where, getDocs } = await import("firebase/firestore");
const { db } = await import("/src/lib/firebase.ts");

// 게시글 조회
const postRef = doc(db, "market", postId);
const postSnap = await getDoc(postRef);
const post = postSnap.data();

console.log("📊 [테스트] 게시글 상태:", {
  postId,
  maxPeople: post.people,
  currentPeople: post.currentPeople,
});

// 참여 신청 목록 조회
const joinsQuery = query(
  collection(db, "marketJoins"),
  where("postId", "==", postId),
  where("status", "==", "pending")
);
const joinsSnap = await getDocs(joinsQuery);

console.log("📋 [테스트] 대기 중인 참여 신청:", {
  count: joinsSnap.size,
  joins: joinsSnap.docs.map(doc => ({
    id: doc.id,
    userId: doc.data().userId,
    status: doc.data().status,
  })),
});
```

**이 정보를 복사:**
```
maxPeople: ?
currentPeople: ?
대기 중인 참여 신청: ?명
```

---

#### 2단계: 동시 승인 테스트

**방법 A: 브라우저 2개 사용**

1. **브라우저 A (권한자 계정):**
   - 매칭 게시글 상세 페이지 접속
   - 참여 신청 목록에서 첫 번째 승인 버튼 클릭
   - 콘솔 로그 확인

2. **브라우저 B (같은 권한자 계정, 시크릿 창):**
   - 같은 매칭 게시글 상세 페이지 접속
   - 참여 신청 목록에서 두 번째 승인 버튼 클릭
   - **가능하면 동시에 클릭** (1-2초 이내)

3. **콘솔 로그 확인:**
   - 브라우저 A 콘솔
   - 브라우저 B 콘솔

---

**방법 B: 빠르게 연속 클릭**

1. 권한자 계정으로 로그인
2. 매칭 게시글 상세 페이지 접속
3. 참여 신청 목록에서 **빠르게 연속으로 승인 버튼 클릭** (2-3개)
4. 콘솔 로그 확인

---

#### 3단계: 결과 확인

**콘솔 로그에서 찾을 정보:**

```javascript
// 브라우저 A 콘솔
🔥 [updateJoinStatus] 시작: { joinId: "...", status: "approved", postId: "..." }
📊 [updateJoinStatus] 게시글 현재 인원: { beforeCurrentPeople: ?, maxPeople: ? }
✅ [updateJoinStatus] 트랜잭션 완료: { joinId: "...", status: "approved" }
// 또는
⚠️ [updateJoinStatus] 최대 인원 초과 방지 (자동 거절): { ... }
❌ [updateJoinStatus] 트랜잭션 실패: { ... }

// 브라우저 B 콘솔
🔥 [updateJoinStatus] 시작: { joinId: "...", status: "approved", postId: "..." }
📊 [updateJoinStatus] 게시글 현재 인원: { beforeCurrentPeople: ?, maxPeople: ? }
✅ [updateJoinStatus] 트랜잭션 완료: { joinId: "...", status: "approved" }
// 또는
⚠️ [updateJoinStatus] 최대 인원 초과 방지 (자동 거절): { ... }
❌ [updateJoinStatus] 트랜잭션 실패: { ... }
```

**Firestore 상태 확인:**

```javascript
// 승인 후 상태 확인
const postSnap = await getDoc(doc(db, "market", postId));
const post = postSnap.data();

const approvedQuery = query(
  collection(db, "marketJoins"),
  where("postId", "==", postId),
  where("status", "==", "approved")
);
const approvedSnap = await getDocs(approvedQuery);

console.log("✅ [테스트] 승인 후 상태:", {
  currentPeople: post.currentPeople,
  maxPeople: post.people,
  approvedCount: approvedSnap.size,
  approvedJoins: approvedSnap.docs.map(doc => ({
    id: doc.id,
    userId: doc.data().userId,
    status: doc.data().status,
  })),
});
```

---

## 📝 보고할 정보

테스트 후 아래 정보를 복사해서 알려주세요:

### 1. 게시글 상태

```
maxPeople: ?
currentPeople: ? (승인 전)
```

### 2. 동시 승인 시도

**브라우저 A 콘솔 로그:**
```
[전체 로그 복사]
```

**브라우저 B 콘솔 로그:**
```
[전체 로그 복사]
```

### 3. 승인 후 상태

```
currentPeople: ? (승인 후)
approvedCount: ? (실제 승인된 참여 신청 개수)
```

---

## 🔍 빠른 확인 방법

**브라우저 콘솔에서 한 번에 확인:**

```javascript
// 전체 스크립트 (복사해서 실행)
(async () => {
  const { doc, getDoc, collection, query, where, getDocs } = await import("firebase/firestore");
  const { db } = await import("/src/lib/firebase.ts");
  
  // 게시글 ID (URL에서 확인)
  const postId = window.location.pathname.split("/").pop();
  
  // 게시글 조회
  const postRef = doc(db, "market", postId);
  const postSnap = await getDoc(postRef);
  const post = postSnap.data();
  
  // 참여 신청 조회
  const [pendingSnap, approvedSnap, rejectedSnap] = await Promise.all([
    getDocs(query(collection(db, "marketJoins"), where("postId", "==", postId), where("status", "==", "pending"))),
    getDocs(query(collection(db, "marketJoins"), where("postId", "==", postId), where("status", "==", "approved"))),
    getDocs(query(collection(db, "marketJoins"), where("postId", "==", postId), where("status", "==", "rejected"))),
  ]);
  
  console.log("📊 [테스트] 게시글 전체 상태:", {
    postId,
    maxPeople: post.people,
    currentPeople: post.currentPeople,
    pendingCount: pendingSnap.size,
    approvedCount: approvedSnap.size,
    rejectedCount: rejectedSnap.size,
    pending: pendingSnap.docs.map(d => ({ id: d.id, userId: d.data().userId })),
    approved: approvedSnap.docs.map(d => ({ id: d.id, userId: d.data().userId })),
    rejected: rejectedSnap.docs.map(d => ({ id: d.id, userId: d.data().userId })),
  });
})();
```

이 스크립트를 콘솔에 붙여넣고 실행하면 모든 정보를 한 번에 확인할 수 있습니다.
