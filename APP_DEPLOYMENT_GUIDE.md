# 🚀 YAGO VIBE 앱스토어 배포 가이드

Android/iOS 앱스토어에 YAGO VIBE 앱을 배포하는 상세 가이드입니다.

## 📋 목차

1. [Android 배포 (Google Play Store)](#1-android-배포-google-play-store)
2. [iOS 배포 (App Store)](#2-ios-배포-app-store)
3. [버전 관리](#3-버전-관리)
4. [스토어 정보 작성](#4-스토어-정보-작성)

---

## 1️⃣ Android 배포 (Google Play Store)

### 🔧 1-1. Google Play Console 계정 생성

1. **https://play.google.com/console** 접속
2. **"Get started"** 클릭
3. 개발자 등록 ($25 일회성)
4. 약관 동의 및 결제 완료

### 🔧 1-2. 앱 버전 정보 설정

**`android/app/build.gradle`**:

```gradle
android {
    defaultConfig {
        applicationId "com.yagovibe.app"
        versionCode 1        // 숫자 (배포할 때마다 증가)
        versionName "1.0.0"  // 문자열 (사용자에게 표시)
        minSdkVersion 22     // Android 5.1 이상
        targetSdkVersion 34  // Android 14
    }
}
```

**버전 관리**:
- `versionCode`: 정수, 배포할 때마다 1씩 증가
- `versionName`: 문자열, "1.0.0", "1.0.1" 등

### 🔧 1-3. AAB 빌드

**Android Studio에서**:

1. **Build** → **Build Bundle(s) / APK(s)** → **Build Bundle(s)**
2. 빌드 완료 후 경로:
   ```
   android/app/build/outputs/bundle/release/app-release.aab
   ```

### 🔧 1-4. Google Play Console에 업로드

1. **Google Play Console** → **"Create app"** 클릭
2. 앱 정보 입력:
   - **App name**: YAGO VIBE
   - **Default language**: 한국어
   - **App or game**: App
   - **Free or paid**: Free
3. **"Create app"** 클릭
4. **"Production"** → **"Create new release"** 클릭
5. **AAB 파일 업로드**: `app-release.aab` 업로드
6. **"Save"** → **"Review release"** 클릭

### 🔧 1-5. 스토어 정보 작성

1. **Store presence** → **Main store listing**:
   - **Short description**: 짧은 설명 (80자)
   - **Full description**: 전체 설명 (4000자)
   - **App icon**: 512x512px PNG
   - **Feature graphic**: 1024x500px PNG
   - **Screenshots**: 최소 2개, 최대 8개
   - **Phone**: 16:9 또는 9:16 비율, 320px~3840px
   - **Tablet**: 7인치, 10인치 (선택)
2. **Content rating**: 앱 등급 설정
3. **Target audience**: 타겟 연령 설정
4. **Data safety**: 데이터 수집/사용 정보 입력

### 🔧 1-6. 배포 완료

1. 모든 정보 입력 완료
2. **"Submit for review"** 클릭
3. Google 심사 대기 (보통 1-3일)
4. 승인 후 자동 배포!

---

## 2️⃣ iOS 배포 (App Store)

### 🔧 2-1. Apple Developer 계정 생성

1. **https://developer.apple.com** 접속
2. **"Enroll"** 클릭
3. 개발자 프로그램 등록 ($99/년)
4. 결제 완료

### 🔧 2-2. App Store Connect 설정

1. **https://appstoreconnect.apple.com** 접속
2. **"My Apps"** → **"+"** → **"New App"** 클릭
3. 앱 정보 입력:
   - **Platforms**: iOS
   - **Name**: YAGO VIBE
   - **Primary Language**: 한국어
   - **Bundle ID**: `com.yagovibe.app` (Xcode에서 생성)
   - **SKU**: 고유 식별자 (예: yagovibe-001)
   - **User Access**: Full Access
4. **"Create"** 클릭

### 🔧 2-3. Xcode에서 Signing 설정

**Xcode** → **Signing & Capabilities**:

1. **Team**: Apple Developer 계정 선택
2. **Bundle Identifier**: `com.yagovibe.app` 확인
3. **Signing Certificate**: 자동 생성됨

### 🔧 2-4. 앱 버전 정보 설정

**`ios/App/App/Info.plist`**:

```xml
<key>CFBundleShortVersionString</key>
<string>1.0.0</string>

<key>CFBundleVersion</key>
<string>1</string>
```

또는 **Xcode** → **General** → **Version** / **Build**

### 🔧 2-5. Archive & Upload

**Xcode에서**:

1. **Product** → **Scheme** → **Edit Scheme** → **Run** → **Build Configuration**: **Release**
2. **Product** → **Archive** 클릭
3. Archive 완료 후 **Window** → **Organizer** 열기
4. 최신 Archive 선택 → **"Distribute App"** 클릭
5. **"App Store Connect"** 선택 → **"Next"**
6. **"Upload"** 선택 → **"Next"**
7. **"Automatically manage signing"** 선택 → **"Next"**
8. **"Upload"** 클릭
9. 업로드 완료 대기 (몇 분 소요)

### 🔧 2-6. App Store Connect에서 버전 생성

1. **App Store Connect** → **My Apps** → **YAGO VIBE** 선택
2. **"+" Version or Platform"** 클릭 → **iOS** 선택
3. **Version**: `1.0.0` 입력
4. **"Create"** 클릭

### 🔧 2-7. 스토어 정보 작성

1. **App Information**:
   - **Name**: YAGO VIBE
   - **Subtitle**: 부제목 (30자)
   - **Category**: 카테고리 선택
   - **Privacy Policy URL**: 개인정보처리방침 URL

2. **Pricing and Availability**:
   - **Price**: Free
   - **Availability**: 모든 국가 (또는 선택)

3. **Version Information**:
   - **Description**: 앱 설명 (4000자)
   - **Keywords**: 키워드 (100자)
   - **Support URL**: 지원 URL
   - **Marketing URL**: 마케팅 URL (선택)
   - **Screenshots**: 스크린샷 (필수)
     - iPhone 6.7": 최소 1개
     - iPhone 6.5": 최소 1개
     - iPad Pro (12.9"): 선택
   - **App Preview**: 동영상 (선택)
   - **App Icon**: 1024x1024px PNG

4. **App Review Information**:
   - **Contact Information**: 연락처 정보
   - **Demo Account**: 데모 계정 (필요 시)

### 🔧 2-8. 배포 완료

1. **Build** 선택: 업로드한 버전 선택
2. 모든 정보 입력 완료
3. **"Submit for Review"** 클릭
4. Apple 심사 대기 (보통 1-7일)
5. 승인 후 자동 배포!

---

## 3️⃣ 버전 관리

### 🔧 3-1. Android 버전 업데이트

**`android/app/build.gradle`**:

```gradle
android {
    defaultConfig {
        versionCode 2        // 1 → 2로 증가
        versionName "1.0.1"  // 버전 이름 업데이트
    }
}
```

### 🔧 3-2. iOS 버전 업데이트

**Xcode** → **General** → **Version** / **Build**:
- **Version**: `1.0.1` (사용자에게 표시)
- **Build**: `2` (내부 번호, 증가)

또는 **`ios/App/App/Info.plist`**:

```xml
<key>CFBundleShortVersionString</key>
<string>1.0.1</string>

<key>CFBundleVersion</key>
<string>2</string>
```

### 🔧 3-3. 빌드 및 배포

```bash
# 1. 버전 업데이트 (위 방법 중 선택)

# 2. 웹앱 빌드 및 동기화
npm run cap:copy

# 3. Android Studio / Xcode에서 빌드
# Android: Build Bundle(s)
# iOS: Archive & Upload

# 4. 스토어 업로드 및 심사 요청
```

---

## 4️⃣ 스토어 정보 작성

### 🔧 4-1. 앱 이름 및 설명

**Android / iOS 공통**:

- **앱 이름**: YAGO VIBE
- **짧은 설명**: AI 기반 중고거래 플랫폼
- **전체 설명**:
  ```
  YAGO VIBE는 AI 기술을 활용한 스마트 중고거래 플랫폼입니다.

  ✨ 주요 기능:
  - AI 검색 엔진: 의미 기반 상품 검색
  - AI 추천 시스템: 개인화된 상품 추천
  - AI 사기 감지: 안전한 거래 보장
  - 실시간 채팅: AI 흥정 도우미
  - 위치 기반 검색: 근처 상품 찾기

  🔒 안전한 거래:
  - 판매자 신뢰도 평가
  - 사기 위험 자동 감지
  - 안전 결제 시스템

  🚀 지금 다운로드하고 스마트한 중고거래를 시작하세요!
  ```

### 🔧 4-2. 스크린샷 준비

**Android (Google Play Store)**:
- **Phone**: 16:9 또는 9:16 비율
  - 최소 해상도: 320px
  - 최대 해상도: 3840px
  - 권장: 1080x1920px (9:16) 또는 1920x1080px (16:9)
- **Tablet 7"**: 1024x600px
- **Tablet 10"**: 1280x800px
- 최소 2개, 최대 8개

**iOS (App Store)**:
- **iPhone 6.7"**: 1290x2796px (필수)
- **iPhone 6.5"**: 1242x2688px (필수)
- **iPhone 5.5"**: 1242x2208px (선택)
- **iPad Pro (12.9")**: 2048x2732px (선택)
- 최소 1개, 최대 10개

### 🔧 4-3. 앱 아이콘

**Android**:
- **App Icon**: 512x512px PNG
- `assets/icon.png`에서 자동 생성됨

**iOS**:
- **App Icon**: 1024x1024px PNG
- `assets/icon.png`에서 자동 생성됨

### 🔧 4-4. Feature Graphic (Android만)

- **Feature Graphic**: 1024x500px PNG
- Google Play Store 상단에 표시되는 이미지

---

## ✅ 체크리스트

### Android 배포

- [ ] Google Play Console 계정 생성 완료
- [ ] `build.gradle` 버전 정보 설정 완료
- [ ] AAB 빌드 완료
- [ ] Google Play Console에 업로드 완료
- [ ] 스토어 정보 작성 완료
- [ ] 스크린샷 준비 완료
- [ ] 앱 아이콘 준비 완료
- [ ] Content rating 설정 완료
- [ ] "Submit for Review" 완료

### iOS 배포

- [ ] Apple Developer 계정 생성 완료
- [ ] App Store Connect 앱 생성 완료
- [ ] Xcode Signing 설정 완료
- [ ] Info.plist 버전 정보 설정 완료
- [ ] Archive & Upload 완료
- [ ] App Store Connect 버전 생성 완료
- [ ] 스토어 정보 작성 완료
- [ ] 스크린샷 준비 완료 (iPhone 6.7", 6.5")
- [ ] 앱 아이콘 준비 완료
- [ ] "Submit for Review" 완료

---

## 🚨 문제 해결

### 문제: Android AAB 업로드 실패

1. **서명 확인**:
   - **Build** → **Generate Signed Bundle / APK**
   - 키스토어 파일 생성 또는 기존 키스토어 사용

2. **버전 확인**:
   - `versionCode`가 이전 버전보다 높은지 확인

3. **권한 확인**:
   - `AndroidManifest.xml` 권한 설정 확인

### 문제: iOS Archive 실패

1. **Signing 확인**:
   - Xcode → **Signing & Capabilities** → Team 선택 확인

2. **Bundle ID 확인**:
   - App Store Connect의 Bundle ID와 일치하는지 확인

3. **Xcode 버전 확인**:
   - 최신 Xcode 버전 사용 권장

### 문제: 심사 거부

1. **거부 사유 확인**:
   - Google Play Console / App Store Connect에서 거부 사유 확인

2. **수정 후 재제출**:
   - 거부 사유에 따라 수정
   - 새 버전으로 다시 제출

---

## 🎉 완료!

이제 YAGO VIBE는 Google Play Store와 App Store 모두에서 다운로드 가능합니다!

### ✨ 배포 후 확인사항

- [ ] Google Play Store에서 앱 다운로드 확인
- [ ] App Store에서 앱 다운로드 확인
- [ ] 모든 기능 정상 작동 확인
- [ ] 모바일 권한 정상 작동 확인
- [ ] 푸시 알림 정상 작동 확인 (설정 시)

---

**이제 YAGO VIBE는 Web, Android, iOS 모두 지원하는 풀 플랫폼 서비스입니다! 🎉**

