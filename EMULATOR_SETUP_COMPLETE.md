# 🔥 Firebase Emulator 설정 완료 (ALL or NOTHING)

## ✅ 완료된 작업

### 1️⃣ 환경 변수 통합
- **기존**: `VITE_USE_AUTH_EMULATOR`, `VITE_USE_FIRESTORE_EMULATOR`, `VITE_USE_FUNCTIONS_EMULATOR` (3개)
- **개선**: `VITE_USE_EMULATOR` (1개) - **ALL or NOTHING 원칙**

### 2️⃣ Emulator 연결 코드 통합
- **위치**: `src/lib/firebase.ts`
- **원칙**: `VITE_USE_EMULATOR=true`이면 Auth/Firestore/Functions 모두 Emulator 연결
- **원칙**: `VITE_USE_EMULATOR=false`이면 모두 프로덕션 사용

---

## 🚀 사용 방법

### .env.local 파일 설정
```bash
# Emulator 모드 활성화
VITE_USE_EMULATOR=true
```

### Firebase Emulator Suite 실행
```bash
firebase emulators:start
```

### 개발 서버 재시작
```bash
# 1. 서버 완전 종료
Ctrl + C

# 2. 다시 실행
npm run dev
```

### 브라우저 쿠키 삭제
1. DevTools 열기 (F12)
2. Application 탭
3. Cookies / Local Storage 전부 삭제
4. 새로고침 (Ctrl + Shift + R)
5. 다시 로그인

---

## 🔍 Emulator 연결 확인

### 콘솔 로그 확인
정상 연결 시 다음 로그가 표시됩니다:
```
🔥 [firebase.ts] Firebase Emulator Mode 활성화
🔥 [firebase.ts] ALL Emulator 연결 시작 (Auth + Firestore + Functions)
✅ [firebase.ts] Auth Emulator 연결 완료 (http://localhost:9099)
✅ [firebase.ts] Firestore Emulator 연결 완료 (localhost:8084)
✅ [firebase.ts] Functions Emulator 연결 완료 (localhost:5001)
🔥 [firebase.ts] Firebase Emulator Mode 완전 활성화
```

---

## ⚠️ 중요 사항

### ❌ 절대 하면 안 되는 상태
- Auth → Emulator
- Firestore → Prod
- Functions → Prod

이 조합은 "호스트 바뀐 것 같다"는 현상을 유발합니다.

### ✅ 올바른 상태
**옵션 1: 모두 Emulator**
- Auth → Emulator (localhost:9099)
- Firestore → Emulator (localhost:8084)
- Functions → Emulator (localhost:5001)

**옵션 2: 모두 프로덕션**
- Auth → 프로덕션
- Firestore → 프로덕션
- Functions → 프로덕션

---

## 🧪 테스트 체크리스트

- [ ] `.env.local`에 `VITE_USE_EMULATOR=true` 설정
- [ ] `firebase emulators:start` 실행 중
- [ ] 개발 서버 재시작 (`npm run dev`)
- [ ] 브라우저 쿠키/로컬 스토리지 삭제
- [ ] 콘솔에서 "Firebase Emulator Mode 완전 활성화" 로그 확인
- [ ] 로그인 테스트 (Emulator Auth 사용)
- [ ] 데이터 읽기/쓰기 테스트 (Emulator Firestore 사용)
- [ ] Functions 호출 테스트 (Emulator Functions 사용)

---

## 📝 문제 해결

### 문제: "호스트 바뀐 것 같다" 에러
**원인**: 일부만 Emulator로 연결됨
**해결**:
1. `.env.local`에서 `VITE_USE_EMULATOR=true` 확인
2. 개발 서버 재시작
3. 브라우저 쿠키 삭제

### 문제: Emulator 연결 안 됨
**원인**: Firebase Emulator Suite가 실행되지 않음
**해결**:
```bash
firebase emulators:start
```

### 문제: 로그인 실패
**원인**: 이전 프로덕션 토큰이 남아있음
**해결**:
1. 브라우저 쿠키/로컬 스토리지 삭제
2. 새로고침 (Ctrl + Shift + R)
3. 다시 로그인

---

**작성일**: 2024년
**상태**: ✅ 완료

