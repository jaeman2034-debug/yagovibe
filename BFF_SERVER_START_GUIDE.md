# 🔥 BFF 서버 시작 가이드

## 📋 현재 상황

- ✅ 서버는 이미 동작 중 (대시보드 화면 표시됨)
- ❌ `npm run dev:bff` 스크립트가 루트에 있지만, `server` 디렉토리에서는 없음

## 🚀 서버 시작 방법

### 방법 1: 루트 디렉토리에서 (권장)

```bash
# 루트 디렉토리에서
npm run dev:bff
```

이 명령은 자동으로 `server` 디렉토리로 이동하여 `npm run dev`를 실행합니다.

### 방법 2: server 디렉토리에서 직접

```bash
# server 디렉토리로 이동
cd server

# 서버 시작
npm run dev
```

### 방법 3: 프론트 + 백엔드 동시 실행

```bash
# 루트 디렉토리에서
npm run dev:all
```

이 명령은 프론트엔드와 백엔드를 동시에 실행합니다.

---

## 📝 실제 스크립트 목록

### 루트 디렉토리 (`package.json`)

- `dev` - 프론트엔드 개발 서버 (포트 5173)
- `dev:bff` - 백엔드 서버 시작 (`cd server && npm run dev`)
- `dev:all` - 프론트 + 백엔드 동시 실행

### server 디렉토리 (`server/package.json`)

- `dev` - 백엔드 개발 서버 (포트 3001)
- `start` - 프로덕션 서버 시작
- `build` - TypeScript 빌드

---

## ✅ 서버 실행 확인

서버가 정상적으로 실행되면 다음 메시지가 표시됩니다:

```
🚀 API Server running on :3001
📡 Health: http://localhost:3001/health
📚 Stories: http://localhost:3001/api/stories
🏆 Leagues: http://localhost:3001/api/leagues
✅ [Firestore Admin] 초기화 완료
```

---

## 🔧 문제 해결

### 문제: `npm run dev:bff` 명령이 작동하지 않음

**해결:**
1. 루트 디렉토리에서 실행했는지 확인
2. 또는 `cd server && npm run dev` 직접 실행

### 문제: 포트 3001이 이미 사용 중

**해결:**
```bash
# Windows PowerShell
netstat -ano | findstr :3001
# 프로세스 ID 확인 후 종료
taskkill /PID [프로세스ID] /F
```

---

## 📌 참고

- 서버는 `server/src/index.ts`에서 시작됩니다
- 포트는 환경 변수 `PORT` 또는 기본값 `3001`을 사용합니다
- Firebase Admin SDK 인증이 필요합니다 (`server/FIREBASE_ADMIN_SETUP.md` 참고)
