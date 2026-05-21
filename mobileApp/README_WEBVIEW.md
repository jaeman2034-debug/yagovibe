# 📱 Expo WebView 앱 설정 가이드

## ✅ 완료된 작업

1. `App.js` 생성 완료
2. `react-native-webview` 이미 설치됨
3. `package.json` main 진입점 변경 완료

## 🚀 실행 방법

### 1️⃣ PC IP 주소 확인

```powershell
ipconfig | findstr /i "IPv4"
```

출력 예시:
```
IPv4 주소 . . . . . . . . . . . . : 192.168.0.5
```

### 2️⃣ App.js에 IP 주소 입력

`mobileApp/App.js` 파일을 열고:
```javascript
const WEB_URL = 'http://192.168.0.5:5173'; // ⚠️ 실제 PC IP로 변경
```

### 3️⃣ 웹 개발 서버 실행 (PC에서)

```bash
npm run dev
```

또는

```bash
npm run dev:http
```

서버가 `http://localhost:5173`에서 실행됩니다.

### 4️⃣ 방화벽 설정 (중요!)

Windows 방화벽에서 포트 5173 허용:

1. Windows 보안 → 방화벽 및 네트워크 보호
2. 고급 설정
3. 인바운드 규칙 → 새 규칙
4. 포트 → TCP → 5173
5. 연결 허용

또는 PowerShell (관리자 권한):
```powershell
New-NetFirewallRule -DisplayName "Vite Dev Server" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
```

### 5️⃣ Expo 앱 실행

```bash
cd mobileApp
npx expo start
```

### 6️⃣ 휴대폰에서 실행

1. **Expo Go 앱 설치**
   - iOS: App Store에서 "Expo Go" 검색
   - Android: Play Store에서 "Expo Go" 검색

2. **QR 코드 스캔**
   - `npx expo start` 실행 후 터미널에 QR 코드 표시
   - Expo Go 앱에서 QR 코드 스캔

3. **연결 확인**
   - 앱이 열리면 WebView에 웹앱이 로드됩니다
   - PC와 휴대폰이 같은 Wi-Fi 네트워크에 있어야 합니다

## 🔧 문제 해결

### ❌ 연결 안 됨

1. **PC IP 확인**
   ```powershell
   ipconfig
   ```
   - IPv4 주소 확인 (예: 192.168.0.5)

2. **방화벽 확인**
   - 포트 5173이 열려있는지 확인

3. **네트워크 확인**
   - PC와 휴대폰이 같은 Wi-Fi에 연결되어 있는지 확인

4. **브라우저에서 테스트**
   - 휴대폰 브라우저에서 `http://PC_IP:5173` 접속 테스트

### ❌ WebView가 로드 안 됨

1. **웹 서버 확인**
   - PC에서 `http://localhost:5173` 접속 테스트

2. **URL 확인**
   - `App.js`의 `WEB_URL`이 올바른지 확인

3. **콘솔 로그 확인**
   - Expo Go 앱에서 에러 메시지 확인

## 📝 다음 단계

### 프로덕션 배포용 URL 변경

배포 후에는:
```javascript
const WEB_URL = 'https://yago-vibe-spt.web.app';
```

### 앱 아이콘/이름 변경

`app.json` 수정:
```json
{
  "expo": {
    "name": "YAGO VIBE",
    "icon": "./assets/images/icon.png"
  }
}
```

### APK/IPA 빌드

```bash
# Android APK
eas build --platform android

# iOS IPA
eas build --platform ios
```

## 🎯 결과

이제 앱은:
- ✅ 진짜 모바일 앱
- ✅ 터치 OK
- ✅ 키보드 OK
- ✅ 마이크/STT OK
- ✅ UI/UX 실전과 거의 동일

