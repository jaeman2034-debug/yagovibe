# 🧭 내비게이션 전체 플로우 다이어그램

## 📊 상태 머신 다이어그램

```
┌─────────┐
│  IDLE   │ ← 초기 상태
└────┬────┘
     │ 검색/추천
     ↓
┌─────────┐
│SEARCHING│ ← 검색 중
└────┬────┘
     │ 결과 도출
     ↓
┌─────────┐
│CONFIRMED│ ← 목적지 확정 (추천 카드 표시)
└────┬────┘
     │ 출발 (버튼/음성)
     ↓
┌─────────┐
│NAVIGATING│ ← 내비게이션 중 (경로 표시)
└────┬────┘
     │ 도착 감지 (30-50m)
     ↓
┌─────────┐
│ ARRIVED │ ← 도착 (마켓 연결)
└────┬────┘
     │ 10초 후 또는 사용자 액션
     ↓
┌─────────┐
│  IDLE   │ ← 복귀
└─────────┘
```

## 🔄 상세 플로우

### 1️⃣ IDLE → SEARCHING → CONFIRMED

```
[사용자 액션]
  - 음성 검색: "축구장"
  - 텍스트 검색
  - 지도 클릭

[시스템 처리]
  - 검색 API 호출
  - places 배열 업데이트
  - recommendedPlace 설정

[상태 전환]
  - navStatus: IDLE → SEARCHING → CONFIRMED
  - searchPhase: idle → searching → results → confirmed

[UI 표시]
  - 추천 카드 표시
  - TTS: "지금 위치에서 제일 가까워서 먼저 보여줬어요..."
  - STT 자동 시작
```

### 2️⃣ CONFIRMED → NAVIGATING (출발)

#### 🎯 진입점 (3가지)

**A. 버튼 클릭**
```
[사용자] "출발" 버튼 클릭
  ↓
NavigationCard.onStart()
  ↓
handleStartNavigation() 호출
  ↓
상태 전환 시작
```

**B. 음성 명령 (CONFIRMED 상태)**
```
[사용자] "여기로 갈게요"
  ↓
onSpeechFinal()
  ↓
handleConfirmedVoiceCommand()
  ↓
출발 키워드 감지
  ↓
상태 전환 시작
```

**C. 음성 명령 (일반 상태)**
```
[사용자] "여기로 갈게"
  ↓
onSpeechFinal()
  ↓
detectStartIntent() 체크
  ↓
출발 의도 감지
  ↓
상태 전환 시작
```

#### 🔧 상태 전환 로직 (공통)

```typescript
// 1. 상태 먼저 설정 (검색 로직 차단)
setNavStatus('NAVIGATING');
setSearchPhase('navigating');
setNavigationStarted(true);

// 2. 목적지 확정
setConfirmedDestination(targetPlace);
setConfirmedPlace(targetPlace);
setRecommendedPlace(targetPlace);

// 3. UI 업데이트
setIsNavigating(true);
setShowConfirmStart(false);

// 4. 음성 안내
speakOnce('안내를 시작할게요');

// 5. 경로 계산 트리거
onStartNavigation() 호출
  ↓
MapController.handleStartNavigation()
  ↓
requestRoute() 호출
  ↓
경로 계산 및 표시
```

### 3️⃣ NAVIGATING → ARRIVED (도착)

```
[시스템] 2초마다 거리 체크
  ↓
getDistanceKm() 계산
  ↓
거리 ≤ 50m 감지
  ↓
[상태 전환]
  - navStatus: NAVIGATING → ARRIVED
  - searchPhase: navigating → arrived
  - navigationStarted: true → false

[UI 업데이트]
  - 도착 배경 이미지 오버레이 (보조)
  - 목적지 카드 유지
  - 마켓 연결 버튼 표시

[음성 안내]
  - speakOnce('목적지에 도착했어요')

[자동 복귀]
  - 10초 후 IDLE 상태로 복귀
```

### 4️⃣ ARRIVED → IDLE (복귀)

```
[트리거]
  - 10초 경과 (자동)
  - 사용자 액션 (마켓 이동 등)

[상태 전환]
  - navStatus: ARRIVED → IDLE
  - searchPhase: arrived → idle
  - confirmedPlace: null
  - confirmedDestination: null

[UI 초기화]
  - 모든 내비게이션 UI 제거
  - 지도 초기 상태로 복귀
```

## 🎯 핵심 원칙

1. **단일 진입점**: 모든 출발은 동일한 상태 전환 로직 사용
2. **상태 우선**: NAVIGATING 먼저 설정하여 검색 로직 차단
3. **목적지 유지**: confirmedDestination은 ARRIVED까지 유지
4. **음성 동기화**: 상태 전환 시 음성 안내 제공
