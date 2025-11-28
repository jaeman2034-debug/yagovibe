# 🔑 Google Cloud Console API 키 도메인 제한 추가 가이드

## ❌ 현재 오류
```
RefererNotAllowedMapError
Your site URL to be authorized: https://www.yagovibe.com/voice-map
```

## 📋 해결 방법

### 1️⃣ Google Cloud Console 접속

1. **Google Cloud Console 열기**
   - https://console.cloud.google.com 접속
   - 프로젝트 선택 (YAGO VIBE 관련 프로젝트)

### 2️⃣ API 키 찾기

1. **사용자 인증 정보 메뉴**
   - 왼쪽 메뉴: **"API 및 서비스"** → **"사용자 인증 정보"**
   - 또는 직접 링크: https://console.cloud.google.com/apis/credentials

2. **API 키 찾기**
   - API 키 목록에서 사용 중인 키 찾기
   - 키 이름 또는 키 값으로 검색: `AIzaSyCJOahD8gJGDIGM3GWOob3tsaVS4D93WCw`
   - 해당 API 키를 **클릭**하여 편집 모드로 진입

### 3️⃣ 웹사이트 제한사항 추가

1. **애플리케이션 제한사항 설정**
   - **"애플리케이션 제한사항"** 섹션 확인
   - **"HTTP 리퍼러(웹사이트)"** 선택되어 있는지 확인
   - 만약 "제한 없음"으로 되어 있다면 **"HTTP 리퍼러(웹사이트)"**로 변경

2. **웹사이트 제한사항에 도메인 추가**
   - **"웹사이트 제한사항"** 섹션에서 **"항목 추가"** 클릭
   - 다음 도메인들을 **각각 한 줄씩** 추가:

   ```
   https://yagovibe.com/*
   https://www.yagovibe.com/*
   https://yagovibe.vercel.app/*
   http://localhost:5173/*
   http://localhost:5178/*
   http://localhost:5179/*
   http://127.0.0.1:5173/*
   ```

   **⚠️ 중요:**
   - 각 도메인은 **별도의 줄**에 입력
   - `https://` 또는 `http://` 포함
   - 경로까지 포함하려면 끝에 `/*` 추가
   - `www.yagovibe.com`과 `yagovibe.com`은 **별도로** 추가해야 함

3. **저장**
   - **"저장"** 버튼 클릭
   - 변경 사항은 **즉시 적용**됩니다 (최대 5분 소요)

### 4️⃣ Maps JavaScript API 활성화 확인

1. **API 라이브러리 확인**
   - 왼쪽 메뉴: **"API 및 서비스"** → **"라이브러리"**
   - 검색창에 **"Maps JavaScript API"** 입력
   - 결과에서 **"Maps JavaScript API"** 클릭
   - **"사용 설정"** 버튼이 보이면 클릭하여 활성화
   - 이미 활성화되어 있다면 **"관리"** 버튼이 보입니다

### 5️⃣ 결제 계정 확인

Google Maps API는 무료 할당량이 있지만, 결제 계정이 연동되어 있어야 합니다:

1. **결제 설정 확인**
   - 왼쪽 메뉴: **"결제"**
   - 결제 계정이 연동되어 있는지 확인
   - 연동되지 않았다면 **"결제 계정 연결"** 클릭하여 진행

### 6️⃣ 테스트

1. **브라우저 캐시 삭제**
   - `Ctrl + Shift + Delete` (Windows) 또는 `Cmd + Shift + Delete` (Mac)
   - 또는 시크릿 모드에서 테스트

2. **사이트 접속**
   - `https://www.yagovibe.com/voice-map` 접속
   - 구글 지도가 정상적으로 로드되는지 확인

3. **콘솔 확인**
   - 개발자 도구 (F12) → Console 탭
   - `RefererNotAllowedMapError` 오류가 사라졌는지 확인

## 🔍 스크린샷 가이드

### API 키 편집 화면에서 확인할 항목:

1. **애플리케이션 제한사항**
   ```
   ☑ HTTP 리퍼러(웹사이트)
   ```

2. **웹사이트 제한사항**
   ```
   https://yagovibe.com/*
   https://www.yagovibe.com/*
   https://yagovibe.vercel.app/*
   http://localhost:5173/*
   ...
   ```

## ⚠️ 주의사항

- **도메인은 정확히 일치해야 합니다**
  - `https://www.yagovibe.com/*` ≠ `https://yagovibe.com/*`
  - 둘 다 별도로 추가해야 합니다

- **프로토콜 포함**
  - `https://` 또는 `http://`를 포함해야 합니다

- **와일드카드 사용**
  - 경로까지 포함하려면 `/*`를 끝에 추가
  - 예: `https://www.yagovibe.com/*`

- **변경 사항 적용 시간**
  - 즉시 적용되지만, 최대 5분까지 소요될 수 있습니다
  - 브라우저 캐시를 삭제하면 더 빠르게 적용됩니다

## 📝 체크리스트

- [ ] Google Cloud Console 접속
- [ ] API 키 찾기 및 편집 모드 진입
- [ ] 애플리케이션 제한사항: "HTTP 리퍼러(웹사이트)" 선택
- [ ] 웹사이트 제한사항에 모든 도메인 추가
- [ ] Maps JavaScript API 활성화 확인
- [ ] 결제 계정 연동 확인
- [ ] 저장 후 브라우저 캐시 삭제
- [ ] `https://www.yagovibe.com/voice-map` 테스트

## 🆘 문제가 계속되면

1. **API 키가 올바른 프로젝트의 것인지 확인**
   - Firebase Console의 프로젝트 ID와 Google Cloud Console의 프로젝트 ID가 일치하는지 확인

2. **API 키 제한사항 확인**
   - "API 제한사항" 섹션에서 "Maps JavaScript API"가 선택되어 있는지 확인

3. **브라우저 콘솔에서 상세 오류 확인**
   - 개발자 도구 (F12) → Console 탭
   - 오류 메시지의 전체 내용 확인

