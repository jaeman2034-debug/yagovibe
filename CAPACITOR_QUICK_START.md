# 🚀 Capacitor 빠른 시작 가이드

## ✅ 완료된 작업

1. ✅ Capacitor 패키지 설치
2. ✅ `capacitor.config.ts` 설정
3. ✅ Android/iOS 플랫폼 추가
4. ✅ 푸시 알림 코드 작성
5. ✅ 앱 버전 표시 컴포넌트 생성

---

## 📋 다음 단계 (순서대로)

### 1. 빌드 및 복사

**⚠️ 참고**: TypeScript 오류가 있으면 먼저 수정하거나, 일단 빌드를 시도해보세요.

```bash
npm run build
npx cap copy
```

### 2. Android Studio 열기

```bash
npx cap open android
```

Android Studio에서:
- 프로젝트가 자동으로 열림
- 에뮬레이터 또는 실제 기기 연결
- Run 버튼 클릭

### 3. 아이콘 및 스플래시 생성

#### 3-1. cordova-res 설치

```bash
npm install -g cordova-res
```

#### 3-2. 아이콘 파일 확인

`public/pwa-512x512.png` 파일이 있어야 합니다.

없으면:
- 온라인 도구로 생성: https://realfavicongenerator.net/
- 또는 임시로 단색 이미지 생성

#### 3-3. 아이콘/스플래시 자동 생성

```bash
cordova-res android --skip-config --copy
cordova-res ios --skip-config --copy
```

### 4. Firebase 설정 파일 확인

#### Android
- 파일 위치: `android/app/google-services.json`
- 확인 방법: 파일이 있는지 체크
- 없으면: Firebase Console → 프로젝트 설정 → Android 앱 → `google-services.json` 다운로드

#### iOS
- 파일 위치: `ios/App/App/GoogleService-Info.plist`
- 확인 방법: 파일이 있는지 체크
- 없으면: Firebase Console → 프로젝트 설정 → iOS 앱 → `GoogleService-Info.plist` 다운로드

---

## 🎯 체크리스트

- [ ] `npm run build` 성공
- [ ] `npx cap copy` 성공
- [ ] `npx cap open android` 실행
- [ ] `cordova-res` 설치
- [ ] 아이콘 파일 (`pwa-512x512.png`) 확인
- [ ] `cordova-res android --skip-config --copy` 실행
- [ ] `cordova-res ios --skip-config --copy` 실행
- [ ] `android/app/google-services.json` 확인
- [ ] `ios/App/App/GoogleService-Info.plist` 확인

---

## 💡 팁

### TypeScript 오류가 있어도 빌드하고 싶다면

`vite.config.ts`에 추가:

```typescript
build: {
  rollupOptions: {
    // ...
  },
  // TypeScript 오류 무시 (개발 중에만 사용)
  // typescript: {
  //   ignoreBuildErrors: true
  // }
}
```

또는 `package.json`의 build 스크립트를 수정:

```json
"build": "vite build"
```

(tsc 체크 제거)

---

## 🎉 완료!

모든 단계를 완료하면:
- ✅ Android 앱 실행 가능
- ✅ iOS 앱 실행 가능 (macOS 필요)
- ✅ 푸시 알림 작동
- ✅ 아이콘 및 스플래시 표시

---

**현재 상태**: Capacitor 설정 완료! 빌드만 진행하면 됩니다.

