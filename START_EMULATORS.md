# 🔥 Firebase Emulator 실행 가이드

## 🎯 빠른 시작

**새 PowerShell 터미널을 열고 아래 명령어를 실행하세요:**

```powershell
cd C:\Users\samsung256g\Desktop\yago-vibe-spt
firebase emulators:start --only firestore,auth,functions
```

또는 **모든 서비스 실행:**

```powershell
firebase emulators:start
```

---

## ✅ 정상 실행 시 표시되는 메시지

```
i  emulators: Starting emulators: functions, firestore, auth
✔  functions: Using node@22 from host.
✔  functions: Loaded environment variables from .env.
i  functions: Watching "/Users/.../functions" for Cloud Functions...
✔  functions[generateWeeklyReportAPI]: http function initialized (http://127.0.0.1:5003)
✔  All emulators ready! View Emulator UI at http://127.0.0.1:4000
```

---

## 📊 접속 URL

실행 후 다음 URL로 접속 가능:

- **Firestore UI**: http://localhost:4000
- **Functions Endpoint**: http://localhost:5003
- **Auth UI**: http://localhost:4000

---

## 🛑 에뮬레이터 종료

에뮬레이터를 중지하려면 `Ctrl + C` 를 누르세요.

---

## ⚠️ 문제 해결

### "No emulators to start" 오류

```powershell
# 기존 프로세스 종료
Get-Process | Where-Object {$_.ProcessName -eq "java"} | Stop-Process -Force

# 에뮬레이터 재시작
firebase emulators:start --only firestore,auth,functions
```

### 포트 충돌

```powershell
# 사용 중인 포트 확인
netstat -ano | findstr "LISTENING" | findstr "4000 5003 8080"

# 프로세스 종료 (PID는 위에서 확인한 값)
Stop-Process -Id <PID> -Force
```

---

## 🎯 다음 단계

에뮬레이터 실행 후:

1. **Firestore UI 접속**: http://localhost:4000
2. **테스트 데이터 추가**: `FIRESTORE_DATA_GUIDE.md` 참고
3. **개발 서버 실행** (새 터미널):
   ```powershell
   npm run dev
   ```
4. **홈 페이지 접속**: http://localhost:5173/home

---

**🔥 에뮬레이터가 실행되면 Firestore에 데이터를 추가하고 PDF 기능을 테스트할 수 있습니다!**

