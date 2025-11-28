# 🚨 Firebase API 키 HTTP Referrer 차단 해결 가이드

## ❌ 오류 메시지

콘솔에 다음 오류가 보이면:
```
API_KEY_HTTP_REFERRER_BLOCKED
Requests from referer https://yago-vibe-spt.firebaseapp.com/ are blocked
status: PERMISSION_DENIED
```

## ✅ 해결 방법 (단계별)

### 1단계: Google Cloud Console 접속

1. **Google Cloud Console 열기**
   - https://console.cloud.google.com 접속
   - 프로젝트 **"yago-vibe-spt"** 선택

### 2단계: API 키 찾기

1. **Credentials 페이지로 이동**
   - 왼쪽 메뉴 > **"APIs & Services"** > **"Credentials"** 클릭

2. **API 키 찾기**
   - **"API keys"** 섹션에서 Firebase API 키 찾기
   - 보통 이름이 "Browser key" 또는 "Web API Key"로 표시됨
   - 또는 Firebase Console > Project Settings > General 탭에서 API Key 확인

### 3단계: API 키 제한 설정 수정

1. **API 키 클릭하여 편집**
   - 찾은 API 키를 클릭하여 편집 페이지로 이동

2. **Application restrictions 확인**
   - **"Application restrictions"** 섹션 확인
   - 현재 설정이 **"None"**이면 문제 없음
   - **"HTTP referrers (web sites)"**로 설정되어 있으면 다음 단계 진행

3. **허용된 도메인 추가**
   - **"Website restrictions"** 섹션에서 **"ADD AN ITEM"** 클릭
   - 다음 도메인들을 **하나씩** 추가:
     ```
     http://localhost:*
     http://127.0.0.1:*
     https://yago-vibe-spt.firebaseapp.com/*
     https://yago-vibe-spt.web.app/*
     https://www.yagovibe.com/*
     https://yagovibe.com/*
     ```
   - ⚠️ **주의**: `*`는 와일드카드로 모든 포트와 경로를 허용합니다
   - 각 도메인 추가 후 **"SAVE"** 클릭

### 4단계: API 제한 확인 (선택사항)

1. **API restrictions 섹션 확인**
   - **"API restrictions"** 섹션 확인
   - **"Don't restrict key"** 또는 다음 API들이 포함되어 있는지 확인:
     - Identity Toolkit API
     - Firebase Authentication API

### 5단계: 변경사항 적용

1. **저장**
   - 페이지 하단의 **"SAVE"** 버튼 클릭
   - 변경사항이 즉시 적용됩니다 (몇 초 소요 가능)

2. **개발 서버 재시작**
   ```bash
   # 서버 중지 (Ctrl + C)
   npm run dev
   ```

3. **브라우저 새로고침**
   - 브라우저 강력 새로고침 (Ctrl + Shift + R)
   - 또는 캐시 삭제 후 새로고침

## 🔍 추가 확인 사항

### Firebase Console Authorized Domains

Firebase Console에서도 도메인을 확인해야 합니다:

1. **Firebase Console 접속**
   - https://console.firebase.google.com
   - 프로젝트 **"yago-vibe-spt"** 선택

2. **Authentication > Settings**
   - 왼쪽 메뉴 > **"Authentication"** > **"Settings"** 탭
   - **"Authorized domains"** 섹션 확인

3. **도메인 확인**
   - 다음 도메인들이 목록에 있는지 확인:
     - `localhost`
     - `yago-vibe-spt.firebaseapp.com`
     - `yago-vibe-spt.web.app`
     - `yagovibe.com` (프로덕션 도메인)

4. **도메인 추가 (없는 경우)**
   - **"Add domain"** 클릭
   - 도메인 입력 후 **"Add"** 클릭

## 📋 체크리스트

- [ ] Google Cloud Console > APIs & Services > Credentials
- [ ] API 키 찾기 및 편집
- [ ] HTTP referrers 제한 확인
- [ ] localhost:* 추가됨
- [ ] yago-vibe-spt.firebaseapp.com/* 추가됨
- [ ] 프로덕션 도메인 추가됨
- [ ] 변경사항 저장 완료
- [ ] 개발 서버 재시작
- [ ] 브라우저 새로고침
- [ ] Firebase Console > Authentication > Settings > Authorized domains 확인

## 🚨 여전히 오류가 발생하는 경우

1. **API 키 확인**
   - `.env.local` 파일의 `VITE_FIREBASE_API_KEY`가 올바른지 확인
   - Firebase Console > Project Settings > General에서 API Key 확인

2. **캐시 삭제**
   - 브라우저 개발자 도구 (F12) > Application 탭
   - Clear storage > Clear site data

3. **시크릿 모드에서 테스트**
   - 시크릿 창에서 로그인 시도
   - 캐시 문제인지 확인

4. **콘솔 로그 확인**
   - 브라우저 개발자 도구 (F12) > Console 탭
   - 추가 오류 메시지 확인

## 💡 참고사항

- API 키 제한 변경은 **즉시 적용**됩니다 (몇 초 소요 가능)
- `localhost:*`는 모든 포트를 허용하므로 개발 환경에 유용합니다
- 프로덕션 환경에서는 특정 포트만 허용하는 것이 더 안전합니다
- Firebase Authentication은 **Identity Toolkit API**를 사용합니다

