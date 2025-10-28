# 🗺️ Google Maps API 오류 해결 요약

## 🔍 발견된 문제

### 1. InvalidKeyMapError
- **증상**: Google Maps API 키가 유효하지 않다는 오류
- **원인**: 
  - API 키가 잘못되었거나
  - Maps JavaScript API가 활성화되지 않았거나
  - 도메인 제한 설정 문제
  - 결제 계정 미연동

### 2. TypeError: Cannot read properties of undefined (reading 'getRootNode')
- **증상**: API 로드는 되었지만 초기화 실패
- **원인**: API 키가 거부되어 지도 인스턴스 생성 불가

### 3. Cannot read properties of undefined (reading 'keys')
- **증상**: 위치 접근 오류
- **원인**: 지도가 초기화되지 않아 관련 객체가 undefined

## ✅ 적용된 해결책

### 1. Google Maps API 오류 핸들러 추가
- `gm_authFailure` 콜백을 통한 인증 오류 감지
- InvalidKeyMapError 자동 감지 및 사용자 친화적 메시지 표시

### 2. API 키 유효성 검증 강화
- 스크립트 로드 후 실제로 지도 인스턴스를 생성하여 키 검증
- 검증 실패 시 명확한 오류 메시지 제공

### 3. 초기화 콜백 추가
- `callback` 파라미터를 사용하여 API 완전 로드 확인
- 로드 완료 후 검증 수행

### 4. 오류 메시지 개선
- 사용자에게 명확한 해결 방법 안내
- 브라우저 콘솔에 상세 정보 출력

## 📝 사용자 가이드

### API 키 확인 및 수정

1. **Google Cloud Console 접속**
   ```
   https://console.cloud.google.com
   ```

2. **Maps JavaScript API 활성화 확인**
   - API 및 서비스 > 라이브러리
   - "Maps JavaScript API" 검색 및 활성화 확인

3. **API 키 도메인 제한 확인**
   - API 및 서비스 > 사용자 인증 정보
   - 해당 API 키 클릭
   - 애플리케이션 제한사항: "HTTP 리퍼러" 선택
   - 다음 도메인 추가:
     ```
     http://localhost:5178/*
     http://localhost:5179/*
     http://127.0.0.1:5178/*
     https://localhost:5178/*
     ```

4. **결제 계정 확인**
   - Google Maps Platform은 결제 계정이 필요할 수 있음
   - 사용량이 무료 할당량을 초과하지 않으면 청구되지 않음

### 브라우저 콘솔 디버깅

브라우저 콘솔(F12)에서 다음 명령어 사용:

```javascript
// API 키 설정 확인
checkGoogleMapsEnv()

// API 수동 로드
loadGoogleMapsAPI().then(() => {
    console.log("✅ 성공!");
}).catch(err => {
    console.error("❌ 실패:", err);
})

// 로드 상태 확인
isGoogleMapsLoaded()
```

## 🔧 코드 변경 사항

### src/utils/googleMapsLoader.ts
- `gm_authFailure` 오류 핸들러 추가
- 초기화 콜백(`callback` 파라미터) 추가
- API 키 유효성 검증 로직 강화
- 타임아웃 처리 개선

### src/pages/VoiceMapSearch.tsx
- 오류 메시지 표시 개선
- 사용자에게 요약 메시지 제공

## ⚠️ 다음 단계

1. `.env.local` 파일에 **유효한** Google Maps API 키 입력
2. Google Cloud Console에서 **도메인 제한 설정** 확인
3. 개발 서버 **재시작**
4. 브라우저 캐시 **강제 새로고침** (Ctrl + Shift + R)
5. 지도 페이지 접속하여 정상 작동 확인

## 🐛 추가 문제 해결

### 여전히 InvalidKeyMapError가 발생하는 경우

1. **API 키 확인**
   - Google Cloud Console에서 키가 정상적으로 생성되었는지 확인
   - 키가 삭제되거나 비활성화되지 않았는지 확인

2. **프로젝트 확인**
   - API 키가 올바른 Google Cloud 프로젝트의 것인지 확인
   - Firebase 프로젝트와 Google Cloud 프로젝트가 연결되어 있는지 확인

3. **도메인 확인**
   - 현재 접속 중인 URL이 도메인 제한에 포함되어 있는지 확인
   - `http://localhost:5179`로 접속 중이면 제한에도 포함되어야 함

4. **결제 계정 확인**
   - Google Cloud Console > 결제에서 결제 계정 연동 확인
   - $200 무료 크레딧 제공 (대부분의 테스트 환경에서 충분)

### getRootNode 오류가 계속 발생하는 경우

- 이 오류는 보통 InvalidKeyMapError의 결과입니다
- API 키 문제를 해결하면 자동으로 해결됩니다

---

**문제가 계속되면 브라우저 콘솔의 전체 오류 메시지를 확인하고 Google Cloud Console 설정을 다시 점검하세요.**

