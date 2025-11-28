# 🗺️ Google Maps API 도메인 제한 오류 해결

## ❌ 오류 메시지
```
구글 지도 로드 실패: TypeError: Cannot read properties of undefined (reading 'keys')
```

## 📋 원인
Google Maps API 키의 **도메인 제한** 설정에 현재 도메인이 포함되지 않아서 발생합니다.

## ✅ 해결 방법

### 1️⃣ Google Cloud Console에서 API 키 확인

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com 접속
   - 프로젝트 선택

2. **API 키 찾기**
   - 왼쪽 메뉴: **"API 및 서비스"** → **"사용자 인증 정보"**
   - API 키 목록에서 사용 중인 키 클릭 (예: `AIzaSyCJOahD8gJGDIGM3GWOob3tsaVS4D93WCw`)

3. **웹사이트 제한사항 확인**
   - **"애플리케이션 제한사항"** 섹션 확인
   - **"HTTP 리퍼러(웹사이트)"** 선택되어 있는지 확인

4. **도메인 추가**
   - **"웹사이트 제한사항"** 섹션에서 **"항목 추가"** 클릭
   - 다음 도메인들을 **각각 추가**:
     ```
     https://yagovibe.com/*
     https://www.yagovibe.com/*
     https://yagovibe.vercel.app/*
     http://localhost:5173/*
     http://localhost:5178/*
     http://localhost:5179/*
     http://127.0.0.1:5173/*
     ```

5. **저장**
   - **"저장"** 버튼 클릭
   - 변경 사항은 **즉시 적용**됩니다 (최대 5분 소요)

### 2️⃣ Maps JavaScript API 활성화 확인

1. **API 라이브러리 확인**
   - 왼쪽 메뉴: **"API 및 서비스"** → **"라이브러리"**
   - **"Maps JavaScript API"** 검색
   - **"사용 설정"** 버튼이 보이면 클릭하여 활성화

### 3️⃣ 결제 계정 확인

Google Maps API는 무료 할당량이 있지만, 결제 계정이 연동되어 있어야 합니다:

1. **결제 설정 확인**
   - 왼쪽 메뉴: **"결제"**
   - 결제 계정이 연동되어 있는지 확인
   - 연동되지 않았다면 연동 진행

### 4️⃣ 테스트

1. 브라우저 캐시 삭제 (Ctrl + Shift + Delete)
2. `https://yagovibe.com/voice-map` 접속
3. 구글 지도가 정상적으로 로드되는지 확인

## 🔍 참고

- 도메인 제한은 **정확히 일치**해야 합니다
- `https://yagovibe.com/*`와 `https://www.yagovibe.com/*`는 **별도로** 추가해야 합니다
- 와일드카드(`*`)는 경로까지 포함합니다
- 변경 사항은 **최대 5분** 내에 적용됩니다

## 📝 체크리스트

- [ ] Google Cloud Console에서 API 키 확인
- [ ] 웹사이트 제한사항에 모든 도메인 추가
- [ ] Maps JavaScript API 활성화 확인
- [ ] 결제 계정 연동 확인
- [ ] 브라우저 캐시 삭제 후 테스트

