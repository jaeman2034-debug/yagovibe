# ⚡ Fast Fix 체크리스트 (5분 해결)

## 🎯 최종 결론

팝업 로그인 실패 → fallback handler 출력으로 발생하는 오류는 다음 조건이 충족될 때 해결됩니다:

- ✔ 타사 쿠키 허용
- ✔ popup / redirect 허용
- ✔ Service Worker 제거
- ✔ opener 차단되는 정책 OFF
- ✔ 모든 origin을 Google 콘솔에 정확히 등록
- ✔ HTTP/HTTPS 불일치 제거 (가능한 HTTPS 통일)

## ✅ 즉시 실행할 Fast Fix (5분 해결)

### 1️⃣ 브라우저에서 다음 3개 다 clear

#### 쿠키 삭제
1. `Ctrl + Shift + Delete` 누르기
2. **"쿠키 및 기타 사이트 데이터"** 체크
3. **"지난 4주"** 또는 **"전체 기간"** 선택
4. **"데이터 삭제"** 클릭

#### 캐시 삭제
1. `Ctrl + Shift + Delete` 누르기
2. **"캐시된 이미지 및 파일"** 체크
3. **"지난 4주"** 또는 **"전체 기간"** 선택
4. **"데이터 삭제"** 클릭

#### Service Worker 제거
1. 주소창에 입력: `chrome://serviceworker-internals/`
2. `yagovibe.com`, `yago-vibe-spt.firebaseapp.com` 관련 Service Worker 찾기
3. 각각 **"Unregister"** 클릭
4. 또는 **F12 → Application → Service Workers**에서 Unregister

### 2️⃣ 타사 쿠키 허용

#### Chrome 설정
1. 주소창에 입력: `chrome://settings/cookies`
2. **"타사 쿠키 차단"** 해제
3. 또는 **"사이트가 쿠키 데이터를 저장할 수 있도록 허용"** 체크

#### Edge 설정
1. 주소창에 입력: `edge://settings/cookies`
2. **"타사 쿠키 차단"** 해제
3. 또는 **"사이트가 쿠키 데이터를 저장할 수 있도록 허용"** 체크

### 3️⃣ Popup 허용

#### Chrome 설정
1. 주소창에 입력: `chrome://settings/content/popups`
2. **"팝업 및 리디렉션"** 섹션에서
3. **"사이트에서 팝업 및 리디렉션을 보낼 수 있도록 허용"** 체크
4. 또는 **"차단됨"** 목록에서 `yagovibe.com`, `firebaseapp.com` 제거

#### Edge 설정
1. 주소창에 입력: `edge://settings/content/popups`
2. **"팝업 및 리디렉션"** 섹션에서
3. **"사이트에서 팝업 및 리디렉션을 보낼 수 있도록 허용"** 체크

### 4️⃣ yagovibe.com, firebaseapp.com 모두 허용 도메인 등록

#### Firebase Console
1. Firebase Console 접속: https://console.firebase.google.com
2. 프로젝트 선택: `yago-vibe-spt`
3. **Authentication → Settings** 탭
4. **"Authorized domains"** 섹션 확인
5. 다음 도메인들이 모두 포함되어 있는지 확인:
   - `yagovibe.com`
   - `www.yagovibe.com`
   - `yago-vibe-spt.firebaseapp.com`
   - `yago-vibe-spt.web.app`
   - `localhost` (개발용)

#### Google Cloud Console
1. Google Cloud Console 접속: https://console.cloud.google.com
2. 프로젝트 선택: `yago-vibe-spt`
3. **APIs & Services → Credentials**
4. OAuth 2.0 클라이언트 ID 클릭
5. **"승인된 JavaScript 원본"** 섹션 확인
6. 다음 URL들이 모두 포함되어 있는지 확인:
   - `https://yagovibe.com`
   - `https://www.yagovibe.com`
   - `https://yago-vibe-spt.firebaseapp.com`
   - `https://yago-vibe-spt.web.app`
   - `http://localhost:5173` (개발용)

### 5️⃣ Edge 말고 Chrome의 시크릿 아닌 기본 창으로 로그인 시도

#### Chrome 기본 창 사용
1. **Edge 브라우저 닫기**
2. **Chrome 브라우저 열기**
3. **시크릿 모드가 아닌 일반 창 사용**
4. `https://yago-vibe-spt.firebaseapp.com/login` 접속
5. "G 구글로 로그인" 버튼 클릭

#### 이유
- Edge는 일부 보안 정책이 더 엄격할 수 있음
- 시크릿 모드는 쿠키/캐시가 없어서 일부 기능이 제한될 수 있음
- Chrome 기본 창이 가장 안정적

## 🔥 추가 확인 사항

### opener 차단되는 정책 OFF
- 브라우저 확장 프로그램 확인
- 팝업 차단 확장 프로그램 비활성화
- 보안 소프트웨어의 팝업 차단 기능 확인

### HTTP/HTTPS 불일치 제거
- 모든 URL이 `https://`로 시작하는지 확인
- `http://`와 `https://` 혼용하지 않기
- 가능한 모든 곳에서 HTTPS 통일

## 📋 체크리스트

- [ ] 쿠키 삭제 완료
- [ ] 캐시 삭제 완료
- [ ] Service Worker 제거 완료
- [ ] 타사 쿠키 허용 완료
- [ ] Popup 허용 완료
- [ ] Firebase Console - Authorized domains 확인 완료
- [ ] Google Cloud Console - 승인된 JavaScript 원본 확인 완료
- [ ] Chrome 기본 창으로 로그인 시도 완료

## ✅ 완료 후 테스트

1. Chrome 기본 창 열기
2. `https://yago-vibe-spt.firebaseapp.com/login` 접속
3. F12 → Network 탭, Preserve log 체크
4. "G 구글로 로그인" 버튼 클릭
5. 정상 작동 확인

## 💡 이 패턴으로 많은 Firebase OAuth 오류가 바로 해결됩니다!

