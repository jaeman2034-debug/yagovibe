# 🔧 에뮬레이터 포트 설정 (최종 수정)

## 최종 포트 구성

`firebase.json`에 설정된 모든 에뮬레이터 포트:

| 에뮬레이터 | 포트 | 상태 | 변경 이력 |
|-----------|------|------|----------|
| **Hub** | **4600** | ✅ | 4500 → 4600 |
| **UI** | 4001 | ✅ | - |
| **Functions** | 5001 | ✅ | - |
| **Firestore** | **8083** | ✅ | 8081 → 8082 → 8083 |
| **Auth** | 9099 | ✅ | - |
| **Storage** | **9200** | ✅ | 9199 → 9200 |
| **Hosting** | **5002** | ✅ | 명시적 포트 추가 |
| **Logging** | **4601** | ✅ | 4501 → 4601 |

## 해결된 포트 충돌

1. ✅ Hub: 4500 → **4600**
2. ✅ Logging: 4501 → **4601**
3. ✅ Firestore: 8081 → 8082 → **8083**
4. ✅ Storage: 9199 → **9200**
5. ✅ Hosting: **5002** (명시적 포트 추가)
6. ✅ 모든 충돌 프로세스 종료 완료

## 에뮬레이터 시작

```powershell
cd functions
firebase emulators:start
```

## 접속 URL

- **Emulator UI**: http://localhost:4001
- **Functions**: http://localhost:5001
- **Firestore**: localhost:8083
- **Auth**: localhost:9099
- **Storage**: localhost:9200 (변경됨!)
- **Hosting**: localhost:5002

## 프론트엔드 연결 설정

프론트엔드 코드에서 Storage 포트를 업데이트하세요:

```typescript
// src/lib/firebase.ts
if (import.meta.env.DEV) {
  connectFirestoreEmulator(db, 'localhost', 8083);
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectStorageEmulator(storage, 'localhost', 9200); // 포트 변경됨!
  connectFunctionsEmulator(functions, 'localhost', 5001);
}
```

## 포트 충돌 해결 방법

### 1. 포트 사용 중인 프로세스 확인

```powershell
netstat -ano | findstr ":포트번호"
```

### 2. 프로세스 종료

```powershell
taskkill /F /PID [PID번호]
```

### 3. 또는 포트 변경

`firebase.json`에서 포트 번호 변경

## 모든 포트 해제 확인

```powershell
netstat -ano | findstr ":4001 :4600 :4601 :5001 :5002 :8083 :9099 :9200"
```

결과가 비어있으면 모든 포트가 해제된 상태입니다.

