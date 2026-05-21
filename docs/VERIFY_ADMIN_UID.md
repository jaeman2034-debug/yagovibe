# 🔍 관리자 UID 확인 가이드

## Firebase Console에서 확인한 내용

✅ `adminUids` 배열 존재: `["iUZB8RjKIEhb3uotZ6yqtpWtUQE2"]`

## 확인해야 할 사항

### 1. 현재 로그인한 사용자 UID 확인

브라우저 콘솔에서 실행:

```javascript
// 방법 1: 디버깅 함수 사용 (추천)
await window.debugFirebase.checkAdmin("assoc-nowon-football");

// 방법 2: 직접 확인
const auth = window.debugFirebase?.auth;
if (auth) {
  const currentUser = auth.currentUser;
  console.log("현재 사용자 UID:", currentUser?.uid);
  console.log("adminUids에 포함되어 있나?", 
    ["iUZB8RjKIEhb3uotZ6yqtpWtUQE2"].includes(currentUser?.uid)
  );
}
```

### 2. 예상 결과

#### ✅ 정상인 경우:
```
현재 사용자 UID: iUZB8RjKIEhb3uotZ6yqtpWtUQE2
포함되어 있나? true
✅ 권한 확인 완료: 관리자입니다!
```

#### ❌ 문제인 경우:
```
현재 사용자 UID: 다른_UID_값
포함되어 있나? false
❌ 현재 사용자 UID가 adminUids 배열에 없습니다!
```

## 해결 방법

### 경우 1: UID가 다른 경우

현재 로그인한 사용자의 UID를 `adminUids` 배열에 추가:

1. Firebase Console → Firestore Database
2. `associations/assoc-nowon-football` 문서 열기
3. `adminUids` 필드 편집
4. 배열에 현재 사용자 UID 추가
5. 저장

### 경우 2: UID가 일치하는데도 저장 실패

Rules 평가 문제일 수 있습니다. 확인:

1. Firebase Console → Firestore → Rules → Simulator
2. 테스트:
   - Collection: `associations/assoc-nowon-football/tournaments/{tournamentId}`
   - Operation: `write`
   - User: `iUZB8RjKIEhb3uotZ6yqtpWtUQE2`
   - Data: `{ title: "테스트" }`
3. 결과 확인

## 다음 단계

1. 브라우저 콘솔에서 위 코드 실행
2. 결과 확인
3. 문제가 있으면 해결 방법 적용
4. 다시 저장 시도

