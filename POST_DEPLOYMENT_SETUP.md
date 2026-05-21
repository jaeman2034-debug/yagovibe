# 🚀 YAGO SPORTS 배포 후 필수 설정 가이드

## ✅ 배포 완료 상태

- [x] 빌드 성공
- [x] Firebase Hosting 배포 완료
- [x] 배포 URL: https://yago-vibe-spt.web.app
- [x] 앱 로딩 정상

---

## 🔥 필수 설정 (지금 바로 해야 함)

### 1️⃣ Firebase Authentication - Authorized Domains 설정

**경로**: Firebase Console → Authentication → Settings → Authorized domains

**작업**: 다음 도메인을 반드시 추가

```
yago-vibe-spt.web.app
yago-vibe-spt.firebaseapp.com
```

**확인 방법**:
1. Firebase Console 접속
2. Authentication → Settings
3. "Authorized domains" 섹션 확인
4. 위 두 도메인이 없으면 "Add domain" 클릭하여 추가

**⚠️ 중요**: 이 설정이 없으면 Google 로그인이 실패합니다.

---

### 2️⃣ Firebase Authentication - Google Sign-in Method 설정

**경로**: Firebase Console → Authentication → Sign-in method → Google

**확인 사항**:
- [ ] Google 제공자가 **"사용 설정됨"** 상태인지 확인
- [ ] "웹 클라이언트 ID"가 올바르게 설정되어 있는지 확인
- [ ] "프로젝트 지원 이메일"이 설정되어 있는지 확인

**예상 웹 클라이언트 ID**:
```
126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com
```

---

### 3️⃣ Google Cloud Console - OAuth 2.0 설정 확인

**경로**: Google Cloud Console → APIs & Services → Credentials

**확인 사항**:

1. **OAuth 2.0 클라이언트 ID 확인**
   - 클라이언트 ID가 Firebase Console의 "웹 클라이언트 ID"와 일치하는지 확인

2. **승인된 리디렉션 URI 확인**
   다음 URI가 반드시 포함되어 있어야 합니다:
   ```
   https://yago-vibe-spt.firebaseapp.com/__/auth/handler
   https://yago-vibe-spt.web.app/__/auth/handler
   http://localhost:5173 (개발용)
   ```

3. **승인된 JavaScript 원본 확인**
   ```
   https://yago-vibe-spt.web.app
   https://yago-vibe-spt.firebaseapp.com
   http://localhost:5173 (개발용)
   ```

---

### 4️⃣ Firebase Storage Rules 확인

**경로**: Firebase Console → Storage → Rules

**현재 설정 확인**:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

**⚠️ 주의**: 프로덕션에서는 더 엄격한 규칙을 권장합니다.

---

### 5️⃣ Firestore Rules 확인

**경로**: Firebase Console → Firestore Database → Rules

**현재 설정 확인**:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

**⚠️ 주의**: 프로덕션에서는 더 세밀한 권한 제어를 권장합니다.

---

## 🔧 콘솔 로그 정리 (프로덕션 최적화)

### 현재 상태
- 개발용 console.log가 프로덕션에서도 출력됨
- 불필요한 디버깅 로그가 많음

### 해결 방법

**이미 적용된 것**:
- `src/lib/utils/dev.ts`에 `devLog`, `devWarn`, `devError` 함수 존재
- `ProductDetail.tsx`에서 일부 console.log를 devLog로 교체 시작

**추가 작업 필요**:
1. 주요 파일의 console.log를 devLog로 교체
2. 프로덕션에서 불필요한 로그 제거

---

## 📊 배포 후 테스트 체크리스트

### 기본 기능 테스트
- [ ] 홈 화면 로딩
- [ ] 로그인/회원가입
- [ ] Google 로그인
- [ ] Activity Feed 표시
- [ ] 거래 목록 표시

### 고급 기능 테스트
- [ ] 팀 생성
- [ ] 거래 글 작성
- [ ] 이미지 업로드
- [ ] 채팅 기능
- [ ] Activity Feed 필터링

---

## ⚠️ 알려진 경고 (무시 가능)

### 1. Cross-Origin-Opener-Policy 경고
```
Cross-Origin-Opener-Policy policy would block the window.closed call
```
**원인**: Google OAuth popup 로그인 관련 브라우저 보안 정책
**해결**: 무시 가능 (실서비스에서 흔함)

### 2. heartbeats undefined
```
heartbeats undefined heartbeatService.ts:93
```
**원인**: Firebase Analytics 초기화 로그
**해결**: 문제 없음 (서비스 정상 작동)

### 3. Speech disabled
```
[Speech] disabled (desktop)
```
**원인**: 음성 기능 비활성 로그
**해결**: 문제 없음 (의도된 동작)

---

## 🎯 다음 단계

1. **Firebase Console 설정 확인**
   - Authorized domains 추가
   - Google Sign-in Method 확인

2. **Google Cloud Console 설정 확인**
   - OAuth 2.0 리디렉션 URI 확인
   - JavaScript 원본 확인

3. **테스트 계정으로 로그인 테스트**
   - Google 로그인 정상 작동 확인

4. **콘솔 로그 정리** (선택사항)
   - 주요 파일의 console.log를 devLog로 교체

---

## 📝 참고 링크

- Firebase Console: https://console.firebase.google.com/project/yago-vibe-spt
- Google Cloud Console: https://console.cloud.google.com/apis/credentials?project=yago-vibe-spt
- 배포 URL: https://yago-vibe-spt.web.app

---

**작성일**: 2024년
**버전**: 1.0
