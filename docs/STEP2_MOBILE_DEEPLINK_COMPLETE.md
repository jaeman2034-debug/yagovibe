# ✅ STEP 2: 모바일 딥링크 구현 완료

## 📋 구현 내용

### 1️⃣ Android 딥링크 설정

**파일**: `android/app/src/main/AndroidManifest.xml`

- `yagovibe://` 스킴 지원
- `https://yagovibe.com` 및 `https://www.yagovibe.com` Universal Links 지원
- `android:autoVerify="true"` 설정으로 자동 검증

### 2️⃣ iOS 딥링크 설정

**파일**: `ios/App/App/Info.plist`

- `yagovibe://` 스킴 지원
- `https://` Universal Links 지원 (Associated Domains는 Xcode에서 설정 필요)

### 3️⃣ Capacitor 설정

**파일**: `capacitor.config.ts`

- `App.deepLinkingEnabled: true` 설정 추가

### 4️⃣ 딥링크 처리 로직

**파일**: `src/lib/deepLinkHandler.ts`

- Capacitor App 딥링크 리스너 등록
- QR URL과 딥링크 연동
- `yagovibe://qr?market=home` → `/qr?market=home` → `/app/map` (모바일) 또는 `/home` (PC)

### 5️⃣ 앱 통합

**파일**: `src/main.tsx`, `src/App.tsx`

- 딥링크 리스너 등록 (main.tsx)
- 딥링크 수신 시 라우팅 처리 (App.tsx)

## 🔗 지원하는 딥링크 형식

### Custom URL Scheme
- `yagovibe://qr?market=home`
- `yagovibe://qr?item=ITEM_ID`
- `yagovibe://qr?chat=CHAT_ID`
- `yagovibe://qr?seller=USER_ID`

### Universal Links (HTTPS)
- `https://yagovibe.com/qr?market=home`
- `https://www.yagovibe.com/qr?item=ITEM_ID`
- `https://yagovibe.com/qr?chat=CHAT_ID`
- `https://yagovibe.com/qr?seller=USER_ID`

## 🧪 테스트 방법

### Android
```bash
# ADB를 통한 딥링크 테스트
adb shell am start -W -a android.intent.action.VIEW -d "yagovibe://qr?market=home" com.yagovibe.app
```

### iOS
```bash
# 시뮬레이터에서 딥링크 테스트
xcrun simctl openurl booted "yagovibe://qr?market=home"
```

## 📝 다음 단계

1. **iOS Associated Domains 설정** (Xcode에서)
   - `applinks:yagovibe.com`
   - `applinks:www.yagovibe.com`

2. **Android App Links 검증**
   - `.well-known/assetlinks.json` 파일 배포
   - `https://yagovibe.com/.well-known/assetlinks.json`

3. **딥링크 테스트**
   - 실제 디바이스에서 테스트
   - QR 코드 스캔 테스트

## ✅ 완료 체크

- [x] Android 딥링크 설정
- [x] iOS 딥링크 설정
- [x] Capacitor 딥링크 처리 로직
- [x] QR URL과 딥링크 연동
- [x] 앱 통합
