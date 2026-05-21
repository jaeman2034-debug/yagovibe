# 🔍 권한 데이터 확인 가이드

## 📌 현재 상황

콘솔 로그 기준:
- ✅ `userUid: "qGq5XmuXRBsRZOqJFEOyqtZY5Hin"` - 로그인 성공!
- ❌ `isOwner: false` - 권한 확인 실패
- ❌ `canPublish: false` - 권한 확인 실패
- ❌ `adminUids: Array(0)` - 빈 배열
- ❌ `superAdminUids: Array(0)` - 빈 배열

---

## 🔍 확인 절차

### 1. Firestore Emulator UI에서 데이터 확인

1. **Firestore Emulator UI 열기**
   - `http://localhost:4001` 접속
   - Firestore 탭 클릭

2. **Association 문서 확인**
   - `associations` 컬렉션 클릭
   - `assoc-nowon-football` 문서 클릭
   - 다음 필드 확인:
     - `ownerUid`: `qGq5XmuXRBsRZ0qJFE0yqtZY5Hin` ✅
     - `name`: `"노원구축구협회"` ✅
     - `status`: `"active"` ✅

3. **Members 서브컬렉션 확인**
   - `assoc-nowon-football` 문서에서 `members` 서브컬렉션 클릭
   - `qGq5XmuXRBsRZ0qJFE0yqtZY5Hin` 문서 확인
   - 다음 필드 확인:
     - `role`: `"admin"` ✅
     - `status`: `"active"` ✅

---

### 2. 브라우저 콘솔에서 직접 확인

콘솔에 다음 코드 입력:

```javascript
// Firestore 데이터 확인
const { db } = await import('/src/lib/firebase.js');
const { doc, getDoc } = await import('firebase/firestore');

// Association 문서 확인
const assocRef = doc(db, 'associations/assoc-nowon-football');
const assocDoc = await getDoc(assocRef);
console.log('Association 문서 존재:', assocDoc.exists());
console.log('Association 데이터:', assocDoc.exists() ? assocDoc.data() : '❌ 존재하지 않음');
console.log('ownerUid:', assocDoc.data()?.ownerUid);

// Members 문서 확인
const memberRef = doc(db, 'associations/assoc-nowon-football/members/qGq5XmuXRBsRZ0qJFE0yqtZY5Hin');
const memberDoc = await getDoc(memberRef);
console.log('Member 문서 존재:', memberDoc.exists());
console.log('Member 데이터:', memberDoc.exists() ? memberDoc.data() : '❌ 존재하지 않음');
console.log('role:', memberDoc.data()?.role);

// 현재 사용자 UID 확인
const { auth } = await import('/src/lib/firebase.js');
console.log('현재 사용자 UID:', auth.currentUser?.uid);
console.log('일치 여부:', auth.currentUser?.uid === assocDoc.data()?.ownerUid);
```

---

### 3. UID 일치 확인

콘솔 로그에서:
- `userUid: "qGq5XmuXRBsRZOqJFEOyqtZY5Hin"` (콘솔에 표시된 값)
- 스크립트로 추가한 UID: `qGq5XmuXRBsRZ0qJFE0yqtZY5Hin`

**주의**: 마지막 글자가 다를 수 있습니다!
- 콘솔: `...qtZY5Hin` (소문자 'i')
- 스크립트: `...qtZY5Hin` (소문자 'i')

정확한 UID 확인이 필요합니다.

---

## 🔧 문제 해결

### 문제 1: UID 불일치

**확인 방법**:
1. Auth Emulator에서 실제 사용자 UID 확인
2. 콘솔 로그의 `userUid` 값 확인
3. Firestore의 `ownerUid` 값 확인
4. 세 값이 정확히 일치하는지 확인

**해결**:
- UID가 다르면 Firestore의 `ownerUid`를 실제 사용자 UID로 수정

### 문제 2: Association 문서를 찾지 못함

**확인 방법**:
- 콘솔에 `[useIsAssociationOwner] 협회 문서가 존재하지 않음` 로그가 있는지 확인

**해결**:
- Firestore Emulator UI에서 문서 존재 확인
- 스크립트 다시 실행

---

## 📝 확인 체크리스트

- [ ] Firestore Emulator UI에서 `associations/assoc-nowon-football` 문서 확인
- [ ] `ownerUid` 필드 값 확인
- [ ] `members/qGq5XmuXRBsRZ0qJFE0yqtZY5Hin` 문서 확인
- [ ] `role: "admin"` 필드 확인
- [ ] 브라우저 콘솔에서 UID 일치 확인
- [ ] 페이지 새로고침 후 권한 확인

---

## 💬 요약

**현재 상태**:
- ✅ 로그인 성공 (`userUid` 확인됨)
- ❌ 권한 확인 실패 (`isOwner: false`)

**확인 필요**:
1. Firestore 데이터가 실제로 추가되었는지
2. UID가 정확히 일치하는지
3. Association 문서가 존재하는지

**다음 단계**:
1. Firestore Emulator UI에서 데이터 확인
2. 브라우저 콘솔에서 직접 확인 코드 실행
3. UID 일치 여부 확인
