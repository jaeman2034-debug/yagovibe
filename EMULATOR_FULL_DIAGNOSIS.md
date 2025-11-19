# 🔍 에뮬레이터 전체 진단 결과

## 📊 포트 확인 결과

### ✅ 실행 중인 포트:
- **포트 5003**: Functions (PID 6944) ⚠️ **firebase.json에는 5001로 설정됨**
- **포트 8080**: Firestore (PID 12228, Java 프로세스)
- **포트 9099**: Auth (PID 6944)
- **포트 9199**: Storage (PID 4888)
- **포트 4001**: UI (PID 4888)
- **포트 4400**: Hub (PID 6944)
- **포트 4500**: Logging (PID 6944)

### ❌ 문제점:

1. **포트 불일치**
   - `firebase.json`: Functions 포트 5001
   - 실제 실행: Functions 포트 5003

2. **에뮬레이터가 분리되어 실행됨**
   - Storage만 별도 프로세스 (PID 4888)
   - 나머지는 다른 프로세스 (PID 6944)
   - Firestore는 Java 프로세스 (PID 12228)

3. **Emulator UI에서 OFF로 표시**
   - 포트는 열려있지만 UI에서 인식하지 못함
   - 에뮬레이터가 제대로 등록되지 않았을 가능성

## ✅ 해결 방법

### 방법 1: 모든 에뮬레이터 프로세스 종료 후 재시작 (권장)

```bash
# 1. 모든 관련 프로세스 종료
taskkill /PID 4888 /F
taskkill /PID 6944 /F
taskkill /PID 12228 /F

# 2. 잠시 대기
Start-Sleep -Seconds 2

# 3. 모든 에뮬레이터 재시작
firebase emulators:start
```

### 방법 2: firebase.json 포트 수정

Functions 포트를 5003으로 변경하거나, 실제로 5001로 시작되도록 확인:

```json
"functions": {
  "port": 5003  // 또는 5001로 통일
}
```

### 방법 3: 필요한 에뮬레이터만 명시적으로 시작

```bash
firebase emulators:start --only storage,firestore,auth,functions
```

## 🎯 예상 결과

재시작 후:
- ✅ 모든 에뮬레이터가 같은 프로세스에서 실행
- ✅ 포트가 firebase.json 설정과 일치
- ✅ Emulator UI에서 모두 ON으로 표시

## 📋 체크리스트

### 재시작 전:
- [ ] 모든 에뮬레이터 프로세스 종료
- [ ] 포트 확인 (모두 사용 가능한지)

### 재시작 후:
- [ ] Storage: ON (포트 9199)
- [ ] Firestore: ON (포트 8080)
- [ ] Auth: ON (포트 9099)
- [ ] Functions: ON (포트 5001 또는 5003)

---

**💡 모든 프로세스를 종료하고 재시작하면 문제가 해결될 것입니다!**

