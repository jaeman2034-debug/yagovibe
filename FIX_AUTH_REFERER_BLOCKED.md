# 🔧 auth/requests-from-referer-are-blocked 오류 해결

## 🔍 발견된 오류

```
Firebase: Error (auth/requests-from-referer-https://yago-vibe-spt.firebaseapp.com-are-blocked.)
```

**의미**: `https://yago-vibe-spt.firebaseapp.com` 도메인에서 오는 인증 요청이 차단되고 있습니다.

## ✅ 해결 방법

### 1️⃣ Firebase Console - Authorized domains 추가

1. **Firebase Console 접속**
   - https://console.firebase.google.com
   - 프로젝트 선택

2. **Authentication 설정**
   - 왼쪽 메뉴 > **"Authentication"** 클릭
   - **"Settings"** 탭 선택
   - **"Authorized domains"** 섹션 찾기

3. **도메인 추가**
   - **"Add domain"** 버튼 클릭
   - 다음 도메인 추가:
     - `yago-vibe-spt.firebaseapp.com`
     - `www.yagovibe.com` (커스텀 도메인 사용 시)
   - **"Add"** 클릭

### 2️⃣ Google Cloud Console - 승인된 JavaScript 원본 추가

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com
   - 올바른 프로젝트 선택 (Firebase 프로젝트와 동일한 것)

2. **OAuth 클라이언트 ID 찾기**
   - APIs & Services → Credentials
   - OAuth 2.0 클라이언트 ID 목록에서 Firebase 프로젝트의 클라이언트 ID 찾기
   - 클라이언트 ID 클릭하여 편집

3. **승인된 JavaScript 원본 추가**
   - "승인된 JavaScript 원본" 섹션 찾기
   - **"URI 추가"** 버튼 클릭
   - 다음 URI 추가:
     - `https://yago-vibe-spt.firebaseapp.com`
     - `https://www.yagovibe.com` (커스텀 도메인 사용 시)
   - **"저장"** 클릭

4. **승인된 리디렉션 URI 확인**
   - "승인된 리디렉션 URI" 섹션 확인
   - 다음 URI가 포함되어 있는지 확인:
     - `https://yago-vibe-spt.firebaseapp.com/__/auth/handler`
   - 없으면 추가

### 3️⃣ OAuth 동의 화면 - 승인된 도메인 추가

1. **Google Cloud Console → APIs & Services → OAuth consent screen**

2. **승인된 도메인 확인**
   - "승인된 도메인" 섹션 찾기
   - 다음 도메인이 포함되어 있는지 확인:
     - `yago-vibe-spt.firebaseapp.com`
     - `www.yagovibe.com` (커스텀 도메인 사용 시)
   - 없으면 추가

3. **앱 상태 확인**
   - "테스트" 상태라면 → "테스트 사용자" 목록에 현재 사용자 이메일 추가
   - 또는 "프로덕션"으로 변경 (검토 필요)

## 📝 확인 체크리스트

### Firebase Console
- [ ] Authentication → Settings → Authorized domains
- [ ] `yago-vibe-spt.firebaseapp.com` 추가됨
- [ ] `www.yagovibe.com` 추가됨 (커스텀 도메인 사용 시)

### Google Cloud Console - OAuth 클라이언트 ID
- [ ] APIs & Services → Credentials → OAuth 2.0 클라이언트 ID
- [ ] "승인된 JavaScript 원본"에 `https://yago-vibe-spt.firebaseapp.com` 추가됨
- [ ] "승인된 리디렉션 URI"에 `https://yago-vibe-spt.firebaseapp.com/__/auth/handler` 포함됨

### Google Cloud Console - OAuth 동의 화면
- [ ] APIs & Services → OAuth consent screen
- [ ] "승인된 도메인"에 `yago-vibe-spt.firebaseapp.com` 포함됨
- [ ] 앱 상태가 "테스트"라면 → "테스트 사용자" 목록에 현재 사용자 이메일 추가됨

## 🔄 적용 후 확인

1. **브라우저 캐시 삭제** (Ctrl+Shift+Delete)
2. **브라우저 새로고침** (Ctrl+Shift+R)
3. **구글 로그인 재시도**

## ⚠️ 중요 사항

- 변경 사항이 적용되는 데 몇 분이 걸릴 수 있습니다
- 모든 설정을 변경한 후 브라우저를 완전히 닫았다가 다시 열어보세요
- 시크릿 모드에서도 테스트해보세요

