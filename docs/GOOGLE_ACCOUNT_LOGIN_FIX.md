# 🔥 Google 계정 로그인 문제 해결

## ❌ 문제

Firebase Console에서 사용자 계정의 **Provider가 Google**입니다.

Google OAuth로 가입한 계정은 **이메일/비밀번호로 로그인할 수 없습니다**.

---

## ✅ 해결 방법

### 방법 1: Google 로그인 버튼 사용 (권장)

1. 로그인 페이지에서 **"G 구글로 로그인"** 버튼 클릭
2. Google 계정 선택
3. 로그인 완료

**이미 구현되어 있음** ✅

---

### 방법 2: Firebase Console에서 비밀번호 추가

Google 계정에 비밀번호를 추가하면 이메일/비밀번호로도 로그인 가능합니다.

1. [Firebase Console](https://console.firebase.google.com/project/yago-vibe-spt/authentication/users) 접속
2. Authentication > Users
3. `jaeman2034@gmail.com` 선택
4. "비밀번호" 섹션에서 "비밀번호 추가" 클릭
5. 비밀번호 설정
6. 이메일/비밀번호로 로그인 가능

---

### 방법 3: 새 계정 생성 (이메일/비밀번호)

1. 로그인 페이지에서 **"회원가입"** 클릭
2. 이메일: `jaeman2034@gmail.com` (또는 다른 이메일)
3. 비밀번호 설정
4. 이메일/비밀번호로 로그인 가능

**주의**: 같은 이메일로 두 계정이 생성될 수 있습니다 (Google 계정 + 이메일 계정)

---

## 🔍 확인 사항

Firebase Console에서:
- **Provider**: Google → Google 로그인 사용
- **Provider**: Password → 이메일/비밀번호 로그인 사용

---

## 📝 에러 메시지 개선

이제 `auth/invalid-credential` 에러 발생 시:
- "이 계정은 Google 로그인으로 가입되었습니다. '구글로 로그인' 버튼을 사용해주세요."

라는 메시지가 표시됩니다.

---

**작성일**: 2024년  
**상태**: ✅ 해결 방법 완료

