# 📱 YAGO VIBE 모바일 앱 설정 가이드

Capacitor를 사용하여 웹앱을 Android/iOS 네이티브 앱으로 변환하는 가이드입니다.

## 📋 목차

1. [Capacitor 설치 및 초기화](#1-capacitor-설치-및-초기화)
2. [Android/iOS 플랫폼 추가](#2-androidios-플랫폼-추가)
3. [앱 아이콘 및 스플래시 이미지 생성](#3-앱-아이콘-및-스플래시-이미지-생성)
4. [모바일 권한 설정](#4-모바일-권한-설정)
5. [앱 빌드 및 실행](#5-앱-빌드-및-실행)
6. [앱스토어 배포 준비](#6-앱스토어-배포-준비)

---

## 1️⃣ Capacitor 설치 및 초기화

### 🔧 1-1. Capacitor 패키지 설치

```bash
# 프로젝트 루트에서
npm install @capacitor/core @capacitor/cli
npm install @capacitor/app @capacitor/camera @capacitor/geolocation @capacitor/device @capacitor/keyboard @capacitor/splash-screen
npm install -D @capacitor/cli capacitor-assets
```

### 🔧 1-2. Capacitor 초기화

```bash
# Capacitor 초기화 (이미 capacitor.config.ts가 있으면 스킵)
npx cap init

# 입력:
# App name: YAGO VIBE
# App ID: com.yagovibe.app
# Web Dir: dist
```

### ✅ 완료 확인

`capacitor.config.ts` 파일이 생성되었는지 확인하세요.

---

## 2️⃣ Android/iOS 플랫폼 추가

### 🔧 2-1. Android 플랫폼 추가

```bash
# Android 플랫폼 추가
npm run cap:add:android

# 또는
npx cap add android
```

**결과**:
- `android/` 폴더 생성됨
- Android Studio 프로젝트 준비 완료

### 🔧 2-2. iOS 플랫폼 추가 (macOS만 가능)

```bash
# iOS 플랫폼 추가 (macOS에서만 실행 가능)
npm run cap:add:ios

# 또는
npx cap add ios
```

**결과**:
- `ios/` 폴더 생성됨
- Xcode 프로젝트 준비 완료

### ⚠️ 중요

- **Android**: Windows/macOS/Linux 모두 가능
- **iOS**: macOS + Xcode 필요

---

## 3️⃣ 앱 아이콘 및 스플래시 이미지 생성

### 🔧 3-1. 원본 이미지 준비

프로젝트 루트에 다음 폴더 및 파일 생성:

```
assets/
  icon.png     (1024x1024px, PNG)
  splash.png   (2732x2732px, PNG, 배경색 또는 로고 포함)
```

### 🔧 3-2. 이미지 자동 생성

```bash
# Capacitor Assets 실행
npm run cap:assets

# 또는
npx capacitor-assets generate
```

**결과**:
- Android/iOS 아이콘 자동 생성
- Android/iOS 스플래시 이미지 자동 생성
- 모든 해상도 자동 최적화

### 📝 3-3. 아이콘/스플래시 이미지 가이드

**아이콘** (`assets/icon.png`):
- 크기: 1024x1024px
- 형식: PNG (투명 배경 가능)
- 내용: YAGO VIBE 로고

**스플래시** (`assets/splash.png`):
- 크기: 2732x2732px (iOS 최대 해상도)
- 형식: PNG
- 내용: 배경색 + 로고 (중앙 정렬 권장)

---

## 4️⃣ 모바일 권한 설정

### 🔧 4-1. Android 권한 설정

**`android/app/src/main/AndroidManifest.xml`**:

```xml
<manifest>
  <!-- 위치 권한 -->
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
  <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
  
  <!-- 카메라 권한 -->
  <uses-permission android:name="android.permission.CAMERA" />
  
  <!-- 인터넷 권한 -->
  <uses-permission android:name="android.permission.INTERNET" />
  
  <!-- 파일 읽기/쓰기 권한 (Android 10+) -->
  <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
  <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
                   android:maxSdkVersion="32" />
</manifest>
```

### 🔧 4-2. iOS 권한 설정

**`ios/App/App/Info.plist`**:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>YAGO VIBE는 근처 상품을 찾기 위해 위치 정보가 필요합니다.</string>

<key>NSLocationAlwaysUsageDescription</key>
<string>YAGO VIBE는 근처 상품을 찾기 위해 위치 정보가 필요합니다.</string>

<key>NSCameraUsageDescription</key>
<string>YAGO VIBE는 상품 사진을 촬영하기 위해 카메라 권한이 필요합니다.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>YAGO VIBE는 상품 사진을 업로드하기 위해 사진 라이브러리 권한이 필요합니다.</string>

<key>NSPhotoLibraryAddUsageDescription</key>
<string>YAGO VIBE는 상품 사진을 저장하기 위해 사진 라이브러리 권한이 필요합니다.</string>
```

---

## 5️⃣ 앱 빌드 및 실행

### 🔧 5-1. 웹앱 빌드 및 동기화

```bash
# 1. 웹앱 빌드
npm run build

# 2. Capacitor에 빌드 결과 복사
npx cap sync

# 또는 한 번에
npm run cap:copy
```

### 🔧 5-2. Android Studio에서 실행

```bash
# Android Studio 열기
npm run cap:open:android

# 또는
npx cap open android
```

**Android Studio에서**:
1. **"Run"** → **"Run 'app'"** 클릭
2. 에뮬레이터 또는 실제 기기 선택
3. 앱 실행!

### 🔧 5-3. Xcode에서 실행 (macOS만)

```bash
# Xcode 열기
npm run cap:open:ios

# 또는
npx cap open ios
```

**Xcode에서**:
1. **Product** → **Run** 클릭 (⌘R)
2. 시뮬레이터 또는 실제 기기 선택
3. 앱 실행!

### 🔧 5-4. APK/AAB 빌드 (Android)

**Android Studio에서**:
1. **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. 빌드 완료 후 `android/app/build/outputs/apk/` 폴더 확인
3. APK 파일 생성됨!

**AAB 빌드** (Google Play Store용):
1. **Build** → **Build Bundle(s) / APK(s)** → **Build Bundle(s)**
2. 빌드 완료 후 `android/app/build/outputs/bundle/` 폴더 확인
3. AAB 파일 생성됨!

### 🔧 5-5. IPA 빌드 (iOS)

**Xcode에서**:
1. **Product** → **Archive** 클릭
2. Archive 완료 후 **Window** → **Organizer** 열기
3. **"Distribute App"** 클릭
4. **App Store Connect**, **Ad Hoc**, 또는 **Development** 선택
5. IPA 파일 생성!

---

## 6️⃣ 앱스토어 배포 준비

### 🔧 6-1. Android (Google Play Store)

#### 1. Google Play Console 계정 생성
- https://play.google.com/console 접속
- 개발자 계정 등록 ($25 일회성)

#### 2. 앱 정보 설정
- **`android/app/build.gradle`** 확인:
  ```gradle
  android {
    defaultConfig {
      applicationId "com.yagovibe.app"
      versionCode 1
      versionName "1.0.0"
      minSdkVersion 22
      targetSdkVersion 34
    }
  }
  ```

#### 3. AAB 업로드
- **Build** → **Build Bundle(s) / APK(s)** → **Build Bundle(s)**
- Google Play Console → **App Bundle** 업로드

#### 4. 스토어 정보 작성
- 앱 이름, 설명, 스크린샷, 아이콘 등 입력
- **"Submit for Review"** 클릭

### 🔧 6-2. iOS (App Store)

#### 1. Apple Developer 계정 생성
- https://developer.apple.com 접속
- 개발자 프로그램 등록 ($99/년)

#### 2. App Store Connect 설정
- https://appstoreconnect.apple.com 접속
- 새 앱 생성
- Bundle ID: `com.yagovibe.app`

#### 3. Xcode에서 Archive & Upload
- **Product** → **Archive**
- **Distribute App** → **App Store Connect** 선택
- 업로드 완료

#### 4. 스토어 정보 작성
- App Store Connect에서 앱 정보, 스크린샷, 설명 등 입력
- **"Submit for Review"** 클릭

---

## ✅ 체크리스트

### Capacitor 설치

- [ ] Capacitor 패키지 설치 완료
- [ ] `capacitor.config.ts` 생성 확인
- [ ] `src/lib/capacitor.ts` 확인
- [ ] `src/hooks/useCapacitorCamera.ts` 확인
- [ ] `src/hooks/useCapacitorGeolocation.ts` 확인

### 플랫폼 추가

- [ ] Android 플랫폼 추가 완료
- [ ] iOS 플랫폼 추가 완료 (macOS만)

### 앱 아이콘/스플래시

- [ ] `assets/icon.png` 준비 완료 (1024x1024px)
- [ ] `assets/splash.png` 준비 완료 (2732x2732px)
- [ ] `npm run cap:assets` 실행 완료

### 권한 설정

- [ ] Android `AndroidManifest.xml` 권한 설정 완료
- [ ] iOS `Info.plist` 권한 설정 완료

### 빌드 및 테스트

- [ ] `npm run build` 성공
- [ ] `npx cap sync` 성공
- [ ] Android Studio에서 실행 성공
- [ ] Xcode에서 실행 성공 (macOS만)

### 배포 준비

- [ ] Android 버전 정보 설정 (`build.gradle`)
- [ ] iOS 버전 정보 설정 (`Info.plist`)
- [ ] Google Play Console / App Store Connect 계정 준비

---

## 🚨 문제 해결

### 문제: `npx cap sync` 실패

1. **빌드 확인**:
   ```bash
   npm run build
   ```

2. **`dist` 폴더 확인**:
   - 빌드 결과가 `dist/` 폴더에 생성되었는지 확인

3. **Capacitor 재설치**:
   ```bash
   npm uninstall @capacitor/core @capacitor/cli
   npm install @capacitor/core @capacitor/cli
   ```

### 문제: Android Studio에서 빌드 실패

1. **Gradle 동기화**:
   - Android Studio → **File** → **Sync Project with Gradle Files**

2. **SDK 버전 확인**:
   - **File** → **Project Structure** → **SDK Location** 확인

3. **JDK 버전 확인**:
   - **File** → **Project Structure** → **SDK Location** → **JDK location** 확인

### 문제: iOS 빌드 실패 (macOS만)

1. **Xcode 버전 확인**:
   - Xcode 14.0 이상 필요

2. **CocoaPods 설치**:
   ```bash
   sudo gem install cocoapods
   cd ios/App
   pod install
   ```

3. **Signing 확인**:
   - Xcode → **Signing & Capabilities** → Team 선택

### 문제: 카메라/위치 권한이 작동하지 않음

1. **권한 설정 확인**:
   - Android: `AndroidManifest.xml` 확인
   - iOS: `Info.plist` 확인

2. **권한 요청 코드 확인**:
   - `src/hooks/useCapacitorCamera.ts` 확인
   - `src/hooks/useCapacitorGeolocation.ts` 확인

---

## 📝 사용 예제

### 카메라 사용 예제

```typescript
import { useCapacitorCamera } from '@/hooks/useCapacitorCamera';

function ProductUpload() {
  const { takePicture, pickFromGallery, loading, error } = useCapacitorCamera();

  const handleCamera = async () => {
    const result = await takePicture({
      quality: 90, // 0-100
      allowEditing: false,
      resultType: 'base64',
    });

    if (result?.dataUrl) {
      // result.dataUrl 사용 (Base64 이미지)
      console.log('이미지:', result.dataUrl);
    }
  };

  const handleGallery = async () => {
    const result = await pickFromGallery({
      quality: 90,
      allowEditing: false,
    });

    if (result?.webPath) {
      // result.webPath 사용 (모바일 앱)
      console.log('이미지 경로:', result.webPath);
    }
  };

  return (
    <div>
      <button onClick={handleCamera} disabled={loading}>
        카메라로 촬영
      </button>
      <button onClick={handleGallery} disabled={loading}>
        갤러리에서 선택
      </button>
      {error && <p>오류: {error}</p>}
    </div>
  );
}
```

### GPS 사용 예제

```typescript
import { useCapacitorGeolocation } from '@/hooks/useCapacitorGeolocation';

function LocationComponent() {
  const { position, loading, error, getCurrentPosition, watchPosition } = useCapacitorGeolocation();

  useEffect(() => {
    // 현재 위치 가져오기
    getCurrentPosition();
  }, []);

  useEffect(() => {
    // 위치 감시 시작
    const unwatch = watchPosition((pos) => {
      console.log('위치:', pos.latitude, pos.longitude);
    });

    // 클린업
    return unwatch;
  }, []);

  if (loading) return <p>위치 확인 중...</p>;
  if (error) return <p>오류: {error}</p>;

  return (
    <div>
      {position && (
        <p>
          위치: {position.latitude}, {position.longitude}
        </p>
      )}
    </div>
  );
}
```

---

## 🎉 완료!

이제 YAGO VIBE는 **Web + Android + iOS = 풀 플랫폼 서비스**입니다!

### ✨ 주요 기능

✅ **웹 코드 그대로 사용**: UI, API, Firebase 모두 동일  
✅ **고화질 카메라**: 모바일 앱에서 네이티브 카메라 사용  
✅ **고정밀 GPS**: 모바일 앱에서 네이티브 GPS 사용  
✅ **앱스토어 배포 가능**: Google Play / App Store 등록 가능  
✅ **PWA도 지원**: 웹에서도 앱처럼 사용 가능

### 🚀 다음 단계

1. **앱 아이콘/스플래시 이미지 준비**: `assets/icon.png`, `assets/splash.png` 생성
2. **플랫폼 추가**: `npm run cap:add:android`, `npm run cap:add:ios`
3. **권한 설정**: Android `AndroidManifest.xml`, iOS `Info.plist`
4. **빌드 및 테스트**: Android Studio / Xcode에서 실행
5. **앱스토어 배포**: Google Play Console / App Store Connect

---

**이제 YAGO VIBE는 Web, Android, iOS 모두 지원합니다! 🎉**

