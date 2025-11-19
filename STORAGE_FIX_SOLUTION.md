# 🔧 Storage 에뮬레이터 문제 해결

## ❌ 현재 문제

Storage 에뮬레이터가 시작되지 않습니다.

## 🔍 원인

1. `storage.rules` 파일이 없거나 문제가 있을 수 있음
2. 에뮬레이터가 Storage를 포함하지 않고 시작되었을 수 있음
3. 포트 충돌 가능성

## ✅ 해결 방법

### 방법 1: storage.rules 파일 확인 및 생성

`storage.rules` 파일이 없으면 생성:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 방법 2: 에뮬레이터 재시작 (Storage 명시)

```bash
# 현재 에뮬레이터 종료 (Ctrl+C)
# 그 다음 Storage를 명시적으로 포함해서 시작:
firebase emulators:start --only storage,firestore,auth,functions
```

### 방법 3: firebase.json 설정 확인

Storage 설정이 올바른지 확인하고, 필요하면 수정:

```json
{
  "storage": {
    "rules": "storage.rules"
  },
  "emulators": {
    "storage": {
      "port": 9199
    }
  }
}
```

## 🚀 즉시 실행

1. **storage.rules 파일 확인**
2. **에뮬레이터 재시작** (Storage 포함)
3. **Emulator UI에서 확인**

