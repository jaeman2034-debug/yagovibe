# isAdmin false 원인 진단 가이드

## 🔴 현재 증상

스크린샷 기준:
- 공지 등록 버튼이 보이지 않음
- "현재 등록된 공지가 없습니다" 메시지만 표시
- 행정 모드 토글이 보이지 않음

## 🔍 원인 분석

코드 기준 (`NoticeListPage.tsx`):
```typescript
const { isAdmin, loading: adminLoading } = useIsAssociationAdmin(associationId);
```

일반 모드에서 공지 등록 버튼 표시 조건:
```typescript
<NoticeEmptyState 
  associationId={associationId} 
  isAdminMode={isAdminMode}
  onNewNotice={isAdmin ? handleOpenDrawer : undefined}  // ⚠️ isAdmin이 false면 undefined
/>
```

**결론:** `isAdmin`이 `false`이면 `onNewNotice`가 `undefined` → 버튼 숨김

## 🧪 확인 방법

### 1. 브라우저 콘솔 확인

개발자 도구 콘솔에서 다음 로그 확인:

```javascript
[useIsAssociationAdmin] 관리자 권한 확인: {
  associationId: "assoc-nowon-football",
  userUid: "iUZB8RjKlEhb3uotZ6yqtpWtUQE2",
  isAdmin: false,  // ⚠️ false면 문제
  adminUids: [...],
  isArray: true,
  includesResult: false  // ⚠️ false면 UID 불일치
}
```

### 2. Firestore 데이터 확인

Firebase Console에서:
- `associations/assoc-nowon-football` 문서 확인
- `adminUids` 배열에 `iUZB8RjKlEhb3uotZ6yqtpWtUQE2` 포함 확인

### 3. 사용자 UID 확인

브라우저 콘솔에서:
```javascript
firebase.auth().currentUser?.uid
```

## 🔧 가능한 원인

### 원인 1: UID 불일치
- Firestore의 `adminUids` 배열에 있는 UID와 현재 로그인한 사용자 UID가 다름
- 대소문자 차이, 특수문자 차이 등

### 원인 2: adminUids 배열 타입 문제
- 이미 배열로 수정했지만, 캐시 문제로 이전 데이터가 남아있을 수 있음

### 원인 3: useIsAssociationAdmin 훅 실패
- `associations/{id}` 문서 읽기 실패
- Firestore Rules 문제

## ✅ 해결 방법

### 1. 브라우저 콘솔에서 직접 확인

```javascript
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const assocRef = doc(db, 'associations', 'assoc-nowon-football');
const assocSnap = await getDoc(assocRef);

if (assocSnap.exists()) {
  const data = assocSnap.data();
  const adminUids = data.adminUids;
  const currentUid = firebase.auth().currentUser?.uid;
  
  console.log('📋 Association 데이터:', data);
  console.log('👤 현재 사용자 UID:', currentUid);
  console.log('🔑 adminUids:', adminUids);
  console.log('✅ 배열 타입:', Array.isArray(adminUids));
  console.log('✅ UID 포함:', adminUids?.includes(currentUid));
  
  // UID 비교 (문자별)
  if (adminUids && adminUids.length > 0) {
    const storedUid = adminUids[0];
    console.log('🔍 UID 비교:');
    console.log('  저장된 UID:', storedUid);
    console.log('  현재 UID:', currentUid);
    console.log('  일치:', storedUid === currentUid);
    console.log('  길이:', storedUid.length, 'vs', currentUid.length);
    
    // 다른 문자 찾기
    for (let i = 0; i < Math.max(storedUid.length, currentUid.length); i++) {
      if (storedUid[i] !== currentUid[i]) {
        console.log(`  위치 ${i}: '${storedUid[i]}' vs '${currentUid[i]}'`);
      }
    }
  }
}
```

### 2. Firestore Console에서 UID 확인

1. `associations/assoc-nowon-football` 문서 열기
2. `adminUids` 배열의 첫 번째 요소 확인
3. 브라우저 콘솔에서 `firebase.auth().currentUser?.uid` 확인
4. 두 UID를 비교 (대소문자, 특수문자 포함)

### 3. UID 수정 (필요시)

Firestore Console에서:
1. `adminUids` 배열의 값을 확인
2. 브라우저 콘솔의 UID와 정확히 일치하는지 확인
3. 불일치하면 올바른 UID로 수정

## 📋 체크리스트

- [ ] 브라우저 콘솔에서 `[useIsAssociationAdmin]` 로그 확인
- [ ] `isAdmin: true`인지 확인
- [ ] `adminUids` 배열에 현재 UID 포함 확인
- [ ] UID 문자열이 정확히 일치하는지 확인 (대소문자, 특수문자)
- [ ] Firestore Console에서 `adminUids` 배열 값 확인

## 🎯 예상 결과

정상 작동 시:
- ✅ `isAdmin: true`
- ✅ `adminUids.includes(currentUid) === true`
- ✅ 공지 등록 버튼 표시
- ✅ 행정 모드 토글 표시

