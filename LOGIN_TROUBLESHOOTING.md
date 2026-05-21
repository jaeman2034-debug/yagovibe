# 🔧 로그인 실패 문제 해결 가이드

## 🚨 즉시 해결 방법

### 1️⃣ 브라우저 스토리지 완전 정리 (필수)

**이전 Emulator 토큰과 프로덕션 토큰 충돌이 가장 흔한 원인입니다.**

#### 단계별 정리 방법:

1. **DevTools 열기**
   - `F12` 또는 `Ctrl + Shift + I`

2. **Application 탭 선택**
   - 왼쪽 사이드바에서 "Application" 클릭

3. **모든 스토리지 삭제**
   - **Cookies** → `http://localhost:5173` → 우클릭 → "Clear"
   - **Local Storage** → `http://localhost:5173` → 우클릭 → "Clear"
   - **Session Storage** → `http://localhost:5173` → 우클릭 → "Clear"
   - **IndexedDB** → Firebase 관련 항목 모두 삭제

4. **완전 새로고침**
   - `Ctrl + Shift + R` (캐시 무시 새로고침)
   - 또는 DevTools → Network 탭 → "Disable cache" 체크 → 새로고침

5. **다시 로그인 시도**

---

### 2️⃣ Firebase Auth 설정 확인

#### 콘솔에서 확인할 로그:
```
🔍 [Login] Firebase Auth 설정:
  authDomain: "yago-vibe-spt.firebaseapp.com" (프로덕션)
  projectId: "yago-vibe-spt"
  apiKey: "AIzaSy..."
```

**주의**: `authDomain`이 `localhost`이면 안 됩니다 (프로덕션 모드).

---

### 3️⃣ 환경 변수 확인

#### .env.local 파일 확인:
```bash
# 프로덕션 모드 (Emulator 사용 안 함)
VITE_USE_EMULATOR=false

# 또는 변수 자체를 설정하지 않음 (기본값: false)
```

---

## 🔍 에러 코드별 해결 방법

### `auth/user-not-found` 또는 `auth/wrong-password`
- **원인**: 이메일 또는 비밀번호가 잘못됨
- **해결**: 이메일/비밀번호 확인

### `auth/invalid-email`
- **원인**: 이메일 형식이 잘못됨
- **해결**: 올바른 이메일 형식 입력

### `auth/too-many-requests`
- **원인**: 너무 많은 로그인 시도
- **해결**: 잠시 후 다시 시도

### `auth/network-request-failed`
- **원인**: 네트워크 연결 문제
- **해결**: 인터넷 연결 확인

### `auth/invalid-credential`
- **원인**: 이메일/비밀번호 불일치 또는 계정 삭제됨
- **해결**: 이메일/비밀번호 확인 또는 계정 복구

### `auth/operation-not-allowed`
- **원인**: Firebase Console에서 이 로그인 방법이 비활성화됨
- **해결**: Firebase Console → Authentication → Sign-in method 확인

### 알 수 없는 에러
- **원인**: 브라우저 스토리지 충돌 또는 Firebase 설정 문제
- **해결**: 
  1. 브라우저 스토리지 완전 정리
  2. 개발 서버 재시작
  3. 콘솔에서 에러 코드 확인

---

## 🧪 디버깅 체크리스트

### 콘솔에서 확인할 항목:

1. **Firebase 초기화 로그**
   ```
   🚀 [firebase.ts] 프로덕션 모드 활성화
   ✅ Auth: 프로덕션
   ✅ Firestore: 프로덕션
   ✅ Functions: 프로덕션 (asia-northeast3)
   ```

2. **로그인 시도 로그**
   ```
   🔍 [Login Debug] 로그인 Credential 확인
   📧 이메일: ...
   🔒 비밀번호: ...
   ```

3. **에러 로그**
   ```
   ❌ [Login] 로그인 실패: ...
   ❌ [Login] 에러 코드: ...
   ❌ [Login] 에러 메시지: ...
   ```

---

## 🚀 추가 해결 방법

### 방법 1: 시크릿 모드에서 테스트
- `Ctrl + Shift + N` (Chrome) 또는 `Ctrl + Shift + P` (Firefox)
- 시크릿 모드에서 로그인 시도
- 성공하면 → 브라우저 스토리지 문제 확정

### 방법 2: 다른 브라우저에서 테스트
- Chrome → Firefox 또는 Edge
- 성공하면 → 브라우저별 설정 문제

### 방법 3: 개발 서버 재시작
```bash
# 서버 완전 종료
Ctrl + C

# 다시 실행
npm run dev
```

---

## 📝 문제 해결 후 확인 사항

- [ ] 로그인 성공
- [ ] 콘솔에 "✅ [Login] 이메일 로그인 성공" 로그 표시
- [ ] 프로덕션 Auth로 정상 인증
- [ ] 다음 글 생성 기능 정상 작동

---

**작성일**: 2024년
**상태**: ✅ 해결 가이드 완료

