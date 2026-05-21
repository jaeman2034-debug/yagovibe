# 🔍 권한 확인 실패 원인 진단

## 📌 현재 상황 (콘솔 로그 기준)

### ✅ 성공한 것
- `userUid: "qGq5XmuXRBsRZOqJFEOyqtZY5Hin"` - 로그인 성공!

### ❌ 실패한 것
- `isOwner: false` - 권한 확인 실패
- `canPublish: false` - 권한 확인 실패
- `adminUids: Array(0)` - 빈 배열
- `superAdminUids: Array(0)` - 빈 배열

---

## 🔍 핵심 문제

### 문제 1: `[useIsAssociationOwner] ownerUid 기준 확인` 로그가 없음

**의미**:
- Hook이 실행되지 않았거나
- Association 문서를 찾지 못했거나
- 권한 문제로 읽지 못함

**확인 필요**:
- 콘솔에 이 로그가 있는지 확인
- 없다면 Association 문서가 존재하지 않거나 읽기 권한이 없음

---

### 문제 2: `adminUids: Array(0)` - 빈 배열

**의미**:
- `useIsAssociationAdmin` Hook이 `members/{uid}` 문서를 찾지 못함
- 하위 호환으로 `adminUids` 배열을 확인했지만 빈 배열
- 결과: `canPublish: false`

**확인 필요**:
- `members/qGq5XmuXRBsRZ0qJFE0yqtZY5Hin` 문서가 존재하는지
- `role: "admin"` 필드가 있는지

---

## ✅ 해결 방법

### STEP 1: Firestore Emulator UI에서 직접 확인

1. **Firestore Emulator UI 열기**
   - `http://localhost:4001` 접속
   - Firestore 탭 클릭

2. **Association 문서 확인**
   - `associations` → `assoc-nowon-football` 클릭
   - 다음 필드 확인:
     - `ownerUid`: `qGq5XmuXRBsRZ0qJFE0yqtZY5Hin` ✅
     - `name`: `"노원구축구협회"` ✅

3. **Members 서브컬렉션 확인**
   - `assoc-nowon-football` → `members` 클릭
   - `qGq5XmuXRBsRZ0qJFE0yqtZY5Hin` 문서 확인
   - 다음 필드 확인:
     - `role`: `"admin"` ✅
     - `status`: `"active"` ✅

---

### STEP 2: 브라우저 콘솔에서 직접 확인

콘솔에 다음 코드 입력 (에러 무시하고 실행):

```javascript
// Firestore 데이터 확인
(async () => {
  try {
    const { db } = await import('/src/lib/firebase.js');
    const { doc, getDoc } = await import('firebase/firestore');
    const { auth } = await import('/src/lib/firebase.js');

    // 현재 사용자 UID
    const currentUid = auth.currentUser?.uid;
    console.log('현재 사용자 UID:', currentUid);

    // Association 문서 확인
    const assocRef = doc(db, 'associations/assoc-nowon-football');
    const assocDoc = await getDoc(assocRef);
    
    if (!assocDoc.exists()) {
      console.error('❌ Association 문서가 존재하지 않음!');
      return;
    }
    
    const assocData = assocDoc.data();
    console.log('✅ Association 문서 존재');
    console.log('ownerUid:', assocData?.ownerUid);
    console.log('일치 여부:', currentUid === assocData?.ownerUid);

    // Members 문서 확인
    const memberRef = doc(db, `associations/assoc-nowon-football/members/${currentUid}`);
    const memberDoc = await getDoc(memberRef);
    
    if (!memberDoc.exists()) {
      console.error('❌ Member 문서가 존재하지 않음!');
      return;
    }
    
    const memberData = memberDoc.data();
    console.log('✅ Member 문서 존재');
    console.log('role:', memberData?.role);
    console.log('status:', memberData?.status);
  } catch (error) {
    console.error('❌ 오류:', error);
  }
})();
```

---

### STEP 3: UID 정확히 일치하는지 확인

콘솔 로그에서:
- `userUid: "qGq5XmuXRBsRZOqJFEOyqtZY5Hin"` (콘솔에 표시된 값)
- 스크립트로 추가한 UID: `qGq5XmuXRBsRZ0qJFE0yqtZY5Hin`

**주의**: 마지막 글자가 다를 수 있습니다!
- 정확한 UID 확인 필요

---

## 🔧 예상 원인 및 해결

### 원인 1: UID 불일치

**증상**: `ownerUid`와 `userUid`가 정확히 일치하지 않음

**해결**:
1. Auth Emulator에서 실제 사용자 UID 확인
2. Firestore의 `ownerUid`를 실제 UID로 수정

### 원인 2: Association 문서를 찾지 못함

**증상**: `[useIsAssociationOwner] 협회 문서가 존재하지 않음` 로그

**해결**:
1. Firestore Emulator UI에서 문서 존재 확인
2. 스크립트 다시 실행

### 원인 3: Members 문서를 찾지 못함

**증상**: `adminUids: Array(0)` - 빈 배열

**해결**:
1. Firestore Emulator UI에서 `members/{uid}` 문서 확인
2. 문서가 없으면 스크립트 다시 실행

---

## 📝 확인 절차

1. **Firestore Emulator UI 확인**
   - `associations/assoc-nowon-football` 문서 확인
   - `ownerUid` 필드 값 확인
   - `members/{uid}` 문서 확인

2. **브라우저 콘솔 확인**
   - `[useIsAssociationOwner] ownerUid 기준 확인` 로그 확인
   - 위의 확인 코드 실행

3. **UID 일치 확인**
   - Auth Emulator의 실제 UID
   - Firestore의 `ownerUid` 값
   - 콘솔의 `userUid` 값
   - 세 값이 정확히 일치하는지 확인

---

## 💬 요약

**현재 상태**:
- ✅ 로그인 성공
- ❌ 권한 확인 실패

**확인 필요**:
1. Firestore 데이터 존재 여부
2. UID 정확히 일치하는지
3. Association 문서 읽기 권한

**다음 단계**:
1. Firestore Emulator UI에서 데이터 확인
2. 브라우저 콘솔에서 확인 코드 실행
3. 결과 공유
