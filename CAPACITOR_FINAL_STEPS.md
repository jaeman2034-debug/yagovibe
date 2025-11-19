# 🚀 Capacitor 앱 설정 - 최종 단계

## ✅ 완료된 작업

1. ✅ Capacitor 패키지 설치
2. ✅ `capacitor.config.ts` 설정
3. ✅ Android 플랫폼 추가
4. ✅ iOS 플랫폼 추가
5. ✅ 푸시 알림 코드 작성
6. ✅ 앱 버전 표시 컴포넌트 생성

---

## 📋 남은 작업

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

#### 2-2. 아이콘 파일 확인

`public/pwa-512x512.png` 파일이 있는지 확인하세요. 없으면 생성해야 합니다.

#### 2-3. 아이콘/스플래시 자동 생성

```bash
cordova-res android --skip-config --copy
cordova-res ios --skip-config --copy
```

### 3. Android 권한 확인

Capacitor 플러그인이 자동으로 권한을 추가합니다:

- `@capacitor/geolocation` → `ACCESS_FINE_LOCATION`
- `@capacitor/camera` → `CAMERA`
- 음성 인식 → `RECORD_AUDIO`

`android/app/src/main/AndroidManifest.xml`을 확인하면 자동으로 추가되어 있을 것입니다.

수동으로 추가하려면 `<manifest>` 태그 안에 추가:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.RECORD_AUDIO"/>
<uses-permission android:name="android.permission.CAMERA"/>
```

### 4. Firebase 설정 파일 추가

#### Android
1. Firebase Console → 프로젝트 설정 → Android 앱
2. 패키지 이름: `com.yagovibe.app`
3. `google-services.json` 다운로드
4. `android/app/google-services.json`에 복사

#### iOS
1. Firebase Console → 프로젝트 설정 → iOS 앱
2. Bundle ID: `com.yagovibe.app`
3. `GoogleService-Info.plist` 다운로드
4. `ios/App/App/GoogleService-Info.plist`에 복사

### 5. Android Studio 열기

```bash
npx cap open android
```

Android Studio에서:
1. 프로젝트 열기
2. 에뮬레이터 또는 실제 기기 연결
3. Run 버튼 클릭

### 6. iOS Xcode 열기 (macOS만)

```bash
npx cap open ios
```

Xcode에서:
1. 프로젝트 열기
2. 시뮬레이터 또는 실제 기기 선택
3. Run 버튼 클릭

---

## 🎯 앱 버전 표시 사용법

설정 페이지나 About 페이지에 추가:

```tsx
import AppVersion from "@/components/AppVersion";

// 사용 예시
<AppVersion className="mt-4" />
```

---

## 📱 개발 워크플로우

### 매번 코드 변경 후

```bash
# 1. 웹 앱 빌드
npm run build

# 2. 네이티브 프로젝트에 복사
npx cap copy

# 3. Android Studio 또는 Xcode에서 실행
npx cap open android
```

또는 한 번에:

```bash
npm run cap:copy
npx cap open android
```

---

## 🔧 주요 파일 위치

- `capacitor.config.ts` - Capacitor 설정
- `android/` - Android 네이티브 프로젝트
- `ios/` - iOS 네이티브 프로젝트
- `src/lib/pushNotifications.ts` - 푸시 알림 초기화
- `src/components/AppVersion.tsx` - 앱 버전 표시

---

## ⚠️ 주의사항

1. **아이콘 파일**: `public/pwa-512x512.png`가 반드시 필요합니다.
2. **Firebase 설정**: 푸시 알림을 사용하려면 Firebase 설정 파일이 필요합니다.
3. **iOS 빌드**: macOS와 Xcode가 필요합니다.
4. **버전 관리**: `package.json`의 `version` 필드가 앱 버전으로 사용됩니다.

---

## 🎉 완료!

이제 YAGO VIBE는:
- ✅ 웹 앱 (PWA)
- ✅ Android 앱
- ✅ iOS 앱

모든 플랫폼에서 작동합니다!

