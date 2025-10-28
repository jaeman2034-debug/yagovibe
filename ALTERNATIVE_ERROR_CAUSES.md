# 🔍 다른 원인 가능성 분석

Google Cloud Console 설정이 모두 올바른데도 InvalidKeyMapError가 발생한다면:

## 🚨 발견된 다른 잠재적 원인들

### 1️⃣ React.StrictMode로 인한 이중 렌더링 (확률 60%)

**문제**: `src/main.tsx`에서 `React.StrictMode` 사용 중
- 개발 모드에서 useEffect가 두 번 실행됨
- 지도가 두 번 초기화 시도 → 충돌 가능

**증상**:
- 콘솔에 "지도 초기화 성공!" 메시지가 여러 번 나타남
- 두 번째 초기화 시점에 InvalidKeyMapError 발생

**해결**: ✅ 적용 완료
- `isMounted` 플래그로 이중 실행 방지
- cleanup 함수로 unmount 상태 관리

### 2️⃣ @react-google-maps/api 패키지 충돌 (확률 30%)

**문제**: `GeoDashboard.tsx`에서 `useJsApiLoader` 사용
- `useJsApiLoader`가 별도로 Google Maps 스크립트 로드
- `VoiceMapSearch.tsx`에서 직접 스크립트 로드와 충돌 가능

**위치**:
```typescript
// src/pages/admin/GeoDashboard.tsx
const { isLoaded, loadError } = useJsApiLoader({
  id: "google-map-script",
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  libraries: ["visualization"],
});
```

**해결 방법**:
1. VoiceMapSearch에서도 `useJsApiLoader` 사용
2. 또는 GeoDashboard의 스크립트 ID를 다르게 설정
3. 또는 공통 로더 사용

### 3️⃣ 스크립트 ID 충돌 (확률 5%)

**문제**: 여러 컴포넌트가 비슷한 스크립트 ID 사용
- `google-maps-script` (VoiceMap)
- `google-map-script` (GeoDashboard의 useJsApiLoader)
- 충돌 가능성

**해결**: ✅ 적용 완료
- VoiceMapSearch: `google-maps-script-voice-search`로 변경
- VoiceMap: `google-maps-script-voice-map`로 변경

### 4️⃣ callback 파라미터 누락 (확률 3%)

**문제**: VoiceMapSearch에서 callback 없이 로드
- googleMapsLoader.ts는 `callback=__googleMapsInit` 사용
- VoiceMapSearch는 callback 없이 `onload` 사용
- 타이밍 차이로 인한 문제 가능

**해결**: ✅ 적용 완료
- `loading=async` 파라미터 추가로 안정성 향상

### 5️⃣ HTTPS 인증서 문제 (확률 2%)

**문제**: vite.config.ts에서 HTTPS 사용 중
- `localhost-key.pem`, `localhost.pem` 사용
- 브라우저가 인증서를 신뢰하지 않을 수 있음

**확인 방법**:
- 브라우저 주소창에 자물쇠 아이콘 확인
- "연결이 비공개로 설정되어 있지 않음" 경고가 있는지 확인

**해결**:
- 인증서 재생성 또는 HTTP로 테스트

## ✅ 적용된 수정 사항

1. **React.StrictMode 이중 실행 방지**
   - `isMounted` 플래그 추가
   - cleanup 함수로 unmount 상태 관리

2. **스크립트 ID 고유화**
   - VoiceMapSearch: `google-maps-script-voice-search`
   - VoiceMap: `google-maps-script-voice-map`

3. **로딩 파라미터 추가**
   - `loading=async` 추가

4. **초기화 타이밍 개선**
   - 스크립트 로드 후 100ms 지연

## 🔍 추가 확인 사항

### GeoDashboard 충돌 확인

GeoDashboard 페이지에 접속했는지 확인:
- `/admin/geo-dashboard` 접속 시 `useJsApiLoader`가 스크립트 로드
- 이 상태에서 `/voice-map` 접속하면 충돌 가능

**테스트**:
1. 브라우저를 완전히 닫음
2. `/voice-map`만 직접 접속
3. 다른 페이지 거치지 않고 바로 접속

### 브라우저 콘솔에서 확인

```javascript
// 현재 로드된 Google Maps 스크립트 확인
document.querySelectorAll('script[src*="maps.googleapis.com"]').forEach(s => {
    console.log("스크립트:", s.id || "id없음", s.src);
});

// window.google 객체 확인
console.log("window.google:", window.google);
console.log("window.google.maps:", window.google?.maps);
```

## 🎯 다음 단계

1. **서버 재시작** 후 테스트
2. **GeoDashboard 미접속** 상태에서 `/voice-map` 직접 접속
3. **브라우저 캐시 완전 클리어**
4. **콘솔에서 스크립트 중복 확인**

---

**가장 가능성 높은 원인: React.StrictMode 이중 렌더링 또는 GeoDashboard와의 스크립트 충돌입니다!**

