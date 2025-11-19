# 🔧 에뮬레이터 심층 문제 해결

## ❌ 현재 문제

포트는 모두 열려있지만 Emulator UI에서 OFF로 표시됨:
- 포트 5003: Functions 실행 중 (PID 6944)
- 포트 8080: Firestore 실행 중 (PID 12228)
- 포트 9099: Auth 실행 중 (PID 6944)
- 포트 9199: Storage 실행 중 (PID 4888)

## 🔍 원인 분석

에뮬레이터가 **다른 방식으로 시작**되었거나, **Emulator Hub에 제대로 등록되지 않았을** 가능성이 있습니다.

## ✅ 해결 방법

### 방법 1: 모든 프로세스 종료 후 완전 재시작 (권장)

```bash
# 1. 모든 관련 프로세스 종료
taskkill /PID 4888 /F
taskkill /PID 6944 /F
taskkill /PID 12228 /F

# 2. 포트 해제 확인
Start-Sleep -Seconds 3
netstat -ano | findstr "5003\|8080\|9099\|9199\|4001"

# 3. 모든 에뮬레이터 재시작 (프로젝트 루트에서)
firebase emulators:start
```

### 방법 2: 명시적으로 모든 에뮬레이터 시작

```bash
firebase emulators:start --only storage,firestore,auth,functions
```

### 방법 3: 에뮬레이터 데이터 초기화

```bash
# 에뮬레이터 데이터 초기화
firebase emulators:exec --only storage,firestore,auth,functions "echo 'Reset complete'"
```

## 🎯 확인 사항

### 1. firebase.json 설정 확인
- ✅ 모든 에뮬레이터 포트 설정 확인
- ✅ Functions 포트 5003으로 수정 완료

### 2. 프로젝트 루트에서 실행
```bash
# 반드시 프로젝트 루트에서 실행
cd C:\Users\samsung256g\Desktop\yago-vibe-spt
firebase emulators:start
```

### 3. 에뮬레이터 로그 확인
에뮬레이터 시작 시 출력되는 로그를 확인하여 어떤 에뮬레이터가 시작되었는지 확인

## 📋 예상 출력

정상적으로 시작되면:
```
✔ functions[releaseCheck]: http function initialized (http://127.0.0.1:5003)
✔ All emulators ready!
View Emulator UI at http://127.0.0.1:4001
```

## 💡 추가 팁

### 에뮬레이터가 계속 OFF로 표시되는 경우:

1. **브라우저 캐시 삭제**
   - Emulator UI 새로고침 (Ctrl+Shift+R)

2. **다른 터미널에서 확인**
   - 에뮬레이터가 실제로 시작되었는지 로그 확인

3. **포트 충돌 확인**
   - 다른 프로세스가 포트를 점유하고 있는지 확인

---

**🚀 모든 프로세스를 종료하고 프로젝트 루트에서 재시작하면 해결될 것입니다!**

