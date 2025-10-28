# 🔍 InvalidKeyMapError 원인 분석

## 현재 상황

콘솔 메시지를 보면:
1. ✅ "Google Maps API 로드 완료!" - 스크립트는 정상 로드됨
2. ✅ "지도 초기화 시작..." - 초기화 시도
3. ✅ "지도 초기화 성공!" - Map 객체 생성은 성공
4. ❌ "Google Maps JavaScript API error: InvalidKeyMapError" - 실제 렌더링 시점에 오류 발생

## 원인 분석

### InvalidKeyMapError가 발생하는 경우

1. **API 키가 유효하지 않음**
   - 키가 삭제되었거나 비활성화됨
   - 잘못된 키 입력

2. **Maps JavaScript API가 활성화되지 않음**
   - Google Cloud Console에서 API가 활성화되지 않음

3. **API 키의 도메인 제한 설정 문제**
   - 현재 도메인(`localhost:5179`)이 허용 목록에 없음
   - HTTP/HTTPS 프로토콜 불일치

4. **결제 계정 미연동**
   - Google Maps Platform은 결제 계정이 필요함
   - (무료 크레딧 제공되지만 계정 연결 필요)

5. **API 키 프로젝트 불일치**
   - Firebase 프로젝트와 Google Cloud 프로젝트가 다름
   - 키가 다른 프로젝트에 속함

## 해결 방법

### 1단계: API 키 확인

`.env.local` 파일에서 API 키 확인:
```env
VITE_GOOGLE_MAPS_API_KEY=AIzaSy실제_발급받은_키
```

브라우저 콘솔에서 확인:
```javascript
// API 키 확인 (일부만 표시)
console.log(import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.substring(0, 10) + "...");

// 또는
checkGoogleMapsEnv();
```

### 2단계: Google Cloud Console 확인

**필수 확인 사항:**

1. **Maps JavaScript API 활성화**
   - https://console.cloud.google.com 접속
   - API 및 서비스 > 라이브러리
   - "Maps JavaScript API" 검색
   - **"사용 설정"** 클릭 (활성화되어 있으면 "관리" 표시됨)

2. **API 키 도메인 제한 설정**
   - API 및 서비스 > 사용자 인증 정보
   - 해당 API 키 클릭
   - **애플리케이션 제한사항**: "HTTP 리퍼러(웹사이트)" 선택
   - **웹사이트 제한사항**에 다음 추가:
     ```
     http://localhost:5178/*
     http://localhost:5179/*
     http://127.0.0.1:5178/*
     http://127.0.0.1:5179/*
     https://localhost:5178/*
     https://localhost:5179/*
     ```
   - **저장** 클릭

3. **결제 계정 확인**
   - 결제 > 계정 관리
   - 결제 계정이 연동되어 있는지 확인
   - (무료 크레딧 제공되지만 계정 연결은 필요)

### 3단계: API 키 재발급 (필요한 경우)

1. 기존 키 삭제 또는 새 키 생성
2. Maps JavaScript API 활성화 확인
3. 도메인 제한 설정
4. `.env.local` 파일 업데이트
5. 개발 서버 재시작

### 4단계: 개발 서버 재시작

```bash
# 서버 중지 (Ctrl + C)
npm run dev
```

## 증상별 진단

### 지도 객체는 생성되지만 렌더링 실패
- **원인**: API 키는 있지만 권한이 없음
- **해결**: 도메인 제한 설정 확인

### 스크립트 로드 실패
- **원인**: 네트워크 문제 또는 잘못된 키
- **해결**: API 키 형식 확인, 네트워크 확인

### API 키 undefined
- **원인**: `.env.local` 파일 문제 또는 서버 미재시작
- **해결**: 파일 확인 후 서버 재시작

## 디버깅 명령어

브라우저 콘솔에서 실행:

```javascript
// 1. API 키 확인
checkGoogleMapsEnv();

// 2. API 로드 상태 확인
isGoogleMapsLoaded();

// 3. 수동 로드 시도
loadGoogleMapsAPI().then(() => {
    console.log("✅ 성공!");
}).catch(err => {
    console.error("❌ 실패:", err);
});

// 4. 현재 API 키 (일부만 표시)
console.log("API 키:", import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.substring(0, 20) + "...");
```

## 체크리스트

- [ ] `.env.local`에 실제 API 키 입력됨
- [ ] Google Cloud Console에서 Maps JavaScript API 활성화됨
- [ ] API 키 도메인 제한에 localhost:5178, localhost:5179 포함됨
- [ ] 결제 계정 연동됨
- [ ] 개발 서버 재시작 완료
- [ ] 브라우저 캐시 클리어 (Ctrl + Shift + R)

---

**가장 흔한 원인은 "도메인 제한 설정"입니다!**
Google Cloud Console에서 API 키의 웹사이트 제한사항에 `localhost:5179`를 추가했는지 확인하세요.

