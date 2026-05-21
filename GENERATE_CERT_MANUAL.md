# 🔐 SSL 인증서 수동 생성 가이드

## 🚨 OpenSSL이 설치되어 있지 않은 경우

### 방법 1: Git Bash 사용 (가장 쉬움)

Git이 설치되어 있다면 Git Bash에 OpenSSL이 포함되어 있습니다.

1. **프로젝트 루트에서 Git Bash 열기**
   - 프로젝트 폴더에서 우클릭 → "Git Bash Here"

2. **다음 명령어 실행:**

```bash
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout localhost-key.pem \
  -out localhost-cert.pem \
  -days 365
```

3. **질문이 뜨면 Enter를 계속 누르기**

4. **생성 확인:**
```bash
ls localhost-*.pem
```

### 방법 2: OpenSSL 설치

#### Windows

1. **Win32OpenSSL 다운로드:**
   - https://slproweb.com/products/Win32OpenSSL.html
   - Light 버전으로 충분합니다

2. **설치 후 PowerShell 재시작**

3. **인증서 생성:**
```powershell
openssl req -x509 -newkey rsa:2048 -nodes `
  -keyout localhost-key.pem `
  -out localhost-cert.pem `
  -days 365
```

### 방법 3: WSL 사용 (Windows Subsystem for Linux)

WSL이 설치되어 있다면:

```bash
# WSL 터미널에서
cd /mnt/c/Users/samsung256g/Desktop/yago-vibe-spt
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout localhost-key.pem \
  -out localhost-cert.pem \
  -days 365
```

## ✅ 생성 완료 후

1. **파일 확인:**
   - `localhost-key.pem` (개인 키)
   - `localhost-cert.pem` (인증서)

2. **개발 서버 실행:**
```bash
npm run dev
```

3. **HTTPS 접속:**
   - `https://localhost:5173` 접속
   - 브라우저에서 "고급" → "안전하지 않은 사이트로 이동" 클릭

## 🎯 빠른 명령어 (Git Bash)

프로젝트 루트에서 Git Bash 열고:

```bash
openssl req -x509 -newkey rsa:2048 -nodes -keyout localhost-key.pem -out localhost-cert.pem -days 365 -subj "/C=KR/ST=Seoul/L=Seoul/O=YAGO VIBE/CN=localhost"
```

이 명령어는 질문 없이 바로 생성합니다!

