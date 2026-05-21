# 🔥 개발 모드 Google 로그인 비활성화 완료

## 문제
- ❌ Auth Emulator + Google Provider 조합에서 `ERR_CONNECTION_REFUSED` 발생
- ❌ Google OAuth는 실제 Google 서버를 호출해야 하는데 Emulator는 가짜 서버
- ❌ `localhost/_/auth/handler`를 처리할 서버가 없음

## 해결 방법

### ✅ 완료된 수정

1. **LoginPage.tsx**
   - 개발 환경(localhost)에서 Google 로그인 버튼 비활성화
   - 대신 안내 메시지 표시: "⚠️ 개발 모드: Google 로그인은 Email/Password만 사용 가능"

2. **SignupPage.tsx**
   - 개발 환경에서 Google 로그인 버튼 비활성화
   - 클릭 시 에러 메시지 표시

3. **firestore.rules**
   - 임시로 모든 접근 허용 (`allow read, write: if true`)
   - 에뮬레이터 테스트용

---

## 사용 방법

### STEP 1: 에뮬레이터 재시작

```powershell
firebase emulators:stop
firebase emulators:start
```

### STEP 2: 브라우저 새로고침 (Hard Reload)

- Chrome: `Ctrl + Shift + R`
- 또는 개발자 도구(F12) → Network 탭 → "Disable cache" 체크 → 새로고침

### STEP 3: Email/Password로 로그인

1. **회원가입 (처음이면)**
   - Email/Password로 계정 생성
   - Auth Emulator UI에서 확인 가능

2. **로그인**
   - 생성한 Email/Password로 로그인
   - Google 로그인 버튼은 비활성화되어 있음

---

## 예상 결과

### ✅ 정상 작동
- Email/Password 로그인 정상
- 공지사항 표시 (데이터가 있으면)
- 관리자 권한 정상 판단
- 토너먼트 목록 표시
- 조 추첨 이후 단계 정상

### ✅ 에러 사라짐
- `ERR_CONNECTION_REFUSED` 사라짐
- `Error compiling rules` 사라짐
- 콘솔에 Firestore 쿼리 성공 로그

---

## 다음 단계

기능이 정상 작동하면:
1. ✅ Firestore rules 정식 버전 다시 짜주기
2. ✅ Auth Emulator + Email 계정 자동 생성 스크립트
3. ✅ 모바일/PC 공통 로그인 전략 정리
4. ✅ 공지사항 seed 스크립트 바로 생성

---

## 참고

- **프로덕션 환경**: Google 로그인 정상 작동
- **개발 환경**: Email/Password만 사용 (Auth Emulator 제한)
- **실제 Google 로그인 테스트**: Auth Emulator 끄고 프로덕션 Firebase 사용
