# 🔥 Firebase 에뮬레이터 설정 가이드

## ✅ 완료된 설정

### 1. 자동 에뮬레이터 연결
- `src/lib/firebase.ts`에서 localhost 감지 시 자동으로 에뮬레이터 연결
- 환경 변수 설정 불필요

### 2. 에뮬레이터 포트 설정
- Auth: `localhost:9099`
- Firestore: `localhost:8084`
- Functions: `localhost:5001`

## 🚀 에뮬레이터 실행 방법

### STEP 1: 에뮬레이터 시작

터미널에서 프로젝트 루트에서 실행:

```bash
firebase emulators:start --only auth,firestore,functions
```

정상 실행 시 콘솔에 표시:
```
✔  All emulators ready!
i  Emulator UI logging to http://localhost:4001
✔  Auth Emulator running at http://localhost:9099
✔  Firestore Emulator running at http://localhost:8084
✔  Functions Emulator running at http://localhost:5001
```

### STEP 2: 프론트엔드 개발 서버 시작

**새 터미널**에서:

```bash
npm run dev
```

### STEP 3: 브라우저 접속

`https://localhost:5173` 접속

## 🎯 기대되는 효과

### ✅ 해결되는 문제
- ❌ `securetoken.googleapis.com` 차단 에러 완전 제거
- ❌ `Missing or insufficient permissions` 에러 제거
- ❌ `functions/internal` 에러 제거
- ✅ Auth 토큰 갱신 문제 해결
- ✅ 모든 Callable 함수 정상 작동

### ✅ 정상 동작 확인
1. 로그인 (에뮬레이터에서 자동 생성 가능)
2. 팀원 등록 시작 버튼 클릭 → 즉시 성공
3. 조 추첨 실행 → 정상 작동
4. 브라켓 생성 → 정상 작동
5. 경기 결과 입력 → 정상 작동
6. 결승 완료 → 정상 작동

## 🔧 에뮬레이터 관리자 계정 설정

### 방법 1: Emulator UI에서 생성
1. `http://localhost:4001` 접속
2. Authentication 탭
3. "Add user" 클릭
4. 이메일/비밀번호 입력
5. Custom claims에서 `adminUids` 설정 (선택)

### 방법 2: 코드로 자동 생성
에뮬레이터 실행 후 자동으로 관리자 계정 생성 (선택 사항)

## 📝 참고 사항

- 에뮬레이터는 **로컬에서만** 작동
- 배포 환경에는 영향 없음
- 에뮬레이터 데이터는 `firebase-debug.log`에 저장됨
- 에뮬레이터 종료: `Ctrl+C`

## 🐛 문제 해결

### 에뮬레이터 연결 실패
- 에뮬레이터가 실행 중인지 확인
- 포트가 사용 중인지 확인: `netstat -ano | findstr :9099`

### Functions 에뮬레이터 타임아웃
- Functions 빌드 확인: `cd functions && npm run build`
