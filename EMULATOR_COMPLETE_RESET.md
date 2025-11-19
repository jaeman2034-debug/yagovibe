# 🔄 에뮬레이터 완전 재시작 가이드

## ❌ 현재 문제

에뮬레이터가 **오래 전에 시작**되었고, **제대로 등록되지 않았습니다**:
- PID 4888: 11월 5일 3:56 시작 (Storage)
- PID 6944: 11월 2일 5:18 시작 (Functions/Auth)
- PID 12228: 11월 2일 5:18 시작 (Firestore, Java)

## ✅ 해결 방법: 완전 재시작

### 1단계: 모든 에뮬레이터 프로세스 종료

```powershell
# PowerShell에서 실행:
taskkill /PID 4888 /F
taskkill /PID 6944 /F
taskkill /PID 12228 /F

# 포트 해제 확인
Start-Sleep -Seconds 3
netstat -ano | findstr "5003\|8080\|9099\|9199\|4001"
```

### 2단계: 프로젝트 루트에서 에뮬레이터 시작

```bash
# 반드시 프로젝트 루트에서 실행
cd C:\Users\samsung256g\Desktop\yago-vibe-spt
firebase emulators:start
```

### 3단계: 모든 에뮬레이터가 시작되었는지 확인

터미널 출력에서 다음을 확인:
```
✔ All emulators ready!
View Emulator UI at http://127.0.0.1:4001
```

## 📋 예상 결과

정상적으로 시작되면:
- ✅ Storage: ON (포트 9199)
- ✅ Firestore: ON (포트 8080)
- ✅ Auth: ON (포트 9099)
- ✅ Functions: ON (포트 5003)

## 🎯 중요 사항

1. **프로젝트 루트에서 실행**: `firebase.json`이 있는 디렉토리에서 실행
2. **모든 프로세스 종료**: 기존 프로세스를 모두 종료한 후 시작
3. **브라우저 새로고침**: Emulator UI를 새로고침 (Ctrl+Shift+R)

---

**🚀 모든 프로세스를 종료하고 프로젝트 루트에서 재시작하면 해결됩니다!**

