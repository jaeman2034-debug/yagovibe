# 🚀 EAS Build 가이드 (Expo)

> TestFlight / Play Store 배포용 빌드

---

## 1️⃣ EAS CLI 설치

```bash
npm install -g eas-cli
```

---

## 2️⃣ 로그인

```bash
eas login
```

Expo 계정으로 로그인

---

## 3️⃣ 프로젝트 설정

### `eas.json` 생성 (자동 생성됨)

```bash
eas build:configure
```

### 기본 설정 확인

```json
{
  "build": {
    "production": {
      "ios": {
        "simulator": false
      },
      "android": {
        "buildType": "apk"
      }
    },
    "development": {
      "ios": {
        "simulator": true
      }
    }
  }
}
```

---

## 4️⃣ iOS 빌드 (TestFlight)

### 빌드 실행

```bash
eas build --platform ios --profile production
```

### 빌드 옵션

- **App Store**: TestFlight 업로드용
- **Ad Hoc**: 테스트용 (선택)

### 빌드 완료 후

1. App Store Connect에서 빌드 확인
2. TestFlight에 자동 업로드됨
3. 심사 제출

---

## 5️⃣ Android 빌드 (Play Store)

### 빌드 실행

```bash
eas build --platform android --profile production
```

### 빌드 타입

- **AAB**: Play Store 업로드용 (필수)
- **APK**: 테스트용 (선택)

### 빌드 완료 후

1. Play Console에서 AAB 업로드
2. 출시 트랙 선택
3. 심사 제출

---

## 6️⃣ 빌드 전 체크리스트

- [ ] `app.json` 설정 확인
- [ ] Bundle ID / Package name 확인
- [ ] 권한 문구 확인
- [ ] 버전 번호 확인

### 버전 번호 설정 (`app.json`)

```json
{
  "expo": {
    "version": "1.0.0",
    "ios": {
      "buildNumber": "1"
    },
    "android": {
      "versionCode": 1
    }
  }
}
```

---

## 7️⃣ 빌드 상태 확인

```bash
eas build:list
```

---

## 8️⃣ 문제 해결

### 빌드 실패 시

1. 로그 확인: `eas build:view`
2. 에러 메시지 확인
3. `app.json` 설정 재확인

### 일반적인 문제

- **권한 문구 누락**: `app.json` 확인
- **Bundle ID 중복**: App Store Connect 확인
- **서명 문제**: Apple Developer 설정 확인

---

## ✅ 빌드 성공 후

- [ ] TestFlight / Play Store 업로드 확인
- [ ] 실기기에서 테스트
- [ ] 심사 제출

---

## 🚀 다음 단계

빌드 완료 후:
- TestFlight 테스터 초대
- Play Store 내부 테스트
- 심사 제출
