# 🔍 데이터 추가 확인 가이드

## 📌 현재 상황

콘솔 로그를 보면:
- `userUid: undefined` - 여전히 로그인 상태 문제
- `isOwner: false` - 권한 확인 실패
- `canPublish: false` - 게시 불가

---

## ✅ 확인 절차

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

### 2. 로그인 상태 확인 (가장 중요)

**문제**: `userUid: undefined`

**해결**:
1. **로그인 페이지로 이동**
   - 로그아웃 후 다시 로그인
2. **Auth Emulator 확인**
   - `http://localhost:4001` → Authentication → Users
   - `qGq5XmuXRBsRZ0qJFE0yqtZY5Hin` 사용자 존재 확인
3. **로그인 후 대회 등록 페이지로 이동**

---

### 3. 브라우저 콘솔에서 직접 확인

콘솔에 다음 코드 입력:

```javascript
// Firestore 데이터 확인
const { db } = await import('/src/lib/firebase.js');
const { doc, getDoc } = await import('firebase/firestore');

// Association 문서 확인
const assocRef = doc(db, 'associations/assoc-nowon-football');
const assocDoc = await getDoc(assocRef);
console.log('Association 문서:', assocDoc.exists() ? assocDoc.data() : '존재하지 않음');

// Members 문서 확인
const memberRef = doc(db, 'associations/assoc-nowon-football/members/qGq5XmuXRBsRZ0qJFE0yqtZY5Hin');
const memberDoc = await getDoc(memberRef);
console.log('Member 문서:', memberDoc.exists() ? memberDoc.data() : '존재하지 않음');
```

---

## 🔧 문제 해결

### 문제 1: userUid가 undefined

**원인**: 로그인하지 않았거나 Auth 상태가 로드되지 않음

**해결**:
1. 로그인 페이지로 이동
2. Email/Password로 로그인
3. 대회 등록 페이지로 다시 이동

### 문제 2: 권한 데이터가 추가되지 않음

**원인**: 스크립트 실행 실패 또는 Emulator 연결 문제

**해결**:
1. Firestore Emulator가 실행 중인지 확인
2. 스크립트 다시 실행:
   ```bash
   node scripts/seed-admin-permission.js
   ```
3. Emulator UI에서 데이터 확인

---

## 📝 최종 확인 체크리스트

- [ ] Firestore Emulator UI에서 `associations/assoc-nowon-football` 문서 확인
- [ ] `ownerUid` 필드 존재 확인
- [ ] `members/qGq5XmuXRBsRZ0qJFE0yqtZY5Hin` 문서 확인
- [ ] `role: "admin"` 필드 확인
- [ ] 로그인 상태 확인 (콘솔에서 `userUid` 확인)
- [ ] 페이지 새로고침 후 권한 확인

---

## 💬 요약

**현재 상태**:
- ✅ 스크립트 실행 완료
- ❌ `userUid: undefined` - 로그인 필요
- ❌ 권한 확인 실패 - 로그인 후 확인 필요

**다음 단계**:
1. 로그인 확인
2. Firestore 데이터 확인
3. 페이지 새로고침 후 권한 확인
