# 🧪 Step 32 Emulator 테스트 가이드

## ✅ Firebase Emulators 설정 완료

`firebase.json`에 emulators 설정이 추가되었습니다. 이제 로컬에서 Step 32 함수들을 테스트할 수 있습니다.

## 🚀 Emulator 실행 방법

### 1. 전체 Emulator 시작

```bash
firebase emulators:start
```

이 명령어로 다음 emulators가 자동으로 시작됩니다:
- ✅ Functions (포트 5001)
- ✅ Firestore (포트 8080)
- ✅ Storage (포트 9199)
- ✅ Auth (포트 9099)
- ✅ UI (포트 4000)

### 2. Functions만 시작

```bash
firebase emulators:start --only functions
```

### 3. Functions + Firestore만 시작

```bash
firebase emulators:start --only functions,firestore
```

## 📋 Step 32 테스트 플로우 (Emulator)

### 1️⃣ Emulator 시작

```bash
firebase emulators:start
```

예상 출력:
```
✔ functions[releaseCheck]: http function initialized (http://127.0.0.1:5001)
✔ functions[generateReleaseNotes]: http function initialized (http://127.0.0.1:5001)
✔ All emulators ready!
View Emulator UI at http://127.0.0.1:4000
```

### 2️⃣ Functions Shell에서 수동 트리거

새 터미널에서:

```bash
firebase functions:shell
```

실행 후:

```javascript
releaseCheck()
generateReleaseNotes()
```

### 3️⃣ HTTP 함수 직접 호출

```bash
# 릴리즈 체크
curl -X POST http://127.0.0.1:5001/yago-vibe-spt/asia-northeast3/releaseCheck

# 릴리즈 노트 생성
curl -X POST http://127.0.0.1:5001/yago-vibe-spt/asia-northeast3/generateReleaseNotes
```

### 4️⃣ Emulator UI에서 확인

1. 브라우저에서 `http://127.0.0.1:4000` 접속
2. **Firestore** 탭에서 확인:
   - `releaseChecks/latest` 문서
   - `releaseNotes/latest` 문서
3. **Functions** 탭에서 로그 확인

### 5️⃣ 관리자 대시보드 확인

1. React 앱 실행 (로컬 개발 서버)
2. `http://localhost:5173/admin` 접속
3. Firestore 연결을 Emulator로 설정:
   ```typescript
   // src/lib/firebase.ts에서
   connectFirestoreEmulator(db, '127.0.0.1', 8080);
   ```
4. ReleaseBoard 컴포넌트 확인

## 🔧 Emulator 포트 설정

| 서비스 | 포트 | URL |
|--------|------|-----|
| Functions | 5001 | http://127.0.0.1:5001 |
| Firestore | 8080 | http://127.0.0.1:8080 |
| Storage | 9199 | http://127.0.0.1:9199 |
| Auth | 9099 | http://127.0.0.1:9099 |
| UI | 4000 | http://127.0.0.1:4000 |

## 📊 테스트 체크리스트

### Emulator 실행
- [ ] `firebase emulators:start` 성공
- [ ] Functions 초기화 확인
- [ ] UI 접속 확인

### Functions 실행
- [ ] `releaseCheck()` 실행 성공
- [ ] `generateReleaseNotes()` 실행 성공

### Firestore 확인
- [ ] `releaseChecks/latest` 문서 생성
- [ ] `releaseNotes/latest` 문서 생성

### UI 확인
- [ ] Emulator UI에서 문서 확인
- [ ] 관리자 대시보드에서 ReleaseBoard 표시

## 🐛 문제 해결

### Emulator가 시작되지 않을 때

1. **포트 충돌 확인**
   ```bash
   netstat -ano | findstr :5001
   ```

2. **다른 포트 사용**
   ```json
   "functions": {
     "port": 5002
   }
   ```

### Functions가 초기화되지 않을 때

1. **빌드 확인**
   ```bash
   cd functions
   npm run build
   ```

2. **타입 오류 확인**
   - Step 32 파일들은 타입 오류 없음
   - 다른 파일들의 오류는 무시 가능 (emulator에서는 실행 가능)

### Firestore 연결 오류

1. **Emulator 설정 확인**
   ```typescript
   connectFirestoreEmulator(db, '127.0.0.1', 8080);
   ```

2. **환경 변수 확인**
   ```bash
   # .env.local
   NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true
   ```

## ✅ 예상 결과

### 릴리즈 체크 성공 시:
```json
{
  "ok": true,
  "data": {
    "total": 100,
    "errors": 0,
    "errorRate": "0.00",
    "sloMet": true,
    "errorBudget": "1.00",
    "errorBudgetUsed": "0.00"
  }
}
```

### 릴리즈 노트 생성 성공 시:
```json
{
  "ok": true,
  "note": "# 릴리즈 노트\n\n## 주요 개선사항\n..."
}
```

## 🎯 다음 단계

1. **Emulator 시작**: `firebase emulators:start`
2. **Functions 테스트**: `firebase functions:shell`
3. **UI 확인**: `http://127.0.0.1:4000`
4. **관리자 대시보드 확인**: 로컬 React 앱

Emulator를 사용하면 타입 오류 없이 Step 32 함수들을 테스트할 수 있습니다! 🚀

