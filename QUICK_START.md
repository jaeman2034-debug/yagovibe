# 🚀 빠른 시작 가이드

## ⚡ 순서대로 실행하세요

### 1️⃣ Firebase Emulator 시작

**새 PowerShell 터미널**을 열고:

```powershell
cd C:\Users\samsung256g\Desktop\yago-vibe-spt
firebase emulators:start --only firestore,auth,functions
```

✅ **정상 실행 시 보이는 메시지:**
```
✔  All emulators ready! View Emulator UI at http://127.0.0.1:4000
```

➡️ 이 터미널은 **열어두세요** (에뮬레이터가 계속 실행됨)

---

### 2️⃣ 개발 서버 시작

**또 다른 새 PowerShell 터미널**을 열고:

```powershell
cd C:\Users\samsung256g\Desktop\yago-vibe-spt
npm run dev
```

✅ **정상 실행 시 보이는 메시지:**
```
VITE v7.1.12  ready in 1234 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

### 3️⃣ Firestore 테스트 데이터 추가

**브라우저**에서:
1. http://localhost:4000 접속
2. "Firestore" 탭 클릭
3. `FIRESTORE_DATA_GUIDE.md` 파일의 **방법 1** 따라하기

---

### 4️⃣ 홈 페이지 접속 및 PDF 테스트

**브라우저**에서:
1. http://localhost:5173/home 접속
2. "📸 전체 대시보드 스크린샷 PDF 저장" 버튼 클릭
3. PDF 다운로드 확인

---

## ⚠️ 중요 사항

- **에뮬레이터 터미널은 꺼지면 안 됩니다!**
- **에뮬레이터 중지**: `Ctrl + C`
- **개발 서버 중지**: `Ctrl + C`

---

## 🆘 문제 발생 시

### PORT 5173이 이미 사용 중인 경우

```powershell
netstat -ano | findstr "5173"
# PID 확인 후
Stop-Process -Id <PID> -Force
```

### PORT 4000, 5003, 8080이 이미 사용 중인 경우

```powershell
Get-Process | Where-Object {$_.ProcessName -eq "java"} | Stop-Process -Force
```

---

**🎉 준비 완료! 이제 AI 리포트 시스템을 사용할 수 있습니다!**

