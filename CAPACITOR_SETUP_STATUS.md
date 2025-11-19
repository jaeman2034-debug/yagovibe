# 🚀 Capacitor 설정 상태 및 다음 단계

## ✅ 완료된 작업

### 1단계: Capacitor 설치 ✅
- ✅ `@capacitor/core`: ^6.2.1
- ✅ `@capacitor/cli`: ^6.2.1  
- ✅ `@capacitor/android`: ^6.0.0
- ✅ `@capacitor/ios`: ^6.0.0
- ✅ `@capacitor/push-notifications`: ^6.0.0

### 2단계: 초기화 ✅
- ✅ `capacitor.config.ts` 생성/설정 완료
- ✅ Android 플랫폼 추가 완료
- ✅ iOS 플랫폼 추가 완료
- ⚠️ 빌드 필요 (TypeScript 오류 수정 필요)

### 3단계: 앱 열기
- ⏳ 빌드 완료 후 진행

### 4단계: 아이콘/스플래시
- ⏳ 빌드 완료 후 진행

### 5단계: 푸시 알림
- ✅ 코드 작성 완료
- ⏳ Firebase 설정 파일 추가 필요

---

## ⚠️ 현재 상황

TypeScript 빌드 오류가 발생하고 있습니다. 다음 중 하나를 선택하세요:

### 옵션 1: TypeScript 오류 수정 후 빌드 (권장)
- 모든 TypeScript 오류를 수정한 후 빌드
- 시간이 걸릴 수 있음

### 옵션 2: TypeScript 체크 건너뛰고 빌드
- `tsconfig.json`에서 `"noEmit": true` 설정
- 또는 `vite.config.ts`에서 TypeScript 체크 비활성화
- 빠르게 진행 가능하지만 타입 안정성 감소

### 옵션 3: 일단 다음 단계 진행
- 빌드는 나중에 하고, 아이콘/스플래시 생성 및 Firebase 설정 파일 확인부터 진행

---

## 📋 다음 단계 (빌드 완료 후)

### 1. 빌드 및 복사
```bash
npm run build
npx cap copy
```

### 2. Android Studio 열기
```bash
npx cap open android
```

### 3. 아이콘/스플래시 생성

#### 3-1. cordova-res 설치
```bash
npm install -g cordova-res
```

#### 3-2. 아이콘 파일 확인
`public/pwa-512x512.png` 파일이 있는지 확인하세요.

#### 3-3. 아이콘/스플래시 자동 생성
```bash
cordova-res android --skip-config --copy
cordova-res ios --skip-config --copy
```

### 4. Firebase 설정 파일 확인

#### Android
- `android/app/google-services.json` 파일이 있는지 확인
- 없으면 Firebase Console에서 다운로드

#### iOS  
- `ios/App/App/GoogleService-Info.plist` 파일이 있는지 확인
- 없으면 Firebase Console에서 다운로드

---

## 🔧 TypeScript 오류 수정 방법

주요 오류들:
1. IndexedDB 타입 오류 (`IDBTransaction.store`, `IDBTransaction.done`)
2. Badge 컴포넌트 variant 타입 오류
3. Button 컴포넌트 size 타입 오류
4. ProductDetail 타입 오류 (category, sellerId 등)

이 오류들을 수정하면 빌드가 성공할 것입니다.

---

## 💡 빠른 진행 방법

TypeScript 오류를 일단 무시하고 빌드하려면:

1. `vite.config.ts`에 다음 추가:
```typescript
build: {
  rollupOptions: {
    // ...
  },
  // TypeScript 체크 건너뛰기
  typescript: {
    ignoreBuildErrors: true
  }
}
```

또는

2. `tsconfig.json`에서:
```json
{
  "compilerOptions": {
    "noEmit": true,
    "skipLibCheck": true
  }
}
```

---

## 🎯 권장 순서

1. **TypeScript 오류 수정** (가능한 범위에서)
2. **빌드 및 복사** (`npm run build && npx cap copy`)
3. **아이콘/스플래시 생성** (`cordova-res`)
4. **Firebase 설정 파일 확인**
5. **Android Studio에서 실행**

---

현재 상태: Capacitor 설정은 완료되었고, 빌드만 진행하면 됩니다!

