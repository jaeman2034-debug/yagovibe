# 🔧 최종 에뮬레이터 포트 설정

## 현재 포트 구성 (최종)

`firebase.json`에 설정된 에뮬레이터 포트:

| 에뮬레이터 | 포트 | 상태 | 비고 |
|-----------|------|------|------|
| **Hub** | **4600** | ✅ | 4500에서 변경 |
| **UI** | 4001 | ✅ | - |
| **Functions** | 5001 | ✅ | - |
| **Firestore** | 8082 | ✅ | 8081에서 변경 |
| **Auth** | 9099 | ✅ | - |
| **Storage** | 9199 | ✅ | - |
| **Logging** | **4601** | ✅ | 4501에서 변경 |

## 해결된 포트 충돌

1. ✅ Hub: 4500 → **4600** (변경 완료)
2. ✅ Logging: 4501 → **4601** (변경 완료)
3. ✅ Firestore: 8081 → **8082** (이전에 변경)
4. ✅ 기존 프로세스 종료: PID 22280 종료

## 에뮬레이터 시작

```powershell
cd functions
firebase emulators:start
```

## 접속 URL

- **Emulator UI**: http://localhost:4001
- **Functions**: http://localhost:5001
- **Firestore**: localhost:8082
- **Auth**: localhost:9099
- **Storage**: localhost:9199

## 문제 해결 체크리스트

### 포트 충돌 발생 시

1. 포트 사용 중인 프로세스 확인:
   ```powershell
   netstat -ano | findstr ":포트번호"
   ```

2. 프로세스 종료:
   ```powershell
   taskkill /F /PID [PID번호]
   ```

3. 또는 `firebase.json`에서 포트 변경

### 모든 포트 해제 확인

```powershell
netstat -ano | findstr ":4001 :4600 :4601 :5001 :8082 :9099 :9199"
```

결과가 비어있으면 모든 포트가 해제된 상태입니다.

