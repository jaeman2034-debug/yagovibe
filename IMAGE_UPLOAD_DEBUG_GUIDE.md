# 🔥 이미지 업로드 디버깅 가이드

## ✅ 수정 완료 사항

### 1. 상세 로그 추가
- `uploadTeamImage` 함수에 `getDownloadURL` 결과 명확히 출력
- 로그인 상태 확인 로그 추가
- 에러 상세 정보 출력

### 2. 업로드 성공 후 즉시 Firestore 저장
- 업로드 성공 시 자동으로 Firestore에 `imageUrl` 저장
- 사용자가 "저장" 버튼을 누르지 않아도 이미지가 저장됨

---

## 🔍 디버깅 체크리스트

### 1️⃣ 로그인 상태 확인

**콘솔에서 확인:**
```javascript
// 브라우저 콘솔에서 실행
console.log("현재 사용자:", firebase.auth().currentUser)
```

**예상 결과:**
- ✅ `{ uid: "...", email: "..." }` → 정상
- ❌ `null` → 로그인 필요

---

### 2️⃣ Storage Rules 확인

**Firebase Console:**
- https://console.firebase.google.com/project/yago-vibe-spt/storage/rules

**현재 규칙 (테스트용):**
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

**확인 사항:**
- ✅ "게시됨" 상태인지 확인
- ✅ 규칙이 위와 동일한지 확인

---

### 3️⃣ 업로드 시 콘솔 로그 확인

**이미지 업로드 버튼 클릭 시 콘솔에 출력되는 로그:**

```
🔐 [uploadTeamImage] 인증 확인: { uid: "...", email: "...", isAnonymous: false }
📤 [uploadTeamImage] 업로드 시작: { teamId: "...", fileName: "...", fileSize: ... }
🔍 [uploadTeamImage] getDownloadURL 호출 시작...
================================================================================
✅ [uploadTeamImage] 업로드 완료!
================================================================================
📤 다운로드 URL: https://firebasestorage.googleapis.com/...
📁 Storage 경로: teams/.../profile.jpg
🔗 URL 직접 열기: https://firebasestorage.googleapis.com/...
================================================================================
✅ [TeamSettingsModal] 이미지 업로드 성공: { url: "...", path: "..." }
✅ [TeamSettingsModal] Firestore에 imageUrl 저장 완료
```

---

### 4️⃣ getDownloadURL 결과 확인

**질문: "콘솔에서 getDownloadURL 찍으면 URL 나오냐 안 나오냐?"**

**확인 방법:**
1. 이미지 업로드 버튼 클릭
2. 콘솔에서 `📤 다운로드 URL:` 로그 확인
3. URL이 나오면 → **업로드 성공**
4. URL이 안 나오면 → **업로드 실패** (에러 로그 확인)

---

### 5️⃣ Firestore 저장 확인

**Firebase Console:**
- https://console.firebase.google.com/project/yago-vibe-spt/firestore/data

**확인 경로:**
- `teams/{teamId}` 문서
- `imageUrl` 필드에 URL이 저장되어 있는지 확인

---

## 🚨 문제 해결

### 문제 1: 403 에러 (storage/unauthorized)

**원인:**
- Storage Rules에 read/write 권한 없음
- 로그인 안 된 상태

**해결:**
1. Storage Rules 확인 (위 규칙 적용)
2. 로그인 상태 확인
3. Firebase Console에서 Rules "게시" 확인

---

### 문제 2: 업로드는 되는데 화면에 안 보임

**원인:**
- Firestore에 `imageUrl` 저장 안 됨
- 이미지 URL이 잘못됨

**해결:**
1. Firestore에 `imageUrl` 필드 확인
2. 콘솔에서 다운로드 URL 직접 열어보기
3. URL이 정상이면 → 렌더링 문제
4. URL이 비정상이면 → 업로드 문제

---

### 문제 3: getDownloadURL이 null

**원인:**
- 업로드 실패
- Storage 경로 문제

**해결:**
1. 콘솔 에러 로그 확인
2. Storage Rules 확인
3. 로그인 상태 확인

---

## 🎯 다음 단계

1. **이미지 업로드 버튼 클릭**
2. **콘솔 로그 확인**
3. **getDownloadURL 결과 확인**
4. **Firestore에 imageUrl 저장 확인**

---

**작성일**: 2025-01-XX  
**버전**: v1.0  
**상태**: ✅ **디버깅 로그 추가 완료**
