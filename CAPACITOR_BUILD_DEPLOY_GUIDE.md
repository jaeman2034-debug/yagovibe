# 🚀 Capacitor 빌드 및 배포 완벽 가이드

## ✅ Step 1: 자동 로그인 및 라우트 보호 (완료)

### 구현 완료 사항:
- ✅ `AuthProvider`에 자동 리다이렉트 로직 추가
- ✅ `ProtectedRoute` 컴포넌트 생성
- ✅ 주요 라우트에 보호 적용 (`/sports-hub`, `/admin` 등)

### 동작 방식:
- 로그인 상태에서 `/login`, `/signup` 접속 → 자동으로 `/sports-hub`로 이동
- 로그아웃 상태에서 보호된 페이지 접속 → 자동으로 `/login`으로 이동

## ✅ Step 2: 세션 초기화 기능 (완료)

### 구현 완료 사항:
- ✅ `resetSession()` 함수 생성 (`src/lib/session.ts`)
- ✅ `ResetSessionButton` 컴포넌트 생성
- ✅ `SettingsPage` 생성 (`/app/settings`)

### 사용 방법:
1. 앱에서 `/app/settings` 접속
2. "로그아웃 및 세션 초기화" 버튼 클릭
3. 확인 후 Firebase 로그아웃 + 모든 세션 데이터 정리

## ✅ Step 3: Capacitor + FCM Push 알림 연동 (완료)

### 구현 완료 사항:
- ✅ `registerPushNotifications()` 함수 개선
- ✅ Capacitor 환경 감지 로직
- ✅ 권한 요청 및 토큰 수신 처리

### 추가 설정 필요:

#### 3-1. Firebase Console 설정

1. **Firebase Console > Project Settings > Cloud Messaging**
   - 서버 키 확인
   - 발신자 ID 확인

2. **Android 설정**
   - `google-services.json` 다운로드
   - `android/app/google-services.json`에 배치

3. **iOS 설정**
   - `GoogleService-Info.plist` 다운로드
   - Xcode에서 프로젝트에 추가
   - APNs 인증 키 설정 (Apple Developer 계정 필요)

#### 3-2. Android build.gradle 설정

**android/app/build.gradle**에 추가:
```gradle
apply plugin: 'com.google.gms.google-services'
```

**android/build.gradle**에 추가:
```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.4.2'
    }
}
```

## ✅ Step 4: Capacitor 빌드 루틴

### 4-1. 항상 이 순서로 빌드

```bash
# 1) 웹 빌드
npm run build

# 2) Capacitor에 동기화
npx cap sync

# 3) 플랫폼별 빌드
npx cap open android  # Android Studio 열기
npx cap open ios      # Xcode 열기
```

### 4-2. 자주 발생하는 오류 & 해결

#### 오류 1: Android minSdk / targetSdk 불일치

**해결:**
```gradle
// android/variables.gradle 또는 android/app/build.gradle
minSdkVersion = 23  // Android 6.0 이상
targetSdkVersion = 34  // 최신 버전
```

#### 오류 2: google-services 플러그인 빠짐

**해결:**
```gradle
// android/app/build.gradle 상단에 추가
apply plugin: 'com.google.gms.google-services'
```

#### 오류 3: iOS 빌드 시 Pods 문제

**해결:**
```bash
cd ios/App
pod install
cd ../..
npx cap sync ios
```

#### 오류 4: TypeScript 에러로 빌드 실패

**해결:**
```bash
# 빌드 전에 TypeScript 체크
npm run build

# 에러 메시지를 확인하고 수정
```

## ✅ Step 5: App Store / Play Store 배포

### 5-1. Android (Play Store)

#### 필수 설정:

1. **앱 아이콘/스플래시 준비**
   ```bash
   # Capacitor Assets 사용
   npx cap assets
   ```

2. **서명 설정**
   - `android/app/release.keystore` 생성
   - `android/gradle.properties`에 서명 정보 추가:
   ```properties
   MYAPP_RELEASE_STORE_FILE=release.keystore
   MYAPP_RELEASE_KEY_ALIAS=my-key-alias
   MYAPP_RELEASE_STORE_PASSWORD=*****
   MYAPP_RELEASE_KEY_PASSWORD=*****
   ```

3. **Release 빌드**
   ```bash
   npx cap open android
   ```
   - Android Studio에서: Build > Generate Signed Bundle / APK
   - `.aab` 파일 생성

4. **Play Console 업로드**
   - Play Console 접속
   - 앱 등록
   - `.aab` 파일 업로드
   - 스크린샷, 설명, 심사 제출

### 5-2. iOS (App Store)

#### 필수 설정:

1. **Apple Developer 계정 준비**
   - Apple Developer Program 가입 ($99/년)
   - App Store Connect 계정 생성

2. **Xcode 설정**
   - Signing & Capabilities > Team 선택
   - Bundle ID 고정 (com.yagovibe.app)

3. **Release 빌드**
   ```bash
   npx cap open ios
   ```
   - Xcode에서: Product > Archive
   - Organizer에서: "Distribute App" > App Store

4. **App Store Connect 업로드**
   - 메타데이터 입력
   - 아이콘, 스크린샷, 설명
   - 심사 제출

## 📋 체크리스트

### 빌드 전 확인
- [ ] `npm run build` 성공
- [ ] TypeScript 에러 없음
- [ ] 환경 변수 설정 완료
- [ ] Firebase 설정 완료

### Android 빌드
- [ ] `google-services.json` 배치 완료
- [ ] `minSdkVersion` 23 이상
- [ ] 서명 설정 완료
- [ ] Release 빌드 성공

### iOS 빌드
- [ ] `GoogleService-Info.plist` 추가 완료
- [ ] APNs 인증 키 설정 완료
- [ ] Apple Developer 계정 연결
- [ ] Archive 빌드 성공

### 배포 전 확인
- [ ] 앱 아이콘 준비
- [ ] 스플래시 화면 준비
- [ ] 스크린샷 준비
- [ ] 앱 설명 작성
- [ ] 개인정보 처리방침 준비

## 🎯 완료된 기능 요약

✅ **자동 로그인**
- AuthProvider에서 로그인 상태 감시
- 자동 리다이렉트 로직

✅ **라우트 보호**
- ProtectedRoute 컴포넌트
- 주요 페이지 보호 적용

✅ **세션 관리**
- resetSession() 함수
- ResetSessionButton 컴포넌트
- SettingsPage 생성

✅ **FCM 푸시 알림**
- registerPushNotifications() 함수
- Capacitor 환경 감지
- 권한 요청 및 토큰 수신

✅ **Capacitor 설정**
- Android WebView 세션 유지
- iOS WKWebView 세션 유지
- Google OAuth Redirect 설정

## 🚀 다음 단계

1. **Firebase Console 설정**
   - Authorized domains에 `capacitor://localhost` 추가

2. **앱 빌드 및 테스트**
   ```bash
   npm run build
   npx cap sync
   npx cap open android  # 또는 ios
   ```

3. **스토어 배포**
   - Android: Play Console
   - iOS: App Store Connect

