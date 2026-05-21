# 🗺️ Google Maps API 리퍼러 제한 오류 해결 가이드

## 📊 현재 상황

### ✅ 정상 작동
- `localhost:5173/voice-map` - Google Maps 정상 로드

### ❌ 오류 발생
- `https://www.yagovibe.com/voice-map` - `RefererNotAllowedMapError` 발생

**오류 메시지**:
```
Google Maps JavaScript API error: RefererNotAllowedMapError
Your site URL to be authorized: https://www.yagovibe.com/voice-map
```

**사용 중인 API 키**:
- `AIzaSyCJ0ahD8gJGDIGM3GWOob3tsaVS493WCw` (39자)

## 🎯 원인 분석

### 문제점
Google Maps API 키의 **HTTP 리퍼러(Referer) 제한** 설정에 `www.yagovibe.com`이 포함되지 않았습니다.

### 왜 localhost는 작동하나요?
- 개발 환경(`localhost`)은 Google Maps API의 기본 허용 도메인
- 프로덕션 도메인(`www.yagovibe.com`)은 명시적으로 추가해야 함

## ✅ 해결 방법

### Step 1: Google Cloud Console 접속

1. **Google Cloud Console 접속**
   ```
   https://console.cloud.google.com/apis/credentials?project=yago-vibe-spt
   ```

2. **API 키 찾기**
   - API 키 목록에서 `AIzaSyCJ0ahD8gJGDIGM3GWOob3tsaVS493WCw` 찾기
   - 또는 "Maps API" 관련 키 찾기

### Step 2: API 키 편집

1. **API 키 클릭**하여 편집 화면으로 이동

2. **애플리케이션 제한사항** 섹션에서:
   - **"HTTP 리퍼러(웹사이트)"** 선택

3. **웹사이트 제한사항**에 다음 항목 추가:

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
   - `/*` 와일드카드 **반드시** 포함 (모든 경로 허용)
   - `https://` 프로토콜 명시
   - `www`가 있는 버전과 없는 버전 **모두** 추가

4. **저장** 버튼 클릭

### Step 3: 설정 전파 대기

- **5-10분** 대기 (Google 서버에 설정이 전파되는 시간)
- 때로는 **최대 15분**까지 소요될 수 있음

### Step 4: 브라우저 캐시 삭제

1. **모바일 브라우저**:
   - Chrome: 설정 → 개인정보 보호 및 보안 → 인터넷 사용 기록 삭제
   - Safari: 설정 → Safari → 인터넷 사용 기록 및 웹사이트 데이터 지우기

2. **PC 브라우저**:
   - 하드 리프레시: `Ctrl + Shift + R` (Windows/Linux), `Cmd + Shift + R` (Mac)
   - 또는 시크릿 모드에서 테스트

### Step 5: 테스트

1. **프로덕션 도메인에서 테스트**
   ```
   https://www.yagovibe.com/voice-map
   ```

2. **예상 결과**:
   - ✅ Google Maps 정상 로드
   - ✅ 지도에 현재 위치 표시
   - ✅ 음성 명령 기능 정상 작동

## 🔍 추가 확인 사항

### Maps JavaScript API 활성화 확인

1. **Google Cloud Console → API 및 서비스 → 라이브러리**
2. **"Maps JavaScript API"** 검색
3. **"사용 설정됨"** 상태인지 확인

### API 제한사항 확인

1. **API 키 편집 화면 → API 제한사항**
2. 다음 중 하나 선택:
   - **"키 제한 안 함"** (권장 - 개발 단계)
   - **"키 제한"** → 다음 API 포함:
     - ✅ Maps JavaScript API
     - ✅ Places API (사용하는 경우)
     - ✅ Geocoding API (사용하는 경우)

## 📝 체크리스트

- [ ] Google Cloud Console 접속
- [ ] Maps API 키 찾기 (`AIzaSyCJ0ahD8gJGDIGM3GWOob3tsaVS493WCw`)
- [ ] HTTP 리퍼러 제한 활성화
- [ ] `https://www.yagovibe.com/*` 추가
- [ ] `https://yagovibe.com/*` 추가
- [ ] `https://yago-vibe-spt.web.app/*` 추가
- [ ] `https://yago-vibe-spt.firebaseapp.com/*` 추가
- [ ] `http://localhost:5173/*` 추가 (개발용)
- [ ] 저장 버튼 클릭
- [ ] 5-10분 대기
- [ ] 브라우저 캐시 삭제
- [ ] `https://www.yagovibe.com/voice-map` 테스트
- [ ] Google Maps 정상 로드 확인

## 🚨 주의사항

1. **프로토콜 일치**
   - 실제 사이트가 `https://`를 사용하면 `https://`로 추가
   - `http://`와 `https://`는 별도로 추가 필요

2. **서브도메인 포함**
   - `www.yagovibe.com`과 `yagovibe.com`은 **별도로** 추가 필요
   - 와일드카드(`*.yagovibe.com`)는 지원하지 않음

3. **포트 번호**
   - `localhost:5173`과 같이 포트가 있으면 포트 번호 포함
   - 프로덕션 도메인은 포트 번호 없이 추가

4. **와일드카드 위치**
   - 경로 끝에만 사용 가능: `https://example.com/*`
   - 도메인 중간에는 사용 불가: `https://*.example.com/*` (❌)

## 💡 참고

- **Maps API 키**: `AIzaSyCJ0ahD8gJGDIGM3GWOob3tsaVS493WCw`
- **프로젝트**: `yago-vibe-spt`
- **Google Cloud Console**: https://console.cloud.google.com/apis/credentials?project=yago-vibe-spt

---

**이 가이드를 따라 설정하면 `www.yagovibe.com`에서도 Google Maps가 정상적으로 작동합니다!** 🎉

