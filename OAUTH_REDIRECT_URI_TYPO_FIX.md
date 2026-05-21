# 🚨 OAuth 리디렉션 URI 오타 발견 및 수정 가이드

## ❌ 발견된 문제

### 현재 설정 (잘못됨)

**승인된 리디렉션 URI**:
- ❌ `http://localhost:5173/_/auth/handler` (언더스코어 1개)
- ❌ `http://localhost:5174/_/auth/handler` (언더스코어 1개)
- ❌ `https://yago-vibe-spt.firebaseapp.com/_/auth/handler` (언더스코어 1개)
- ❌ `https://yago-vibe-spt.web.app/_/auth/handler` (언더스코어 1개)

### 올바른 설정

**승인된 리디렉션 URI** (수정 필요):
- ✅ `http://localhost:5173/__/auth/handler` (언더스코어 2개)
- ✅ `http://localhost:5174/__/auth/handler` (언더스코어 2개)
- ✅ `https://yago-vibe-spt.firebaseapp.com/__/auth/handler` (언더스코어 2개)
- ✅ `https://yago-vibe-spt.web.app/__/auth/handler` (언더스코어 2개)

## 🔥 문제 원인

Firebase Auth는 `/__/auth/handler` (언더스코어 2개) 경로를 사용합니다.

현재 설정은 `/_/auth/handler` (언더스코어 1개)로 되어 있어서:
- Firebase Auth가 리디렉션할 때 올바른 경로를 찾지 못함
- `auth/requests-from-referer-are-blocked` 오류 발생
- OAuth 인증 실패

## ✅ 수정 방법

### Step 1: Google Cloud Console 접속

1. https://console.cloud.google.com 접속
2. 프로젝트 선택: `yago-vibe-spt`
3. **APIs & Services → Credentials**
4. **OAuth 2.0 클라이언트 ID** (웹 클라이언트) 클릭

### Step 2: 리디렉션 URI 수정

**"승인된 리디렉션 URI"** 섹션에서:

1. **기존 URI 수정**:
   - 각 URI의 `/_/auth/handler`를 `__/auth/handler`로 변경
   - 또는 기존 URI 삭제 후 새로 추가

2. **수정할 URI 목록**:
   ```
   ❌ http://localhost:5173/_/auth/handler
   ✅ http://localhost:5173/__/auth/handler
   
   ❌ http://localhost:5174/_/auth/handler
   ✅ http://localhost:5174/__/auth/handler
   
   ❌ https://yago-vibe-spt.firebaseapp.com/_/auth/handler
   ✅ https://yago-vibe-spt.firebaseapp.com/__/auth/handler
   
   ❌ https://yago-vibe-spt.web.app/_/auth/handler
   ✅ https://yago-vibe-spt.web.app/__/auth/handler
   ```

3. **추가로 필요한 URI** (없다면 추가):
   ```
   https://www.yagovibe.com/__/auth/handler
   https://yagovibe.com/__/auth/handler
   https://yagovibe.vercel.app/__/auth/handler
   ```

### Step 3: 저장

1. **"저장"** 버튼 클릭
2. **5분~몇 시간 대기** (설정 적용 시간)
3. 브라우저 새로고침 (Ctrl + Shift + R)
4. 다시 테스트

## 📋 수정 체크리스트

### 승인된 JavaScript 원본 (현재 정상)
- [x] `http://localhost:5173` ✅
- [x] `http://localhost:5174` ✅
- [x] `https://www.yagovibe.com` ✅
- [x] `https://yagovibe.com` ✅
- [x] `https://yagovibe.vercel.app` ✅
- [x] `https://yago-vibe-spt.firebaseapp.com` ✅
- [x] `https://yago-vibe-spt.web.app` ✅

### 승인된 리디렉션 URI (수정 필요)
- [ ] `http://localhost:5173/_/auth/handler` → `http://localhost:5173/__/auth/handler` 수정
- [ ] `http://localhost:5174/_/auth/handler` → `http://localhost:5174/__/auth/handler` 수정
- [ ] `https://yago-vibe-spt.firebaseapp.com/_/auth/handler` → `https://yago-vibe-spt.firebaseapp.com/__/auth/handler` 수정
- [ ] `https://yago-vibe-spt.web.app/_/auth/handler` → `https://yago-vibe-spt.web.app/__/auth/handler` 수정
- [ ] `https://www.yagovibe.com/__/auth/handler` 추가 (없다면)
- [ ] `https://yagovibe.com/__/auth/handler` 추가 (없다면)
- [ ] `https://yagovibe.vercel.app/__/auth/handler` 추가 (없다면)

## ⚠️ 중요 포인트

1. **언더스코어 개수**
   - ❌ `/_/auth/handler` (언더스코어 1개) - 잘못됨
   - ✅ `/__/auth/handler` (언더스코어 2개) - 올바름

2. **경로 정확성**
   - Firebase Auth는 정확히 `/__/auth/handler` 경로를 사용
   - 한 글자라도 틀리면 인증 실패

3. **프로토콜**
   - 로컬: `http://`
   - 프로덕션: `https://`

## ✅ 예상 결과

수정 후:
- ✅ `auth/requests-from-referer-are-blocked` 오류 해결
- ✅ Google 로그인 정상 작동
- ✅ 모든 도메인에서 로그인 가능

## ✅ 완료

이 오타를 수정하면 `auth/requests-from-referer-are-blocked` 오류가 해결됩니다!

