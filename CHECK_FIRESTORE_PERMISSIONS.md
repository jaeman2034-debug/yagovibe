# Firestore 권한 문제 진단 가이드

## 🔴 현재 증상
- `FirebaseError: Missing or insufficient permissions.`
- `[handleSave] publish 실패 → draft로 롤백`
- UI에 "저장 실패" 메시지 표시

## 🔍 확인해야 할 사항

### 1️⃣ Firestore Rules 배포 확인

**명령어:**
```bash
firebase deploy --only firestore:rules
```

**확인 방법:**
1. Firebase Console → Firestore Database → Rules 탭
2. 최신 규칙이 배포되어 있는지 확인
3. Rules Simulator로 테스트

---

### 2️⃣ Firestore 데이터 구조 확인

**확인 경로:**
```
associations/assoc-nowon-football
```

**필수 필드:**
```javascript
{
  adminUids: ["iUZB8RjKlEhb3uotZ6yqtpWtUQE2"]  // ✅ 배열 타입이어야 함
}
```

**확인 사항:**
- ✅ `associations/assoc-nowon-football` 문서 존재
- ✅ `adminUids` 필드 존재
- ✅ `adminUids`가 **배열 타입** (문자열 아님)
- ✅ `adminUids` 배열에 `iUZB8RjKlEhb3uotZ6yqtpWtUQE2` 포함

---

### 3️⃣ Rules Simulator 테스트

**Firebase Console → Firestore → Rules → Rules Simulator**

**테스트 설정:**
```
Location: notices/test-notice-id
Method: create
Authentication: 
  - User ID: iUZB8RjKlEhb3uotZ6yqtpWtUQE2
  - Authentication: Enabled

Request (생성할 데이터):
{
  "associationId": "assoc-nowon-football",
  "title": "테스트",
  "content": "테스트 내용",
  "status": "published",
  "isPinned": false,
  "isOfficial": true,
  "createdAt": "2025-01-XX",
  "createdBy": "iUZB8RjKlEhb3uotZ6yqtpWtUQE2"
}
```

**예상 결과:** ✅ **ALLOW**

---

### 4️⃣ isAssociationAdmin 함수 확인

**현재 함수:**
```javascript
function isAssociationAdmin(associationId) {
  return request.auth != null &&
    exists(/databases/$(database)/documents/associations/$(associationId)) &&
    request.auth.uid in get(/databases/$(database)/documents/associations/$(associationId)).data.adminUids;
}
```

**체크 포인트:**
1. `request.auth != null` → 사용자 로그인 확인
2. `exists(...)` → `associations/{associationId}` 문서 존재 확인
3. `request.auth.uid in ...data.adminUids` → UID가 배열에 포함 확인

---

## 🐛 문제 해결 단계

### Step 1: Firestore Console에서 데이터 확인

1. Firebase Console → Firestore Database → Data 탭
2. `associations` 컬렉션 → `assoc-nowon-football` 문서 확인
3. `adminUids` 필드 확인:
   - 타입: **array** (배열)
   - 값: `["iUZB8RjKlEhb3uotZ6yqtpWtUQE2"]`

**만약 `adminUids`가 문자열이면:**
- Firestore Console에서 직접 수정
- 또는 Cloud Functions로 수정

---

### Step 2: Rules 배포

```bash
# 프로젝트 디렉토리에서
firebase deploy --only firestore:rules
```

**배포 확인:**
- Firebase Console → Firestore → Rules 탭
- 최신 규칙이 반영되었는지 확인

---

### Step 3: Rules Simulator 테스트

1. Firebase Console → Firestore → Rules → Rules Simulator
2. 위의 테스트 설정으로 테스트
3. 결과 확인:
   - ✅ **ALLOW** → Rules 정상
   - ❌ **DENY** → Rules 또는 데이터 문제

---

### Step 4: 브라우저 콘솔에서 디버깅

**브라우저 콘솔에서 실행:**
```javascript
// 현재 사용자 UID 확인
firebase.auth().currentUser?.uid

// Firestore에서 associations 문서 확인
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const assocRef = doc(db, 'associations', 'assoc-nowon-football');
const assocSnap = await getDoc(assocRef);
console.log('Association data:', assocSnap.data());
console.log('adminUids:', assocSnap.data()?.adminUids);
console.log('Is array?', Array.isArray(assocSnap.data()?.adminUids));
console.log('Contains UID?', assocSnap.data()?.adminUids?.includes('iUZB8RjKlEhb3uotZ6yqtpWtUQE2'));
```

---

## ✅ 예상 원인 및 해결책

### 원인 1: Rules 미배포
**해결:** `firebase deploy --only firestore:rules` 실행

### 원인 2: adminUids가 문자열
**해결:** Firestore Console에서 배열로 수정

### 원인 3: adminUids에 UID 없음
**해결:** Firestore Console에서 UID 추가

### 원인 4: associations 문서 없음
**해결:** 문서 생성 및 adminUids 설정

---

## 🧪 빠른 테스트 스크립트

**브라우저 콘솔에서 실행:**
```javascript
(async () => {
  const { doc, getDoc } = await import('firebase/firestore');
  const { db } = await import('/src/lib/firebase');
  
  const assocRef = doc(db, 'associations', 'assoc-nowon-football');
  const assocSnap = await getDoc(assocRef);
  
  if (!assocSnap.exists()) {
    console.error('❌ associations/assoc-nowon-football 문서가 없습니다!');
    return;
  }
  
  const data = assocSnap.data();
  const adminUids = data.adminUids;
  const currentUid = firebase.auth().currentUser?.uid;
  
  console.log('📋 Association 데이터:', data);
  console.log('👤 현재 사용자 UID:', currentUid);
  console.log('🔑 adminUids 타입:', typeof adminUids, Array.isArray(adminUids));
  console.log('🔑 adminUids 값:', adminUids);
  console.log('✅ UID 포함 여부:', adminUids?.includes(currentUid));
  
  if (!Array.isArray(adminUids)) {
    console.error('❌ adminUids가 배열이 아닙니다! 문자열:', adminUids);
  } else if (!adminUids.includes(currentUid)) {
    console.error('❌ adminUids에 현재 사용자 UID가 없습니다!');
  } else {
    console.log('✅ 모든 조건이 정상입니다!');
  }
})();
```

---

## 📝 다음 단계

1. ✅ Firestore Console에서 `associations/assoc-nowon-football` 확인
2. ✅ `adminUids` 배열 타입 및 값 확인
3. ✅ Rules 배포 확인
4. ✅ Rules Simulator 테스트
5. ✅ 브라우저 콘솔 디버깅 스크립트 실행

위 단계를 순서대로 진행하면 문제 원인을 정확히 파악할 수 있습니다.

