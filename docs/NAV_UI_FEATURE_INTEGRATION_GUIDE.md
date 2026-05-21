# 🛡️ 네비 기능 얹을 때 UI 안 망가지는 가이드

> 실제 네비 로직/API/실시간 위치를 추가할 때
> **UI 상태 머신 구조를 유지하는 방법**

---

## 🎯 핵심 원칙 (외워라)

> **기능은 실패해도 UI 상태는 절대 흔들리면 안 된다**
> 
> **UI는 느리면 안 되고, 기능은 틀려도 된다**

사용자는:
- 길이 틀린 건 참아도
- **앱이 멈춘 느낌은 절대 못 참는다**

---

## 🧠 네비 기능 얹기 전 "UI 생존 규칙"

### 1️⃣ "기능 상태"와 "UI 상태"를 절대 섞지 마라

#### ❌ 망하는 구조

```typescript
// 기능 상태가 UI 상태를 제어
if (routeLoaded) {
  showNavigationUI(); // ❌ 기능이 UI 제어
}
```

#### ✅ 정답 구조

```typescript
// UI 상태와 기능 상태 완전 분리
type UIState = "SEARCH" | "SELECTED" | "PRE_NAV" | "NAVIGATING";
type RouteState = "IDLE" | "LOADING" | "SUCCESS" | "FAIL";
type GPSState = "IDLE" | "TRACKING" | "WEAK" | "LOST";

// UI는 UIState만 본다
const [uiState, setUIState] = useState<UIState>("SEARCH");
const [routeState, setRouteState] = useState<RouteState>("IDLE");
const [gpsState, setGpsState] = useState<GPSState>("IDLE");

// 기능은 UI에 신호만 보낸다
useEffect(() => {
  if (uiState === "NAVIGATING") {
    // UI 상태에 따라 기능 실행
    startRouteTracking();
  }
}, [uiState]);
```

**핵심**: UI는 `UIState`만 본다. 기능은 UI에 **신호만 보낸다**.

---

### 2️⃣ 출발 버튼 = UI 전환 먼저, 기능은 뒤에

#### ❌ 실패 UX

```typescript
// 출발 클릭 → API 호출 → 응답 대기 → UI 변경
const handleStart = async () => {
  const route = await calculateRoute(); // ❌ 기다림
  if (route) {
    setUIState("NAVIGATING"); // ❌ 늦은 UI 변경
  }
};
```

#### ✅ 정답 UX

```typescript
// 출발 클릭 → UI 즉시 변경 → 기능은 뒤에
const handleStart = () => {
  // 1. UI 즉시 전환 (0ms)
  setUIState("NAVIGATING");
  
  // 2. 지도 연출 + UI 교체 (즉시)
  animateMapToNavigation();
  swapUIComponents();
  
  // 3. 그 다음 경로 계산 (비동기)
  calculateRoute()
    .then((route) => {
      setRouteState("SUCCESS");
      updateRouteOnMap(route);
    })
    .catch((error) => {
      setRouteState("FAIL");
      // UI는 NAVIGATING 유지, 메시지만 오버레이
      showErrorOverlay("경로를 찾을 수 없습니다");
    });
};
```

**핵심**: 경로 실패해도 UI는 **NAVIGATING 유지**. 메시지만 오버레이.

---

### 3️⃣ "경로 계산 중"은 기능 상태지 UI 상태가 아니다

#### ❌ 잘못된 방법

```typescript
// CALCULATING 같은 UI 상태 추가
type UIState = "SEARCH" | "SELECTED" | "PRE_NAV" | "CALCULATING" | "NAVIGATING";
// ❌ 상태 폭증
```

#### ✅ 정답

```typescript
// UI는 여전히 PRE_NAV or NAVIGATING
type UIState = "SEARCH" | "SELECTED" | "PRE_NAV" | "NAVIGATING";
type RouteState = "IDLE" | "LOADING" | "SUCCESS" | "FAIL";

// 하단 카드 안에서만 표시
{uiState === "PRE_NAV" && routeState === "LOADING" && (
  <div>경로 계산 중…</div>
)}

{uiState === "NAVIGATING" && routeState === "LOADING" && (
  <div>경로를 다시 찾는 중…</div>
)}
```

**핵심**: 상태 폭증 방지. UI 상태는 유지, 기능 상태만 변경.

---

### 4️⃣ 위치 업데이트 = UI 트리거 ❌ / 애니메이션 입력 ✅

#### ❌ 잘못된 방법

```typescript
// 위치 바뀔 때마다 UI rerender
useEffect(() => {
  navigator.geolocation.watchPosition((position) => {
    setCurrentLocation(position); // ❌ UI rerender
    updateUI(position); // ❌ UI 트리거
  });
}, []);
```

#### ✅ 정답

```typescript
// 위치는 지도에만 전달, UI 상태는 그대로
useEffect(() => {
  if (uiState !== "NAVIGATING") {
    return;
  }
  
  const watchId = navigator.geolocation.watchPosition((position) => {
    // 위치는 지도에만 전달 (애니메이션 입력)
    map.updateCamera(position);
    map.updateCurrentLocationMarker(position);
    
    // UI 상태는 그대로 유지
    // UI는 "지금 뭐 하는지"만 말해야 한다
    // "어디 있는지"는 지도 역할
  });
  
  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
}, [uiState]);
```

**핵심**: 위치 업데이트는 지도에만 전달. UI는 상태만 표시.

---

### 5️⃣ GPS 튀어도 UI는 흔들리지 마라

#### ❌ 잘못된 방법

```typescript
// GPS 끊기면 UI 상태 변경
useEffect(() => {
  if (!hasGPSSignal) {
    setUIState("SEARCH"); // ❌ UI 흔들림
  }
}, [hasGPSSignal]);
```

#### ✅ 정답

```typescript
// GPS 상태는 별도 관리, UI는 유지
const [gpsState, setGpsState] = useState<"STRONG" | "WEAK" | "LOST">("STRONG");

useEffect(() => {
  const checkGPS = setInterval(() => {
    if (!hasGPSSignal) {
      setGpsState("WEAK");
      // UI 상태는 NAVIGATING 유지
      // 오버레이만 표시
      showGPSWarning("신호가 불안정합니다");
    }
  }, 2000);
  
  return () => clearInterval(checkGPS);
}, []);

// 1~2초 위치 안 와도 안내 중 유지
// UI 상태 변경 ❌
```

**핵심**: GPS 튀어도 UI는 흔들리지 않음. 오버레이만 표시.

---

### 6️⃣ 경로 재탐색은 "UI 이벤트"가 아니다

#### ❌ 잘못된 방법

```typescript
// 재탐색 → UI 리셋
const recalculateRoute = async () => {
  setUIState("PRE_NAV"); // ❌ UI 리셋
  const newRoute = await calculateRoute();
  setUIState("NAVIGATING");
};
```

#### ✅ 정답

```typescript
// UI는 계속 NAVIGATING, 지도만 부드럽게 교체
const recalculateRoute = async () => {
  setRouteState("LOADING");
  
  // 하단에만 표시
  showMessage("경로를 다시 찾는 중…");
  
  const newRoute = await calculateRoute();
  
  // 지도만 부드럽게 경로 교체
  map.updateRoute(newRoute, { animate: true });
  
  setRouteState("SUCCESS");
  hideMessage();
  
  // UI 상태는 NAVIGATING 유지
};
```

**핵심**: 네비 앱에서 가장 중요한 안정감. UI는 유지, 지도만 업데이트.

---

### 7️⃣ 종료는 반드시 "의도된 액션"만

#### ❌ 잘못된 방법

```typescript
// GPS 끊김, 경로 실패 → SEARCH로 튕김
useEffect(() => {
  if (gpsLost || routeFailed) {
    setUIState("SEARCH"); // ❌ 자동 종료
  }
}, [gpsLost, routeFailed]);
```

#### ✅ 정답

```typescript
// 오직 이것만 허용
const handleStopNavigation = () => {
  // 사용자가 "안내 종료" 버튼 클릭
  setUIState("PRE_NAV");
};

const handleErrorChoice = () => {
  // 명시적 에러 선택
  setUIState("SELECTED");
};

// GPS 끊김, 경로 실패는 UI 상태 변경 안 함
// 오버레이만 표시
```

**핵심**: 오직 사용자 액션만 UI 상태 변경. 자동 종료 ❌.

---

### 8️⃣ 백그라운드 / 포그라운드 복귀 UX

#### ❌ 잘못된 방법

```typescript
// 앱 복귀 시 검색 화면으로 돌아감
useEffect(() => {
  const handleAppStateChange = (nextAppState) => {
    if (nextAppState === "active") {
      setUIState("SEARCH"); // ❌ 실패
    }
  };
}, []);
```

#### ✅ 정답

```typescript
// 이전 UIState 그대로, 지도 카메라만 복구
useEffect(() => {
  const handleAppStateChange = (nextAppState) => {
    if (nextAppState === "active") {
      // UI 상태는 그대로 유지
      // 지도 카메라만 복구
      if (uiState === "NAVIGATING") {
        map.resumeTracking();
        map.restoreCamera();
      } else if (uiState === "PRE_NAV") {
        map.restoreRouteView();
      }
    }
  };
}, [uiState]);
```

**핵심**: 앱 복귀 시 이전 UIState 그대로. 지도만 복구.

---

### 9️⃣ 디버그 기준 (이거 있으면 절대 안 망함)

#### ✅ 필수 디버그 정보

```typescript
// 항상 볼 수 있어야 하는 것
{process.env.NODE_ENV === "development" && (
  <div className="debug-panel">
    <div>UI STATE: {uiState}</div>
    <div>ROUTE STATE: {routeState}</div>
    <div>GPS: {gpsState}</div>
    <div>LOCATION: {currentLocation ? "OK" : "NONE"}</div>
  </div>
)}
```

**핵심**: 이 세 줄이면 **QA/개발/기획 전부 커버**.

---

### 🔟 최종 생존 공식 (외워라)

> **UI는 느리면 안 되고**
> **기능은 틀려도 된다**

#### 구현 원칙

1. **UI 상태 전환은 즉시** (0ms)
2. **기능 실행은 비동기** (뒤에)
3. **기능 실패해도 UI 유지**
4. **에러는 오버레이로만 표시**

---

## 📋 기능 통합 체크리스트

새로운 기능을 추가할 때:

- [ ] 기능 상태와 UI 상태가 분리되어 있는가?
- [ ] UI 상태 전환이 기능 실행보다 먼저인가?
- [ ] "로딩 중"이 UI 상태가 아닌 기능 상태인가?
- [ ] 위치 업데이트가 UI를 트리거하지 않는가?
- [ ] GPS 튀어도 UI 상태가 유지되는가?
- [ ] 경로 재탐색이 UI 상태를 변경하지 않는가?
- [ ] 종료가 의도된 액션으로만 가능한가?
- [ ] 백그라운드 복귀 시 UI 상태가 유지되는가?
- [ ] 디버그 정보가 표시되는가?

모두 ✅면 **UI 안 망가짐**

---

## 🎯 실제 코드 예시

### 완전한 통합 예시

```typescript
// ✅ 정답 구조
function NavigationScreen() {
  // UI 상태 (절대 변경 안 함)
  const [uiState, setUIState] = useState<UIState>("SEARCH");
  
  // 기능 상태 (UI와 분리)
  const [routeState, setRouteState] = useState<RouteState>("IDLE");
  const [gpsState, setGpsState] = useState<GPSState>("IDLE");
  
  // 출발 버튼 클릭
  const handleStart = () => {
    // 1. UI 즉시 전환
    setUIState("NAVIGATING");
    
    // 2. 지도 연출
    map.startNavigation();
    
    // 3. 기능 실행 (비동기)
    calculateRoute()
      .then((route) => {
        setRouteState("SUCCESS");
        map.updateRoute(route);
      })
      .catch((error) => {
        setRouteState("FAIL");
        // UI는 NAVIGATING 유지
        showErrorOverlay("경로를 찾을 수 없습니다");
      });
  };
  
  // 위치 업데이트 (UI 트리거 안 함)
  useEffect(() => {
    if (uiState !== "NAVIGATING") return;
    
    const watchId = navigator.geolocation.watchPosition((position) => {
      // 지도에만 전달
      map.updateCamera(position);
    });
    
    return () => navigator.geolocation.clearWatch(watchId);
  }, [uiState]);
  
  // GPS 상태 체크 (UI 상태 변경 안 함)
  useEffect(() => {
    const checkGPS = setInterval(() => {
      if (!hasGPSSignal) {
        setGpsState("WEAK");
        showGPSWarning("신호가 불안정합니다");
        // UI 상태는 NAVIGATING 유지
      }
    }, 2000);
    
    return () => clearInterval(checkGPS);
  }, []);
  
  return (
    <>
      <MapLayer state={uiState} />
      <TopLayer state={uiState} />
      <BottomLayer 
        state={uiState} 
        routeState={routeState}
        onStart={handleStart}
      />
      <DebugPanel 
        uiState={uiState}
        routeState={routeState}
        gpsState={gpsState}
      />
    </>
  );
}
```

---

## 1️⃣ 경로 계산 API 통합 (상세)

### ❌ 잘못된 방법

```typescript
// API가 상태를 제어
const calculateRoute = async () => {
  const route = await api.getRoute(origin, destination);
  if (route) {
    setState("NAVIGATING"); // ❌ API가 상태 제어
  }
};
```

### ✅ 정답

```typescript
// 상태 머신이 API를 제어
const handleStartNavigation = () => {
  // 1. 상태 먼저 변경
  setState("PRE_NAV");
  setIsRouteCalculating(true);
  
  // 2. API 호출 (상태에 따라)
  calculateRoute(origin, destination)
    .then((route) => {
      setRouteInfo(route);
      setIsRouteCalculating(false);
      // 상태는 PRE_NAV 유지 (사용자가 출발 버튼 눌러야 NAVIGATING)
    })
    .catch((error) => {
      setErrorState("ROUTE_ERROR");
      setIsRouteCalculating(false);
      // 상태는 SELECTED로 복귀
      setState("SELECTED");
    });
};
```

**핵심**: API 결과가 상태를 바꾸지 않음. 상태 머신이 API를 호출하고 결과를 처리함.

---

## 2️⃣ 실시간 위치 업데이트 통합

### ❌ 잘못된 방법

```typescript
// 위치 업데이트가 상태를 제어
useEffect(() => {
  navigator.geolocation.watchPosition((position) => {
    updateMapCenter(position); // ❌ 위치가 지도를 제어
    if (isNearDestination(position)) {
      setState("ARRIVED"); // ❌ 위치가 상태 제어
    }
  });
}, []);
```

### ✅ 정답

```typescript
// 상태 머신이 위치 업데이트를 제어
useEffect(() => {
  // NAVIGATING 상태에서만 위치 추적
  if (state !== "NAVIGATING") {
    return;
  }
  
  const watchId = navigator.geolocation.watchPosition((position) => {
    // 위치는 단순히 업데이트만
    updateCurrentLocation(position);
    
    // 상태 변경은 별도 로직으로
    if (isNearDestination(position)) {
      // 상태 머신이 결정
      setState("ARRIVED");
    }
  });
  
  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
}, [state]); // 상태에 따라 추적 시작/중지
```

**핵심**: 위치 업데이트는 데이터만 제공. 상태 머신이 언제 추적할지 결정.

---

## 3️⃣ 경로 재계산 통합

### ❌ 잘못된 방법

```typescript
// 경로 이탈 시 자동 재계산
useEffect(() => {
  if (isOffRoute(currentLocation, route)) {
    recalculateRoute(); // ❌ 자동으로 상태 변경
    setState("PRE_NAV"); // ❌ 기능이 상태 제어
  }
}, [currentLocation]);
```

### ✅ 정답

```typescript
// 상태 머신이 재계산 결정
useEffect(() => {
  if (state !== "NAVIGATING") {
    return;
  }
  
  if (isOffRoute(currentLocation, route)) {
    // UI로 사용자에게 알림
    setToastMessage("경로에서 벗어났습니다");
    // 상태는 NAVIGATING 유지 (사용자가 선택)
    // 재계산은 사용자 액션으로만
  }
}, [state, currentLocation]);

// 사용자가 재계산 버튼 클릭 시
const handleRecalculate = () => {
  setState("PRE_NAV"); // 상태 머신이 결정
  setIsRouteCalculating(true);
  recalculateRoute();
};
```

**핵심**: 자동 재계산 ❌. 사용자 액션으로만 상태 변경.

---

## 4️⃣ 음성 안내 통합

### ❌ 잘못된 방법

```typescript
// 음성 안내가 상태 제어
const speakTurn = (instruction) => {
  speak(instruction);
  if (instruction === "도착했습니다") {
    setState("ARRIVED"); // ❌ 음성이 상태 제어
  }
};
```

### ✅ 정답

```typescript
// 상태 머신이 음성 안내 제어
useEffect(() => {
  if (state !== "NAVIGATING" || !nextTurn) {
    return;
  }
  
  // 상태에 따라 음성 안내
  speak(nextTurn.instruction);
}, [state, nextTurn]);

// 도착은 위치 기반으로 상태 머신이 결정
useEffect(() => {
  if (state === "NAVIGATING" && isNearDestination(currentLocation)) {
    setState("ARRIVED");
    speak("도착했습니다");
  }
}, [state, currentLocation]);
```

**핵심**: 음성 안내는 상태에 따라 출력. 음성이 상태를 바꾸지 않음.

---

## 5️⃣ 에러 처리 통합

### ❌ 잘못된 방법

```typescript
// 에러가 상태를 제어
try {
  await calculateRoute();
} catch (error) {
  setState("ERROR"); // ❌ 에러 상태 추가
}
```

### ✅ 정답

```typescript
// 에러는 서브 상태로 처리
const [errorState, setErrorState] = useState<ErrorType | null>(null);

try {
  await calculateRoute();
  setErrorState(null);
} catch (error) {
  setErrorState("ROUTE_ERROR");
  // 메인 상태는 이전 상태 유지
  setState("SELECTED"); // PRE_NAV로 가지 않음
}

// UI에서 에러 표시
{errorState === "ROUTE_ERROR" && (
  <ErrorCard
    message="경로를 찾을 수 없습니다"
    onRetry={() => {
      setErrorState(null);
      calculateRoute();
    }}
  />
)}
```

**핵심**: 에러는 별도 상태로 관리. 메인 상태 머신은 유지.

---

## 6️⃣ 로딩 상태 통합

### ❌ 잘못된 방법

```typescript
// 로딩이 상태를 제어
const [isLoading, setIsLoading] = useState(false);

const handleAction = async () => {
  setIsLoading(true);
  await api.call();
  setIsLoading(false);
  setState("NEXT"); // ❌ 로딩 후 상태 변경
};
```

### ✅ 정답

```typescript
// 로딩은 서브 상태로 처리
const [isRouteCalculating, setIsRouteCalculating] = useState(false);

const handleStartNavigation = () => {
  // 상태 먼저 변경
  setState("PRE_NAV");
  setIsRouteCalculating(true);
  
  // API 호출
  calculateRoute()
    .then(() => {
      setIsRouteCalculating(false);
      // 상태는 PRE_NAV 유지 (사용자가 출발 버튼 눌러야 NAVIGATING)
    });
};

// UI에서 로딩 표시
{isRouteCalculating && (
  <div>경로 계산 중...</div>
)}
```

**핵심**: 로딩은 서브 상태. 메인 상태 머신과 분리.

---

## 7️⃣ 실시간 데이터 업데이트

### ❌ 잘못된 방법

```typescript
// 실시간 데이터가 상태 제어
useEffect(() => {
  socket.on("locationUpdate", (data) => {
    updateMap(data);
    if (data.arrived) {
      setState("ARRIVED"); // ❌ 실시간 데이터가 상태 제어
    }
  });
}, []);
```

### ✅ 정답

```typescript
// 상태 머신이 실시간 데이터 수신 결정
useEffect(() => {
  if (state !== "NAVIGATING") {
    return; // NAVIGATING에서만 수신
  }
  
  const unsubscribe = socket.on("locationUpdate", (data) => {
    // 데이터만 업데이트
    updateCurrentLocation(data);
    updateRouteProgress(data);
    
    // 상태 변경은 별도 로직
    if (data.arrived && state === "NAVIGATING") {
      setState("ARRIVED");
    }
  });
  
  return unsubscribe;
}, [state]);
```

**핵심**: 실시간 데이터는 수신만. 상태 변경은 상태 머신이 결정.

---

## 8️⃣ 외부 이벤트 통합 (알림, 백그라운드)

### ❌ 잘못된 방법

```typescript
// 외부 이벤트가 상태 제어
window.addEventListener("beforeunload", () => {
  setState("IDLE"); // ❌ 외부 이벤트가 상태 제어
});
```

### ✅ 정답

```typescript
// 상태 머신이 외부 이벤트 처리
useEffect(() => {
  const handleBeforeUnload = () => {
    // 상태는 유지, 데이터만 저장
    saveNavigationState(state, routeInfo);
  };
  
  window.addEventListener("beforeunload", handleBeforeUnload);
  return () => {
    window.removeEventListener("beforeunload", handleBeforeUnload);
  };
}, [state]);
```

**핵심**: 외부 이벤트는 데이터만 처리. 상태는 상태 머신이 관리.

---

## 9️⃣ 복잡한 비즈니스 로직 통합

### ❌ 잘못된 방법

```typescript
// 비즈니스 로직이 상태 제어
const complexBusinessLogic = async () => {
  const step1 = await api.step1();
  if (step1) {
    setState("STEP1");
  }
  const step2 = await api.step2();
  if (step2) {
    setState("STEP2");
  }
  // ❌ 복잡한 로직이 상태를 마구 변경
};
```

### ✅ 정답

```typescript
// 상태 머신이 비즈니스 로직 제어
const handleComplexFlow = async () => {
  // 1. 상태 먼저 변경
  setState("PROCESSING");
  
  // 2. 비즈니스 로직 실행
  try {
    const step1 = await api.step1();
    const step2 = await api.step2();
    
    // 3. 결과에 따라 상태 변경 (상태 머신이 결정)
    if (step1 && step2) {
      setState("COMPLETE");
    } else {
      setState("ERROR");
    }
  } catch (error) {
    setState("ERROR");
  }
};
```

**핵심**: 비즈니스 로직은 실행만. 상태 변경은 상태 머신이 결정.

---

## 🔟 상태 머신 보호 규칙

### 절대 금기

1. ❌ API 응답이 상태를 직접 변경
2. ❌ 실시간 데이터가 상태를 직접 변경
3. ❌ 외부 이벤트가 상태를 직접 변경
4. ❌ 비즈니스 로직이 상태를 직접 변경
5. ❌ 에러/로딩이 메인 상태 머신에 추가

### 필수 규칙

1. ✅ 상태 머신이 모든 기능을 제어
2. ✅ 기능은 상태에 따라 실행/중지
3. ✅ 에러/로딩은 서브 상태로 관리
4. ✅ 상태 전환은 사용자 액션 또는 명확한 조건
5. ✅ 상태 머신 구조는 절대 변경하지 않음

---

## 🎯 최종 천재 요약

### 핵심 질문 (기능 추가 시마다)

> **"이 기능이 UI 상태를 제어하는가?**
> **아니면 UI 상태가 이 기능을 제어하는가?"**

**정답은 항상 후자여야 한다.**

### 최종 생존 공식

> **UI는 느리면 안 되고**
> **기능은 틀려도 된다**

사용자는:
- 길이 틀린 건 참아도
- **앱이 멈춘 느낌은 절대 못 참는다**

### 구현 원칙

1. **UI 상태 전환은 즉시** (0ms)
2. **기능 실행은 비동기** (뒤에)
3. **기능 실패해도 UI 유지**
4. **에러는 오버레이로만 표시**
5. **기능 상태와 UI 상태 완전 분리**

---

## 📋 기능 통합 체크리스트

새로운 기능을 추가할 때:

- [ ] 기능이 상태 머신을 제어하지 않는가?
- [ ] 기능이 상태에 따라 실행/중지되는가?
- [ ] 에러/로딩이 서브 상태로 관리되는가?
- [ ] 상태 전환이 사용자 액션 또는 명확한 조건인가?
- [ ] 상태 머신 구조가 변경되지 않았는가?

모두 ✅면 **UI 안 망가짐**
