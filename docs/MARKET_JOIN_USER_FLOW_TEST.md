# 🔥 일반 사용자 플로우 테스트 (실전 배포 기준)

## 테스트 목표

일반 사용자로 "참여하기" 버튼 클릭 시 정상 동작 확인

---

## 테스트 1: users 문서 체크

### 브라우저 콘솔에서 실행

```javascript
(async () => {
  const { db } = await import("/src/lib/firebase.ts");
  const { doc, getDoc } = await import("firebase/firestore");
  const { getAuth } = await import("firebase/auth");

  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    console.error("❌ 로그인되지 않았습니다.");
    return;
  }

  const uid = user.uid;
  const userRef = doc(db, "users", uid);
  
  try {
    const snap = await getDoc(userRef);
    
    console.log("=== 일반사용자 users 문서 체크 ===");
    console.log("UID:", uid);
    console.log("존재:", snap.exists());
    console.log("데이터:", snap.data());
    
    if (!snap.exists()) {
      console.warn("⚠️ users 문서가 없습니다. 온보딩이 필요할 수 있습니다.");
    } else {
      console.log("✅ users 문서 정상");
    }
    
    return {
      uid,
      exists: snap.exists(),
      data: snap.data(),
    };
  } catch (error) {
    console.error("❌ users 문서 조회 실패:", error);
    return {
      uid,
      exists: false,
      error: error.message,
    };
  }
})();
```

### 보고할 정보

```
UID: ?
존재: ? (true/false)
데이터: ? (또는 에러 메시지)
```

---

## 테스트 2: 참여하기 버튼 클릭

### 준비

1. **일반 사용자 계정으로 로그인** (게시글 작성자가 아닌 계정)
2. 브라우저 개발자 도구 열기 (F12) → Console 탭
3. 매칭 게시글 상세 페이지 접속
4. "참여하기" 버튼 클릭

### 수집할 로그

콘솔에서 아래 패턴의 로그를 모두 복사:

**성공 시:**
```javascript
🔥 [MatchDetail] 참여하기 버튼 클릭: { ... }
🔥 [joinMarketPost] 시작: { postId, userId }
✅ [joinMarketPost] 참여 신청 생성 완료: { joinId }
✅ [MatchDetail] 참여 성공: { joinId }
```

**실패 시:**
```javascript
❌ [MatchDetail] 참여 실패: { error: "..." }
❌ [joinMarketPost] 실패: { error: "..." }
```

### 보고할 정보

```
[참여하기 버튼 클릭 시 전체 콘솔 로그 복사]
```

---

## 테스트 3: 참여 상태 확인

### 참여 후 상태 확인

```javascript
(async () => {
  const { db } = await import("/src/lib/firebase.ts");
  const { doc, getDoc } = await import("firebase/firestore");
  const { getAuth } = await import("firebase/auth");

  const auth = getAuth();
  const user = auth.currentUser;
  const postId = window.location.pathname.split("/").pop();

  if (!user || !postId) {
    console.error("❌ 로그인 또는 게시글 ID 없음");
    return;
  }

  const joinDocId = `${postId}_${user.uid}`;
  const joinRef = doc(db, "marketJoins", joinDocId);
  
  try {
    const snap = await getDoc(joinRef);
    
    console.log("=== 참여 상태 확인 ===");
    console.log("joinId:", joinDocId);
    console.log("존재:", snap.exists());
    console.log("상태:", snap.data()?.status);
    console.log("데이터:", snap.data());
    
    return {
      joinId: joinDocId,
      exists: snap.exists(),
      status: snap.data()?.status,
      data: snap.data(),
    };
  } catch (error) {
    console.error("❌ 참여 상태 조회 실패:", error);
    return {
      joinId: joinDocId,
      exists: false,
      error: error.message,
    };
  }
})();
```

---

## 최종 보고 형식

아래 형식으로 보고해주세요:

```
=== 테스트 1: users 문서 체크 ===
UID: ?
존재: ?
데이터: ?

=== 테스트 2: 참여하기 버튼 클릭 ===
[전체 콘솔 로그 복사]

=== 테스트 3: 참여 상태 확인 (선택) ===
joinId: ?
존재: ?
상태: ?
```

---

## 예상 시나리오

### 시나리오 A: 정상 동작

1. users 문서 존재 ✅
2. 참여하기 클릭 → 성공 ✅
3. marketJoins 문서 생성 ✅
4. 상태 = "pending" ✅
5. 버튼 → "대기중" ✅

### 시나리오 B: users 문서 없음

1. users 문서 없음 ⚠️
2. 참여하기 클릭 → 자동 생성 시도
3. 성공 또는 권한 오류

### 시나리오 C: 권한 오류

1. users 문서 조회 실패 ❌
2. 참여하기 클릭 → 권한 오류
3. 에러 메시지 확인 필요

---

## 다음 단계

테스트 결과를 받으면:
1. users 문서 자동 생성 로직 강화
2. 참여하기 플로우 완전 안정화
3. 권한 오류 해결
4. 멀티유저 실전 테스트

까지 진행합니다.
