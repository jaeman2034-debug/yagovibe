# 🔧 Emulator 포트 충돌 해결 가이드

## 📌 현재 상황

터미널 로그:
```
Error: Could not start emulator hub, port taken.
```

**의미**: 모든 Emulator 포트가 이미 사용 중

---

## 🔍 포트 사용 중인 프로세스 확인

다음 명령어로 포트를 사용하는 프로세스 확인:

```powershell
# Auth Emulator 포트 확인
netstat -ano | findstr :9099

# Firestore Emulator 포트 확인
netstat -ano | findstr :8086

# Emulator UI 포트 확인
netstat -ano | findstr :4001

# Hub 포트 확인
netstat -ano | findstr :4600
```

---

## ✅ 해결 방법

### 방법 1: 기존 Emulator 프로세스 종료 (권장)

1. **포트를 사용하는 프로세스 찾기**
   ```powershell
   netstat -ano | findstr :9099
   ```
   - PID (마지막 숫자) 확인

2. **프로세스 종료**
   ```powershell
   taskkill /PID <PID번호> /F
   ```

3. **모든 포트 확인 및 종료**
   ```powershell
   # Auth (9099)
   netstat -ano | findstr :9099
   # PID 확인 후
   taskkill /PID <PID> /F

   # Firestore (8086)
   netstat -ano | findstr :8086
   taskkill /PID <PID> /F

   # UI (4001)
   netstat -ano | findstr :4001
   taskkill /PID <PID> /F

   # Hub (4600)
   netstat -ano | findstr :4600
   taskkill /PID <PID> /F
   ```

### 방법 2: 모든 Node.js 프로세스 종료 (빠른 방법)

```powershell
taskkill /IM node.exe /F
```

**주의**: 다른 Node.js 프로세스도 종료될 수 있음

### 방법 3: 포트 변경 (선택사항)

`firebase.json`에서 포트 변경:
```json
{
  "emulators": {
    "hub": {
      "port": 4601  // 다른 포트로 변경
    },
    "auth": {
      "port": 9100  // 다른 포트로 변경
    },
    "firestore": {
      "port": 8087  // 다른 포트로 변경
    }
  }
}
```

---

## 🔧 자동 해결 스크립트

포트를 사용하는 프로세스를 자동으로 찾아 종료하는 스크립트를 실행하겠습니다.
