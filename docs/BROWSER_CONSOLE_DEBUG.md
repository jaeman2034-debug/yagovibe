# 🔍 브라우저 콘솔 디버깅 (복붙용)

## ⚠️ 중요: import 문 사용 불가

브라우저 콘솔에서는 ES6 모듈 import를 직접 사용할 수 없습니다.

## ✅ 방법 1: Firebase Console에서 직접 확인 (가장 빠름)

1. **Firebase Console 열기**: https://console.firebase.google.com/project/yago-vibe-spt/firestore
2. **associations 컬렉션** 클릭
3. **assoc-nowon-football** 문서 열기
4. **adminUids** 필드 확인:
   - 타입: `array`
   - 값: `["사용자_UID_1", "사용자_UID_2"]`
5. **현재 사용자 UID 확인**:
   - 브라우저 콘솔에서: `firebase.auth().currentUser?.uid` (Firebase v8)
   - 또는 앱에서 로그인한 사용자 정보 확인

## ✅ 방법 2: React DevTools 사용

React 앱이 실행 중이라면:

1. **React DevTools** 설치 (Chrome 확장)
2. **Components 탭**에서 `TournamentEditDrawer` 찾기
3. **Props** 확인:
   - `associationId`
   - `user.uid`
   - `isAdmin`
   - `canPublish`

## ✅ 방법 3: window 객체에 임시 함수 추가

앱 코드에 임시로 추가 (개발 모드에서만):

```typescript
// src/lib/firebase.ts 끝에 추가 (개발 모드에서만)
if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as any).debugFirebase = {
    db,
    auth,
    checkAdmin: async (associationId: string) => {
      const { doc, getDoc } = await import("firebase/firestore");
      const associationRef = doc(db, `associations/${associationId}`);
      const associationDoc = await getDoc(associationRef);
      
      if (associationDoc.exists()) {
        const data = associationDoc.data();
        const currentUid = auth.currentUser?.uid;
        
        console.log("=== 권한 확인 ===");
        console.log("adminUids 배열:", data.adminUids);
        console.log("현재 사용자 UID:", currentUid);
        console.log("포함되어 있나?", data.adminUids?.includes(currentUid));
        
        return {
          adminUids: data.adminUids,
          currentUid,
          isAdmin: data.adminUids?.includes(currentUid) || false,
        };
      }
      return null;
    },
  };
}
```

그러면 브라우저 콘솔에서:
```javascript
await window.debugFirebase.checkAdmin("assoc-nowon-football");
```

## ✅ 방법 4: 가장 간단한 확인 (Firebase Console)

1. **Firebase Console** → **Firestore Database**
2. **associations** → **assoc-nowon-football** 문서
3. **adminUids** 필드 확인
4. **현재 사용자 UID 확인**:
   - 앱에서 로그인한 사용자의 UID 확인
   - 또는 Firebase Console → Authentication → Users에서 확인
5. **UID가 adminUids 배열에 없으면 추가**

## 🔧 즉시 해결: adminUids에 UID 추가

### Firebase Console에서:
1. Firestore Database → `associations/assoc-nowon-football`
2. `adminUids` 필드 편집
3. 배열에 현재 사용자 UID 추가
4. 저장

### 또는 코드로 (Cloud Functions):
```typescript
// Firebase Console → Functions → 직접 실행
const admin = require("firebase-admin");
const db = admin.firestore();

await db.doc("associations/assoc-nowon-football").update({
  adminUids: admin.firestore.FieldValue.arrayUnion("USER_UID_HERE"),
});
```

## 📋 체크리스트

- [ ] Firebase Console에서 `associations/assoc-nowon-football` 문서 확인
- [ ] `adminUids` 필드가 배열 타입인지 확인
- [ ] 현재 사용자 UID 확인
- [ ] UID가 `adminUids` 배열에 포함되어 있는지 확인
- [ ] 없으면 배열에 추가
- [ ] 저장 후 다시 테스트

