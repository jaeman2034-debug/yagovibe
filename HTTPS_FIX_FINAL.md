# 🔥 HTTPS localhost 문제 최종 해결 가이드

## ✅ 완료된 코드 수정

다음 파일들이 수정되었습니다:

1. **`src/lib/firebase.ts`**
   - 개발 환경에서 `auth.useDeviceLanguage()` 추가
   - HTTPS 감지 및 경고 로그 추가
   - HTTP origin 강제 확인

2. **`src/pages/LoginPage.tsx`**
   - HTTPS 프로토콜 감지 시 에러 메시지 표시
   - HTTP origin 강제 확인
   - Redirect URI 로깅 강화

3. **`src/pages/AuthRedirectHandler.tsx`**
   - `/__/auth/handler` 접근 시 HTTPS → HTTP 자동 리다이렉트
   - HTTP origin 확인

## 📋 필수 설정: .env.local 파일

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```env
VITE_FIREBASE_AUTH_DOMAIN=localhost
```

### .env.local 파일 생성 방법

1. 프로젝트 루트 디렉토리(`yago-vibe-spt/`)에서 `.env.local` 파일 생성
2. 위 내용 추가
3. 개발 서버 재시작:
   ```bash
   npm run dev
   ```

## 🔥 Firebase Console 설정 (필수!)

Firebase Console에서 HTTPS localhost URI를 **반드시 삭제**해야 합니다.

### 단계별 가이드

1. **Firebase Console 접속**
   - https://console.firebase.google.com
   - 프로젝트: **yago-vibe-spt** 선택

2. **Authentication → Sign-in method → Google**
   - **Authorized redirect URIs** 섹션 확인

3. **삭제할 URI (HTTPS localhost)**
   ```
   ❌ https://localhost/__/auth/handler
   ❌ https://localhost:5173/__/auth/handler
   ❌ https://127.0.0.1/__/auth/handler
   ❌ https://127.0.0.1:5173/__/auth/handler
   ```

4. **유지할 URI (HTTP만)**
   ```
   ✅ http://localhost:5173/__/auth/handler
   ✅ http://127.0.0.1:5173/__/auth/handler
   ```

5. **저장 후 브라우저 캐시 삭제**
   - Chrome/Edge: `Ctrl+Shift+Delete` → 캐시 삭제
   - 또는 시크릿 모드로 테스트

## 🧪 테스트 확인

### 1. 개발 서버 시작
```bash
npm run dev
```

### 2. HTTP로 접속 확인
- ✅ `http://localhost:5173/login` (올바름)
- ❌ `https://localhost:5173/login` (오류 발생)

### 3. Google 로그인 테스트
1. "G 구글로 로그인" 버튼 클릭
2. Google 로그인 완료
3. `/sports-hub`로 정상 이동 확인
4. 로그인 상태 유지 (튕김 없음)

## 🔍 동작 흐름

```
1. 카카오톡에서 링크 열림 → intent로 Chrome 이동
2. Chrome: http://localhost:5173
3. Firebase Google 로그인 시작
4. Firebase Redirect → http://localhost:5173/__/auth/handler
5. AuthRedirectHandler에서 HTTPS 감지 시 → http://localhost:5173/__/auth/handler로 리다이렉트
6. getRedirectResult 처리 → /sports-hub로 이동
7. 로그인 성공 유지! ✅
```

## ⚠️ 중요 사항

- **절대 HTTPS localhost URI를 Firebase Console에 추가하지 마세요!**
- localhost는 HTTP만 지원합니다
- Firebase Console 설정이 코드보다 우선순위가 높습니다
- `.env.local` 파일은 Git에 커밋하지 마세요 (`.gitignore`에 포함되어 있음)

## 🐛 문제 해결

### 여전히 HTTPS로 리다이렉트되는 경우

1. **브라우저 캐시 완전 삭제**
   - `Ctrl+Shift+Delete` → "캐시된 이미지 및 파일" 선택 → 삭제

2. **시크릿 모드로 테스트**
   - Chrome: `Ctrl+Shift+N`
   - Edge: `Ctrl+Shift+P`

3. **Firebase Console 재확인**
   - HTTPS localhost URI가 정말 삭제되었는지 확인

4. **개발 서버 재시작**
   ```bash
   npm run dev
   ```

## ✅ 완료 체크리스트

- [ ] `.env.local` 파일 생성 및 `VITE_FIREBASE_AUTH_DOMAIN=localhost` 추가
- [ ] Firebase Console에서 HTTPS localhost URI 삭제
- [ ] HTTP URI만 유지 (`http://localhost:5173/__/auth/handler`)
- [ ] 브라우저 캐시 삭제
- [ ] 개발 서버 재시작
- [ ] `http://localhost:5173/login`으로 접속 확인
- [ ] Google 로그인 테스트 성공 확인

