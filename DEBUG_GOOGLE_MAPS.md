# 🔍 Google Maps API 디버깅 가이드

## 🚨 발견된 잠재적 원인들

### 1️⃣ 스크립트 URL에 API 키가 제대로 포함되는지 확인

**현재 코드**:
```typescript
script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker,geometry&callback=__googleMapsInit`;
```

**확인 방법**:
1. 브라우저 개발자 도구 > Network 탭
2. `maps.googleapis.com` 요청 찾기
3. Request URL 확인:
   - ✅ `key=AIzaSyCJ0ahD8...` 포함되어야 함
   - ❌ `key=undefined` 또는 `key=` 빈 값이면 문제

### 2️⃣ 콜백 함수 `__googleMapsInit` 호출 여부

**현재 코드**:
- `callback=__googleMapsInit`로 설정됨
- 하지만 콜백이 호출되지 않으면 `window.__googleMapsApiLoaded__`가 `false`로 남음

**확인 방법**:
- 콘솔에 "🔧 Google Maps API 초기화 콜백 호출됨" 메시지 확인
- 이 메시지가 없으면 콜백이 호출되지 않은 것

### 3️⃣ `useJsApiLoader`와의 충돌

**문제**:
- GeoDashboard에서 `@react-google-maps/api`의 `useJsApiLoader` 사용
- 이것이 별도 스크립트를 로드하려고 시도할 수 있음

**해결책**:
- GeoDashboard가 로드되기 전에 이미 스크립트가 로드되어 있어야 함
- 또는 GeoDashboard도 `loadGoogleMapsAPI()`를 사용하도록 변경

### 4️⃣ HTTPS 인증서 문제

**현재 설정**:
- `vite.config.ts`에서 `localhost-key.pem`, `localhost.pem` 사용
- 브라우저가 이 인증서를 신뢰하지 않을 수 있음

**확인 방법**:
- 브라우저 주소창에 자물쇠 아이콘 확인
- "연결이 비공개로 설정되어 있지 않음" 경고 확인

### 5️⃣ 실제 API 키 값 확인

**디버깅 코드 추가 필요**:
```typescript
// 스크립트 URL 전체 출력
console.log("📋 전체 스크립트 URL:", script.src);
```

## 🔧 즉시 확인할 사항

### 브라우저 콘솔에서 실행:

```javascript
// 1. 현재 로드된 Google Maps 스크립트 확인
document.querySelectorAll('script[src*="maps.googleapis.com"]').forEach((s, i) => {
    console.log(`${i + 1}. ID: ${s.id || "없음"}`);
    console.log(`   URL: ${s.src}`);
    console.log(`   로드 상태: ${s.onload ? "onload 있음" : "onload 없음"}`);
});

// 2. window.google 객체 확인
console.log("window.google:", window.google);
console.log("window.google.maps:", window.google?.maps);
console.log("window.google.maps.Map:", window.google?.maps?.Map);

// 3. 환경 변수 확인
console.log("API 키:", import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
console.log("API 키 길이:", import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.length);
console.log("API 키 시작:", import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.substring(0, 20));

// 4. Network 탭에서 확인할 것
// - maps.googleapis.com 요청 찾기
// - Request URL에 key 파라미터 확인
// - Status Code 확인 (200이어야 함)
// - Response 확인 (오류 메시지가 있는지)
```

### Network 탭에서 확인:

1. **요청 URL**: `https://maps.googleapis.com/maps/api/js?key=...`
2. **Status Code**: 
   - ✅ 200 OK: 정상
   - ❌ 400 Bad Request: API 키 문제
   - ❌ 403 Forbidden: 도메인 제한 또는 API 미활성화
3. **Response**: 오류 메시지가 포함되어 있는지 확인

## 🎯 가장 가능성 높은 원인

1. **API 키가 실제로는 도메인 제한에 걸림** (60% 확률)
   - Google Cloud Console에서 확인 필요
   - `https://localhost:5179/*`가 정확히 추가되었는지

2. **스크립트 URL에 API 키가 제대로 포함되지 않음** (20% 확률)
   - Network 탭에서 확인 필요
   - `import.meta.env.VITE_GOOGLE_MAPS_API_KEY`가 런타임에 `undefined`일 수 있음

3. **콜백 함수 호출 타이밍 문제** (15% 확률)
   - 스크립트는 로드되었지만 콜백이 호출되지 않음
   - `__googleMapsInit` 함수가 제대로 등록되지 않음

4. **HTTPS 인증서 문제** (5% 확률)
   - 브라우저가 인증서를 신뢰하지 않아 스크립트 로드 실패

---

**다음 단계**: 브라우저 Network 탭에서 실제 요청 URL과 응답을 확인하세요!

