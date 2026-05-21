# 🔥 Firebase Console HTTPS localhost URI 삭제 가이드

## 🚨 문제 원인

Firebase Console에 `https://localhost/__/auth/handler` 같은 HTTPS URI가 등록되어 있어서, Firebase가 Google OAuth 후 HTTPS로 리디렉션하려고 시도합니다.

하지만 localhost는 HTTPS를 지원하지 않기 때문에 `ERR_CONNECTION_REFUSED` 오류가 발생합니다.

## ✅ 해결 방법 (3분 완료)

### 1️⃣ Firebase Console 접속

1. https://console.firebase.google.com 접속
2. 프로젝트: **yago-vibe-spt** 선택
3. 왼쪽 메뉴 → **Authentication** 클릭
4. 상단 탭 → **Sign-in method** 클릭
5. **Google** 제공업체 클릭
6. **Authorized redirect URIs** 섹션 확인

### 2️⃣ HTTPS localhost URI 삭제

다음 URI들을 **모두 삭제**하세요:

```
❌ https://localhost/__/auth/handler
❌ https://localhost:5173/__/auth/handler
❌ https://127.0.0.1/__/auth/handler
❌ https://127.0.0.1:5173/__/auth/handler
```

### 3️⃣ HTTP URI만 유지

다음 URI들만 **유지**하세요:

```
✅ http://localhost:5173/__/auth/handler
✅ http://127.0.0.1:5173/__/auth/handler
```

### 4️⃣ 저장 및 브라우저 캐시 삭제

1. Firebase Console에서 **저장** 클릭
2. 브라우저 캐시 삭제:
   - **Chrome/Edge**: `Ctrl+Shift+Delete` → 캐시 삭제
   - 또는 시크릿 모드로 테스트
3. 개발 서버 재시작:
   ```bash
   npm run dev
   ```

## 🧪 테스트 확인

1. `http://localhost:5173/login` 접속 (HTTP 확인!)
2. "G 구글로 로그인" 버튼 클릭
3. Google 로그인 완료
4. `/sports-hub`로 정상 이동 확인
5. 로그인 상태 유지 (튕김 없음)

## 📋 최종 Authorized redirect URIs 목록

### 개발 환경 (localhost)
```
http://localhost:5173/__/auth/handler
http://127.0.0.1:5173/__/auth/handler
```

### 프로덕션 환경
```
https://yago-vibe-spt.firebaseapp.com/__/auth/handler
https://yago-vibe-spt.web.app/__/auth/handler
https://yagovibe.com/__/auth/handler
https://www.yagovibe.com/__/auth/handler
```

## ⚠️ 중요 사항

- **절대 HTTPS localhost URI를 추가하지 마세요!**
- localhost는 HTTP만 지원합니다
- Firebase Console 설정이 코드보다 우선순위가 높습니다

