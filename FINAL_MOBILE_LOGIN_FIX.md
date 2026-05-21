# 🚨 모바일 로그인 튕김 최종 해결 가이드

## 📊 문제 분석 결과

### 현재 상황

1. **코드 레벨 문제**: 해결됨 (캐시 문제 가능성)
   - `detectInAppBrowser is not defined` → 코드 수정 완료
   - `Rendered fewer hooks than expected` → 코드 수정 완료
   - **하지만**: 모바일에서 이전 코드가 캐시되어 로드될 수 있음

2. **환경 설정 문제**: **여전히 남아있음** ⚠️
   - HTTP 리퍼러 제한이 설정되어 있음
   - API 제한사항이 설정되어 있음
   - **이것이 모바일 로그인 튕김의 근본 원인**

### 확인된 API 키

**Firebase Authentication용 Browser key**:
- 키 값: `AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY`
- 현재 상태: **제한이 설정되어 있음** ❌
- 필요 상태: **제한 완전 해제** ✅

## 🎯 최종 해결 방법

### Step 1: Google Cloud Console에서 Browser key 찾기

1. **Google Cloud Console 접속**
   ```
   https://console.cloud.google.com/apis/credentials?project=yago-vibe-spt
   ```

2. **Browser key 찾기**
   - "API 키" 섹션에서 "Browser key (auto created by Firebase)" 찾기
   - 키 값이 `AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY`인지 확인
   - 키 클릭하여 편집 화면으로 이동

### Step 2: 애플리케이션 제한사항 완전 해제

1. **"애플리케이션 제한사항" 섹션 확인**
   - 현재 설정: "HTTP 리퍼러(웹사이트)" 또는 다른 제한
   - 스크린샷에서 6개의 웹사이트 주소가 목록에 남아있음

2. **웹사이트 제한 목록 삭제 (중요!)**
   - "웹사이트 제한사항" 목록에 있는 모든 항목 삭제
   - 각 항목 옆의 체크박스 선택 후 "삭제" 버튼 클릭
   - 또는 목록 전체 선택 후 일괄 삭제

3. **"없음" 선택**
   - "애플리케이션 제한사항" 드롭다운에서 **"없음"** 선택
   - 이렇게 하면 모든 도메인에서 사용 가능

### Step 3: API 제한사항 완전 해제

1. **"API 제한사항" 섹션 확인**
   - 현재 설정: "키 제한" 또는 특정 API만 허용
   - 스크린샷에서 4개의 API가 제한되어 있음

2. **"키 제한 안 함" 선택**
   - "API 제한사항" 드롭다운에서 **"키 제한 안 함"** 선택
   - 이렇게 하면 모든 API 사용 가능

### Step 4: 저장 및 확인

1. **"저장" 버튼 클릭**
   - 화면 하단 또는 상단의 "저장" 버튼 클릭
   - 변경 사항 저장 확인

2. **설정 확인**
   - 저장 후 다시 편집 화면으로 들어가서 확인:
     - "애플리케이션 제한사항": **"없음"** ✅
     - "API 제한사항": **"키 제한 안 함"** ✅
     - "웹사이트 제한사항" 목록: **비어있음** ✅

### Step 5: 대기 및 모바일 캐시 삭제

1. **15분 대기**
   - Google 서버에 설정이 전파되는 시간
   - 최대 15분까지 소요될 수 있음

2. **모바일 브라우저 캐시 완전 삭제**

   **Android (Chrome)**:
   - 설정 → 개인정보 보호 및 보안 → 인터넷 사용 기록 삭제
   - "캐시된 이미지 및 파일" 체크
   - "쿠키 및 기타 사이트 데이터" 체크
   - "삭제" 버튼 클릭

   **iOS (Safari)**:
   - 설정 → Safari → 인터넷 사용 기록 및 웹사이트 데이터 지우기
   - "지우기" 버튼 클릭

   **또는 시크릿 모드 사용**:
   - 새로운 시크릿 창에서 테스트

3. **모바일에서 테스트**
   - `https://www.yagovibe.com/login` 접속
   - Google 로그인 시도
   - 로그인 튕김이 해결되었는지 확인

### Step 6: 코드 캐시 문제 해결 (필요시)

만약 여전히 `detectInAppBrowser is not defined` 오류가 발생한다면:

1. **빌드 캐시 삭제**
   ```bash
   # dist 폴더 삭제
   rm -rf dist
   
   # Vite 캐시 삭제
   rm -rf node_modules/.vite
   
   # 재빌드
   npm run build
   
   # 재배포
   firebase deploy --only hosting
   ```

2. **모바일에서 하드 리프레시**
   - Android: Chrome 메뉴 → "새로고침" 길게 누르기
   - iOS: Safari에서 주소창 길게 누르기 → "새로고침" 선택

## 📝 체크리스트

### Google Cloud Console 설정

- [ ] Google Cloud Console 접속
- [ ] Browser key 찾기 (`AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY`)
- [ ] 키 편집 화면으로 이동
- [ ] "웹사이트 제한사항" 목록의 모든 항목 삭제
- [ ] "애플리케이션 제한사항" → "없음" 선택
- [ ] "API 제한사항" → "키 제한 안 함" 선택
- [ ] 저장 버튼 클릭
- [ ] 설정 확인 (다시 편집 화면에서 확인)

### 대기 및 테스트

- [ ] 15분 대기 (설정 전파)
- [ ] 모바일 브라우저 캐시 완전 삭제
- [ ] 모바일에서 `https://www.yagovibe.com/login` 접속
- [ ] Google 로그인 시도
- [ ] 로그인 튕김이 해결되었는지 확인
- [ ] 콘솔에서 경고 메시지 사라졌는지 확인

### 코드 캐시 문제 (필요시)

- [ ] dist 폴더 삭제
- [ ] node_modules/.vite 폴더 삭제
- [ ] npm run build 재실행
- [ ] firebase deploy --only hosting 재배포
- [ ] 모바일에서 하드 리프레시

## 🚨 중요 참고사항

### API 키 구분

1. **Browser key (Firebase Authentication용)**
   - 키 값: `AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY`
   - 용도: Firebase Authentication (Identity Toolkit API)
   - **이 키의 제한을 완전히 해제해야 함** ⚠️

2. **Maps API 키 (Google Maps용)**
   - 키 값: `AIzaSyAdaboeaFt5dsb0cYsLs893KXi6ltTApEY`
   - 용도: Google Maps JavaScript API
   - 별도로 설정됨 (이미 해결됨)

### 제한 해제가 필요한 이유

1. **모바일 Redirect 로그인**
   - 모바일에서는 `signInWithRedirect` 사용
   - Redirect 과정에서 다양한 도메인을 거침
   - HTTP 리퍼러 제한이 있으면 인증 요청이 차단됨

2. **개발/프로덕션 환경**
   - 로컬 개발 환경 (`localhost:5173`)
   - Firebase Hosting (`yago-vibe-spt.web.app`)
   - Custom Domain (`www.yagovibe.com`)
   - 모든 환경에서 작동해야 함

3. **인증 플로우**
   - Google OAuth 리디렉션
   - Firebase Auth 리디렉션
   - 다양한 리퍼러가 발생
   - 제한이 있으면 차단됨

## 💡 최종 권장 사항

**반드시 해야 할 것**:
1. ✅ Browser key의 모든 제한 해제
2. ✅ 웹사이트 제한 목록 완전 삭제
3. ✅ 15분 대기 후 모바일 캐시 삭제
4. ✅ 모바일에서 테스트

**만약 여전히 문제가 발생한다면**:
1. 새 Browser key 생성 (제한 없이)
2. `.env.production` 파일 업데이트
3. 재빌드 및 재배포

---

**이 가이드를 따라 API 키 제한을 완전히 해제하면 모바일 로그인 튕김 문제가 해결됩니다!** 🎉

