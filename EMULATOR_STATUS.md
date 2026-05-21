# ✅ 에뮬레이터 실행 상태

## 현재 실행 중인 에뮬레이터

| 에뮬레이터 | 상태 | 포트 | 접속 URL |
|-----------|------|------|----------|
| **Authentication** | ✅ On | 9099 | http://localhost:9099 |
| **Firestore** | ✅ On | 8082 | http://localhost:8082 |
| **Storage** | ✅ On | 9199 | http://localhost:9199 |
| **Functions** | ✅ On | 5001 | http://localhost:5001 |
| **Extensions** | ✅ On | 5001 | http://localhost:5001 |
| **Hosting** | ✅ On | - | - |

## 비활성화된 에뮬레이터 (정상)

| 에뮬레이터 | 상태 | 비고 |
|-----------|------|------|
| **PubSub** | ❌ Off | 필요 시 활성화 가능 |
| **Realtime Database** | ❌ Off | 필요 시 활성화 가능 |

## Emulator UI

- **URL**: http://localhost:4001 (또는 http://127.0.0.1:4001)
- **상태**: ✅ 정상 작동

## 다음 단계

### 1. 개발 환경 설정

프론트엔드에서 에뮬레이터 연결:

```typescript
// src/lib/firebase.ts
if (import.meta.env.DEV) {
  connectFirestoreEmulator(db, 'localhost', 8082);
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectStorageEmulator(storage, 'localhost', 9199);
  connectFunctionsEmulator(functions, 'localhost', 5001);
}
```

### 2. 테스트 데이터 생성

Firestore Emulator UI에서:
1. http://localhost:4001 → Firestore 탭
2. 컬렉션 생성 및 테스트 데이터 추가

### 3. Functions 테스트

Functions Emulator UI에서:
1. http://localhost:4001 → Functions 탭
2. 로그 확인 및 함수 호출 테스트

## 문제 해결

### 에뮬레이터가 중단될 때

```powershell
# 포트 확인
netstat -ano | findstr ":4001 :5001 :8082 :9099 :9199"

# 프로세스 종료 후 재시작
cd functions
firebase emulators:start
```

### 포트 충돌 시

`firebase.json`에서 포트 변경:

```json
"emulators": {
  "firestore": { "port": 8082 },
  "auth": { "port": 9099 },
  "storage": { "port": 9199 },
  "functions": { "port": 5001 },
  "ui": { "port": 4001 }
}
```

