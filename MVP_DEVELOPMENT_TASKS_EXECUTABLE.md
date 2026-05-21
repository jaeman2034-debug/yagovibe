# 🚀 1번 MVP 개발 태스크 (실행용, 안 흔들 버전)

## 🎯 전제 다시 고정

* 목적: **음성으로 주변 장소 찾기**
* 지도 = 주인공
* 음성 = 검색 입력
* 자동 추론 ❌ / 상태 ❌ / AI 멘트 ❌

---

# 1️⃣ 프론트엔드 (FE) 태스크

## FE-0. 지도 페이지 기본 구조 (지금 화면 유지)

**Priority:** P0  
**Estimate:** 2h  
**Status:** ✅ 이미 완료

### Task

* Google Map / Tmap 유지
* 내 위치 표시
* 줌 / 드래그 가능

### Deliverable

```
src/pages/GeneralMapPage.tsx (기존 유지)
src/components/map/GoogleMapCanvas.tsx
```

### Acceptance Criteria

- [ ] 지도 정상 로딩
- [ ] 내 위치 파란 점 표시
- [ ] 줌/드래그 정상 작동

### Dependencies

None

---

## FE-1. 음성 검색 트리거 UI (핵심)

**Priority:** P0  
**Estimate:** 4h  
**Sprint:** Day 1

### Task

* 하단 영역을 **"🎙️ 말로 장소 찾기" 버튼처럼 동작**
* 클릭 → 음성 인식 시작

### 상태

* 기본: `🎙️ 말로 장소 찾기`
* 인식 중: `듣고 있어요…`

### Deliverable

```
src/components/voice/VoiceSearchButton.tsx
src/hooks/useVoiceRecognition.ts
```

### Acceptance Criteria

- [ ] 버튼 클릭 시 음성 인식 시작
- [ ] 인식 중 상태 표시
- [ ] 인식 완료 시 텍스트 반환
- [ ] 인식 실패 시 자연스럽게 복귀

### Dependencies

None

### Notes

❗ 대화 UI ❌
❗ 채팅 로그 ❌
❗ 음성 파형 표시 ❌

---

## FE-2. 음성 인식 결과 처리

**Priority:** P0  
**Estimate:** 3h  
**Sprint:** Day 1

### Task

* 텍스트로 변환된 음성 쿼리
* 그대로 BE에 전달

### 입력 예

```
"근처 축구장"
"지금 여는 헬스장"
```

### Deliverable

```
src/services/voiceSearchService.ts
```

### API 호출

```typescript
POST /api/search/voice
{
  "query": "근처 축구장",
  "lat": 37.xxx,
  "lng": 127.xxx
}
```

### Acceptance Criteria

- [ ] 음성 텍스트 정확히 전달
- [ ] 현재 위치 포함
- [ ] 에러 핸들링

### Dependencies

FE-1, BE-1

---

## FE-3. 지도 핀 렌더링

**Priority:** P0  
**Estimate:** 6h  
**Sprint:** Day 2

### Task

* 검색 결과를 지도에 핀으로 표시
* 가장 가까운 장소 1개 강조 (크기/색상)
* 지도 자동 줌 (모든 핀 보이도록)

### Deliverable

```
src/components/map/SearchResultMarkers.tsx
src/utils/mapBounds.ts
```

### Acceptance Criteria

- [ ] 검색 결과 핀 표시 (3-5개)
- [ ] 가장 가까운 핀 강조
  - 크기: 12px (나머지 8px)
  - 색상: 빨간색 (나머지 청록색)
- [ ] 지도 자동 줌 정확
- [ ] 핀 클릭 시 카드 표시

### Dependencies

FE-2, BE-3

### Notes

❌ 리스트 먼저 ❌
⭕ 지도 먼저 ⭕

---

## FE-4. 하단 결과 카드 (1개만)

**Priority:** P0  
**Estimate:** 4h  
**Sprint:** Day 3

### Task

* 가장 가까운 장소만 카드 표시
* 필수 정보: 장소명, 거리, 간단 태그
* 액션: 카드 클릭 → 상세, "여기로 가기" 버튼

### 카드 정보

* 장소명
* 거리 (예: "도보 12분 · 850m")
* 간단 태그 (무료 / 실내 / 운영중 등)

### Deliverable

```
src/components/map/ResultCard.tsx
```

### Acceptance Criteria

- [ ] 가장 가까운 장소만 표시
- [ ] 필수 정보 3개 포함
- [ ] 카드 1개만 (리스트 아님)
- [ ] "여기로 가기" 버튼 작동

### Dependencies

FE-3

---

## FE-5. 길찾기 연결

**Priority:** P0  
**Estimate:** 3h  
**Sprint:** Day 4

### Task

* "여기로 가기" 버튼 클릭
* 외부 지도 앱 연결 (초기엔)

### 지원 앱

* Google Maps
* Kakao Map
* Tmap

### Deliverable

```
src/utils/navigation.ts
```

### Acceptance Criteria

- [ ] 버튼 클릭 시 외부 지도 앱 열기
- [ ] 목적지 좌표 정확히 전달
- [ ] 앱 없으면 웹 지도 열기

### Dependencies

FE-4

### Notes

* 내부 네비 ❌ (초기)
* 외부 지도 앱 연결 OK

---

# 2️⃣ 백엔드 (BE) 태스크

## BE-1. 음성 검색 쿼리 처리 API

**Priority:** P0  
**Estimate:** 4h  
**Sprint:** Day 1

### Task

* 음성 쿼리 받아서 처리
* 키워드 추출
* 카테고리 매핑

### Endpoint

```
POST /api/search/voice
```

### Request

```json
{
  "query": "근처 축구장",
  "lat": 37.742,
  "lng": 127.049
}
```

### Response

```json
{
  "category": "SOCCER_FIELD",
  "parsedQuery": "축구장",
  "hasCondition": false
}
```

### Deliverable

```
functions/src/api/searchVoice.ts
```

### Acceptance Criteria

- [ ] 쿼리 파싱 성공
- [ ] 카테고리 매핑 정확
- [ ] 조건 추출 (있으면)

### Dependencies

BE-2

---

## BE-2. 키워드 → 카테고리 매핑 (초기엔 단순)

**Priority:** P0  
**Estimate:** 3h  
**Sprint:** Day 1

### Task

* 키워드 하드코딩 매핑
* NLP ❌ (초기엔)

### 매핑 테이블

| 키워드 | 카테고리 | 코드 |
|------|--------|------|
| 축구장 | SOCCER_FIELD | `soccer` |
| 헬스장 | GYM | `gym` |
| 헬스 | GYM | `gym` |
| 배드민턴 | BADMINTON | `badminton` |
| 배드민턴장 | BADMINTON | `badminton` |
| 카페 | CAFE | `cafe` |
| 커피 | CAFE | `cafe` |

### 조건 키워드

| 키워드 | 조건 |
|------|------|
| 근처 | radius: 1000m |
| 가까운 | radius: 1000m |
| 지금 여는 | isOpen: true |
| 무료 | isFree: true |

### Deliverable

```
functions/src/utils/keywordMapper.ts
```

### Acceptance Criteria

- [ ] 4개 카테고리 매핑 정확
- [ ] 조건 키워드 인식
- [ ] 매칭 실패 시 null 반환

### Dependencies

None

### Notes

👉 NLP ❌
👉 하드코딩 ⭕ (처음엔 충분)

---

## BE-3. 장소 데이터 조회

**Priority:** P0  
**Estimate:** 8h  
**Sprint:** Day 2-3

### Task

* 카테고리별 장소 조회
* 반경 내 필터링
* 거리 계산

### 데이터 소스

* 공공 체육시설 API
* POI 데이터
* 자체 DB (있다면)

### 필수 필드

```typescript
interface Place {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  distance: number; // meters
  isOpen?: boolean;
  isFree?: boolean;
  tags?: string[]; // ["무료", "실내", "운영중"]
}
```

### Deliverable

```
functions/src/services/placeService.ts
functions/src/data/places.ts (Mock 초기)
```

### Acceptance Criteria

- [ ] 카테고리별 조회 성공
- [ ] 반경 2km 내 필터링
- [ ] 거리 계산 정확
- [ ] 최대 5개 결과 반환

### Dependencies

BE-2

---

## BE-4. 정렬 로직

**Priority:** P0  
**Estimate:** 3h  
**Sprint:** Day 3

### Task

* 기본: **거리순**
* 조건 있으면:
  * "지금 여는" → isOpen = true 우선
  * "무료" → isFree = true 우선

### 정렬 규칙

1. 조건 매칭 우선
2. 거리순 (가까운 것 먼저)
3. 최대 5개

### Deliverable

```
functions/src/utils/sortPlaces.ts
```

### Acceptance Criteria

- [ ] 거리순 정렬 정확
- [ ] 조건 우선 정렬 작동
- [ ] 최대 5개 제한

### Dependencies

BE-3

---

## BE-5. 응답 포맷 (프론트 최적화)

**Priority:** P0  
**Estimate:** 2h  
**Sprint:** Day 3

### Task

* 프론트 최적화된 응답 포맷
* primary (가장 가까운 1곳) 분리

### Response Format

```json
{
  "primary": {
    "id": "place_1",
    "name": "의정부 축구장",
    "lat": 37.742,
    "lng": 127.049,
    "distance": 850,
    "category": "SOCCER_FIELD",
    "tags": ["무료", "야외", "운영중"]
  },
  "others": [
    {
      "id": "place_2",
      "name": "민락동 축구장",
      "distance": 1200,
      ...
    }
  ]
}
```

### Deliverable

```
functions/src/utils/formatSearchResponse.ts
```

### Acceptance Criteria

- [ ] primary 분리 정확
- [ ] others 배열 정확
- [ ] FE 바로 사용 가능한 포맷

### Dependencies

BE-4

### Notes

👉 FE는 **primary만 바로 사용**

---

# 3️⃣ MVP 성공 로그 (진짜 중요)

## 수집할 로그는 이것뿐이다

### 이벤트 1: 음성 버튼 클릭

```typescript
logEvent("voice_button_click", {
  timestamp: Date.now(),
  userId: string,
});
```

### 이벤트 2: 음성 인식 성공

```typescript
logEvent("voice_recognition_success", {
  query: string,
  category: string,
  timestamp: Date.now(),
});
```

### 이벤트 3: 검색 결과 표시

```typescript
logEvent("search_results_shown", {
  category: string,
  resultCount: number,
  primaryDistance: number,
});
```

### 이벤트 4: "여기로 가기" 클릭

```typescript
logEvent("navigation_clicked", {
  placeId: string,
  placeName: string,
  distance: number,
});
```

### 이벤트 5: 음성 인식 실패

```typescript
logEvent("voice_recognition_failed", {
  error: string,
  timestamp: Date.now(),
});
```

## 측정 지표

### 핵심 지표

1. **음성 버튼 클릭률**
   - 전체 사용자 중 클릭한 비율

2. **음성 → 결과 성공률**
   - 클릭 후 결과 표시까지 성공 비율

3. **"여기로 가기" 클릭률**
   - 결과 표시 후 길찾기 클릭 비율

### 계산식

```
음성 → 결과 성공률 = 
  (음성 인식 성공 + 검색 결과 표시) / 음성 버튼 클릭

"여기로 가기" 클릭률 = 
  "여기로 가기" 클릭 / 검색 결과 표시
```

## ❌ 수집하지 않는 것

* DAU
* 체류 시간
* 페이지뷰
* 세션 길이

⭕ **검색 성공률만**

---

# ⏱️ 현실적인 개발 일정 (소규모 팀 기준)

## Week 1 (MVP 완성)

### Day 1 (8h)
- [ ] FE-1: 음성 검색 트리거 UI
- [ ] FE-2: 음성 인식 결과 처리
- [ ] BE-1: 음성 검색 쿼리 처리 API
- [ ] BE-2: 키워드 → 카테고리 매핑

### Day 2 (8h)
- [ ] FE-3: 지도 핀 렌더링
- [ ] BE-3: 장소 데이터 조회 (Mock)

### Day 3 (8h)
- [ ] FE-4: 하단 결과 카드
- [ ] BE-4: 정렬 로직
- [ ] BE-5: 응답 포맷

### Day 4 (8h)
- [ ] FE-5: 길찾기 연결
- [ ] 통합 테스트
- [ ] 버그 수정

### Day 5 (8h)
- [ ] 실사용 테스트
- [ ] 로그 수집 설정
- [ ] 배포 준비

---

## 🧠 지금 단계에서 가장 중요한 말

> **이 MVP는
> "우리가 똑똑하다"를 증명하는 게 아니라
> "이게 더 빠르다"를 증명하는 단계다.**

---

## ✅ MVP 완성 체크리스트

### 기능
- [ ] 음성 버튼 클릭 → 인식 시작
- [ ] 음성 텍스트 → 카테고리 매핑
- [ ] 검색 결과 → 지도 핀 표시
- [ ] 가장 가까운 핀 강조
- [ ] 결과 카드 1개 표시
- [ ] "여기로 가기" 버튼 작동

### UX
- [ ] 키보드 없이 말만으로 검색 가능
- [ ] 결과가 바로 지도에 표시
- [ ] 3초 안에 결정 가능
- [ ] "편하다" 피드백 수집

### 로그
- [ ] 음성 버튼 클릭 로그
- [ ] 음성 인식 성공/실패 로그
- [ ] 검색 결과 표시 로그
- [ ] "여기로 가기" 클릭 로그

---

## 🚀 다음 단계

이제 바로 이어서 할 수 있는 건:

1️⃣ **이 태스크를 Jira/Notion 티켓 문구로 써줄까**
2️⃣ **음성 인식 실패했을 때 UX만 따로 설계해줄까**
3️⃣ **실제 사용자 테스트 시나리오 + 질문지 만들어줄까**
