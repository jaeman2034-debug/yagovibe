# 🔧 프로덕션/로컬 환경 완전 분리 가이드

## ✅ 목표

프로덕션 테스트 시:
- ❌ 에뮬레이터 완전 차단
- ✅ 프로덕션 Firebase만 사용
- ✅ 혼선 제거

---

## 1️⃣ 환경 변수 설정

### 프로덕션 테스트용 (`.env.local`)

```env
# Firebase 설정
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=yago-vibe-spt.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=yago-vibe-spt
VITE_FIREBASE_STORAGE_BUCKET=yago-vibe-spt.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

# 🔥 에뮬레이터 완전 비활성화 (프로덕션 테스트)
VITE_USE_AUTH_EMULATOR=false
VITE_USE_FIRESTORE_EMULATOR=false
VITE_USE_FUNCTIONS_EMULATOR=false

# 🔥 프로덕션 모드 강제
VITE_USE_PRODUCTION=true
```

### 로컬 개발용 (에뮬레이터 사용 시)

```env
# Firebase 설정 (동일)
VITE_FIREBASE_API_KEY=AIzaSy...
...

# 🔥 에뮬레이터 활성화
VITE_USE_AUTH_EMULATOR=true
VITE_USE_FIRESTORE_EMULATOR=true
VITE_USE_FUNCTIONS_EMULATOR=true

# 🔥 프로덕션 모드 비활성화
VITE_USE_PRODUCTION=false
```

---

## 2️⃣ Functions Region 확인

### 프론트 (`src/lib/firebase.ts`)

```typescript
// ✅ 반드시 region 명시
functions = getFunctions(app, "asia-northeast3");
```

### Functions (`functions/src/feePayment.ts`)

```typescript
// ✅ 동일한 region 사용
export const processFeePaymentCallable = onCall(
  {
    region: "asia-northeast3", // ✅ 일치 필수
    cors: true,
  },
  async (request) => { ... }
);
```

---

## 3️⃣ 에뮬레이터 완전 차단 확인

### 브라우저 콘솔에서 확인

```javascript
// Functions region 확인
getFirebaseFunctions().region
// 예상: "asia-northeast3"

// 에뮬레이터 연결 여부 확인
// (직접 확인 방법은 없지만, 로그로 확인 가능)
```

### 콘솔 로그 확인

프로덕션 모드일 때:
```
✅ [firebase.ts] 프로덕션 모드 - Functions Emulator 연결 안 함
✅ [firebase.ts] Functions는 프로덕션(asia-northeast3) 사용
```

에뮬레이터 모드일 때:
```
✅ [firebase.ts] Functions Emulator 연결 완료 (127.0.0.1:5001)
⚠️ [firebase.ts] 주의: 에뮬레이터 모드입니다!
```

---

## 4️⃣ 테스트 체크리스트

### 프로덕션 테스트 전

- [ ] `.env.local`에 `VITE_USE_*_EMULATOR=false` 설정
- [ ] `VITE_USE_PRODUCTION=true` 설정
- [ ] 에뮬레이터 완전 종료 (`firebase emulators:start` 중단)
- [ ] 프론트 재시작 (`npm run dev`)
- [ ] 브라우저 완전 새로고침 (`Ctrl + Shift + R`)

### Functions 호출 시

- [ ] 브라우저 콘솔에서 Functions region 로그 확인
- [ ] `functions region: asia-northeast3` 확인
- [ ] `프로덕션 모드` 로그 확인

### Functions 로그 확인

```bash
firebase functions:log --only processFeePaymentCallable
```

**예상 로그:**
```
🔥 [processFeePaymentCallable] ========== 시작 ==========
🔥 [processFeePaymentCallable] request.data: {...}
🔥 [processFeePaymentCallable] auth uid: ...
```

---

## 5️⃣ 문제 해결

### 문제: "No log entries found"

**원인:**
- Functions가 실행되지 않음
- 에뮬레이터/프로덕션 혼선

**해결:**
1. `.env.local` 확인
2. 에뮬레이터 완전 종료
3. 프론트 재시작
4. 브라우저 완전 새로고침

### 문제: "internal" 에러

**원인:**
- Region 불일치
- Auth 토큰 불일치

**해결:**
1. Functions region 확인 (`asia-northeast3`)
2. 프론트 Functions region 확인
3. 완전 로그아웃 후 재로그인

---

## 6️⃣ 환경 전환 스크립트 (선택)

### 프로덕션 모드로 전환

```bash
# .env.local 수정
echo "VITE_USE_AUTH_EMULATOR=false" > .env.local
echo "VITE_USE_FIRESTORE_EMULATOR=false" >> .env.local
echo "VITE_USE_FUNCTIONS_EMULATOR=false" >> .env.local
echo "VITE_USE_PRODUCTION=true" >> .env.local

# 프론트 재시작
npm run dev
```

### 에뮬레이터 모드로 전환

```bash
# .env.local 수정
echo "VITE_USE_AUTH_EMULATOR=true" > .env.local
echo "VITE_USE_FIRESTORE_EMULATOR=true" >> .env.local
echo "VITE_USE_FUNCTIONS_EMULATOR=true" >> .env.local
echo "VITE_USE_PRODUCTION=false" >> .env.local

# 에뮬레이터 시작
firebase emulators:start

# 프론트 재시작
npm run dev
```

---

## 🎯 성공 기준

✅ **프로덕션 모드:**
- 콘솔에 "프로덕션 모드" 로그 표시
- Functions region: `asia-northeast3`
- 에뮬레이터 연결 로그 없음
- Functions 로그에 진단 로그 표시

✅ **에뮬레이터 모드:**
- 콘솔에 "에뮬레이터 모드" 로그 표시
- Functions Emulator 연결 로그 표시
- 에뮬레이터 UI 접근 가능

---

**이제 프로덕션/로컬 환경이 완전히 분리되었습니다!** 🎉

