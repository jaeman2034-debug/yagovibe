# 🔍 Firestore Rules 권한 검증 가이드

> ⚠️ **주의**: 아래 예시의 `@/lib/firebase` 는 **프론트엔드(Vite) 전용 alias** 입니다.  
> 브라우저 콘솔에서 실행할 땐 `@/` 가 해석되지 않으므로, 앱이 로드된 페이지에서 `window` 에 노출된 객체를 사용하거나, 상대 URL로 import 해주세요.

## 🎯 관리자 판정 방식 (Rules 기준)

**현재 Rules는 두 가지 방식 모두 체크:**

1. **방법 1**: `associations/{associationId}/members/{uid}` 문서의 `role == "admin"`
2. **방법 2**: `associations/{associationId}` 문서의 `adminUids` 배열에 UID 포함

**둘 중 하나라도 true면 관리자로 판정**

---

## 1️⃣ 권한 판정 근거 검증 (최우선)

### 브라우저 콘솔에서 실행

```javascript
// 현재 사용자 UID 확인
const { auth } = await import("@/lib/firebase");
console.log("현재 사용자 UID:", auth.currentUser?.uid);

// 방법 1: members/{uid} 문서 확인
const { doc, getDoc } = await import("firebase/firestore");
const { db } = await import("@/lib/firebase");

const associationId = "assoc-nowon-football"; // 실제 협회 ID로 변경
const uid = auth.currentUser?.uid;

// members 문서 확인
const memberRef = doc(db, `associations/${associationId}/members/${uid}`);
const memberSnap = await getDoc(memberRef);

console.log("방법 1 - members 문서 존재:", memberSnap.exists());
if (memberSnap.exists()) {
  console.log("방법 1 - role:", memberSnap.data()?.role);
  console.log("방법 1 - 관리자 여부:", memberSnap.data()?.role === "admin");
}

// 방법 2: adminUids 배열 확인
const associationRef = doc(db, `associations/${associationId}`);
const associationSnap = await getDoc(associationRef);

if (associationSnap.exists()) {
  const adminUids = associationSnap.data()?.adminUids;
  console.log("방법 2 - adminUids 타입:", typeof adminUids);
  console.log("방법 2 - adminUids 값:", adminUids);
  console.log("방법 2 - 배열 여부:", Array.isArray(adminUids));
  if (Array.isArray(adminUids)) {
    console.log("방법 2 - UID 포함 여부:", adminUids.includes(uid));
  }
}
```

### 예상 결과

**정상 케이스**:
- 방법 1: `members/{uid}` 문서 존재 + `role === "admin"` → ✅ 관리자
- 또는 방법 2: `adminUids` 배열 + UID 포함 → ✅ 관리자

**문제 케이스**:
- 방법 1: 문서 없음 또는 `role !== "admin"` → ❌
- 방법 2: `adminUids`가 배열이 아니거나 UID 미포함 → ❌
- **둘 다 false면 Rules는 영원히 false → 영원히 permission error**

---

## 2️⃣ Firestore Rules 경로 확인

### 현재 Rules가 allow read 하는 경로

✅ **Teams**: `associations/{aid}/tournaments/{tid}/teams/{teamId}`
```rules
allow read: if isAssociationAdmin(associationId);
```

✅ **Stats**: `associations/{aid}/tournaments/{tid}/stats/{statId}`
```rules
allow read: if isAssociationAdmin(associationId);
```

✅ **Phase Events**: `associations/{aid}/tournaments/{tid}/phaseEvents/{eventId}`
```rules
allow read: if isAssociationAdmin(associationId);
```

✅ **Ops Logs**: `associations/{aid}/tournaments/{tid}/opsLogs/{logId}`
```rules
allow read: if isAssociationAdmin(associationId);
```

### 확인 포인트

- [ ] 모든 경로에 `isAssociationAdmin(associationId)` 사용
- [ ] `associationId` 변수가 올바르게 전달되는지 확인

---

## 3️⃣ 실제 데이터 구조 확인

### Firestore Console에서 확인

1. **`associations/{associationId}` 문서**
   - `adminUids` 필드 존재 여부
   - `adminUids` 타입이 **배열(array)**인지 확인
   - 현재 사용자 UID가 배열에 포함되어 있는지 확인

2. **`associations/{associationId}/members/{uid}` 문서**
   - 문서 존재 여부
   - `role` 필드가 `"admin"`인지 확인

---

## 4️⃣ 문제 해결 체크리스트

### 케이스 A: members 문서 없음
**해결**: `associations/{associationId}/members/{uid}` 문서 생성
```javascript
// Firestore Console에서 수동 생성
// 문서 ID: {uid}
// 필드: role: "admin" (string)
```

### 케이스 B: adminUids가 배열이 아님
**해결**: `associations/{associationId}` 문서의 `adminUids` 필드를 배열로 변경
```javascript
// Firestore Console에서
// adminUids 필드 삭제 후
// 새로 추가: 타입 = array, 값 = [uid1, uid2, ...]
```

### 케이스 C: adminUids 배열에 UID 없음
**해결**: 배열에 현재 사용자 UID 추가

---

## 5️⃣ 최종 검증 스크립트

```javascript
// 브라우저 콘솔에서 실행
(async () => {
  const { auth, db } = await import("@/lib/firebase");
  const { doc, getDoc } = await import("firebase/firestore");
  
  const associationId = "assoc-nowon-football"; // 실제 ID로 변경
  const uid = auth.currentUser?.uid;
  
  console.log("=== 권한 검증 시작 ===");
  console.log("사용자 UID:", uid);
  console.log("협회 ID:", associationId);
  
  // 방법 1 확인
  const memberRef = doc(db, `associations/${associationId}/members/${uid}`);
  const memberSnap = await getDoc(memberRef);
  const isMemberAdmin = memberSnap.exists() && memberSnap.data()?.role === "admin";
  console.log("방법 1 (members):", isMemberAdmin);
  
  // 방법 2 확인
  const assocRef = doc(db, `associations/${associationId}`);
  const assocSnap = await getDoc(assocRef);
  const adminUids = assocSnap.exists() ? assocSnap.data()?.adminUids : null;
  const isAdminUid = Array.isArray(adminUids) && adminUids.includes(uid);
  console.log("방법 2 (adminUids):", isAdminUid);
  
  // 최종 판정
  const isAdmin = isMemberAdmin || isAdminUid;
  console.log("=== 최종 판정 ===");
  console.log("관리자 여부:", isAdmin);
  
  if (!isAdmin) {
    console.error("❌ 관리자로 판정되지 않음!");
    console.log("해결 방법:");
    if (!memberSnap.exists()) {
      console.log("1. members/{uid} 문서 생성 필요");
    }
    if (!Array.isArray(adminUids)) {
      console.log("2. adminUids를 배열로 변경 필요");
    }
    if (Array.isArray(adminUids) && !adminUids.includes(uid)) {
      console.log("3. adminUids 배열에 UID 추가 필요");
    }
  } else {
    console.log("✅ 관리자로 판정됨!");
  }
})();
```

---

## 🎯 다음 단계

1. **위 스크립트 실행** → 관리자 판정 여부 확인
2. **문제 발견 시** → Firestore Console에서 수정
3. **하드 리프레시** → 권한 재확인
4. **버튼 상태 확인** → 활성화 여부 확인
