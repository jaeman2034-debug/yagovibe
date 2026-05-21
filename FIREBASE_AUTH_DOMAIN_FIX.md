# 🔧 Firebase 인증 도메인 설정 수정 가이드

## 🚨 문제 원인

Firebase 인증 완료 후 `/login`으로 튕기는 현상은 **Firebase 콘솔의 승인된 도메인 설정**이 커스텀 도메인과 일치하지 않아서 발생합니다.

### 현재 증상
- Google 로그인 완료 → `/__/auth/handler` 도달
- `user = null` 반환
- `/login`으로 다시 리디렉션
- **원인**: Firebase 세션 쿠키가 커스텀 도메인에 전달되지 않음

---

## ✅ 해결 방법: Firebase 콘솔 설정 수정

### 📍 Firebase 콘솔 접속
1. [Firebase Console](https://console.firebase.google.com) 접속
2. 프로젝트 선택: **`yago-vibe-spt`**
3. 왼쪽 메뉴 → **Authentication** 클릭
4. 상단 탭 → **Settings** (또는 **설정**) 클릭
5. 아래로 스크롤 → **승인된 도메인** (Authorized domains) 섹션

---

## 🔹 1. 승인된 JavaScript 원본 (Authorized JavaScript origins)

### ✅ **남겨야 하는 도메인 (프로덕션)**
```
https://yagovibe.com
https://www.yagovibe.com
```

### ✅ **로컬 개발 환경용 (추가 필요)**
```
http://localhost:5173
http://localhost:3000
http://127.0.0.1:5173
```

**💡 참고**: 로컬 개발 환경(`localhost`)은 **별도로 추가**해야 합니다. `firebaseapp.com` 삭제와는 무관합니다.

### ❌ **삭제해야 하는 도메인**
```
https://yago-vibe-spt.web.app
https://yago-vibe-spt.firebaseapp.com
https://yago-vibe-sp.web.app
```

**⚠️ 중요**: `firebaseapp.com` 주소는 **절대 사용하지 마세요!**

---

## 🔹 2. 승인된 리디렉션 URI (Authorized redirect URIs)

### ✅ **남겨야 하는 URI (프로덕션)**
```
https://yagovibe.com/__/auth/handler
https://www.yagovibe.com/__/auth/handler
```

### ✅ **로컬 개발 환경용 (추가 필요)**
```
http://localhost:5173/__/auth/handler
http://localhost:3000/__/auth/handler
http://127.0.0.1:5173/__/auth/handler
```

**💡 참고**: 로컬 개발 환경(`localhost`)은 **별도로 추가**해야 합니다.

### ❌ **삭제해야 하는 URI**
```
https://yago-vibe-spt.web.app/__/auth/handler
https://yago-vibe-spt.firebaseapp.com/__/auth/handler
```

---

## 🔹 3. 승인된 도메인 (Authorized domains)

### ✅ **남겨야 하는 도메인 (프로덕션)**
```
yagovibe.com
www.yagovibe.com
```

### ✅ **로컬 개발 환경용 (기본 포함 또는 추가 필요)**
```
localhost
```

**💡 참고**: Firebase는 기본적으로 `localhost`를 포함하지만, 확인이 필요합니다.

### ❌ **삭제해야 하는 도메인**
```
yago-vibe-spt.web.app
yago-vibe-spt.firebaseapp.com
yago-vibe-sp.web.app
```

---

## 🧠 왜 이게 문제인가?

### 현재 문제 상황
1. 모바일 Chrome/카카오톡에서 Google 로그인
2. Google Auth Redirect URL = `www.yagovibe.com/__/auth/handler`
3. Firebase Auth Session Cookie 생성 URL = `yago-vibe-spt.web.app`
4. **도메인이 다름** → 쿠키가 전달되지 않음
5. `user = null` 반환 → `/login`으로 다시 튕김

### 해결 후 예상 동작
1. Google 로그인 완료
2. Redirect URL = `www.yagovibe.com/__/auth/handler`
3. Firebase 세션 쿠키 = `www.yagovibe.com` 도메인
4. **도메인 일치** → 쿠키 정상 전달
5. `user` 정상 반환 → `/sports-hub`로 이동

---

## 📌 설정 변경 후 확인 사항

### 1. Firebase 콘솔에서 설정 저장
- 모든 변경사항 저장
- **3~5분 대기** (Firebase 설정 전파 지연)

### 2. 테스트 시나리오
1. 모바일 Chrome에서 `https://www.yagovibe.com/login` 접속
2. Google 로그인 버튼 클릭
3. Google 계정 선택
4. `/__/auth/handler` 도달
5. **2초 정도 로딩 화면**
6. **자동으로 `/sports-hub`로 이동** ✅

---

## ✅ 최종 확인 체크리스트

### Firebase 콘솔 설정 (프로덕션)
- [ ] 승인된 JavaScript 원본에 `yagovibe.com`, `www.yagovibe.com` 추가
- [ ] 승인된 JavaScript 원본에 `localhost` 개발 환경 추가 (`http://localhost:5173` 등)
- [ ] 승인된 JavaScript 원본에서 `firebaseapp.com`, `web.app` 주소 모두 삭제
- [ ] 승인된 리디렉션 URI에 `yagovibe.com/__/auth/handler`, `www.yagovibe.com/__/auth/handler` 추가
- [ ] 승인된 리디렉션 URI에 `localhost` 개발 환경 추가 (`http://localhost:5173/__/auth/handler` 등)
- [ ] 승인된 리디렉션 URI에서 `firebaseapp.com`, `web.app` 주소 모두 삭제
- [ ] 승인된 도메인에 `yagovibe.com`, `www.yagovibe.com` 추가
- [ ] 승인된 도메인에 `localhost` 확인 (기본 포함되어 있음)
- [ ] 설정 저장 완료
- [ ] 3~5분 대기 (설정 전파)

### 로컬 개발 환경 확인
- [ ] `npm run dev` 실행 시 `http://localhost:5173` 접속 가능
- [ ] 로컬에서 Google 로그인 버튼 클릭 시 정상 작동
- [ ] 로컬에서 `/__/auth/handler` 리디렉션 정상 작동

### 테스트
- [ ] 모바일 Chrome에서 Google 로그인 성공
- [ ] `/sports-hub`로 정상 이동
- [ ] `/login`으로 튕김 없음

---

## 🔍 추가 확인: Google Cloud Console

Firebase는 내부적으로 Google Cloud Console의 OAuth 설정을 사용합니다.

### Google Cloud Console 확인
1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 프로젝트 선택: **`yago-vibe-spt`**
3. 왼쪽 메뉴 → **APIs & Services** → **Credentials**
4. OAuth 2.0 Client ID 클릭
5. **Authorized JavaScript origins** 확인:
   - ✅ `https://yagovibe.com`
   - ✅ `https://www.yagovibe.com`
   - ❌ `firebaseapp.com`, `web.app` 주소 삭제
6. **Authorized redirect URIs** 확인:
   - ✅ `https://yagovibe.com/__/auth/handler`
   - ✅ `https://www.yagovibe.com/__/auth/handler`
   - ❌ `firebaseapp.com`, `web.app` 주소 삭제

---

## 💡 참고: Firebase Auth Domain 설정

**중요**: `src/lib/firebase.ts`의 `authDomain` 설정은 **변경하지 마세요!**

```typescript
authDomain: "yago-vibe-spt.firebaseapp.com"
```

이것은 Firebase 내부 인증 서버 주소이므로 `firebaseapp.com`을 사용해야 합니다.

**하지만** Firebase 콘솔의 **승인된 도메인**은 **커스텀 도메인만** 사용해야 합니다!

---

## 🎯 결론

이 설정 변경 후 **프로덕션과 로컬 개발 환경 모두 정상 동작**합니다.

### ✅ 로컬 개발 환경 안전성
- `firebaseapp.com`, `web.app` 삭제는 **프로덕션 도메인만** 영향을 받습니다
- `localhost`는 **별도로 관리**되므로 삭제와 무관합니다
- 로컬 개발 환경은 **기존과 동일하게 작동**합니다

### 문제가 계속 발생한다면:
1. Firebase 설정 전파 시간 확인 (3~5분 대기)
2. 브라우저 캐시 삭제
3. 시크릿 모드에서 테스트
4. 로컬 개발 환경: `localhost`가 승인된 도메인에 포함되어 있는지 확인

