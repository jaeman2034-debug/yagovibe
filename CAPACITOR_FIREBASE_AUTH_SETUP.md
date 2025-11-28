# 🚀 Capacitor + Firebase Auth 완벽 구축 가이드

## ✅ 완료된 설정

### 1단계: Android WebView 세션 유지 설정 ✅

**파일**: `android/app/src/main/java/com/yagovibe/app/MainActivity.java`

- ✅ CookieManager 활성화
- ✅ DOM Storage 활성화 (localStorage/sessionStorage)
- ✅ IndexedDB 지원
- ✅ 쿠키 및 세션 유지 설정

### 2단계: Android Google OAuth Redirect 설정 ✅

**파일**: `android/app/src/main/AndroidManifest.xml`

- ✅ `capacitor://localhost` intent-filter 추가
- ✅ Google 로그인 후 앱으로 자동 복귀 지원

### 3단계: iOS WKWebView 세션 유지 설정 ✅

**파일**: `ios/App/App/AppDelegate.swift`

- ✅ WKWebViewConfiguration 설정
- ✅ HTTP 쿠키 저장소 활성화
- ✅ 데이터 저장소 설정

### 4단계: iOS Google OAuth Redirect 설정 ✅

**파일**: `ios/App/App/Info.plist`

- ✅ `capacitor://` URL scheme 추가
- ✅ Google 로그인 후 앱으로 자동 복귀 지원

### 5단계: Firebase Auth Persistence 강화 ✅

**파일**: `src/lib/firebase.ts`

- ✅ Capacitor 환경 감지 로직 추가
- ✅ Capacitor에서는 IndexedDB LocalPersistence 사용 (자동 로그인 지원)
- ✅ 일반 WebView에서는 SessionPersistence 사용

## 🔥 필수 확인 사항

### Firebase Console 설정

**Firebase Console > Authentication > Settings > Authorized domains**에 다음 도메인들이 모두 추가되어 있어야 합니다:

- ✅ `localhost`
- ✅ `127.0.0.1`
- ✅ `yago-vibe-spt.firebaseapp.com`
- ✅ `yago-vibe-spt.web.app`
- ✅ `yagovibe.com`
- ✅ `www.yagovibe.com`
- ✅ `capacitor://localhost` (Capacitor Google 로그인 필수)

**추가 방법:**
1. Firebase Console 접속
2. Authentication > Settings
3. Authorized domains 섹션
4. "Add domain" 클릭
5. `capacitor://localhost` 입력
6. 저장

### Google Cloud Console 설정

**Google Cloud Console > APIs & Services > Credentials > OAuth 2.0 Client IDs**

**Authorized JavaScript origins:**
- `https://yagovibe.com`
- `https://www.yagovibe.com`
- `capacitor://localhost`

**Authorized redirect URIs:**
- `https://yagovibe.com/__/auth/handler`
- `https://www.yagovibe.com/__/auth/handler`
- `capacitor://localhost`

## 📱 앱 빌드 및 테스트

### Android 빌드

```bash
# Capacitor 동기화
npx cap sync android

# Android Studio에서 빌드
npx cap open android
```

### iOS 빌드

```bash
# Capacitor 동기화
npx cap sync ios

# Xcode에서 빌드
npx cap open ios
```

## 🧪 테스트 체크리스트

### ✅ 이메일 로그인 테스트
- [ ] 앱에서 `https://www.yagovibe.com/login` 접속
- [ ] 이메일/비밀번호 입력
- [ ] 로그인 성공
- [ ] 앱 재실행 시 자동 로그인 확인

### ✅ Google 로그인 테스트
- [ ] "구글로 로그인" 버튼 클릭
- [ ] Google 계정 선택 팝업 표시
- [ ] 계정 선택 후 로그인
- [ ] 앱으로 자동 복귀 확인
- [ ] 로그인 상태 유지 확인

### ✅ 자동 로그인 테스트
- [ ] 한 번 로그인 후 앱 종료
- [ ] 앱 재실행
- [ ] 자동으로 로그인 상태 유지 확인

### ✅ 세션 유지 테스트
- [ ] 로그인 후 앱을 백그라운드로 전환
- [ ] 몇 분 후 다시 앱으로 복귀
- [ ] 로그인 상태 유지 확인

## 🚨 문제 해결

### 문제 1: Google 로그인 후 앱으로 돌아오지 않음

**원인**: `capacitor://localhost` 도메인이 Firebase Authorized domains에 없음

**해결**:
1. Firebase Console > Authentication > Settings
2. Authorized domains에 `capacitor://localhost` 추가

### 문제 2: 자동 로그인이 안 됨

**원인**: IndexedDB가 비활성화되어 있거나 Persistence 설정 문제

**해결**:
1. `MainActivity.java`에서 `setDatabaseEnabled(true)` 확인
2. `firebase.ts`에서 Capacitor 환경 감지 로직 확인
3. 브라우저 콘솔에서 IndexedDB 사용 가능 여부 확인

### 문제 3: 쿠키가 저장되지 않음

**원인**: WebView 쿠키 설정이 비활성화됨

**해결**:
1. `MainActivity.java`에서 `setAcceptThirdPartyCookies` 확인
2. `AppDelegate.swift`에서 HTTP 쿠키 저장소 활성화 확인

## 💡 참고사항

- Capacitor는 내부적으로 Android WebView와 iOS WKWebView를 사용합니다
- Firebase Auth는 쿠키와 IndexedDB를 모두 사용하여 세션을 유지합니다
- Capacitor 환경에서는 IndexedDB가 사용 가능하므로 LocalPersistence를 사용하여 자동 로그인을 지원합니다
- 일반 인앱 브라우저(카카오톡, 인스타그램 등)에서는 SessionPersistence를 사용합니다

