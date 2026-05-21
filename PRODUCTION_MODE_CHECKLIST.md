# 🚀 프로덕션 모드 체크리스트

## ✅ 완료된 작업

### 1️⃣ Emulator 연결 코드 조건문 확인
- ✅ **위치**: `src/lib/firebase.ts`
- ✅ **상태**: 모든 Emulator 연결 코드가 `if (useEmulator)` 조건문 안에만 존재
- ✅ **변수 스코프**: `useEmulator` 변수를 상위 스코프로 이동하여 모든 서비스에서 접근 가능

### 2️⃣ 프로덕션 모드 기본값
- ✅ **기본값**: `VITE_USE_EMULATOR`가 없으면 `false` (프로덕션 모드)
- ✅ **체크 방식**: `=== "true"`로 엄격하게 비교

---

## 🔍 코드 검증 결과

### ✅ Emulator 연결 코드 위치
```typescript
// 상위 스코프에서 정의
const useEmulator = import.meta.env.VITE_USE_EMULATOR === "true";

// Auth 초기화 블록
if (useEmulator) {
  connectAuthEmulator(auth, "http://localhost:9099");
}

// Firestore 초기화 블록
if (useEmulator && ...) {
  connectFirestoreEmulator(db, "localhost", 8084);
}

// Functions 초기화 블록
if (useEmulator && ...) {
  connectFunctionsEmulator(functions, "localhost", 5001);
}
```

**결론**: 모든 Emulator 연결 코드가 조건문 안에만 존재 ✅

---

## 📋 최종 체크리스트

### ✅ 필수 확인 사항

- [x] **코드 검증**: Emulator 연결 코드가 조건문 안에만 존재
- [ ] **환경 변수**: `.env.local`에 `VITE_USE_EMULATOR=false` 또는 미설정
- [ ] **Firebase Emulator Suite**: 꺼도 됨 (프로덕션 모드)
- [ ] **브라우저 스토리지 초기화**: Cookies/LocalStorage/IndexedDB 전부 삭제
- [ ] **로그인 테스트**: 프로덕션 Auth로 정상 로그인
- [ ] **다음 글 생성 테스트**: 프로덕션 Functions로 정상 작동
- [ ] **자동 스케줄**: 프로덕션에서만 실행 (Emulator 아님)

---

## 🧹 브라우저 스토리지 정리 방법

### 1. DevTools 열기
- `F12` 또는 `Ctrl + Shift + I`

### 2. Application 탭 선택
- 왼쪽 사이드바에서 "Application" 클릭

### 3. 스토리지 삭제
다음 항목을 모두 삭제:
- **Cookies** → `http://localhost:5173` → 모두 삭제
- **Local Storage** → `http://localhost:5173` → 모두 삭제
- **IndexedDB** → Firebase 관련 항목 → 모두 삭제
- **Session Storage** → `http://localhost:5173` → 모두 삭제

### 4. 새로고침
- `Ctrl + Shift + R` (캐시 무시 새로고침)

### 5. 다시 로그인
- 프로덕션 Auth로 새로 로그인

---

## 🔍 프로덕션 모드 확인 방법

### 콘솔 로그 확인
정상 작동 시 다음 로그가 표시됩니다:
```
🚀 [firebase.ts] 프로덕션 모드 활성화
✅ Auth: 프로덕션
✅ Firestore: 프로덕션
✅ Functions: 프로덕션 (asia-northeast3)
```

**주의**: "Firebase Emulator Mode" 로그가 보이면 안 됩니다.

---

## ⚠️ 중요 사항

### ❌ Emulator 사용 시 문제점
- **Auth**: 실제 사용자 계정 검증 불가
- **스케줄러**: Emulator에서 의미 없음
- **Rate Limit**: 운영 데이터와 분리됨
- **비용 추적**: 전부 왜곡됨
- **로그인**: "호스트 바뀐 것 같은 증상" 발생

### ✅ 프로덕션 모드 사용 이유
- 실제 사용자 계정으로 검증 가능
- 실제 데이터로 스케줄러 테스트
- 실제 Rate Limit 적용
- 정확한 비용 추적
- 안정적인 로그인

---

## 🚀 다음 단계

1. **브라우저 스토리지 정리** (필수)
2. **개발 서버 재시작** (필수)
3. **로그인 테스트** (프로덕션 Auth)
4. **다음 글 생성 테스트** (프로덕션 Functions)
5. **자동 스케줄러 확인** (프로덕션에서만 실행)

---

**작성일**: 2024년
**상태**: ✅ 코드 검증 완료

