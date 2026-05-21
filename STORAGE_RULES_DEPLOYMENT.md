# 🔥 Firebase Storage Rules 배포 가이드

## ✅ Storage Rules 수정 완료

`storage.rules` 파일이 생성되었습니다.

---

## 🚀 배포 방법

### 방법 1: Firebase Console에서 직접 배포 (권장)

1. **Firebase Console 접속**
   - https://console.firebase.google.com/project/yago-vibe-spt/storage/rules

2. **Rules 탭 클릭**

3. **아래 내용 복사해서 붙여넣기:**

```js
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // 🔥 팀 프로필 이미지 업로드 (테스트 단계: 로그인한 유저만 허용)
    match /teams/{teamId}/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
    
    // 🔥 채팅 이미지 업로드
    match /chat/{roomId}/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
    
    // 🔥 사용자 프로필 이미지
    match /users/{userId}/{allPaths=**} {
      allow read: if true; // 프로필 이미지는 공개 읽기 가능
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // 🔥 마켓 상품 이미지
    match /market/{allPaths=**} {
      allow read: if true; // 상품 이미지는 공개 읽기 가능
      allow write: if request.auth != null;
    }
    
    // 🔥 활동 이미지
    match /activities/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
  }
}
```

4. **"게시" 버튼 클릭**

5. **배포 완료 확인**
   - "Rules published successfully" 메시지 확인

---

### 방법 2: Firebase CLI로 배포

```bash
firebase deploy --only storage
```

---

## ✅ 배포 후 확인

1. **앱에서 팀 이미지 업로드 테스트**
   - 팀 설정 페이지에서 이미지 업로드 시도
   - 403 에러가 사라졌는지 확인

2. **콘솔 로그 확인**
   - `✅ [uploadTeamImage] 업로드 완료` 메시지 확인

---

## 🚨 주의사항

### 테스트 단계 (현재)
- 로그인한 유저만 모든 Storage 경로 접근 가능
- 보안이 약하지만 테스트에는 충분

### 출시 전 필수 작업
- 팀 이미지는 팀 멤버만 업로드 가능하도록 강화
- 채팅 이미지는 채팅방 멤버만 업로드 가능하도록 강화
- 상세 권한 체크 추가

---

## 📝 향후 보안 강화 예시

```js
// 팀 이미지: 팀 멤버만 업로드 가능
match /teams/{teamId}/profile.{ext} {
  allow read: if true;
  allow write: if request.auth != null 
    && exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid));
}
```

**하지만 지금은 테스트 단계이므로 간단한 규칙으로 충분합니다.**

---

**작성일**: 2025-01-XX  
**버전**: v1.0  
**상태**: ✅ **Storage Rules 준비 완료**
