# 🔧 로그인 문제 해결 가이드

## 📌 현재 상황

**에러 메시지**:
> "이 계정은 Google 로그인으로 가입되었습니다. '구글로 로그인' 버튼을 사용해주세요."

**문제**:
- `test@test.com` 계정이 Google 로그인으로 가입됨
- Email/Password로는 로그인 불가
- Auth Emulator에서는 Google 로그인이 제한적

---

## ✅ 해결 방법 (3가지)

### 방법 1: Auth Emulator에서 Email/Password 계정 생성 (권장 ⭐)

**가장 간단하고 빠른 방법**

#### STEP 1: Auth Emulator UI에서 계정 생성

1. **Auth Emulator UI 열기**
   - `http://localhost:4001` 접속
   - Authentication 탭 클릭

2. **새 사용자 추가**
   - "Add user" 버튼 클릭
   - **Email**: `test@test.com` (또는 다른 이메일)
   - **Password**: 원하는 비밀번호 입력
   - **Provider**: Email/Password 선택
   - "Add" 클릭

3. **기존 Google 계정 삭제 (선택사항)**
   - 기존 `test@test.com` 계정이 있다면 삭제
   - 또는 다른 이메일 사용

#### STEP 2: 로그인 페이지에서 로그인

1. **로그인 페이지로 이동**
2. **이메일/비밀번호 입력**
   - Email: `test@test.com` (또는 새로 생성한 이메일)
   - Password: Auth Emulator에서 설정한 비밀번호
3. **"로그인" 버튼 클릭**

---

### 방법 2: Google 로그인 사용 (제한적)

**주의**: Auth Emulator에서는 Google 로그인이 제대로 작동하지 않을 수 있음

1. **"구글로 로그인" 버튼 클릭**
2. **Google OAuth 팝업에서 로그인**
3. **실제 Google 계정 사용 필요** (Emulator가 아닌 실제 Firebase 프로젝트)

---

### 방법 3: 기존 계정 정보 확인

**이전에 사용하던 계정 정보**:
- Email: `jaeman2034@gmail.com`
- UID: `qGq5XmuXRBsRZ0qJFE0yqtZY5Hin`

#### STEP 1: Auth Emulator에서 해당 계정 확인

1. **Auth Emulator UI 열기**
   - `http://localhost:4001` → Authentication → Users
2. **`qGq5XmuXRBsRZ0qJFE0yqtZY5Hin` 사용자 확인**
3. **Provider 확인**
   - Email/Password인지 Google인지 확인

#### STEP 2: Email/Password로 변경 (필요시)

1. **기존 계정 삭제**
2. **새로 Email/Password 계정 생성**
   - Email: `jaeman2034@gmail.com`
   - Password: 원하는 비밀번호
   - UID는 자동 생성됨 (다를 수 있음)

---

## 🔍 확인 절차

### 1. Auth Emulator 확인
- [ ] `http://localhost:4001` → Authentication → Users
- [ ] 사용자 목록 확인
- [ ] Provider 확인 (Email/Password vs Google)

### 2. 로그인 테스트
- [ ] Email/Password로 로그인 시도
- [ ] 에러 메시지 확인
- [ ] 로그인 성공 여부 확인

### 3. 로그인 후 확인
- [ ] 대회 등록 페이지로 이동
- [ ] 콘솔에서 `userUid` 확인
- [ ] `userUid`가 `undefined`가 아닌지 확인

---

## 💬 권장 해결 방법

**가장 빠른 방법**: Auth Emulator UI에서 Email/Password 계정 생성

1. `http://localhost:4001` → Authentication → Add user
2. Email: `test@test.com` (또는 원하는 이메일)
3. Password: 설정
4. Provider: Email/Password
5. 로그인 페이지에서 로그인

---

## 🎯 다음 단계

로그인 성공 후:
1. **대회 등록 페이지로 이동**
2. **콘솔에서 `userUid` 확인**
   - `userUid`가 정상적으로 표시되는지 확인
3. **Firestore에 권한 데이터 추가**
   - `associations/assoc-nowon-football.ownerUid` 추가
   - `associations/assoc-nowon-football/members/{userUid}` 생성

---

## ⚠️ 주의사항

- **Auth Emulator에서는 Google 로그인이 제한적**
- **Email/Password 계정 사용 권장**
- **실제 Firebase 프로젝트에서는 Google 로그인 정상 작동**
