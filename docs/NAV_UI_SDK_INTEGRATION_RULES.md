# 🗺 실제 지도 SDK 붙일 때 UI 절대 규칙 TOP 10

> 카카오/네이버/구글 지도 SDK 공통 규칙
> 이거 안 지키면 바로 티 남

---

## 1️⃣ 지도는 항상 "대답"해야 한다

### ❌ 실패 예
- 사용자가 장소 선택했는데 지도가 안 움직임
- 출발 눌렀는데 카메라 변화 없음

### ✅ 정답
```typescript
// SELECTED 상태
if (state === "SELECTED" && destination) {
  map.fitBounds([origin, destination], { padding: 80 });
}

// NAVIGATING 상태
if (state === "NAVIGATING") {
  map.setTrackingMode(true);
  map.setCameraTilt(45); // 약간 기울임
}
```

**핵심**: 상태가 바뀌면 **지도가 무조건 반응**해야 함

---

## 2️⃣ 지도 카메라 전환은 "부드럽게"

### ❌ 실패 예
```typescript
map.setCenter(destination); // 갑자기 점프
```

### ✅ 정답
```typescript
map.panTo(destination); // 부드럽게 이동
// 또는
map.fitBounds(bounds, { 
  duration: 500, // 애니메이션 시간
  padding: 80 
});
```

**핵심**: `setCenter` 대신 `panTo` 또는 `fitBounds` 사용

---

## 3️⃣ 경로선은 "상태에 따라" 표시/숨김

### ❌ 실패 예
- SEARCH 상태에서도 경로선 보임
- NAVIGATING 상태에서 경로선 안 보임

### ✅ 정답
```typescript
// PRE_NAV / NAVIGATING에서만 경로선 표시
if (state === "PRE_NAV" || state === "NAVIGATING") {
  polyline.setMap(map);
  polyline.setOptions({
    strokeColor: state === "PRE_NAV" ? "#9CA3AF" : "#4285F4", // 연한색 → 진한색
    strokeWeight: state === "PRE_NAV" ? 3 : 5,
  });
} else {
  polyline.setMap(null); // 완전히 제거
}
```

**핵심**: 경로선은 **상태 머신이 제어**해야 함

---

## 4️⃣ 마커는 "의미별로" 분리

### ❌ 실패 예
- 모든 마커가 같은 스타일
- 내 위치와 목적지 구분 안 됨

### ✅ 정답
```typescript
// 내 위치 마커 (항상 존재)
const myLocationMarker = new Marker({
  position: myLocation,
  icon: {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 8,
    fillColor: "#4285F4",
    fillOpacity: 1,
  },
});

// 목적지 마커 (SELECTED 이후만)
const destinationMarker = new Marker({
  position: destination,
  icon: {
    url: "/pin-destination.png",
    scaledSize: new google.maps.Size(32, 32),
  },
});

// 상태별 마커 표시
if (state === "SEARCH") {
  myLocationMarker.setMap(map);
  destinationMarker.setMap(null);
} else if (state === "SELECTED" || state === "PRE_NAV" || state === "NAVIGATING") {
  myLocationMarker.setMap(map);
  destinationMarker.setMap(map);
}
```

**핵심**: 마커도 **상태 머신이 제어**

---

## 5️⃣ 지도 줌 레벨은 "상태별 고정"

### ❌ 실패 예
- 사용자가 줌 조작하면 상태와 맞지 않음
- 상태 전환 시 줌이 이상하게 변함

### ✅ 정답
```typescript
const ZOOM_LEVELS = {
  SEARCH: 15,        // 동네 단위
  SELECTED: 14,      // 출발지 + 목적지 한 화면
  PRE_NAV: 14,       // 경로 전체 보기
  NAVIGATING: 16,    // 차량 시점 (가까이)
};

// 상태 전환 시 줌 고정
map.setZoom(ZOOM_LEVELS[state]);

// NAVIGATING 중에는 줌 조작 차단
if (state === "NAVIGATING") {
  map.setOptions({ 
    gestureHandling: "none", // 핀치 줌 차단
    disableDoubleClickZoom: true 
  });
} else {
  map.setOptions({ 
    gestureHandling: "auto",
    disableDoubleClickZoom: false 
  });
}
```

**핵심**: 상태별 **줌 레벨 고정** + NAVIGATING 중 조작 차단

---

## 6️⃣ 지도 인터랙션은 "상태별로" 제어

### ❌ 실패 예
- NAVIGATING 중에도 드래그 가능
- 사용자가 지도 이동하면 상태와 어긋남

### ✅ 정답
```typescript
// NAVIGATING 중에는 드래그 차단
if (state === "NAVIGATING") {
  map.setOptions({
    draggable: false,
    scrollwheel: false,
    gestureHandling: "none",
  });
} else {
  map.setOptions({
    draggable: true,
    scrollwheel: true,
    gestureHandling: "auto",
  });
}
```

**핵심**: NAVIGATING 중에는 **지도 조작 완전 차단**

---

## 7️⃣ 경로 계산 실패는 "UI로" 처리

### ❌ 실패 예
- API 에러 시 아무 반응 없음
- 콘솔 에러만 남고 사용자 모름

### ✅ 정답
```typescript
try {
  const route = await calculateRoute(origin, destination);
  setRouteInfo(route);
  setState("PRE_NAV");
} catch (error) {
  // UI로 에러 표시
  setErrorState({
    type: "ROUTE_ERROR",
    message: "경로를 찾을 수 없습니다",
    onRetry: () => {
      // 다시 시도
      calculateRoute(origin, destination);
    },
  });
  // 상태는 SELECTED 유지 (PRE_NAV로 가지 않음)
}
```

**핵심**: API 실패해도 **UI는 반드시 반응**

---

## 8️⃣ 지도 로딩은 "투명하게"

### ❌ 실패 예
- 지도 로딩 중 빈 화면
- 로딩 스피너가 지도 위에 가림

### ✅ 정답
```typescript
// 지도는 백그라운드에서 로딩
const [isMapReady, setIsMapReady] = useState(false);

useEffect(() => {
  loadMap().then(() => {
    setIsMapReady(true);
    // 로딩 완료 후 즉시 내 위치로 이동
    if (state === "SEARCH") {
      map.panTo(myLocation);
    }
  });
}, []);

// 로딩 중에는 지도 영역만 표시 (스피너 없음)
return (
  <div className="map-container">
    {!isMapReady && (
      <div className="map-placeholder">
        {/* 최소한의 플레이스홀더 */}
      </div>
    )}
    <div id="map" style={{ opacity: isMapReady ? 1 : 0 }} />
  </div>
);
```

**핵심**: 지도 로딩은 **사용자 방해 최소화**

---

## 9️⃣ 지도 스타일은 "상태별로" 변경

### ❌ 실패 예
- 모든 상태에서 지도 스타일 동일
- NAVIGATING 상태 구분 안 됨

### ✅ 정답
```typescript
// NAVIGATING 상태에서는 지도 스타일 변경
if (state === "NAVIGATING") {
  map.setOptions({
    styles: [
      {
        featureType: "poi",
        elementType: "labels",
        stylers: [{ visibility: "off" }], // POI 숨김
      },
      {
        featureType: "transit",
        stylers: [{ visibility: "off" }], // 대중교통 숨김
      },
    ],
  });
} else {
  map.setOptions({
    styles: [], // 기본 스타일
  });
}
```

**핵심**: NAVIGATING 상태는 **지도 스타일도 달라야 함**

---

## 🔟 지도 이벤트는 "상태 머신과" 연동

### ❌ 실패 예
- 지도 클릭 시 상태와 무관하게 동작
- 마커 클릭 시 상태 전환 안 됨

### ✅ 정답
```typescript
// 마커 클릭 이벤트
destinationMarker.addListener("click", () => {
  if (state === "SEARCH") {
    // 장소 선택 → SELECTED 전환
    setState("SELECTED");
    setDestination(place);
    map.fitBounds([myLocation, place.location]);
  }
});

// 지도 클릭 이벤트 (NAVIGATING 중에는 무시)
map.addListener("click", (e) => {
  if (state === "NAVIGATING") {
    return; // NAVIGATING 중에는 클릭 무시
  }
  // 다른 상태에서는 지도 클릭 처리
});
```

**핵심**: 지도 이벤트도 **상태 머신이 제어**

---

## 🎯 최종 천재 요약

1. **지도는 항상 대답해야 함** (상태 변화 = 지도 반응)
2. **카메라 전환은 부드럽게** (`panTo` / `fitBounds`)
3. **경로선은 상태별 표시/숨김**
4. **마커는 의미별로 분리**
5. **줌 레벨은 상태별 고정**
6. **인터랙션은 상태별 제어** (NAVIGATING 중 차단)
7. **경로 계산 실패는 UI로 처리**
8. **지도 로딩은 투명하게**
9. **지도 스타일은 상태별 변경**
10. **지도 이벤트는 상태 머신과 연동**

---

## 🚫 절대 금기

- ❌ 지도 SDK가 상태 머신을 제어
- ❌ 상태 전환 시 지도 반응 없음
- ❌ NAVIGATING 중에도 지도 조작 가능
- ❌ API 실패 시 UI 반응 없음

**핵심**: 지도 SDK는 **상태 머신의 "실행부"**일 뿐
