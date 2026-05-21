# ✅ 내비게이션 음성/버튼/상태 1:1 매핑 최종 점검표

## 📋 전체 체크리스트

### 1️⃣ 출발 (CONFIRMED → NAVIGATING)

#### 🎯 진입점별 체크

| 진입점 | 트리거 | 상태 전환 | 음성 | 경로 | UI |
|--------|--------|----------|------|------|-----|
| **버튼 클릭** | `NavigationCard.onStart()` | ✅ | ✅ | ✅ | ✅ |
| **음성 (CONFIRMED)** | `handleConfirmedVoiceCommand()` | ✅ | ✅ | ✅ | ✅ |
| **음성 (일반)** | `detectStartIntent()` | ✅ | ✅ | ✅ | ✅ |

#### 🔍 상세 체크리스트

##### A. 버튼 클릭 경로
- [ ] `NavigationCard`에서 `onStart` 호출
- [ ] `handleStartNavigation` 콜백 실행
- [ ] `setNavStatus('NAVIGATING')` 실행
- [ ] `setNavigationStarted(true)` 실행
- [ ] `setConfirmedDestination()` 실행
- [ ] `speakOnce('안내를 시작할게요')` 실행
- [ ] `onStartNavigationRef.current()` 호출
- [ ] MapController에서 경로 계산 시작
- [ ] 경로 라인 지도에 표시

##### B. 음성 명령 (CONFIRMED 상태)
- [ ] `onSpeechFinal()` 호출
- [ ] `navStatus === 'CONFIRMED'` 체크 통과
- [ ] `handleConfirmedVoiceCommand()` 호출
- [ ] 출발 키워드 감지: `['여기로 갈게', '출발', '가자', ...]`
- [ ] `setNavStatus('NAVIGATING')` 실행
- [ ] `setNavigationStarted(true)` 실행
- [ ] `speakOnce('안내를 시작할게요')` 실행
- [ ] `onStartNavigationRef.current()` 호출
- [ ] 검색 로직 차단 (`return true`)

##### C. 음성 명령 (일반 상태)
- [ ] `onSpeechFinal()` 호출
- [ ] `detectStartIntent()` 체크 통과
- [ ] 목적지 찾기: `confirmedPlace || recommendedPlace || selectedPlace || places[0]`
- [ ] `[NAV] startNavigation called from voice command` 로그 출력
- [ ] `setNavStatus('NAVIGATING')` 실행 (먼저)
- [ ] `setNavigationStarted(true)` 실행
- [ ] `setConfirmedDestination()` 실행
- [ ] `speakOnce('안내를 시작할게요')` 실행
- [ ] `onStartNavigationRef.current()` 호출
- [ ] 검색 로직 차단 (`return`)

#### 🛡️ 보호 로직 체크

- [ ] 출발 의도 처리 후 즉시 `return`하여 검색 로직 실행 차단
- [ ] 검색 로직에서 `navStatus === 'NAVIGATING'` 체크
- [ ] 검색 로직에서 `navigationStarted` 체크
- [ ] 중복 실행 방지: `!isNavigating && !navigationStarted` 체크

### 2️⃣ 내비게이션 중 (NAVIGATING)

#### 🔍 상태 유지 체크

- [ ] `navStatus === 'NAVIGATING'` 유지
- [ ] `navigationStarted === true` 유지
- [ ] `confirmedDestination` 유지
- [ ] 경로 라인 지도에 표시 유지
- [ ] 목적지 마커 고정 유지
- [ ] NAVIGATING 카드 표시

#### 🚫 차단 로직 체크

- [ ] 검색 입력 차단 (토스트 메시지)
- [ ] 다른 목적지 선택 차단
- [ ] 지도 인터랙션으로 상태 변경 차단
- [ ] 추천 장소 초기화 차단

#### 🎤 음성 명령 체크 (NAVIGATING 중)

| 명령 | 키워드 | 동작 | 상태 변경 |
|------|--------|------|----------|
| **중지** | "멈춰", "그만", "취소" | 내비게이션 종료 | NAVIGATING → IDLE |
| **검색** | "근처 카페" 등 | 차단 (토스트) | - |

### 3️⃣ 도착 (NAVIGATING → ARRIVED)

#### 🔍 도착 감지 체크

- [ ] `arrivalCheckTimer` 실행 (2초마다)
- [ ] `searchPhase === 'navigating'` 체크
- [ ] `navigationStarted === true` 체크
- [ ] `confirmedPlace.location` 존재 체크
- [ ] `locationState.status === 'ready'` 체크
- [ ] `getDistanceKm()` 계산
- [ ] 거리 ≤ 50m 감지

#### 🔧 상태 전환 체크

- [ ] `setSearchPhase('arrived')` 실행
- [ ] `setNavStatus('ARRIVED')` 실행
- [ ] `setNavigationStarted(false)` 실행
- [ ] `speakOnce('목적지에 도착했어요')` 실행
- [ ] `arrivalAutoIdleTimer` 시작 (10초)

#### 🎨 UI 체크

- [ ] 목적지 카드 유지
- [ ] 도착 배경 이미지 오버레이 표시 (보조)
- [ ] 마켓 연결 버튼 표시
- [ ] 경로 라인 제거 (선택적)

### 4️⃣ 도착 후 (ARRIVED)

#### 🔍 상태 유지 체크

- [ ] `navStatus === 'ARRIVED'` 유지
- [ ] `confirmedDestination` 유지
- [ ] 목적지 카드 유지
- [ ] 마켓 연결 가능

#### ⏰ 자동 복귀 체크

- [ ] 10초 경과 후 자동 IDLE 복귀
- [ ] `setSearchPhase('idle')` 실행
- [ ] `setConfirmedPlace(null)` 실행
- [ ] 모든 내비게이션 UI 제거

#### 🎤 음성 명령 체크 (ARRIVED 중)

| 명령 | 키워드 | 동작 | 상태 변경 |
|------|--------|------|----------|
| **마켓 이동** | "마켓", "상품 보기" | 마켓 페이지 이동 | - |
| **종료** | "그만", "취소" | IDLE 복귀 | ARRIVED → IDLE |

## 🔄 상태 전환 매트릭스

| 현재 상태 | 액션 | 다음 상태 | 조건 |
|----------|------|----------|------|
| IDLE | 검색 | SEARCHING | 검색어 입력 |
| SEARCHING | 결과 도출 | CONFIRMED | places 배열 업데이트 |
| CONFIRMED | 출발 (버튼/음성) | NAVIGATING | 목적지 확정 |
| NAVIGATING | 도착 감지 | ARRIVED | 거리 ≤ 50m |
| ARRIVED | 10초 경과 | IDLE | 자동 |
| ARRIVED | 사용자 액션 | IDLE | 마켓 이동 등 |
| NAVIGATING | 중지 (음성) | IDLE | "멈춰", "그만" |

## 🎯 음성 키워드 매핑

### 출발 명령
- ✅ "여기로 갈게"
- ✅ "여기로 가자"
- ✅ "출발"
- ✅ "가자"
- ✅ "갈게"
- ✅ "갈래"
- ✅ "이쪽으로"
- ✅ "안내"
- ✅ "길 안내"

### 다른 곳 요청
- ✅ "다른 곳"
- ✅ "다른 데"
- ✅ "다른 곳 보여줘"
- ✅ "다른 곳 찾아줘"
- ✅ "다른 곳 볼래"

### 취소/중지
- ✅ "아니"
- ✅ "그만"
- ✅ "취소"
- ✅ "안 갈래"
- ✅ "안 갈게"
- ✅ "멈춰"

## 🐛 버그 체크 포인트

### 출발 시
- [ ] `navigationStarted`가 `true`로 설정되는가?
- [ ] `navStatus`가 `NAVIGATING`으로 설정되는가?
- [ ] 검색 로직이 실행되지 않는가?
- [ ] 경로 라인이 표시되는가?
- [ ] 음성 안내가 나오는가?

### 내비게이션 중
- [ ] 상태가 유지되는가?
- [ ] 검색이 차단되는가?
- [ ] 경로 라인이 유지되는가?
- [ ] 목적지가 유지되는가?

### 도착 시
- [ ] 도착 감지가 정확한가?
- [ ] 상태 전환이 정확한가?
- [ ] 음성 안내가 나오는가?
- [ ] UI가 올바르게 표시되는가?

## 📝 로그 체크 포인트

### 출발 시 필수 로그
```
[NAV] startNavigation called from voice command
✅ [MapPageContainer] 출발 의도 처리: 목적지 있음
✅ [MapPageContainer] 출발 의도: onStartNavigation 호출
✅ [MapController] NAVIGATING: 경로 요청 시작
```

### 도착 시 필수 로그
```
✅ [MapPageContainer] 도착 감지: { distanceM, place }
✅ [MapPageContainer] 도착 후 10초 경과 → idle 복귀
```

## 🎯 최종 검증 시나리오

### 시나리오 1: 버튼 클릭 출발
1. CONFIRMED 상태에서 "출발" 버튼 클릭
2. `navigationStarted = true` 확인
3. 경로 라인 표시 확인
4. "안내를 시작할게요" 음성 확인

### 시나리오 2: 음성 명령 출발 (CONFIRMED)
1. CONFIRMED 상태에서 "여기로 갈게요" 음성
2. `navigationStarted = true` 확인
3. 경로 라인 표시 확인
4. "안내를 시작할게요" 음성 확인

### 시나리오 3: 음성 명령 출발 (일반)
1. 추천 장소 표시 후 "여기로 갈게" 음성
2. `[NAV] startNavigation called` 로그 확인
3. `navigationStarted = true` 확인
4. 경로 라인 표시 확인

### 시나리오 4: 도착 감지
1. NAVIGATING 상태에서 목적지 근처 이동
2. 거리 ≤ 50m 감지
3. `navStatus = ARRIVED` 확인
4. "목적지에 도착했어요" 음성 확인
5. 10초 후 IDLE 복귀 확인
