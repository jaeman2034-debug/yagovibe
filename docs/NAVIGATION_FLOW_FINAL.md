# 🧭 내비게이션 전체 플로우 다이어그램 (최종판)

## 🔷 핵심 원칙 (Single Source of Truth)

* **`navigationStarted === true`** = 내비게이션의 실제 시작
* `navStatus` = UI 상태 표현용
* `navigationStarted` = 행동(경로·음성·검색 차단)의 기준

---

## 📊 상태 플로우 다이어그램

```
┌─────────────────┐
│      IDLE       │ ← 초기 상태
└────────┬────────┘
         │
         │ (장소 검색 / 추천)
         ▼
┌─────────────────┐
│   RECOMMENDED   │ ← 추천 장소 표시
│                 │   - recommendedPlace 설정
│                 │   - 추천 카드 표시
│                 │   - TTS: "지금 위치에서..."
└────────┬────────┘
         │
         │ (출발 트리거)
         │  - 버튼: "여기로 갈게요"
         │  - 음성: "여기로 갈게", "출발"
         │  - detectStartIntent() 감지
         ▼
┌─────────────────┐
│ START_NAVIGATION│ ← 출발 처리 시작
│                 │
│ Actions:        │
│ 1. navigationStarted = true ✅ (가장 먼저)
│ 2. navStatus = 'NAVIGATING'
│ 3. confirmedDestination = place
│ 4. recommendedPlace = place (유지)
│ 5. 검색/places 업데이트 차단
│ 6. route 계산 요청
│ 7. TTS: "안내를 시작할게요"
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   NAVIGATING    │ ← 내비게이션 진행 중
│                 │
│ 지속 동작:        │
│ - 현재 위치 업데이트 │
│ - 경로 라인 표시   │
│ - NavigationCard 표시
│ - 음성 안내 loop │
│ - 검색 완전 차단   │
│ - places 업데이트 차단
└────────┬────────┘
         │
         │ (도착 조건 충족)
         │  - 거리 ≤ 50m
         │  - 또는 멈춤 5초
         ▼
┌─────────────────┐
│    ARRIVED      │ ← 도착 상태
│                 │
│ Actions:        │
│ 1. navStatus = 'ARRIVED'
│ 2. navigationStarted = false
│ 3. 경로 제거
│ 4. 목적지 카드 + 이미지 표시
│ 5. TTS: "목적지에 도착했어요"
└────────┬────────┘
         │
         │ (10초 후 또는 사용자 액션)
         ▼
┌─────────────────┐
│  POST_ARRIVED   │ ← 도착 후 처리
│                 │
│ - 마켓 연결      │
│ - 추천 표시      │
│ - 종료          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│      IDLE       │ ← 복귀
└─────────────────┘
```

---

## 🔄 상세 플로우 설명

### 1️⃣ IDLE → RECOMMENDED

**트리거:**
- 음성 검색: "축구장"
- 텍스트 검색
- 지도 클릭

**처리:**
```
검색 API 호출
  ↓
places 배열 업데이트
  ↓
recommendedPlace 설정
  ↓
추천 카드 표시
  ↓
TTS: "지금 위치에서 제일 가까워서..."
  ↓
STT 자동 시작
```

**상태:**
- `navStatus`: IDLE → SEARCHING → CONFIRMED
- `searchPhase`: idle → searching → results → confirmed
- `recommendedPlace`: 설정됨

---

### 2️⃣ RECOMMENDED → START_NAVIGATION

**트리거 (3가지):**

#### A. 버튼 클릭
```
NavigationCard.onStart()
  ↓
handleStartNavigation()
  ↓
상태 전환 시작
```

#### B. 음성 명령 (CONFIRMED 상태)
```
onSpeechFinal("여기로 갈게요")
  ↓
handleConfirmedVoiceCommand()
  ↓
출발 키워드 감지
  ↓
상태 전환 시작
```

#### C. 음성 명령 (일반 상태)
```
onSpeechFinal("여기로 갈게")
  ↓
detectStartIntent() 체크 ✅
  ↓
목적지 찾기
  ↓
상태 전환 시작
```

**핵심 처리 순서 (지시문 준수):**

```typescript
// 1. navigationStarted 먼저 설정 (가장 중요)
setNavigationStarted(true);

// 2. navStatus 설정
setNavStatus('NAVIGATING');
setSearchPhase('navigating');

// 3. 목적지 확정
setConfirmedDestination(targetPlace);
setConfirmedPlace(targetPlace);
setRecommendedPlace(targetPlace);

// 4. UI 업데이트
setIsNavigating(true);
setShowConfirmStart(false);

// 5. 음성 안내
speakOnce('안내를 시작할게요');

// 6. 경로 계산 트리거
onStartNavigation() 호출
  ↓
MapController.handleStartNavigation()
  ↓
requestRoute() 호출
  ↓
경로 계산 및 표시
```

---

### 3️⃣ NAVIGATING (지속 상태)

**지속 동작:**

1. **현재 위치 업데이트**
   - 2초마다 위치 체크
   - 거리 계산
   - 도착 감지

2. **경로 라인 표시**
   - `navigationStarted === true`일 때만
   - `confirmedDestination` 기준

3. **NavigationCard 표시**
   - `navigationStarted === true`일 때만
   - "안내 그만할게요" 버튼

4. **검색 완전 차단**
   - Places API 호출 차단
   - `onPlacesUpdate` 차단
   - 검색 트리거 차단

5. **음성 안내 loop**
   - 중간 안내 (거리/방향)
   - 도착 안내

**상태 불변식:**
```typescript
// 항상 유지되어야 함
navigationStarted === true
navStatus === 'NAVIGATING'
confirmedDestination !== null
```

---

### 4️⃣ NAVIGATING → ARRIVED

**도착 감지 조건:**

1. **거리 기반**
   - 현재 위치와 목적지 거리 ≤ 50m
   - 2초마다 체크

2. **멈춤 기반**
   - 위치 변화 없음 (5초)
   - 속도 0

**상태 전환:**

```typescript
// 도착 감지
if (distanceM <= 50 || stationary) {
  setSearchPhase('arrived');
  setNavStatus('ARRIVED');
  setNavigationStarted(false); // ✅ 허용: 도착 시에만
  
  speakOnce('목적지에 도착했어요');
  
  // 10초 후 자동 idle 복귀
  setTimeout(() => {
    setNavStatus('IDLE');
    setSearchPhase('idle');
    setConfirmedPlace(null);
    setConfirmedDestination(null);
  }, 10000);
}
```

---

### 5️⃣ ARRIVED → IDLE

**트리거:**
- 10초 경과 (자동)
- 사용자 액션 (마켓 이동 등)

**상태 전환:**
```typescript
setNavStatus('IDLE');
setSearchPhase('idle');
setConfirmedPlace(null);
setConfirmedDestination(null);
setSelectedPlace(null);
setShowConfirmStart(false);
```

---

## 🎯 상태 불변식 (Invariants)

### 불변식 1: NAVIGATING 상태
```typescript
if (navStatus === 'NAVIGATING') {
  assert(navigationStarted === true);
  assert(confirmedDestination !== null);
}
```

### 불변식 2: navigationStarted 상태
```typescript
if (navigationStarted === true) {
  assert(navStatus === 'NAVIGATING');
  assert(confirmedDestination !== null);
}
```

### 불변식 3: ARRIVED 상태
```typescript
if (navStatus === 'ARRIVED') {
  assert(confirmedDestination !== null || confirmedPlace !== null);
  assert(navigationStarted === false);
}
```

---

## 🚫 금지 패턴

### ❌ 금지 1: NAVIGATING 중 검색 실행
```typescript
// 금지
if (navStatus === 'NAVIGATING') {
  runSearch(); // ❌
}
```

### ❌ 금지 2: navigationStarted 자동 false
```typescript
// 금지 (도착/종료 외)
setNavigationStarted(false); // ❌
```

### ❌ 금지 3: navStatus만 체크
```typescript
// 금지
if (navStatus === 'NAVIGATING') {
  showNavigationUI(); // ❌
}

// 정답
if (navStatus === 'NAVIGATING' && navigationStarted) {
  showNavigationUI(); // ✅
}
```

---

## ✅ 검증 체크리스트

### 출발 시
- [ ] `navigationStarted === true` 설정됨
- [ ] `navStatus === 'NAVIGATING'` 설정됨
- [ ] `confirmedDestination` 설정됨
- [ ] 검색 로직 차단됨
- [ ] 경로 계산 트리거됨
- [ ] 음성 안내 나옴

### NAVIGATING 중
- [ ] `navigationStarted === true` 유지
- [ ] 검색 차단 유지
- [ ] places 업데이트 차단 유지
- [ ] 경로 라인 표시 유지
- [ ] NavigationCard 표시 유지

### 도착 시
- [ ] 도착 감지 정확함
- [ ] `navigationStarted = false` 설정됨
- [ ] `navStatus = 'ARRIVED'` 설정됨
- [ ] 음성 안내 나옴
- [ ] UI 올바르게 표시됨
