# 🔍 다른 원인 발견 및 수정 완료

## ✅ 발견된 다른 원인들

### 1️⃣ React.StrictMode 이중 렌더링 문제 ⚠️ 수정 완료

**문제**:
- `src/main.tsx`에서 `React.StrictMode` 사용
- 개발 모드에서 useEffect가 두 번 실행됨
- 지도가 두 번 초기화 시도 → 충돌

**증상**:
- 콘솔에 "지도 초기화 성공!" 메시지가 여러 번 나타남
- 두 번째 초기화 시점에 InvalidKeyMapError 발생 가능

**수정**:
- ✅ `isMounted` 플래그 추가
- ✅ cleanup 함수로 unmount 상태 관리
- ✅ 컴포넌트 unmount 시 초기화 중단

### 2️⃣ 스크립트 ID 충돌 ⚠️ 수정 완료

**문제**:
- 여러 컴포넌트가 비슷한 스크립트 ID 사용
- `google-maps-script` (VoiceMap - 원래)
- `google-map-script` (GeoDashboard의 useJsApiLoader)
- 충돌 가능성

**수정**:
- ✅ VoiceMapSearch: `google-maps-script-voice-search` (고유 ID)
- ✅ VoiceMap: `google-maps-script-voice-map` (고유 ID)
- ✅ GeoDashboard: `google-map-script-geo-dashboard` (고유 ID)

### 3️⃣ @react-google-maps/api 패키지 충돌 ⚠️ 수정 완료

**문제**:
- `GeoDashboard.tsx`에서 `useJsApiLoader` 사용
- `VoiceMapSearch.tsx`에서 직접 스크립트 로드
- 두 방식이 충돌할 수 있음

**수정**:
- ✅ GeoDashboard의 스크립트 ID 고유화

### 4️⃣ 로딩 파라미터 추가 ⚠️ 수정 완료

**문제**:
- Google의 권장 방식인 `loading=async` 파라미터 누락
- 콘솔 경고: "Google Maps JavaScript API has been loaded directly without loading-async"

**수정**:
- ✅ `loading=async` 파라미터 추가

### 5️⃣ 초기화 타이밍 개선 ⚠️ 수정 완료

**문제**:
- 스크립트 로드 완료 직후 즉시 초기화 시도
- DOM이 완전히 준비되지 않았을 수 있음

**수정**:
- ✅ 스크립트 로드 후 100ms 지연
- ✅ DOM 준비 확인 후 초기화

## 📝 적용된 수정 사항

### VoiceMapSearch.tsx
```typescript
// React.StrictMode 이중 실행 방지
let isMounted = true;

// 고유 스크립트 ID
const scriptId = "google-maps-script-voice-search";

// loading=async 파라미터 추가
script.src = `...&loading=async`;

// 초기화 타이밍 개선
setTimeout(() => {
    if (isMounted && mapRef.current && !map.current) {
        initializeMap();
    }
}, 100);

// cleanup
return () => {
    isMounted = false;
};
```

### VoiceMap.tsx
```typescript
// 동일한 패턴 적용
const scriptId = "google-maps-script-voice-map";
// ...
```

### GeoDashboard.tsx
```typescript
// 고유 ID 사용
id: "google-map-script-geo-dashboard"
```

## 🔍 추가 확인 사항

### GeoDashboard 충돌 테스트

다른 페이지를 거치지 않고 직접 `/voice-map` 접속:

```bash
# 브라우저 완전히 닫기
# 새로 열기
https://localhost:5179/voice-map
```

GeoDashboard(`/admin/geo-dashboard`)에 먼저 접속했다가 `/voice-map`으로 이동하면:
- useJsApiLoader가 이미 스크립트를 로드했을 수 있음
- 충돌 가능성

### 브라우저 콘솔 디버깅

```javascript
// 현재 로드된 모든 Google Maps 스크립트 확인
document.querySelectorAll('script[src*="maps.googleapis.com"]').forEach((s, i) => {
    console.log(`${i + 1}. ID: ${s.id || "없음"}`, s.src.substring(0, 80) + "...");
});

// window.google 상태 확인
console.log("window.google 존재:", !!window.google);
console.log("window.google.maps 존재:", !!window.google?.maps);
console.log("window.google.maps.Map 존재:", !!window.google?.maps?.Map);

// 현재 API 키 확인
console.log("API 키:", import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.substring(0, 30) + "...");
```

## 🎯 최종 체크리스트

다른 원인 확인:

- [ ] React.StrictMode 이중 실행 방지 적용됨 ✅
- [ ] 스크립트 ID 고유화 적용됨 ✅
- [ ] GeoDashboard 충돌 방지 적용됨 ✅
- [ ] loading=async 파라미터 추가됨 ✅
- [ ] 초기화 타이밍 개선됨 ✅
- [ ] 서버 재시작 완료
- [ ] 브라우저 캐시 클리어
- [ ] 다른 페이지 거치지 않고 `/voice-map` 직접 접속 테스트

## 🚨 여전히 오류가 발생한다면

1. **GeoDashboard와의 충돌 확인**
   - GeoDashboard 페이지를 거치지 않고 직접 `/voice-map` 접속
   - 새 브라우저 창에서 테스트

2. **React.StrictMode 일시 비활성화 테스트**
   ```typescript
   // src/main.tsx에서 일시적으로 비활성화
   // React.StrictMode 제거
   <BrowserRouter>
     <App />
   </BrowserRouter>
   ```

3. **스크립트 중복 로드 확인**
   - 브라우저 콘솔에서 위의 디버깅 코드 실행
   - 여러 스크립트 태그가 있는지 확인

---

**위의 수정 사항들이 적용되었습니다!**
서버를 재시작하고 다른 페이지를 거치지 않고 직접 `/voice-map`으로 접속해서 테스트해보세요.

