# 📱 전화번호 인증 환경 변수 설정 가이드

## 🔥 핵심 환경 변수

### 1. `VITE_AUTH_MODE` (필수)

**개발 환경 (`.env.development`)**
```env
VITE_AUTH_MODE=DEV
```
- Firebase Console 테스트 번호 사용
- 실제 SMS 발송 안 함
- 개발/테스트 전용

**운영 환경 (`.env.production`)**
```env
VITE_AUTH_MODE=PROD
```
- 실제 SMS 발송
- Firebase Console 테스트 번호 무시

---

### 2. `VITE_AUTH_TEST_MODE` (선택)

```env
VITE_AUTH_TEST_MODE=true   # 테스트 안내 문구 표시
VITE_AUTH_TEST_MODE=false  # 실전 모드 (안내 문구 숨김)
```

---

### 3. `VITE_USE_APP_CHECK` (선택)

```env
VITE_USE_APP_CHECK=false  # App Check 비활성화 (Phone Auth만 사용, 권장)
VITE_USE_APP_CHECK=true   # App Check 활성화 (Firestore/Functions 보호용)
```

---

## 📋 환경 변수 예시

### 개발 환경 (`.env.development`)

```env
# 🔥 전화번호 인증 모드
VITE_AUTH_MODE=DEV
VITE_AUTH_TEST_MODE=true
VITE_USE_APP_CHECK=false

# Firebase 설정
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# reCAPTCHA Site Key (App Check용, Phone Auth와 무관)
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
```

### 운영 환경 (`.env.production`)

```env
# 🔥 전화번호 인증 모드
VITE_AUTH_MODE=PROD
VITE_AUTH_TEST_MODE=false
VITE_USE_APP_CHECK=false

# Firebase 설정
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# reCAPTCHA Site Key (App Check용, Phone Auth와 무관)
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
```

---

## ✅ Firebase Console 설정

### 1. Authentication → Phone

- **Phone** 활성화 확인
- **테스트 전화번호** (DEV 모드 전용)
  - 번호: `+821056890800`
  - 코드: `123456`
  - ⚠️ 운영 환경에서는 테스트 번호 삭제 필수

### 2. 요금제

- **Blaze 요금제** 필수 (실전 SMS 발송)

---

## 🧪 테스트 시나리오

### 개발 환경 (DEV)

1. `.env.development`에 `VITE_AUTH_MODE=DEV` 설정
2. Firebase Console에 테스트 번호 등록
3. 개발 서버 실행: `npm run dev`
4. 테스트 번호로 인증 테스트
5. 실제 SMS 발송 안 됨 ✅

### 운영 환경 (PROD)

1. `.env.production`에 `VITE_AUTH_MODE=PROD` 설정
2. Firebase Console에서 테스트 번호 삭제
3. 빌드: `npm run build`
4. 배포: `firebase deploy`
5. 실제 전화번호로 SMS 발송 ✅

---

## 🔍 모드별 동작

| 모드 | 테스트 번호 | 실제 SMS | 로그 |
|------|------------|---------|------|
| DEV  | ✅ 사용     | ❌ 안 함 | `🧪 DEV MODE - 테스트 번호 경로` |
| PROD | ❌ 무시     | ✅ 발송  | `🚀 PROD MODE - 실 SMS 전송` |

---

## ⚠️ 주의사항

1. **운영 환경에서는 반드시 `VITE_AUTH_MODE=PROD` 설정**
2. **운영 환경에서는 Firebase Console 테스트 번호 삭제 필수**
3. **Blaze 요금제 필수 (실전 SMS 발송)**
