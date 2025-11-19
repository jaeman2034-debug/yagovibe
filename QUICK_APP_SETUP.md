# ⚡ YAGO VIBE 모바일 앱 빠른 설정 가이드 (5분)

가장 빠르게 Android/iOS 앱을 만들고 배포하는 방법입니다.

## 🚀 빠른 시작

### 1️⃣ Capacitor 설치 (1분)

```bash
# 프로젝트 루트에서
npm install @capacitor/core @capacitor/cli @capacitor/app @capacitor/camera @capacitor/geolocation @capacitor/device @capacitor/keyboard @capacitor/splash-screen
npm install -D @capacitor/cli capacitor-assets
```

### 2️⃣ Android/iOS 플랫폼 추가 (2분)

```bash
# Android 추가
npm run cap:add:android

# iOS 추가 (macOS만)
npm run cap:add:ios
```

### 3️⃣ 빌드 및 동기화 (1분)

```bash
# 웹앱 빌드 후 Capacitor에 복사
npm run cap:copy
```

### 4️⃣ Android Studio / Xcode 열기 (1분)

```bash
# Android Studio 열기
npm run cap:open:android

# Xcode 열기 (macOS만)
npm run cap:open:ios
```

### 5️⃣ 앱 실행!

**Android Studio**:
- **Run** → **Run 'app'** 클릭
- 에뮬레이터 또는 실제 기기에서 실행

**Xcode**:
- **Product** → **Run** 클릭 (⌘R)
- 시뮬레이터 또는 실제 기기에서 실행

---

## ✅ 완료!

이제 YAGO VIBE는 Android/iOS 앱으로 실행됩니다!

---

## 📝 다음 단계

1. **앱 아이콘/스플래시 이미지**: `MOBILE_APP_SETUP.md` 참고
2. **권한 설정**: Android `AndroidManifest.xml`, iOS `Info.plist`
3. **앱스토어 배포**: `APP_DEPLOYMENT_GUIDE.md` 참고

---

**더 자세한 내용은 `MOBILE_APP_SETUP.md`를 참고하세요!**

