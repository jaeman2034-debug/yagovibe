# 🔄 개발 서버 재시작 가이드

## ✅ 프로세스 종료 완료

포트 5173을 사용하던 프로세스(PID 30028)를 종료했습니다.

## 🚀 다음 단계

### 1. 개발 서버 재시작

새 터미널에서:

```bash
npm run dev
```

### 2. HTTPS 인증서 확인

`vite.config.ts`에 HTTPS 설정이 있습니다:
- `localhost-key.pem`
- `localhost.pem`

이 파일들이 없으면 서버가 시작되지 않을 수 있습니다.

### 3. 인증서 생성 (필요한 경우)

```bash
# mkcert 설치 (Windows)
# https://github.com/FiloSottile/mkcert

# 인증서 생성
mkcert -install
mkcert localhost
```

또는 `vite.config.ts`에서 HTTPS 설정을 임시로 비활성화:

```typescript
server: {
  // https: {
  //   key: fs.readFileSync('./localhost-key.pem'),
  //   cert: fs.readFileSync('./localhost.pem'),
  // },
  host: true,
  port: 5173,
}
```

## 📋 Step 32 테스트 플로우

### 터미널 1: Firebase Emulators
```bash
firebase emulators:start
```

### 터미널 2: Vite 개발 서버
```bash
npm run dev
```

### 브라우저 접속
- React 앱: `http://localhost:5173/admin` (또는 `https://localhost:5173/admin`)
- Emulator UI: `http://127.0.0.1:4000`

## ⚠️ 문제 해결

### ERR_EMPTY_RESPONSE 오류

1. **개발 서버가 실행 중인지 확인**
   ```bash
   netstat -ano | findstr :5173
   ```

2. **프로세스 종료 후 재시작**
   ```bash
   taskkill /PID [PID번호] /F
   npm run dev
   ```

3. **HTTPS 인증서 확인**
   - 인증서 파일 존재 확인
   - 또는 HTTPS 설정 비활성화

### 포트 충돌

다른 포트 사용:
```bash
npx vite --port 5174
```

