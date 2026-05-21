# 🔥 로그인 오류 해결 가이드

## ❌ 에러: `auth/invalid-credential`

### 가능한 원인

1. **프로덕션 모드인데 사용자가 프로덕션에 없음**
   - Emulator에서만 계정 생성
   - 프로덕션 Firebase에 계정 없음

2. **실제로 비밀번호가 틀림**
   - 비밀번호 오타
   - 비밀번호 변경됨

3. **Firebase Auth 설정 문제**
   - Emulator/Production 모드 혼용
   - authDomain 설정 오류

4. **브라우저 캐시/스토리지 문제**
   - 이전 세션 토큰 충돌
   - 로컬 스토리지 오염

---

## ✅ 해결 방법

### 1️⃣ Firebase Console에서 사용자 확인

**프로덕션 모드인 경우:**
1. [Firebase Console](https://console.firebase.google.com/project/yago-vibe-spt/authentication/users) 접속
2. Authentication > Users에서 `jaeman2034@gmail.com` 확인
3. 없으면 → 계정 생성 필요
4. 있으면 → 비밀번호 재설정

**Emulator 모드인 경우:**
1. Firebase Emulator UI 접속: `http://localhost:4000`
2. Authentication에서 사용자 확인
3. 없으면 → 계정 생성 필요

---

### 2️⃣ 환경 변수 확인

`.env.local` 파일 확인:

```bash
VITE_USE_EMULATOR=false  # 프로덕션 모드
# 또는
VITE_USE_EMULATOR=true   # Emulator 모드
```

**프로덕션 모드로 전환:**
1. `.env.local` 파일 생성/수정
2. `VITE_USE_EMULATOR=false` 설정
3. 브라우저 완전 새로고침 (`Ctrl + Shift + R`)
4. 브라우저 스토리지 초기화 (아래 참고)

---

### 3️⃣ 브라우저 스토리지 초기화

**완전 초기화 (권장):**

1. DevTools 열기 (`F12`)
2. Application 탭
3. Storage 섹션에서:
   - Cookies → 모두 삭제
   - Local Storage → 모두 삭제
   - IndexedDB → 모두 삭제
   - Session Storage → 모두 삭제
4. 완전 새로고침 (`Ctrl + Shift + R`)

**또는 시크릿 모드에서 테스트:**
- `Ctrl + Shift + N` (Chrome)
- 완전히 새로운 세션

---

### 4️⃣ 비밀번호 재설정

**프로덕션 모드:**
1. [Firebase Console](https://console.firebase.google.com/project/yago-vibe-spt/authentication/users) 접속
2. Authentication > Users
3. `jaeman2034@gmail.com` 선택
4. "비밀번호 재설정" 클릭
5. 이메일로 재설정 링크 받기

**또는 직접 비밀번호 설정:**
1. Firebase Console > Authentication > Users
2. 사용자 선택 > "비밀번호 재설정" 또는 직접 수정

---

### 5️⃣ Emulator 모드에서 테스트

**임시 해결책:**

1. `.env.local` 파일 생성:
   ```
   VITE_USE_EMULATOR=true
   ```

2. Firebase Emulator 시작:
   ```bash
   firebase emulators:start --only auth
   ```

3. Emulator UI에서 계정 생성:
   - `http://localhost:4000` 접속
   - Authentication > Add user
   - 이메일: `jaeman2034@gmail.com`
   - 비밀번호: 원하는 비밀번호

4. 브라우저 새로고침 후 로그인

---

## 🔍 디버깅 체크리스트

- [ ] Firebase Console에서 사용자 계정 존재 확인
- [ ] `VITE_USE_EMULATOR` 환경 변수 확인
- [ ] 브라우저 콘솔에서 `authDomain` 확인
- [ ] 브라우저 스토리지 초기화
- [ ] 비밀번호 재설정 시도
- [ ] 시크릿 모드에서 테스트

---

## 📝 콘솔 로그 확인

브라우저 콘솔에서 다음 로그 확인:

```
🔍 [firebase.ts] Firebase Auth 설정: {
  authDomain: "yago-vibe-spt.firebaseapp.com" (프로덕션)
  또는
  authDomain: "localhost" (Emulator)
}
```

**authDomain이 프로덕션인데 사용자가 없으면:**
→ Firebase Console에서 계정 생성 또는 비밀번호 재설정

**authDomain이 localhost인데 사용자가 없으면:**
→ Emulator UI에서 계정 생성

---

**작성일**: 2024년  
**상태**: ✅ 해결 가이드 완료

