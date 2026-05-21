# 🔧 에뮬레이터 포트 설정

## 현재 포트 구성

`firebase.json`에 설정된 에뮬레이터 포트:

| 에뮬레이터 | 포트 | 상태 |
|-----------|------|------|
| Hub | 4500 | ✅ |
| UI | 4001 | ✅ |
| Functions | 5001 | ✅ |
| Firestore | 8082 | ✅ (8081에서 변경) |
| Auth | 9099 | ✅ |
| Storage | 9199 | ✅ |
| Logging | 4501 | ✅ |

## 포트 충돌 해결 방법

### 방법 1: 기존 프로세스 종료 (권장)

```powershell
# 포트 사용 중인 프로세스 확인
netstat -ano | findstr ":포트번호"

# 프로세스 종료
taskkill /F /PID [PID번호]
```

### 방법 2: 포트 변경

`firebase.json`에서 포트 번호를 변경:

```json
"emulators": {
  "firestore": { "port": 8082 }
}
```

## 에뮬레이터 시작

```powershell
cd functions
firebase emulators:start
```

또는 특정 에뮬레이터만:

```powershell
firebase emulators:start --only functions,firestore,auth,storage
```

## 접속 URL

- **Emulator UI**: http://localhost:4001
- **Functions**: http://localhost:5001
- **Firestore**: localhost:8082
- **Auth**: localhost:9099
- **Storage**: localhost:9199

