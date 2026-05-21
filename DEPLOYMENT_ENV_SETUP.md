# ✅ 배포용 환경 변수 설정 가이드

> **현재 .env 파일에 `VITE_AUTH_MODE`가 없습니다. 배포 전 반드시 설정하세요.**

---

## 🔍 현재 상태 확인

현재 `.env` 파일에는:
- `VITE_USE_FIREBASE_EMULATOR=true` (개발 모드)
- `VITE_AUTH_MODE` 없음

**배포를 위해서는 추가 설정이 필요합니다.**

---

## 🚀 배포용 환경 변수 추가

### 방법 1: .env 파일에 직접 추가

`.env` 파일 끝에 다음을 추가하세요:

```env
# ============================================
# 🔥 전화번호 인증 모드 (배포용)
# ============================================
VITE_AUTH_MODE=PROD
VITE_AUTH_TEST_MODE=false
VITE_SMS_ENABLED=true
```

### 방법 2: .env.production 파일 생성 (권장)

프로덕션 전용 환경 변수 파일을 만드세요:

```bash
# .env.production 파일 생성
```

**내용:**
```env
# ============================================
# 🔥 프로덕션 환경 변수
# ============================================
VITE_APP_ENV=production
VITE_USE_FIREBASE_EMULATOR=false

# 전화번호 인증 모드
VITE_AUTH_MODE=PROD
VITE_AUTH_TEST_MODE=false
VITE_SMS_ENABLED=true

# Firebase 설정 (기존 값 유지)
VITE_FIREBASE_API_KEY=AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY
VITE_FIREBASE_AUTH_DOMAIN=yago-vibe-spt.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=yago-vibe-spt
VITE_FIREBASE_STORAGE_BUCKET=yago-vibe-spt.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=126699415285
VITE_FIREBASE_APP_ID=1:126699415285:web:1ea23395fa0e238dafc7bc
VITE_FIREBASE_MEASUREMENT_ID=G-E0X8G1HTTQ
```

---

## ✅ 배포 전 체크리스트

### 1. 환경 변수 확인

```powershell
# .env 파일 확인
Get-Content .env | Select-String "VITE_AUTH_MODE"

# 또는 전체 확인
Get-Content .env
```

**확인할 것:**
- [ ] `VITE_AUTH_MODE=PROD` (배포 시)
- [ ] `VITE_USE_FIREBASE_EMULATOR=false` (배포 시)
- [ ] `VITE_SMS_ENABLED=true` (SMS 활성화)

### 2. 빌드 테스트

```powershell
npm run build
```

**확인할 것:**
- [ ] 빌드 성공
- [ ] 에러 없음
- [ ] `dist` 폴더 생성

### 3. Firebase 콘솔 확인

- [ ] Authentication → Phone → 테스트 번호 삭제
- [ ] Authorized domains에 실 도메인 추가
- [ ] Phone Auth 활성화 확인

---

## 🔧 환경 변수 설명

### VITE_AUTH_MODE

- `DEV`: 개발 모드 (Firebase Console 테스트 번호 사용)
- `PROD`: 운영 모드 (실제 SMS 발송)

### VITE_AUTH_TEST_MODE

- `true`: 테스트 모드 안내 문구 표시
- `false`: 실전 모드 (안내 문구 숨김)

### VITE_SMS_ENABLED

- `true`: SMS 전송 활성화
- `false`: SMS 전송 차단 (긴급 차단용)

---

## 🚨 주의사항

1. **PowerShell에서 직접 실행 불가**
   - `const isProd = import.meta.env.PROD;`는 코드 파일 안에서만 사용
   - PowerShell에서는 `.env` 파일을 직접 확인

2. **환경 변수는 빌드 시점에 주입됨**
   - 빌드 후에는 변경 불가
   - 변경 시 재빌드 필요

3. **.env 파일은 Git에 커밋하지 마세요**
   - `.gitignore`에 포함되어 있음
   - 실제 값은 안전하게 관리

---

## ✅ 빠른 확인 명령어

```powershell
# 환경 변수 확인
Get-Content .env | Select-String "VITE_AUTH_MODE"

# 빌드 테스트
npm run build
```

이 두 가지로 충분합니다! 🚀
