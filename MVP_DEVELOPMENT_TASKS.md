# 🧱 1번 MVP 개발 태스크 (재정리)

> 1번 MVP 기능 목록 기준으로 프론트/백엔드 태스크 재분해

---

## 🎯 MVP 범위

**P0 기능만 구현:**
1. 음성 검색
2. 내 위치 기반 검색
3. 지도 핀 표시
4. 결과 카드 1개
5. 길찾기 연결

---

# 1️⃣ 프론트엔드 태스크 (FE)

## FE-MVP-1. 음성 검색 UI

**Priority:** P0  
**Estimate:** 6h  
**Sprint:** Week 1

### Task

* 하단 "🎙️ 말로 장소 찾기" 버튼 클릭 시 음성 입력 시작
* 음성 인식 중 상태 표시 ("듣고 있어요…")
* 키워드 매칭 (자연어 완벽 이해 ❌)

### Deliverable

```
src/components/voice/VoiceSearchButton.tsx
src/hooks/useVoiceSearch.ts
```

### Acceptance Criteria

- [ ] 버튼 클릭 시 음성 입력 시작
- [ ] 인식 중 상태 표시
- [ ] 키워드 추출 (축구장, 헬스장, 배드민턴장, 카페)
- [ ] 인식 실패 시 자연스럽게 복귀

### Dependencies

None

---

## FE-MVP-2. 내 위치 기반 검색 연동

**Priority:** P0  
**Estimate:** 4h  
**Sprint:** Week 1

### Task

* 현재 위치 획득
* 반경 2km 내 장소 검색 API 호출
* 카테고리별 필터링

### Deliverable

```
src/hooks/useLocationSearch.ts
src/services/placeSearch.ts
```

### Acceptance Criteria

- [ ] 현재 위치 정확히 획득
- [ ] 반경 2km 내 검색
- [ ] 4개 카테고리 지원 (축구장, 헬스장, 배드민턴장, 카페)

### Dependencies

BE-MVP-1

---

## FE-MVP-3. 지도 핀 표시 + 강조

**Priority:** P0  
**Estimate:** 6h  
**Sprint:** Week 1

### Task

* 검색 결과를 지도 핀으로 표시
* 가장 가까운 장소 1개 강조 (크기/색상)
* 지도 자동 줌 (모든 핀 보이도록)

### Deliverable

```
src/components/map/SearchResultMarkers.tsx
src/utils/mapZoom.ts
```

### Acceptance Criteria

- [ ] 검색 결과 핀 표시 (3-5개)
- [ ] 가장 가까운 핀 강조
- [ ] 지도 자동 줌 정확

### Dependencies

FE-MVP-2

---

## FE-MVP-4. 결과 카드 1개 (하단)

**Priority:** P0  
**Estimate:** 4h  
**Sprint:** Week 1

### Task

* 가장 가까운 장소만 카드 표시
* 필수 정보: 이름, 거리, 간단 상태
* 카드 1개만 (스크롤 리스트 ❌)

### Deliverable

```
src/components/map/ResultCard.tsx
```

### Acceptance Criteria

- [ ] 가장 가까운 장소만 표시
- [ ] 필수 정보 3개 포함
- [ ] 카드 1개만 (리스트 아님)

### Dependencies

FE-MVP-3

---

## FE-MVP-5. 길찾기 연결

**Priority:** P0  
**Estimate:** 4h  
**Sprint:** Week 2

### Task

* "여기로 가기" 버튼
* "여기로 가자" 음성 명령
* 외부 지도 앱 연결 (선택)

### Deliverable

```
src/components/map/NavigationButton.tsx
src/utils/navigation.ts
```

### Acceptance Criteria

- [ ] 버튼 클릭 시 길찾기 시작
- [ ] 음성 명령으로도 길찾기 가능
- [ ] 외부 지도 앱 연결 (선택)

### Dependencies

FE-MVP-4

---

# 2️⃣ 백엔드 태스크 (BE)

## BE-MVP-1. 내 위치 기반 장소 검색 API

**Priority:** P0  
**Estimate:** 8h  
**Sprint:** Week 1

### Task

* 현재 위치 기준 반경 검색
* 카테고리별 필터링
* 거리순 정렬

### Endpoint

```
POST /api/places/search
```

### Request

```typescript
{
  location: { lat: number; lng: number };
  category: "축구장" | "헬스장" | "배드민턴장" | "카페";
  radius: number; // meters, default: 2000
}
```

### Response

```typescript
{
  results: Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    distance: number; // meters
    category: string;
    status?: "무료" | "실내" | "운영중";
  }>;
}
```

### Deliverable

```
functions/src/api/searchPlaces.ts
```

### Acceptance Criteria

- [ ] 반경 2km 내 검색
- [ ] 4개 카테고리 지원
- [ ] 거리순 정렬
- [ ] 최대 5개 결과 반환

### Dependencies

None

---

## BE-MVP-2. 장소 데이터 준비

**Priority:** P0  
**Estimate:** 6h  
**Sprint:** Week 1

### Task

* 4개 카테고리 장소 데이터 수집/입력
* Firestore 컬렉션 구조 설계
* Mock 데이터 준비 (초기)

### Deliverable

```
functions/src/data/places.ts (Mock)
functions/src/models/Place.ts
```

### Acceptance Criteria

- [ ] 4개 카테고리 데이터 준비
- [ ] Firestore 컬렉션 생성
- [ ] Mock 데이터 최소 20개

### Dependencies

None

---

## BE-MVP-3. 음성 키워드 매칭

**Priority:** P0  
**Estimate:** 4h  
**Sprint:** Week 1

### Task

* 음성 텍스트에서 카테고리 키워드 추출
* 간단한 키워드 매칭 (자연어 완벽 이해 ❌)

### Endpoint

```
POST /api/voice/parse
```

### Request

```typescript
{
  text: string;
}
```

### Response

```typescript
{
  category: "축구장" | "헬스장" | "배드민턴장" | "카페" | null;
  confidence: number;
}
```

### Deliverable

```
functions/src/api/parseVoiceCategory.ts
```

### Acceptance Criteria

- [ ] 4개 카테고리 키워드 매칭
- [ ] "근처", "가까운" 등 무시
- [ ] 매칭 실패 시 null 반환

### Dependencies

None

---

# 🗓️ MVP 스프린트 계획

## Week 1 (Foundation)

### Day 1-2
- [ ] FE-MVP-1: 음성 검색 UI
- [ ] BE-MVP-2: 장소 데이터 준비
- [ ] BE-MVP-3: 음성 키워드 매칭

### Day 3-4
- [ ] BE-MVP-1: 장소 검색 API
- [ ] FE-MVP-2: 검색 연동
- [ ] FE-MVP-3: 지도 핀 표시

### Day 5
- [ ] FE-MVP-4: 결과 카드 1개
- [ ] 통합 테스트

---

## Week 2 (Completion)

### Day 1-2
- [ ] FE-MVP-5: 길찾기 연결
- [ ] 버그 수정

### Day 3-4
- [ ] 사용자 테스트
- [ ] UX 개선

### Day 5
- [ ] 배포 준비

---

# ✅ MVP 성공 기준 체크리스트

## 기능 완성도
- [ ] P0 기능 5개 모두 구현
- [ ] 음성 검색 정상 작동
- [ ] 지도 핀 표시 정확
- [ ] 결과 카드 1개 표시
- [ ] 길찾기 연결 성공

## 사용자 경험
- [ ] 키보드 없이 말만으로 장소 찾기 가능
- [ ] 결과가 바로 지도에 표시
- [ ] 3초 안에 결정 가능
- [ ] "편하다" 피드백 수집

---

# 🧠 핵심 원칙

> **1번 MVP는
> "똑똑함"을 증명하는 단계가 아니다.
>
> "편리함"을 증명하는 단계다.**

---

## 🚀 다음 단계

이제 바로 이어서 할 수 있는 건:

1️⃣ **이 MVP 기준으로 프론트/백엔드 개발 태스크 다시 쪼개기** ✅ (완료)
2️⃣ **음성 검색 실패 케이스 UX만 따로 설계**
3️⃣ **이 MVP로 실제 사용자 테스트 질문지 만들기**
