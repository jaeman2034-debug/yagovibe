# 🔍 브라우저 콘솔 디버깅 코드 (복붙용)

## ⚠️ 중요: 브라우저 콘솔에서는 import 사용 불가

브라우저 콘솔에서 직접 실행할 수 있는 코드입니다.

## 1. 권한 확인 (복붙용)

```javascript
// Firebase SDK가 이미 로드되어 있다고 가정
(async () => {
  try {
    // Firebase 인스턴스 가져오기 (전역에서)
    const { db, auth } = window; // 또는 실제 Firebase 인스턴스 경로
    
    // 대안: 직접 Firestore/Auth 가져오기
    const firestore = firebase.firestore();
    const authInstance = firebase.auth();
    
    const associationId = "assoc-nowon-football";
    const associationRef = firestore.doc(`associations/${associationId}`);
    const associationDoc = await associationRef.get();
    
    if (associationDoc.exists()) {
      const data = associationDoc.data();
      const currentUser = authInstance.currentUser;
      const currentUid = currentUser?.uid;
      
      console.log("=== 권한 확인 ===");
      console.log("adminUids 배열:", data.adminUids);
      console.log("adminUids 타입:", typeof data.adminUids);
      console.log("배열인가?", Array.isArray(data.adminUids));
      console.log("현재 사용자 UID:", currentUid);
      console.log("포함되어 있나?", data.adminUids?.includes(currentUid));
      
      if (!data.adminUids || !Array.isArray(data.adminUids)) {
        console.error("❌ adminUids가 배열이 아닙니다!");
      } else if (!currentUid) {
        console.error("❌ 현재 사용자가 로그인되어 있지 않습니다!");
      } else if (!data.adminUids.includes(currentUid)) {
        console.error("❌ 현재 사용자 UID가 adminUids 배열에 없습니다!");
        console.log("💡 해결 방법: Firebase Console에서 adminUids 배열에 이 UID를 추가하세요:", currentUid);
      } else {
        console.log("✅ 권한 확인 완료: 관리자입니다!");
      }
    } else {
      console.error("❌ 협회 문서가 존재하지 않습니다!");
    }
  } catch (error) {
    console.error("❌ 에러 발생:", error);
  }
})();
```

## 2. React 앱에서 사용하는 경우

React 앱이 실행 중이라면, 컴포넌트에서 직접 확인:

```javascript
// 개발자 도구 콘솔에서
// React DevTools를 사용하거나, window 객체에 접근

// 방법 1: React 컴포넌트에서 직접
// TournamentEditDrawer 컴포넌트 내부에 임시로 추가
console.log("=== 권한 디버깅 ===");
console.log("associationId:", associationId);
console.log("user.uid:", user?.uid);
console.log("canPublish:", canPublish);
console.log("isAdmin:", isAdmin);
```

## 3. Firebase Console에서 직접 확인

1. Firebase Console → Firestore Database
2. `associations` 컬렉션 → `assoc-nowon-football` 문서 열기
3. `adminUids` 필드 확인:
   - 타입: array
   - 값: `["USER_UID_1", "USER_UID_2"]`
4. 현재 사용자 UID가 배열에 포함되어 있는지 확인

## 4. 현재 사용자 UID 확인

```javascript
// Firebase Auth가 로드되어 있다면
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    console.log("현재 사용자 UID:", user.uid);
    console.log("현재 사용자 이메일:", user.email);
  } else {
    console.log("로그인되지 않음");
  }
});

// 또는
const currentUser = firebase.auth().currentUser;
if (currentUser) {
  console.log("현재 사용자 UID:", currentUser.uid);
} else {
  console.log("로그인되지 않음");
}
```

## 5. adminUids 배열에 UID 추가 (Firebase Console)

1. Firebase Console → Firestore Database
2. `associations/assoc-nowon-football` 문서 열기
3. `adminUids` 필드 편집:
   - 타입: array
   - 값에 현재 사용자 UID 추가
4. 저장

## 6. 임시 해결: Rules 완화 (테스트용)

```javascript
// firestore.rules
match /associations/{associationId}/tournaments/{tournamentId} {
  allow write: if request.auth != null; // 임시 완화
}
```

⚠️ **주의**: 테스트 후 반드시 원래대로 복구하세요!

