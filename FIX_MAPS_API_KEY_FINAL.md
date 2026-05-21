# 🎯 Maps API 키 최종 해결 가이드

## ✅ 확인된 정보

### Google Cloud Console에서 찾은 Maps API 키
- **키 값**: `AIzaSyAdaboeaFt5dsb0cYsLs893KXi6ltTApEY`
- **위치**: Google Cloud Console에서 확인됨
- **상태**: 실제 존재하는 키

### .env.production 파일의 키
- **키 값**: `AIzaSyCJ0ahD8gJGDIGM3GWOob3tsaVS4D93WCw`
- **위치**: `.env.production` 파일
- **상태**: 설정되어 있으나 실제 키와 불일치 가능

## ⚠️ 두 키가 다릅니다!

현재 상황:
- Google Cloud Console 키: `AIzaSyAdaboeaFt5dsb0cYsLs893KXi6ltTApEY`
- .env.production 키: `AIzaSyCJ0ahD8gJGDIGM3GWOob3tsaVS4D93WCw`

## 🎯 해결 방법: Google Cloud Console의 키 사용

### Step 1: .env.production 파일 업데이트

1. **프로젝트 루트의 `.env.production` 파일 열기**

2. **VITE_GOOGLE_MAPS_API_KEY 값 변경**
   ```env
   VITE_GOOGLE_MAPS_API_KEY=AIzaSyAdaboeaFt5dsb0cYsLs893KXi6ltTApEY
   ```

3. **파일 저장**

### Step 2: Google Cloud Console에서 HTTP 리퍼러 제한 설정

1. **Maps API 키 편집**
   - Google Cloud Console 접속
   - "사용자 인증 정보" 페이지로 이동
   - 키 값이 `AIzaSyAdaboeaFt5dsb0cYsLs893KXi6ltTApEY`인 키 클릭

2. **애플리케이션 제한사항 설정**
   - "애플리케이션 제한사항" 섹션에서:
     - **"HTTP 리퍼러(웹사이트)"** 선택
     - (현재 "없음"으로 되어 있다면 변경 필요)

3. **웹사이트 제한사항에 도메인 추가**

   다음 항목들을 **한 줄씩** 추가:
   ```
   https://www.yagovibe.com/*
   https://yagovibe.com/*
   https://yago-vibe-spt.web.app/*
   https://yago-vibe-spt.firebaseapp.com/*
   http://localhost:5173/*
   http://127.0.0.1:5173/*
   ```

   **⚠️ 중요 포인트**:
   - 각 항목을 **한 줄씩** 입력
   - `/*` 와일드카드 **반드시** 포함
   - `https://` 또는 `http://` 프로토콜 명시
   - `www.yagovibe.com`과 `yagovibe.com` **둘 다** 추가
   - 앞뒤 공백 없이 입력

4. **API 제한사항 확인 (선택사항)**
   - "API 제한사항" 섹션에서:
     - "키 제한 안 함" 또는
     - "다음 API만 사용" 선택 후:
       - ✅ Maps JavaScript API
       - ✅ Places API (필요시)
       - ✅ Geocoding API (필요시)

5. **저장 버튼 클릭**
   - 화면 하단 또는 상단의 "저장" 버튼 클릭
   - 변경 사항 저장 확인

### Step 3: Maps JavaScript API 활성화 확인

1. **Google Cloud Console → "API 및 서비스" → "라이브러리"**

2. **"Maps JavaScript API" 검색**

3. **활성화 상태 확인**
   - "사용 설정됨" 상태여야 함
   - 활성화되지 않았다면 "사용 설정" 버튼 클릭

### Step 4: 빌드 및 재배포

1. **로컬 빌드 테스트**
   ```bash
   npm run build
   ```

2. **로컬 테스트**
   ```bash
   npm run preview
   ```
   - `http://localhost:4173/voice-map` 접속하여 테스트

3. **Firebase에 재배포**
   ```bash
   firebase deploy
   ```

### Step 5: 설정 전파 대기

- **5-10분 대기** (Google 서버에 설정이 전파되는 시간)
- 때로는 **최대 15분**까지 소요될 수 있음

### Step 6: 브라우저 캐시 삭제 및 테스트

1. **브라우저 캐시 삭제**
   - PC: Ctrl + Shift + Delete
   - 모바일: 브라우저 설정 → 캐시 삭제

2. **시크릿 모드에서 테스트**
   - 새로운 시크릿 창 열기
   - `https://www.yagovibe.com/voice-map` 접속

3. **브라우저 콘솔 확인**
   - F12 키로 개발자 도구 열기
   - Console 탭에서 다음 로그 확인:
     ```
     🗺️ [Google Maps API 로드 시작]
     🔑 사용 중인 API 키 (전체): AIzaSyAdaboeaFt5dsb0cYsLs893KXi6ltTApEY
     ```

## 📝 체크리스트

- [ ] `.env.production` 파일에서 `VITE_GOOGLE_MAPS_API_KEY` 값을 `AIzaSyAdaboeaFt5dsb0cYsLs893KXi6ltTApEY`로 변경
- [ ] Google Cloud Console에서 이 키 편집
- [ ] HTTP 리퍼러 제한 활성화 ("HTTP 리퍼러(웹사이트)" 선택)
- [ ] `https://www.yagovibe.com/*` 추가
- [ ] `https://yagovibe.com/*` 추가
- [ ] 다른 도메인들 추가
- [ ] 저장 버튼 클릭
- [ ] Maps JavaScript API 활성화 확인
- [ ] 빌드 및 재배포
- [ ] 5-10분 대기
- [ ] 브라우저 캐시 삭제
- [ ] `https://www.yagovibe.com/voice-map` 테스트

## 💡 중요 참고사항

- **Maps API 키**: `AIzaSyAdaboeaFt5dsb0cYsLs893KXi6ltTApEY`
- **프로젝트**: `yago-vibe-spt`
- **Google Cloud Console**: https://console.cloud.google.com/apis/credentials?project=yago-vibe-spt

---

**이 가이드를 따라 Maps API 키를 통일하고 HTTP 리퍼러 제한을 설정하면 오류가 해결됩니다!** 🎉

