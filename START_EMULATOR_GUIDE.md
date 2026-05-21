# 🚀 에뮬레이터 시작 가이드

## 현재 상태

- **에뮬레이터**: 실행 중이 아님
- **포트 4001**: 사용 중이 아님
- **설정**: 완료됨 (firebase.json, src/lib/firebase.ts)

## 에뮬레이터 시작 방법

### 방법 1: 새 터미널 창에서 시작 (권장)

1. **새 PowerShell 또는 터미널 창 열기**
2. 다음 명령 실행:

```powershell
cd C:\Users\samsung256g\Desktop\yago-vibe-spt\functions
firebase emulators:start
```

3. 에뮬레이터가 시작되면 다음 메시지가 표시됩니다:
   ```
   ✔  All emulators ready! It is now safe to connect.
   ✔  Emulator UI logging to http://localhost:4001
   ```

4. 브라우저에서 http://localhost:4001 접속

### 방법 2: VS Code 통합 터미널 사용

1. VS Code에서 **터미널** → **새 터미널** (Ctrl+Shift+`)
2. 다음 명령 실행:

```powershell
cd functions
firebase emulators:start
```

### 방법 3: 백그라운드 실행 (고급)

PowerShell에서:

```powershell
cd functions
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; firebase emulators:start"
```

## 에뮬레이터 시작 확인

에뮬레이터가 정상적으로 시작되면:

- ✅ 터미널에 "All emulators ready!" 메시지 표시
- ✅ http://localhost:4001 접속 가능
- ✅ 각 에뮬레이터 상태가 "On"으로 표시

## 문제 해결

### 포트 충돌 시

```powershell
# 포트 사용 중인 프로세스 확인
netstat -ano | findstr ":4001"

# 프로세스 종료
taskkill /F /PID [PID번호]
```

### 에뮬레이터가 시작되지 않을 때

1. `firebase.json` 설정 확인
2. Firebase CLI 버전 확인: `firebase --version`
3. Node.js 버전 확인: `node --version` (v18 이상 권장)

## 현재 포트 설정

| 에뮬레이터 | 포트 |
|-----------|------|
| Hub | 4600 |
| UI | 4001 |
| Functions | 5001 |
| Firestore | 8083 |
| Auth | 9099 |
| Storage | 9199 |
| Logging | 4601 |

