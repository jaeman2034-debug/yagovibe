# ✅ 음성/버튼/상태 1:1 매핑 최종 점검표

## 🔶 A. 출발 의도 감지 (가장 중요)

### 입력 → 기대 동작 매핑

| 입력 | 기대 동작 | 필수 조건 | 검증 로그 |
|------|----------|----------|----------|
| **버튼: "여기로 갈게요"** | `startNavigation()` 호출 | ❌ Places 검색 금지 | `[NAV] startNavigation` |
| **음성: "여기로 갈게"** | `detectStartIntent()` → `startNavigation()` | **검색보다 먼저 실행** | `[NAV] startNavigation called from voice command` |
| **음성: "출발"** | `detectStartIntent()` → `startNavigation()` | **검색보다 먼저 실행** | `[NAV] startNavigation called from voice command` |
| **음성: "안내 시작"** | `detectStartIntent()` → `startNavigation()` | **검색보다 먼저 실행** | `[NAV] startNavigation called from voice command` |

### ✅ 검증 로그 (필수)

```typescript
// 출발 의도 감지
🎤 [MapPageContainer] 출발 의도 감지: 여기로 갈게

// 목적지 확인
✅ [MapPageContainer] 출발 의도 처리: 목적지 있음

// startNavigation 호출
[NAV] startNavigation called from voice command

// 상태 전환
navigationStarted === true ✅
navStatus === 'NAVIGATING' ✅
confirmedDestination !== null ✅

// 경로 계산
✅ [MapPageContainer] 출발 의도: onStartNavigation 호출
[NAV] startNavigation
✅ [MapController] NAVIGATING: 경로 요청 시작
```

### ❌ 실패 패턴

```typescript
// 검색으로 처리됨
🔍 [MapController] Places API 검색 시작... { searchQuery: '여기로 갈게.' }
❌ 이 로그가 나오면 실패

// 상태 불일치
navStatus: 'NAVIGATING'
navigationStarted: false ❌
❌ 이 조합이 나오면 실패
```

---

## 🔶 B. NAVIGATING 상태 UI / 로직

### UI 표시 조건

| 항목 | 기준 | 코드 예시 |
|------|------|----------|
| **NavigationCard 표시** | `navigationStarted === true` | `{navigationStarted && <NavigationCard />}` |
| **"안내 그만할게요" 버튼** | `navigationStarted === true` | `{navigationStarted && <StopButton />}` |
| **경로 라인 표시** | `navigationStarted === true && confirmedDestination` | `{navigationStarted && confirmedDestination && <RouteLine />}` |
| **DestinationLabel 표시** | `!(navStatus === 'NAVIGATING' && navigationStarted)` | `{!(navStatus === 'NAVIGATING' && navigationStarted) && <DestinationLabel />}` |

### 로직 차단 조건

| 항목 | 기준 | 코드 예시 |
|------|------|----------|
| **Places API 호출** | ❌ `navigationStarted === true`면 차단 | `if (navigationStarted) return;` |
| **onPlacesUpdate** | ❌ `navigationStarted === true`면 차단 | `if (navigationStarted) return;` |
| **검색 트리거** | ❌ `navigationStarted === true`면 차단 | `if (navigationStarted) return;` |
| **검색 결과 초기화** | ❌ `navigationStarted === true`면 차단 | `if (navigationStarted) return;` |

### ✅ 올바른 조건 패턴

```typescript
// 정답: navigationStarted 기준
if (!navigationStarted) {
  allowSearch();
  allowPlacesUpdate();
} else {
  blockSearch();
  blockPlacesUpdate();
}
```

### ❌ 잘못된 조건 패턴

```typescript
// 금지: navStatus만 체크
if (navStatus !== 'NAVIGATING') {
  allowSearch(); // ❌ navigationStarted가 false일 수 있음
}

// 금지: UI 조건 불일치
if (navStatus === 'NAVIGATING') {
  showNavigationUI(); // ❌ navigationStarted가 false일 수 있음
}
```

---

## 🔶 C. 음성 안내 시퀀스 (NAVIGATING)

### 시점별 멘트

| 시점 | 멘트 | 트리거 |
|------|------|--------|
| **startNavigation 직후** | "안내를 시작할게요" | `speakOnce('안내를 시작할게요')` |
| **경로 계산 완료** | "○○까지 안내할게요" | (선택적) |
| **중간 안내** | 거리/방향 | 주기적 (10~15초) |
| **도착** | "목적지에 도착했어요" | `distanceM <= 50` |

### ✅ 정상 흐름

```typescript
startNavigation()
  ↓
speakOnce('안내를 시작할게요')
  ↓
경로 계산 완료
  ↓
음성 안내 loop 시작
  ↓
도착 감지
  ↓
speakOnce('목적지에 도착했어요')
```

### ❌ 실패 패턴

```typescript
// 첫 멘트만 나오고 다음 액션 없음
speakOnce('안내를 시작할게요')
  ↓
❌ 경로 계산 안 됨 (navigationStarted === false)
❌ 음성 루프 미진입 (navigationStarted === false)
```

---

## 🔶 D. ARRIVED 상태

### UI 구성

| 항목 | 기준 | 설명 |
|------|------|------|
| **지도** | 마지막 위치 유지 | 현재 위치 마커 유지 |
| **목적지 카드** | ✅ 표시 | `confirmedDestination` 기준 |
| **이미지** | 카드와 **공존** | 배경 오버레이 (보조 역할) |
| **NavigationCard** | ❌ 제거 | ARRIVED 모드로 전환 |
| **마켓 버튼** | ✅ 표시 | "이 근처 중고 상품 보기" |

### 상태 전환

```typescript
// 도착 감지
if (distanceM <= 50) {
  setNavStatus('ARRIVED');
  setSearchPhase('arrived');
  setNavigationStarted(false); // ✅ 허용: 도착 시에만
  
  speakOnce('목적지에 도착했어요');
}
```

---

## 🔶 E. 음성 키워드 매핑

### 출발 명령

| 키워드 | 감지 함수 | 처리 함수 |
|--------|----------|----------|
| "여기로 갈게" | `detectStartIntent()` | `startNavigation()` |
| "여기로 갈게요" | `detectStartIntent()` | `startNavigation()` |
| "출발" | `detectStartIntent()` | `startNavigation()` |
| "가자" | `detectStartIntent()` | `startNavigation()` |
| "갈게" | `detectStartIntent()` | `startNavigation()` |
| "안내" | `detectStartIntent()` | `startNavigation()` |
| "길 안내" | `detectStartIntent()` | `startNavigation()` |

### 다른 곳 요청

| 키워드 | 감지 함수 | 처리 함수 |
|--------|----------|----------|
| "다른 곳" | `handleConfirmedVoiceCommand()` | `showAnotherPlace()` |
| "다른 데" | `handleConfirmedVoiceCommand()` | `showAnotherPlace()` |
| "다른 곳 보여줘" | `handleConfirmedVoiceCommand()` | `showAnotherPlace()` |

### 취소/중지

| 키워드 | 감지 함수 | 처리 함수 |
|--------|----------|----------|
| "아니" | `handleConfirmedVoiceCommand()` | `stopNavigation()` |
| "그만" | `handleConfirmedVoiceCommand()` | `stopNavigation()` |
| "취소" | `handleConfirmedVoiceCommand()` | `stopNavigation()` |
| "멈춰" | (NAVIGATING 중) | `stopNavigation()` |

---

## 🔶 F. 상태 전환 매트릭스

| 현재 상태 | 액션 | 다음 상태 | 조건 | 검증 |
|----------|------|----------|------|------|
| IDLE | 검색 | SEARCHING | 검색어 입력 | `searchStatus === 'searching'` |
| SEARCHING | 결과 도출 | CONFIRMED | places 배열 업데이트 | `recommendedPlace !== null` |
| CONFIRMED | 출발 (버튼/음성) | NAVIGATING | `startNavigation()` 호출 | `navigationStarted === true` |
| NAVIGATING | 도착 감지 | ARRIVED | 거리 ≤ 50m | `navStatus === 'ARRIVED'` |
| ARRIVED | 10초 경과 | IDLE | 자동 | `navStatus === 'IDLE'` |
| ARRIVED | 사용자 액션 | IDLE | 마켓 이동 등 | `navStatus === 'IDLE'` |
| NAVIGATING | 중지 (음성) | IDLE | "멈춰", "그만" | `navigationStarted === false` |

---

## 🔶 G. 버그 체크 포인트

### 출발 시 버그

- [ ] `navigationStarted`가 `true`로 설정되는가?
- [ ] `navStatus`가 `NAVIGATING`으로 설정되는가?
- [ ] 검색 로직이 실행되지 않는가?
- [ ] `onPlacesUpdate`가 차단되는가?
- [ ] 경로 라인이 표시되는가?
- [ ] 음성 안내가 나오는가?

### NAVIGATING 중 버그

- [ ] `navigationStarted`가 `true`로 유지되는가?
- [ ] 검색이 차단되는가?
- [ ] `onPlacesUpdate`가 차단되는가?
- [ ] 경로 라인이 유지되는가?
- [ ] 목적지가 유지되는가?
- [ ] "좀비 상태"가 발생하지 않는가?

### 도착 시 버그

- [ ] 도착 감지가 정확한가?
- [ ] 상태 전환이 정확한가?
- [ ] `navigationStarted`가 `false`로 설정되는가?
- [ ] 음성 안내가 나오는가?
- [ ] UI가 올바르게 표시되는가?

---

## 🔶 H. 실전 테스트 시나리오

### 시나리오 1: 버튼 클릭 출발

```
1. CONFIRMED 상태에서 "출발" 버튼 클릭
2. 로그 확인:
   - [NAV] startNavigation
   - navigationStarted === true
   - navStatus === 'NAVIGATING'
3. 화면 확인:
   - 경로 라인 표시 ✅
   - NavigationCard 표시 ✅
   - "안내를 시작할게요" 음성 ✅
```

### 시나리오 2: 음성 명령 출발 (CONFIRMED)

```
1. CONFIRMED 상태에서 "여기로 갈게요" 음성
2. 로그 확인:
   - 🎤 [MapPageContainer] CONFIRMED 음성 명령: 출발
   - [NAV] startNavigation
   - navigationStarted === true
3. 화면 확인:
   - 경로 라인 표시 ✅
   - NavigationCard 표시 ✅
```

### 시나리오 3: 음성 명령 출발 (일반)

```
1. 추천 장소 표시 후 "여기로 갈게" 음성
2. 로그 확인:
   - 🎤 [MapPageContainer] 출발 의도 감지
   - [NAV] startNavigation called from voice command
   - navigationStarted === true
3. 검색 로그 확인:
   - ❌ Places API 검색 시작... 없어야 함
   - ❌ 검색 트리거 없어야 함
```

### 시나리오 4: NAVIGATING 중 검색 차단

```
1. NAVIGATING 상태에서 "근처 카페" 음성
2. 로그 확인:
   - [SEARCH BLOCKED] navigation in progress
   - [onPlacesUpdate BLOCKED] navigation in progress
   - ❌ Places API 호출 없어야 함
```

### 시나리오 5: 도착 감지

```
1. NAVIGATING 상태에서 목적지 근처 이동
2. 거리 ≤ 50m 감지
3. 로그 확인:
   - ✅ [MapPageContainer] 도착 감지
   - navStatus === 'ARRIVED'
   - navigationStarted === false
4. 화면 확인:
   - 목적지 카드 유지 ✅
   - 도착 이미지 표시 ✅
   - "목적지에 도착했어요" 음성 ✅
```

---

## 🔶 I. 최종 검증 체크리스트

### 출발 시 (필수)

- [ ] `[NAV] startNavigation` 로그 출력
- [ ] `navigationStarted === true` 설정
- [ ] `navStatus === 'NAVIGATING'` 설정
- [ ] `confirmedDestination !== null` 설정
- [ ] 검색 로직 차단 확인
- [ ] `onPlacesUpdate` 차단 확인
- [ ] 경로 계산 트리거 확인
- [ ] 음성 안내 출력 확인

### NAVIGATING 중 (필수)

- [ ] `navigationStarted === true` 유지
- [ ] 검색 차단 유지
- [ ] `onPlacesUpdate` 차단 유지
- [ ] 경로 라인 표시 유지
- [ ] NavigationCard 표시 유지
- [ ] 목적지 유지
- [ ] "좀비 상태" 없음

### 도착 시 (필수)

- [ ] 도착 감지 정확함
- [ ] 상태 전환 정확함
- [ ] 음성 안내 출력
- [ ] UI 올바르게 표시

---

## 🔶 J. 상태 불변식 검증

### 불변식 1: NAVIGATING 상태

```typescript
// 항상 참이어야 함
if (navStatus === 'NAVIGATING') {
  assert(navigationStarted === true, 'NAVIGATING은 navigationStarted와 함께');
  assert(confirmedDestination !== null, 'NAVIGATING은 목적지 필요');
}
```

### 불변식 2: navigationStarted 상태

```typescript
// 항상 참이어야 함
if (navigationStarted === true) {
  assert(navStatus === 'NAVIGATING', 'navigationStarted는 NAVIGATING과 함께');
  assert(confirmedDestination !== null, 'navigationStarted는 목적지 필요');
}
```

### 불변식 3: 검색 차단

```typescript
// 항상 참이어야 함
if (navigationStarted === true) {
  assert(searchBlocked === true, 'NAVIGATING 중 검색 차단');
  assert(placesUpdateBlocked === true, 'NAVIGATING 중 places 업데이트 차단');
}
```

---

## 🔶 K. 실패 패턴 진단

### 패턴 1: "좀비 상태"

**증상:**
- `navStatus === 'NAVIGATING'`
- `navigationStarted === false`
- UI는 내비 중, 로직은 아님

**원인:**
- `navStatus`만 변경되고 `navigationStarted`는 변경 안 됨
- 또는 `navigationStarted`가 false로 롤백됨

**해결:**
- `startNavigation()`에서 `navigationStarted`를 먼저 설정
- 검색/places 업데이트에서 `navigationStarted` false 금지

---

### 패턴 2: "검색으로 처리됨"

**증상:**
- "여기로 갈게"가 검색으로 처리됨
- Places API 호출됨

**원인:**
- `detectStartIntent()`가 실행 안 됨
- 또는 검색 로직이 먼저 실행됨

**해결:**
- 출발 의도 감지를 최우선으로 체크
- 출발 의도 감지 후 즉시 `return`

---

### 패턴 3: "상태 롤백"

**증상:**
- `navigationStarted`가 true로 설정됐다가 false로 롤백됨

**원인:**
- `onPlacesUpdate`에서 상태 초기화
- 검색 결과 초기화에서 상태 초기화

**해결:**
- `onPlacesUpdate`에 NAVIGATING 가드 추가
- 검색 결과 초기화에서 `navigationStarted` false 금지

---

## 🔶 L. 최종 검증 시나리오 (E2E)

### 시나리오 A: 완전한 내비게이션 플로우

```
1. 검색: "축구장"
   → 추천 카드 표시 ✅
   → TTS: "지금 위치에서..." ✅

2. 출발: "여기로 갈게"
   → [NAV] startNavigation ✅
   → navigationStarted === true ✅
   → 경로 라인 표시 ✅
   → TTS: "안내를 시작할게요" ✅

3. NAVIGATING 중
   → 경로 라인 유지 ✅
   → NavigationCard 표시 ✅
   → 검색 차단 ✅

4. 도착
   → 도착 감지 ✅
   → TTS: "목적지에 도착했어요" ✅
   → ARRIVED UI 표시 ✅

5. 복귀
   → 10초 후 IDLE 복귀 ✅
```

---

## 🔶 M. 코드 검증 포인트

### startNavigation() 검증

```typescript
function startNavigation() {
  // ✅ 1. navigationStarted 먼저 설정
  setNavigationStarted(true);
  
  // ✅ 2. navStatus 설정
  setNavStatus('NAVIGATING');
  
  // ✅ 3. 목적지 확정
  setConfirmedDestination(place);
  
  // ✅ 4. 검색 차단
  // (이미 위에서 처리)
  
  // ✅ 5. 경로 계산
  onStartNavigation();
  
  // ✅ 6. 음성 안내
  speakOnce('안내를 시작할게요');
}
```

### onPlacesUpdate 검증

```typescript
function onPlacesUpdate(newPlaces) {
  // ✅ NAVIGATING 체크 (가장 먼저)
  if (navigationStarted || (navStatus === 'NAVIGATING' && navigationStarted)) {
    return; // 완전 차단
  }
  
  // ✅ 나머지 로직
  setPlaces(newPlaces);
}
```

---

이 점검표 기준으로 테스트하면 **실전에서 안 깨진다**.
