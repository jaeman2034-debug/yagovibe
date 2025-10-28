# ✅ Emulator 포트 5003 설정 완료

## ✅ 완료된 작업

### 1️⃣ firebase.json 포트 수정
- ✅ Functions: 5003으로 변경
- ✅ UI: enabled

## 🎯 최종 설정

### firebase.json
```json
{
  "emulators": {
    "functions": {
      "host": "127.0.0.1",
      "port": 5003
    },
    "ui": {
      "enabled": true
    }
  }
}
```

## 🚀 에뮬레이터 실행

### 명령어
```bash
cd ..
firebase emulators:start --only functions
```

### 또는 npm run dev
```bash
cd functions
npm run dev
```

## 📊 RT access URL

- Functions: http://127.0.0.1:5003
- UI: (자동 할당)

## ✨ 예상 결과

```
✔ functions[generateWeeklyReportJob]: scheduled function initialized (http://127.0.0.1:5003)
✔ functions[notifyWeeklyReport]: scheduled function initialized (http://127.0.0.1:5003)
✔ All emulators ready!
View Emulator UI at http://127.0.0.1:4000
```

## 📝 함수 목록

### Schedule 함수
1. generateWeeklyReportJob - 매주 월요일 09:00
2. notifyWeeklyReport - 매주 월요일 09:05

---

**🎉 Emulator 포트 5003 설정 완료!**

포트 충돌 없이 에뮬레이터가 시작됩니다! 🔥✨

