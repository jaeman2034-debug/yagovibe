# 🔧 개발 서버 문제 해결

## ❌ 현재 문제

`localhost:5173/admin` 접속 시 `ERR_EMPTY_RESPONSE` 오류 발생

## 🔍 원인 분석

포트 5173은 리스닝 중이지만 (프로세스 ID 30028), 서버가 응답하지 않습니다.

## ✅ 해결 방법

### 방법 1: 개발 서버 재시작 (권장)

```bash
# 1. 기존 프로세스 종료
# PowerShell에서:
Get-Process -Id 30028 | Stop-Process -Force

# 또는 직접:
taskkill /PID 30028 /F

# 2. 개발 서버 재시작
npm run dev
```

### 방법 2: 다른 포트 사용

```bash
# 포트 5174로 시작
npx vite --port 5174

# 또는 package.json 수정:
# "dev": "vite --port 5174"
```

### 방법 3: 포트 확인 및 정리

```bash
# 포트 5173 사용 중인 프로세스 확인
netstat -ano | findstr :5173

# 프로세스 종료
taskkill /PID [PID번호] /F

# 개발 서버 재시작
npm run dev
```

## 🚀 Step 32 테스트를 위한 전체 설정

### 1. Firebase Emulators 시작

```bash
firebase emulators:start
```

### 2. 개발 서버 시작 (새 터미널)

```bash
npm run dev
```

### 3. 브라우저 접속

- 개발 서버: `http://localhost:5173/admin`
- Emulator UI: `http://127.0.0.1:4000`

## 📋 체크리스트

- [ ] 기존 프로세스 종료
- [ ] 개발 서버 재시작
- [ ] `http://localhost:5173` 접속 확인
- [ ] `http://localhost:5173/admin` 접속 확인
- [ ] Firebase Emulators 실행 확인

## 💡 팁

### 동시 실행 필요:

1. **터미널 1**: Firebase Emulators
   ```bash
   firebase emulators:start
   ```

2. **터미널 2**: Vite 개발 서버
   ```bash
   npm run dev
   ```

3. **브라우저**: 
   - `http://localhost:5173/admin` (React 앱)
   - `http://127.0.0.1:4000` (Emulator UI)

