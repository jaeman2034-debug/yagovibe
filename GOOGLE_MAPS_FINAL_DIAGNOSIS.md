# 🔍 Google Maps API 최종 진단 및 해결 체크리스트

## ✅ 확인 완료된 사항

1. ✅ **도메인 제한**: Google Cloud Console에서 올바르게 설정됨
   - `https://www.yagovibe.com/*` ✅
   - `https://yagovibe.com/*` ✅
   - `https://yagovibe.vercel.app/*` ✅
   - 기타 localhost 도메인들 ✅

2. ✅ **빌드된 파일**: 올바른 키 포함 (`AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY`)

3. ✅ **Vercel 환경 변수**: 설정됨

## ❌ 여전히 발생하는 문제

- 두 지도 페이지 모두 로드 실패 (`/voice-map`, `/voice`)
- 에러 메시지: "상태: API 키 오류"

## 🎯 다음 확인 필요 사항 (우선순위 순)

### 1순위: Maps JavaScript API 활성화 여부 (가장 중요!)

**확인 방법**:
1. https://console.cloud.google.com 접속
2. 프로젝트 선택 (Firebase 프로젝트와 동일한 것)
3. **API 및 서비스** > **라이브러리**
4. "Maps JavaScript API" 검색
5. **"사용 설정"** 클릭 (이미 활성화되어 있으면 "관리" 버튼이 보임)

**⚠️ 중요**: API 키가 있어도 Maps JavaScript API가 활성화되지 않으면 `InvalidKeyMapError`가 발생합니다!

### 2순위: API 키가 올바른 프로젝트의 것인지 확인

**확인 방법**:
1. Google Cloud Console > **API 및 서비스** > **사용자 인증 정보**
2. API 키 목록에서 `AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY` 찾기
3. 키를 클릭하여 편집
4. **API 제한사항** 섹션 확인:
   - "키 제한사항"이 "제한 없음"이면 문제 없음
   - 또는 "Maps JavaScript API"가 포함되어 있는지 확인

### 3순위: 결제 계정 연동 여부

**확인 방법**:
1. Google Cloud Console > **결제**
2. 결제 계정이 연결되어 있는지 확인
3. Google Maps Platform은 무료 크레딧을 제공하지만, 결제 계정 연결이 필요할 수 있음

### 4순위: 브라우저 콘솔의 실제 에러 메시지 확인

**확인 방법**:
1. `https://www.yagovibe.com/voice-map` 접속
2. 개발자 도구(F12) 열기
3. **Console** 탭에서 다음 메시지 확인:
   - `🧩 Google Maps API KEY =` → 키가 표시되는지 확인
   - `❌ Google Maps API 오류` → 정확한 에러 타입 확인
   - `RefererNotAllowedMapError` → 도메인 제한 문제 (하지만 이미 설정됨)
   - `InvalidKeyMapError` → API 키 문제

4. **Network** 탭에서:
   - `maps.googleapis.com` 요청 찾기
   - Request URL 확인:
     - ✅ `key=AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY` 포함되어야 함
     - ❌ `key=undefined` 또는 다른 키면 문제

### 5순위: 브라우저 캐시 및 Service Worker 캐시 삭제

**확인 방법**:
1. 개발자 도구(F12) > **Application** 탭
2. **Service Workers** > **Unregister** 클릭
3. **Storage** > **Clear site data** 클릭
4. 브라우저 캐시 삭제 (Ctrl + Shift + Delete)
5. 하드 리프레시 (Ctrl + Shift + R)

## 🔧 추가 디버깅 방법

### 브라우저 콘솔에서 직접 확인:

```javascript
// 1. 현재 로드된 Google Maps 스크립트 확인
const scripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
console.log('로드된 스크립트:', scripts);
scripts.forEach(s => console.log('URL:', s.src));

// 2. window.google 객체 확인
console.log('window.google:', window.google);
console.log('window.google.maps:', window.google?.maps);

// 3. 환경 변수 확인
console.log('VITE_GOOGLE_MAPS_API_KEY:', import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
```

## 📋 체크리스트

- [ ] Maps JavaScript API 활성화 확인
- [ ] API 키가 올바른 프로젝트의 것인지 확인
- [ ] 결제 계정 연동 확인
- [ ] 브라우저 콘솔의 실제 에러 메시지 확인
- [ ] Network 탭에서 API 키가 올바르게 전달되는지 확인
- [ ] 브라우저 캐시 및 Service Worker 캐시 삭제

## 🚨 가장 가능성 높은 원인

**Maps JavaScript API가 활성화되지 않았을 가능성이 매우 높습니다!**

Google Cloud Console에서 Maps JavaScript API를 활성화한 후 다시 테스트하세요.

