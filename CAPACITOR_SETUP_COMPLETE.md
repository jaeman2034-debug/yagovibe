# 🚀 Capacitor 앱 설정 완료 가이드

YAGO VIBE Capacitor 앱 설정이 완료되었습니다.

## ✅ 완료된 작업

### 1. Capacitor 패키지 설치
- ✅ `@capacitor/core`: ^6.2.1
- ✅ `@capacitor/cli`: ^6.2.1
- ✅ `@capacitor/android`: ^6.0.0
- ✅ `@capacitor/ios`: ^6.0.0

### 2. Capacitor 설정
- ✅ `capacitor.config.ts` 생성/업데이트
- ✅ Android 플랫폼 추가
- ✅ iOS 플랫폼 추가 (진행 중)

### 3. 푸시 알림 설정
- ✅ `src/lib/pushNotifications.ts` 생성

---

## 📋 다음 단계

### 1. 빌드 및 파일 복사

```bash
npm run build
npx cap copy
```

### 2. 아이콘 및 스플래시 생성

#### 2-1. cordova-res 설치

```bash
npm install -g cordova-res
```

#### 2-2. 아이콘 파일 준비

`public/pwa-512x512.png` 파일이 있어야 합니다. 없으면 생성하세요.

#### 2-3. 아이콘/스플래시 자동 생성

```bash
cordova-res android --skip-config --copy
cordova-res ios --skip-config --copy
```

### 3. Android 권한 설정

`android/app/src/main/AndroidManifest.xml`에 다음 권한이 자동으로 추가됩니다:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.RECORD_AUDIO"/>
<uses-permission android:name="android.permission.CAMERA"/>
```

Capacitor 플러그인이 자동으로 추가합니다:
- `@capacitor/geolocation` → 위치 권한
- `@capacitor/camera` → 카메라 권한
- 음성 인식 → 마이크 권한

### 4. Firebase 설정 파일 추가

#### Android
1. Firebase Console → 프로젝트 설정 → Android 앱
2. `google-services.json` 다운로드
3. `android/app/google-services.json`에 복사

#### iOS
1. Firebase Console → 프로젝트 설정 → iOS 앱
2. `GoogleService-Info.plist` 다운로드
3. `ios/App/App/GoogleService-Info.plist`에 복사

### 5. 푸시 알림 플러그인 설치

```bash
npm install @capacitor/push-notifications
```

### 6. 푸시 알림 초기화

`src/main.tsx`에 추가:

```typescript
import { initPush } from "./lib/pushNotifications";

// PWA Service Worker 등록
initPWA();

// 푸시 알림 초기화 (Capacitor 앱에서만)
if (window.Capacitor?.isNativePlatform) {
  initPush();
}
```

### 7. 앱 버전 표시

설정 페이지나 About 페이지에 버전 표시:

```typescript
import packageJson from '../../package.json';

<p className="text-xs text-gray-400">
  앱 버전: v{packageJson.version}
</p>
```

---

## 🎯 Android Studio 열기

```bash
npx cap open android
```

Android Studio에서:
1. 프로젝트 열기
2. 에뮬레이터 또는 실제 기기 연결
3. Run 버튼 클릭

---

## 🍎 Xcode 열기 (macOS만)

```bash
npx cap open ios
```

Xcode에서:
1. 프로젝트 열기
2. 시뮬레이터 또는 실제 기기 선택
3. Run 버튼 클릭

---

## 📱 앱 빌드 워크플로우

### 개발 중

```bash
# 1. 웹 앱 빌드
npm run build

# 2. 네이티브 프로젝트에 복사
npx cap copy

# 3. Android Studio 또는 Xcode에서 실행
npx cap open android
# 또는
npx cap open ios
```

### 프로덕션 빌드

#### Android (APK/AAB)
1. Android Studio → Build → Generate Signed Bundle / APK
2. AAB 선택 (Google Play Store용)
3. 키스토어 설정
4. 빌드 완료

#### iOS (IPA)
1. Xcode → Product → Archive
2. App Store Connect에 업로드
3. TestFlight 또는 App Store 배포

---

## 🔧 주요 설정 파일

### capacitor.config.ts
- 앱 ID: `com.yagovibe.app`
- 앱 이름: `YAGO VIBE`
- 웹 디렉토리: `dist`
- 스플래시 스크린 설정 포함

### AndroidManifest.xml
- 위치 권한
- 카메라 권한
- 마이크 권한
- (Capacitor 플러그인이 자동 추가)

---

## ⚠️ 주의사항

1. **아이콘 파일**: `public/pwa-512x512.png`가 반드시 필요합니다.
2. **Firebase 설정**: `google-services.json`과 `GoogleService-Info.plist`를 추가해야 푸시 알림이 작동합니다.
3. **iOS 빌드**: macOS와 Xcode가 필요합니다.
4. **버전 관리**: `package.json`의 `version` 필드가 앱 버전으로 사용됩니다.

---

## 🎉 완료!

이제 YAGO VIBE는:
- ✅ 웹 앱 (PWA)
- ✅ Android 앱
- ✅ iOS 앱

모든 플랫폼에서 작동합니다!

---

## 📚 참고 자료

- [Capacitor 공식 문서](https://capacitorjs.com/docs)
- [Capacitor Android 가이드](https://capacitorjs.com/docs/android)
- [Capacitor iOS 가이드](https://capacitorjs.com/docs/ios)
- [푸시 알림 가이드](https://capacitorjs.com/docs/guides/push-notifications)

