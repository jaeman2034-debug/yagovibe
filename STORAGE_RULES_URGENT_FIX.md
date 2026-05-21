# 🚨 Firebase Storage Rules 긴급 수정 가이드

## ✅ 문제 확인

**에러:**
```
Firebase Storage: User does not have permission to access
teams/RebopABhialrVQONL5jm/profile.jpg
(storage/unauthorized)
```

**원인:** Storage Rules가 업로드를 막고 있음

---

## 🔥 해결 방법 (지금 당장)

### 1단계: Firebase Console 접속

**URL:**
https://console.firebase.google.com/project/yago-vibe-spt/storage/rules

### 2단계: Rules 탭 클릭

### 3단계: 아래 내용 복사해서 붙여넣기

```js
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    match /teams/{teamId}/{allPaths=**} {
      allow read, write: if request.auth != null;
    }

  }
}
```

### 4단계: "게시" 버튼 클릭

### 5단계: "Rules published successfully" 확인

---

## ✅ 추가 개선 사항

### 파일명 캐시 문제 해결

**변경 전:**
```ts
teams/{teamId}/profile.jpg  // 항상 같은 이름 → 캐시 문제
```

**변경 후:**
```ts
teams/{teamId}/{timestamp}.jpg  // 타임스탬프 사용 → 캐시 문제 없음
```

**이미 적용 완료** ✅

---

## 🔍 확인 체크리스트

### 1️⃣ Storage Rules 배포 확인

- [ ] Firebase Console에서 Rules 확인
- [ ] 위 규칙이 적용되어 있는지 확인
- [ ] "게시됨" 상태인지 확인

### 2️⃣ 로그인 상태 확인

브라우저 콘솔에서:
```javascript
console.log("현재 사용자:", firebase.auth().currentUser)
```

- [ ] `{ uid: "...", email: "..." }` → 정상
- [ ] `null` → 로그인 필요

### 3️⃣ 업로드 테스트

- [ ] 이미지 업로드 버튼 클릭
- [ ] 403 에러가 사라졌는지 확인
- [ ] 업로드 성공 메시지 확인

---

## 🎯 다음 단계

1. **Storage Rules 수정** (위 방법)
2. **이미지 업로드 테스트**
3. **"된다 / 안 된다" 결과 알려주기**

---

**작성일**: 2025-01-XX  
**버전**: v1.0  
**상태**: ✅ **Storage Rules 수정 가이드 완료**
