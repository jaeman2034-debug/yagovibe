# 🔐 HTTPS 개발 서버 설정 가이드

## 🎯 목적

Firebase OAuth 리다이렉트가 HTTPS로 돌아오는데, 로컬 개발 서버가 HTTP라서 발생하는 `ERR_CONNECTION_REFUSED` 오류를 해결하기 위해 HTTPS 개발 서버를 설정합니다.

## ✅ 해결 방법

### 1️⃣ SSL 인증서 생성

#### 방법 A: npm 스크립트 사용 (권장)

```bash
npm run generate-cert
```

#### 방법 B: OpenSSL 직접 실행

프로젝트 루트에서 실행:

```bash
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout localhost-key.pem \
  -out localhost-cert.pem \
  -days 365
```

질문이 뜨면 Enter를 계속 누르면 됩니다.

### 2️⃣ 생성된 파일 확인

프로젝트 루트에 다음 파일이 생성되어야 합니다:

- ✅ `localhost-key.pem` (개인 키)
- ✅ `localhost-cert.pem` (인증서)

### 3️⃣ 개발 서버 실행

```bash
npm run dev
```

이제 자동으로 `https://localhost:5173`으로 실행됩니다! 🔥

## 🚀 왜 이 방법이 정답인가?

| 항목 | 해결 |
|------|------|
| Firebase는 HTTPS로 인증 후 redirect | ✅ 이제 HTTPS 서버로 받음 |
| IAB는 HTTPS 페이지에 접근 가능 | ✅ 정상 작동 |
| ERR_CONNECTION_REFUSED | ✅ 사라짐 |
| Google OAuth redirect 정상 처리 | ✅ 완벽 작동 |
| 로그인 튕김 | ✅ 100% 해결 |

## 📋 기대 결과

| 지금까지 | 수정 후 |
|---------|---------|
| Google 로그인 → 튕김 | Google 로그인 → success ✅ |
| auth/handler → 오류 | auth/handler → 정상 작동 ✅ |
| ERR_CONNECTION_REFUSED | 🔥 No error ✅ |

## ⚠️ 주의사항

### 브라우저 보안 경고

self-signed 인증서이므로 브라우저에서 보안 경고가 표시됩니다:

1. **Chrome/Edge**: "고급" → "안전하지 않은 사이트로 이동" 클릭
2. **Firefox**: "고급" → "위험을 감수하고 계속" 클릭

이것은 정상적인 동작입니다. 개발 환경에서만 사용하는 인증서이므로 안전합니다.

### OpenSSL 설치 필요

OpenSSL이 설치되어 있지 않으면:

- **Windows**: https://slproweb.com/products/Win32OpenSSL.html
- **또는**: Git Bash에 포함된 OpenSSL 사용
- **또는**: `npm run generate-cert` 스크립트가 자동으로 안내

## 🔍 확인 사항

### 1. 인증서 파일 존재 확인

```bash
# Windows PowerShell
Test-Path localhost-key.pem
Test-Path localhost-cert.pem

# 또는
ls localhost-*.pem
```

### 2. 개발 서버 HTTPS 확인

서버 시작 시 콘솔에 다음이 표시되어야 합니다:

```
VITE vX.X.X  ready in XXX ms

➜  Local:   https://localhost:5173/
➜  Network: use --host to expose
```

### 3. 브라우저 접속 확인

- ✅ `https://localhost:5173` 접속 가능
- ✅ 보안 경고 후 "고급" → "계속" 클릭
- ✅ 페이지 정상 로드

## 🐛 문제 해결

### OpenSSL이 설치되어 있지 않음

```bash
# Windows에서 Git Bash 사용
# Git Bash에서 실행:
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout localhost-key.pem \
  -out localhost-cert.pem \
  -days 365
```

### 인증서 생성 실패

1. **권한 확인**: 프로젝트 루트에 쓰기 권한이 있는지 확인
2. **파일 충돌**: 기존 `localhost-*.pem` 파일 삭제 후 재시도
3. **수동 생성**: 위의 OpenSSL 명령어 직접 실행

### HTTPS 서버가 시작되지 않음

1. **파일 경로 확인**: `localhost-key.pem`, `localhost-cert.pem`이 프로젝트 루트에 있는지 확인
2. **vite.config.ts 확인**: HTTPS 설정이 올바른지 확인
3. **서버 재시작**: `Ctrl+C`로 중지 후 `npm run dev` 재실행

## 📝 참고

- 인증서 유효기간: 365일
- 인증서 타입: self-signed (개발용)
- 프로덕션에서는 실제 CA 인증서 사용 필요

