# ⚠️ 음성 검색 플로우 빠진 지점 + 수정 사항

---

## 🔴 빠진 지점 3가지

### 1️⃣ STEP 2: 카드 1개만 표시 (현재는 리스트)

**문제:**
- 현재 코드: `ResultList`로 여러 개 결과 표시
- 플로우 요구: **카드 1개만** (가장 가까운 것)

**수정 필요:**
```typescript
// 현재
{aiResponse && overlayState.type === "result" && (
  <ResultList results={aiResponse.results} />
)}

// 수정 후
{aiResponse && overlayState.type === "result" && (
  <ResultCard 
    result={aiResponse.results[0]} // 첫 번째만
    onNavigate={...}
    onDetail={...}
  />
)}
```

---

### 2️⃣ STEP 2: 가장 가까운 핀 강조

**문제:**
- 현재 코드: 모든 핀 동일하게 표시
- 플로우 요구: 가장 가까운 1개 **강조** (더 큰 핀 or 색상 다름)

**수정 필요:**
```typescript
// 마커 생성 시
markers.forEach((marker, index) => {
  if (index === 0) {
    // 가장 가까운 것 강조
    marker.setIcon({
      path: google.maps.SymbolPath.CIRCLE,
      scale: 12, // 더 큼
      fillColor: "#FF6B6B", // 빨간색
      fillOpacity: 1,
      strokeWeight: 3,
      strokeColor: "#FFFFFF",
    });
  } else {
    // 나머지는 작게
    marker.setIcon({
      path: google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: "#4ECDC4", // 청록색
      fillOpacity: 0.8,
      strokeWeight: 2,
      strokeColor: "#FFFFFF",
    });
  }
});
```

---

### 3️⃣ STEP 2: 지도 자동 줌

**문제:**
- 현재 코드: 자동 줌 로직 불명확
- 플로우 요구: 모든 핀이 보이도록 자동 줌

**수정 필요:**
```typescript
// 결과 도착 시
if (aiResponse && aiResponse.results.length > 0) {
  const bounds = new google.maps.LatLngBounds();
  
  // 내 위치 포함
  if (userLocation) {
    bounds.extend(userLocation);
  }
  
  // 모든 결과 포함
  aiResponse.results.forEach(r => {
    bounds.extend({ lat: r.lat, lng: r.lng });
  });
  
  // 자동 줌
  map.fitBounds(bounds, {
    top: 120,
    bottom: 200,
    left: 40,
    right: 40,
  });
}
```

---

## 🟡 개선 필요 지점 2가지

### 4️⃣ STEP 4: 상세 정보 카드

**현재 상태:**
- `AIOverlayReason` 있음 (이유 설명)
- 하지만 **상세 정보 카드**는 별도 필요

**추가 필요:**
```typescript
<DetailCard
  place={selectedPlace}
  onNavigate={() => startNavigation(...)}
  onClose={() => setSelectedPlace(null)}
/>
```

**내용:**
- 장소명
- 주소
- 운영 시간 (있으면)
- 후기 요약 (AI 생성)
- [길 안내] [닫기]

---

### 5️⃣ 예외 처리 명확화

**현재 상태:**
- 결과 없을 때 처리 불명확
- 음성 인식 실패 시 처리 불명확

**추가 필요:**

#### 결과 없을 때
```typescript
{aiResponse && aiResponse.results.length === 0 && (
  <EmptyCard
    message="근처 축구장을 찾지 못했어요"
    hint="다시 말해볼까요?"
  />
)}
```

#### 음성 인식 실패
```typescript
// 에러 메시지 표시 안 함
// 자연스럽게 Idle 상태로 복귀
setWhisperState("idle");
setOverlayState({ type: "idle" });
```

---

## ✅ 수정 우선순위

### P0 (즉시 수정)
1. ✅ 카드 1개만 표시 (ResultList → ResultCard)
2. ✅ 가장 가까운 핀 강조
3. ✅ 지도 자동 줌

### P1 (이번 스프린트)
4. ✅ 상세 정보 카드 추가
5. ✅ 예외 처리 명확화

---

## 🎯 수정 후 플로우 확인

이제 이 질문에 **YES** 나오면 완료:

> ❓ "STEP 0 → STEP 1 → STEP 2 → STEP 3 → STEP 4
> 모든 단계가 명확하고 빠진 게 없나?"

---

## 🚀 다음 액션

이제 **1️⃣ UX 수정** 바로 들어간다.

수정 사항:
- ResultList → ResultCard (1개만)
- 핀 강조 로직 추가
- 자동 줌 로직 추가
- DetailCard 컴포넌트 추가
- 예외 처리 명확화

준비되면 바로 시작.
