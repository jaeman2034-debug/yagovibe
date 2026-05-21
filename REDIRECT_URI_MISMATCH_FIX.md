# 🔧 redirect_uri_mismatch 오류 해결 가이드

## 🚨 오류 메시지
```
400 오류: redirect_uri_mismatch
액세스 차단됨: 이 앱의 요청이 잘못되었습니다
```

## 📌 원인
Google OAuth가 요청한 `redirect_uri`가 Google Cloud Console의 **승인된 리디렉션 URI** 목록에 없어서 발생합니다.

---

## ✅ 해결 방법

### 1️⃣ Google Cloud Console에서 OAuth 설정 확인

#### 접속 경로
1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 프로젝트 선택: **`yago-vibe-spt`**
3. 왼쪽 메뉴 → **APIs & Services** → **Credentials**
4. **OAuth 2.0 Client IDs** 섹션에서 웹 클라이언트 ID 클릭

#### 승인된 리디렉션 URI 확인 및 추가

**✅ 반드시 포함되어야 하는 URI:**
```
https://yagovibe.com/__/auth/handler
https://www.yagovibe.com/__/auth/handler
```

**✅ 로컬 개발 환경용 (추가 필요):**
```
http://localhost:5173/__/auth/handler
http://localhost:3000/__/auth/handler
http://127.0.0.1:5173/__/auth/handler
```

**❌ 삭제해야 하는 URI:**
```
https://yago-vibe-spt.web.app/__/auth/handler
https://yago-vibe-spt.firebaseapp.com/__/auth/handler
```

#### 승인된 JavaScript 원본 확인

**✅ 반드시 포함되어야 하는 원본:**
```
https://yagovibe.com
https://www.yagovibe.com
```

**✅ 로컬 개발 환경용:**
```
http://localhost:5173
http://localhost:3000
http://127.0.0.1:5173
```

**❌ 삭제해야 하는 원본:**
```
https://yago-vibe-spt.web.app
https://yago-vibe-spt.firebaseapp.com
```

---

### 2️⃣ Firebase 콘솔에서도 확인

Firebase는 내부적으로 Google Cloud Console의 OAuth 설정을 사용하지만, Firebase 콘솔에서도 확인이 필요합니다.

#### 접속 경로
1. [Firebase Console](https://console.firebase.google.com) 접속
2. 프로젝트 선택: **`yago-vibe-spt`**
3. 왼쪽 메뉴 → **Authentication** → **Settings** (설정)
4. 아래로 스크롤 → **승인된 도메인** 섹션

#### 승인된 도메인 확인
- ✅ `yagovibe.com`
- ✅ `www.yagovibe.com`
- ✅ `localhost` (로컬 개발용)

---

### 3️⃣ 실제 사용되는 Redirect URI 확인

Firebase의 `signInWithRedirect`는 자동으로 다음 형식의 URI를 사용합니다:
```
https://[authDomain]/__/auth/handler
```

현재 설정 (`src/lib/firebase.ts`):
```typescript
authDomain: "yago-vibe-spt.firebaseapp.com"
```

**하지만** 실제 리디렉션은 **현재 접속한 도메인**을 기준으로 합니다:
- `https://www.yagovibe.com`에서 로그인 → `https://www.yagovibe.com/__/auth/handler`
- `https://yagovibe.com`에서 로그인 → `https://yagovibe.com/__/auth/handler`

---

## 🔍 문제 진단

### 현재 오류가 발생하는 경우

1. **Google Cloud Console에 URI가 없음**
   - `https://www.yagovibe.com/__/auth/handler` 또는
   - `https://yagovibe.com/__/auth/handler`가 목록에 없음

2. **설정 전파 지연**
   - 설정 변경 후 **3-5분 대기** 필요
   - 브라우저 캐시 삭제 필요

3. **잘못된 도메인 사용**
   - `firebaseapp.com` 또는 `web.app` 도메인을 사용 중

---

## ✅ 단계별 해결 체크리스트

### Google Cloud Console
- [ ] OAuth 2.0 Client ID 클릭
- [ ] **승인된 리디렉션 URI**에 다음 추가:
  - `https://yagovibe.com/__/auth/handler`
  - `https://www.yagovibe.com/__/auth/handler`
  - `http://localhost:5173/__/auth/handler` (로컬 개발용)
- [ ] **승인된 JavaScript 원본**에 다음 추가:
  - `https://yagovibe.com`
  - `https://www.yagovibe.com`
  - `http://localhost:5173` (로컬 개발용)
- [ ] `firebaseapp.com`, `web.app` 주소 모두 삭제
- [ ] **저장** 클릭

### Firebase 콘솔
- [ ] Authentication → Settings → 승인된 도메인 확인
- [ ] `yagovibe.com`, `www.yagovibe.com`, `localhost` 포함 확인

### 대기 및 테스트
- [ ] 설정 저장 후 **3-5분 대기** (설정 전파 시간)
- [ ] 브라우저 캐시 삭제 (Ctrl+Shift+Delete)
- [ ] 시크릿 모드에서 테스트
- [ ] Google 로그인 버튼 클릭
- [ ] `redirect_uri_mismatch` 오류가 사라졌는지 확인

---

## 🧪 테스트 방법

### 1. 브라우저 콘솔에서 확인
```javascript
// 현재 도메인 확인
console.log(window.location.origin);
// 예상 결과: https://www.yagovibe.com 또는 https://yagovibe.com

// Firebase Auth Domain 확인
import { auth } from './lib/firebase';
console.log(auth.config.authDomain);
// 예상 결과: yago-vibe-spt.firebaseapp.com
```

### 2. 네트워크 탭에서 확인
1. 브라우저 개발자 도구 (F12) 열기
2. **Network** 탭 선택
3. Google 로그인 버튼 클릭
4. `accounts.google.com` 요청 확인
5. **Request URL**에서 `redirect_uri` 파라미터 확인
6. 이 URI가 Google Cloud Console에 등록되어 있는지 확인

---

## 💡 중요 참고사항

### Firebase Auth Domain vs 실제 Redirect URI

**혼동하지 마세요!**

- **`authDomain`** (`yago-vibe-spt.firebaseapp.com`): Firebase 내부 인증 서버 주소 (변경 불가)
- **실제 Redirect URI**: 현재 접속한 도메인 (`www.yagovibe.com/__/auth/handler`)

Firebase는 현재 접속한 도메인을 기준으로 리디렉션 URI를 생성합니다.

---

## 🎯 최종 확인

설정이 올바르게 되었다면:

1. ✅ Google Cloud Console에 `https://www.yagovibe.com/__/auth/handler` 등록됨
2. ✅ Google Cloud Console에 `https://yagovibe.com/__/auth/handler` 등록됨
3. ✅ `firebaseapp.com`, `web.app` 주소 모두 삭제됨
4. ✅ 설정 저장 후 3-5분 대기
5. ✅ 브라우저 캐시 삭제
6. ✅ Google 로그인 정상 작동

---

## 🚨 여전히 오류가 발생한다면

1. **Google Cloud Console에서 정확한 URI 확인**
   - 네트워크 탭에서 실제 요청된 `redirect_uri` 복사
   - Google Cloud Console에 정확히 동일하게 추가

2. **대소문자 및 슬래시 확인**
   - URI는 대소문자를 구분합니다
   - 마지막 슬래시(`/`)도 중요합니다

3. **다른 OAuth 클라이언트 ID 확인**
   - Firebase는 여러 OAuth 클라이언트를 사용할 수 있습니다
   - 모든 클라이언트에 동일한 URI 추가 필요

4. **Firebase 프로젝트 확인**
   - 올바른 프로젝트 (`yago-vibe-spt`)를 선택했는지 확인

