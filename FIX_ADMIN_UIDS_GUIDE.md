# adminUids 배열 타입 수정 가이드

## 🔴 문제 확인

스크린샷에서 확인된 문제:
- `adminUids` 필드가 **문자열(string)**로 저장됨
- 값: `"iUZB8RjKIEhb3uotZ6yqtpWtUQE2"`
- Firestore Rules는 **배열(array)**을 기대함

## ✅ 해결 방법

### 방법 1: Firestore Console에서 직접 수정 (권장)

1. **Firebase Console → Firestore Database → Data 탭**
2. **`associations` 컬렉션 → `assoc-nowon-football` 문서 선택**
3. **`adminUids` 필드 찾기**
4. **필드 삭제:**
   - `adminUids` 필드 옆의 **세로 점 3개 메뉴(⋮)** 클릭
   - **"필드 삭제"** 선택
5. **새 필드 추가:**
   - **"+ 필드 추가"** 버튼 클릭
   - **필드 이름:** `adminUids`
   - **타입:** `array` (배열) 선택
   - **값 추가:**
     - 배열 내부에 **"+ 항목 추가"** 클릭
     - 값 입력: `iUZB8RjKIEhb3uotZ6yqtpWtUQE2`
   - **저장**

### 방법 2: Cloud Functions로 수정 (고급)

```javascript
// functions/src/fixAdminUids.ts
import { getFirestore } from 'firebase-admin/firestore';

export async function fixAdminUids() {
  const db = getFirestore();
  const assocRef = db.doc('associations/assoc-nowon-football');
  
  const assocSnap = await assocRef.get();
  if (!assocSnap.exists) {
    throw new Error('Association not found');
  }
  
  const data = assocSnap.data()!;
  const adminUid = 'iUZB8RjKIEhb3uotZ6yqtpWtUQE2';
  
  // adminUids 처리
  let adminUids: string[] = [];
  
  if (data.adminUids) {
    if (typeof data.adminUids === 'string') {
      // 문자열이면 배열로 변환
      adminUids = [data.adminUids];
    } else if (Array.isArray(data.adminUids)) {
      adminUids = data.adminUids;
    }
  }
  
  // UID 추가 (중복 제거)
  if (!adminUids.includes(adminUid)) {
    adminUids.push(adminUid);
  }
  
  // 배열로 저장
  await assocRef.update({
    adminUids: adminUids
  });
  
  console.log(`✅ Fixed adminUids:`, adminUids);
  return adminUids;
}
```

## 🧪 수정 후 확인

### 1. Firestore Console에서 확인
- `adminUids` 필드 타입이 **array**인지 확인
- 값이 `["iUZB8RjKIEhb3uotZ6yqtpWtUQE2"]` 형태인지 확인

### 2. 브라우저 콘솔에서 확인
```javascript
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const assocRef = doc(db, 'associations', 'assoc-nowon-football');
const assocSnap = await getDoc(assocRef);

if (assocSnap.exists()) {
  const data = assocSnap.data();
  const adminUids = data.adminUids;
  
  console.log('adminUids 타입:', typeof adminUids, Array.isArray(adminUids));
  console.log('adminUids 값:', adminUids);
  
  if (Array.isArray(adminUids)) {
    console.log('✅ 배열 타입 정상!');
  } else {
    console.error('❌ 여전히 배열이 아닙니다!');
  }
}
```

### 3. 게시 버튼 테스트
1. 브라우저에서 **로그아웃 → 재로그인**
2. 공지 작성 페이지로 이동
3. "게시하기" 버튼 클릭
4. 권한 에러 없이 정상 저장되는지 확인

## ✅ 예상 결과

수정 후:
- ✅ `adminUids`가 배열 타입으로 저장됨
- ✅ Firestore Rules의 `adminUids is list` 체크 통과
- ✅ `isAssociationAdmin` 함수가 `true` 반환
- ✅ 게시 버튼 정상 작동
- ✅ 권한 에러 해결

## 📝 참고

**중요:** Firestore Console에서 배열을 추가할 때:
- 타입을 **반드시 `array`**로 선택
- 값은 배열 내부에 **문자열로** 추가
- 여러 관리자가 있으면 배열에 여러 항목 추가 가능

