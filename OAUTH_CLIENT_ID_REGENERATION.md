# 🔄 OAuth 2.0 클라이언트 ID 재생성 가이드

## 🎯 목적

무한 루프 문제 해결을 위한 OAuth 2.0 클라이언트 ID 완전 재생성 및 클린업

## ⚠️ 중요 사항

이 작업은 Google Cloud Console에서 수동으로 수행해야 합니다.

## 📝 단계별 가이드

### 1단계: 기존 OAuth 2.0 클라이언트 ID 삭제

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com/
   - 프로젝트: `yago-vibe-spt` 선택

2. **APIs & Services → Credentials 이동**
   - 왼쪽 메뉴: APIs & Services → Credentials
   - 또는 직접 링크: https://console.cloud.google.com/apis/credentials?project=yago-vibe-spt

3. **웹 애플리케이션 클라이언트 ID 찾기**
   - "OAuth 2.0 Client IDs" 섹션에서
   - 타입이 "Web application"인 클라이언트 ID 찾기
   - 이름은 보통 "Web client (auto created by Google Service)" 또는 유사한 이름

4. **클라이언트 ID 삭제**
   - 해당 클라이언트 ID 옆의 **삭제 아이콘(휴지통)** 클릭
   - 확인 대화상자에서 "삭제" 확인

### 2단계: 새 OAuth 2.0 클라이언트 ID 생성

1. **+ CREATE CREDENTIALS 클릭**
   - "OAuth client ID" 선택

2. **애플리케이션 유형 선택**
   - "Application type": **Web application** 선택

3. **이름 설정**
   - "Name": `YAGO VIBE Web Client` (또는 원하는 이름)

4. **승인된 JavaScript 원본 추가**
   - "Authorized JavaScript origins" 섹션
   - **+ ADD URI** 클릭하여 다음만 추가:
     ```
     http://localhost:5173
     ```
   - ⚠️ **주의**: 다른 포트(5174, 5000 등)는 추가하지 않음

5. **승인된 리디렉션 URI 추가**
   - "Authorized redirect URIs" 섹션
   - **+ ADD URI** 클릭하여 다음만 추가:
     ```
     http://localhost:5173/__/auth/handler
     ```
   - ⚠️ **주의**: 
     - 다른 포트는 추가하지 않음
     - `/__/auth/handler` 형식 확인 (언더스코어 2개)

6. **CREATE 클릭**
   - 새 클라이언트 ID가 생성됨
   - **클라이언트 ID**와 **클라이언트 시크릿**이 표시됨

### 3단계: Firebase Console에서 클라이언트 ID 업데이트

1. **Firebase Console 접속**
   - https://console.firebase.google.com/
   - 프로젝트: `yago-vibe-spt` 선택

2. **Authentication → Sign-in method 이동**
   - 왼쪽 메뉴: Authentication → Sign-in method
   - 또는 직접 링크: https://console.firebase.google.com/project/yago-vibe-spt/authentication/providers

3. **Google 로그인 설정 편집**
   - "Google" 제공업체 클릭
   - "Web SDK configuration" 섹션에서
   - **Web client ID**: 새로 생성한 클라이언트 ID 입력
   - **Web client secret**: 새로 생성한 클라이언트 시크릿 입력
   - **SAVE** 클릭

### 4단계: 배포 도메인 추가 (선택사항)

프로덕션 환경을 사용하는 경우, 다음도 추가해야 합니다:

**승인된 JavaScript 원본:**
```
https://yago-vibe-spt.web.app
https://yago-vibe-spt.firebaseapp.com
https://yagovibe.com
https://www.yagovibe.com
```

**승인된 리디렉션 URI:**
```
https://yago-vibe-spt.web.app/__/auth/handler
https://yago-vibe-spt.firebaseapp.com/__/auth/handler
https://yagovibe.com/__/auth/handler
https://www.yagovibe.com/__/auth/handler
```

### 5단계: 변경사항 적용 대기

- Google Cloud Console 설정 변경은 **최소 5-10분** 정도 전파 시간이 필요합니다
- Firebase Console 설정 변경은 **즉시 적용**됩니다

### 6단계: 테스트

1. **개발 서버 재시작**
   ```bash
   npm run dev
   ```

2. **브라우저 캐시 완전 삭제**
   - 개발자 도구 (F12) → Application 탭
   - Storage → Clear site data
   - 모든 항목 선택 후 Clear site data 클릭

3. **시크릿 모드에서 테스트**
   - 시크릿 모드 (Ctrl + Shift + N)
   - `http://localhost:5173/login` 접속
   - Google 로그인 테스트
   - 무한 루프 없이 정상적으로 `/sports-hub`로 이동하는지 확인

## ✅ 체크리스트

- [ ] 기존 OAuth 2.0 클라이언트 ID 삭제 완료
- [ ] 새 OAuth 2.0 클라이언트 ID 생성 완료
- [ ] 승인된 JavaScript 원본에 `http://localhost:5173`만 추가
- [ ] 승인된 리디렉션 URI에 `http://localhost:5173/__/auth/handler`만 추가
- [ ] Firebase Console에서 클라이언트 ID 업데이트 완료
- [ ] 개발 서버 재시작 완료
- [ ] 브라우저 캐시 삭제 완료
- [ ] 시크릿 모드에서 테스트 완료

## 🔍 문제 해결

### 클라이언트 ID를 찾을 수 없는 경우

- Firebase Console → Project Settings → General → Your apps
- 웹 앱의 "SDK setup and configuration" 섹션에서 클라이언트 ID 확인

### 여전히 무한 루프가 발생하는 경우

1. **AuthProvider.tsx의 useEffect 의존성 배열 확인**
   - `[]` (비어있음)인지 확인
   - `[navigate]` 또는 `[location.pathname]`이 있으면 제거

2. **브라우저 개발자 도구 콘솔 확인**
   - 무한 루프 관련 에러 메시지 확인
   - 네트워크 탭에서 반복되는 요청 확인

3. **Firebase Console → Authentication → Settings 확인**
   - "Authorized domains"에 `localhost`가 포함되어 있는지 확인

## 📚 참고 자료

- [Firebase Authentication 문서](https://firebase.google.com/docs/auth)
- [Google OAuth 2.0 문서](https://developers.google.com/identity/protocols/oauth2)

