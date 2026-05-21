# 🧾 1번 MVP 개발 티켓 세트 (Jira / Notion 공용)

> 오늘 바로 개발 시작 가능한 수준

---

## 🎯 Epic 01 — 음성 검색 지도 MVP

**Goal**
키보드 없이 음성으로 주변 장소·시설을 검색하고
지도에서 바로 결과를 확인할 수 있다.

**Success Criteria**
- [ ] 음성 버튼 클릭 → 인식 시작
- [ ] 검색 결과 → 지도 핀 표시
- [ ] 결과 카드 1개 표시
- [ ] "여기로 가기" 버튼 작동

**Labels:** `mvp`, `voice-search`, `map`

---

## 🧩 FE 티켓 (Frontend)

---

### 🎫 FE-01. 지도 페이지 기본 세팅

**Type:** Story  
**Priority:** Highest  
**Estimate:** 2h  
**Sprint:** Day 1

**설명**
지도 페이지를 음성 검색 중심 구조로 구성한다.

**작업 내용**
* 지도 SDK 연동 (Google Map / Tmap 유지)
* 내 위치 표시 (파란 점)
* 줌 / 드래그 가능

**완료 조건**
- [ ] 앱 실행 시 지도 + 내 위치 표시
- [ ] 검색 UI 없음 (지도만)
- [ ] 줌/드래그 정상 작동

**Deliverables:**
- `src/pages/GeneralMapPage.tsx` (기존 유지)
- `src/components/map/GoogleMapCanvas.tsx`

**Dependencies:** None

**Labels:** `frontend`, `map`, `p0`

---

### 🎫 FE-02. 음성 검색 버튼 UI

**Type:** Story  
**Priority:** Highest  
**Estimate:** 4h  
**Sprint:** Day 1

**설명**
하단에 음성 검색 트리거 UI를 추가한다.

**UI 문구**
```
🎙️ 말로 장소 찾기
```

**상태**
* 기본: `🎙️ 말로 장소 찾기`
* 인식 중: `듣고 있어요…`

**완료 조건**
- [ ] 버튼 클릭 시 음성 인식 시작
- [ ] 인식 중 상태 시각적으로 표시
- [ ] 인식 완료 시 텍스트 반환
- [ ] 인식 실패 시 자연스럽게 복귀

**Deliverables:**
- `src/components/voice/VoiceSearchButton.tsx`
- `src/hooks/useVoiceRecognition.ts`

**Dependencies:** None

**Labels:** `frontend`, `voice`, `p0`

**Notes:**
❗ 대화 UI ❌
❗ 채팅 로그 ❌

---

### 🎫 FE-03. 음성 인식 결과 처리

**Type:** Story  
**Priority:** Highest  
**Estimate:** 3h  
**Sprint:** Day 1

**설명**
음성 인식 결과를 텍스트로 변환해 서버로 전달한다.

**입력 예**
```json
{
  "query": "근처 축구장"
}
```

**API 호출**
```typescript
POST /api/search/voice
{
  "query": "근처 축구장",
  "lat": 37.xxx,
  "lng": 127.xxx
}
```

**완료 조건**
- [ ] 음성 → 텍스트 변환 성공
- [ ] 결과를 BE API로 전송
- [ ] 현재 위치 포함
- [ ] 에러 핸들링

**Deliverables:**
- `src/services/voiceSearchService.ts`

**Dependencies:**
- FE-02
- BE-01

**Labels:** `frontend`, `api`, `p0`

---

### 🎫 FE-04. 지도 핀 표시

**Type:** Story  
**Priority:** Highest  
**Estimate:** 6h  
**Sprint:** Day 2

**설명**
검색 결과를 지도에 핀으로 표시한다.

**규칙**
* 가장 가까운 장소 1개 강조 (크기 12px, 빨간색)
* 나머지는 기본 핀 (크기 8px, 청록색)
* 지도 자동 줌 (모든 핀 보이도록)

**완료 조건**
- [ ] 검색 시 지도에 핀 노출
- [ ] 가장 가까운 핀 강조
- [ ] 지도 자동 줌 정확
- [ ] 핀 클릭 시 카드 표시

**Deliverables:**
- `src/components/map/SearchResultMarkers.tsx`
- `src/utils/mapBounds.ts`

**Dependencies:**
- FE-03
- BE-03

**Labels:** `frontend`, `map`, `p0`

**Notes:**
❌ 리스트 먼저 ❌
⭕ 지도 먼저 ⭕

---

### 🎫 FE-05. 하단 결과 카드 (1개)

**Type:** Story  
**Priority:** Highest  
**Estimate:** 4h  
**Sprint:** Day 3

**설명**
가장 가까운 장소 정보를 하단 카드로 표시한다.

**카드 정보**
* 장소명
* 거리 (예: "도보 12분 · 850m")
* 상태 태그 (무료 / 실내 / 운영중 등)

**액션**
* 카드 클릭 → 상세 (P1)
* "여기로 가기" 버튼

**완료 조건**
- [ ] 카드 1개만 표시
- [ ] 필수 정보 3개 포함
- [ ] 카드 클릭 가능
- [ ] "여기로 가기" 버튼 작동

**Deliverables:**
- `src/components/map/ResultCard.tsx`

**Dependencies:**
- FE-04

**Labels:** `frontend`, `component`, `p0`

---

### 🎫 FE-06. 길찾기 연결

**Type:** Story  
**Priority:** Highest  
**Estimate:** 3h  
**Sprint:** Day 4

**설명**
선택한 장소로 길찾기를 제공한다.

**범위**
* 외부 지도 앱 연결 허용 (Google Maps, Kakao Map, Tmap)
* 내부 네비 ❌ (초기)

**완료 조건**
- [ ] "여기로 가기" 클릭 시 길찾기 실행
- [ ] 목적지 좌표 정확히 전달
- [ ] 앱 없으면 웹 지도 열기

**Deliverables:**
- `src/utils/navigation.ts`

**Dependencies:**
- FE-05

**Labels:** `frontend`, `navigation`, `p0`

---

## 🧩 BE 티켓 (Backend)

---

### 🎫 BE-01. 음성 검색 API

**Type:** Story  
**Priority:** Highest  
**Estimate:** 4h  
**Sprint:** Day 1

**Endpoint**
```
POST /api/search/voice
```

**입력**
```json
{
  "query": "근처 축구장",
  "lat": 37.742,
  "lng": 127.049
}
```

**응답**
```json
{
  "category": "SOCCER_FIELD",
  "parsedQuery": "축구장",
  "hasCondition": false
}
```

**완료 조건**
- [ ] 요청 정상 처리
- [ ] 쿼리 파싱 성공
- [ ] 카테고리 매핑 정확
- [ ] 결과 반환

**Deliverables:**
- `functions/src/api/searchVoice.ts`

**Dependencies:**
- BE-02

**Labels:** `backend`, `api`, `p0`

---

### 🎫 BE-02. 키워드 → 카테고리 매핑

**Type:** Story  
**Priority:** Highest  
**Estimate:** 3h  
**Sprint:** Day 1

**설명**
음성 텍스트에서 장소 카테고리를 추출한다.

**초기 지원**
* 축구장 → SOCCER_FIELD
* 헬스장 → GYM
* 배드민턴장 → BADMINTON
* 카페 → CAFE

**매핑 규칙**
| 키워드 | 카테고리 |
|------|--------|
| 축구장 | SOCCER_FIELD |
| 헬스장, 헬스 | GYM |
| 배드민턴, 배드민턴장 | BADMINTON |
| 카페, 커피 | CAFE |

**완료 조건**
- [ ] 키워드 기반 매핑 동작
- [ ] 4개 카테고리 모두 지원
- [ ] 매칭 실패 시 null 반환

**Deliverables:**
- `functions/src/utils/keywordMapper.ts`

**Dependencies:** None

**Labels:** `backend`, `mapping`, `p0`

**Notes:**
👉 NLP ❌
👉 하드코딩 ⭕ (처음엔 충분)

---

### 🎫 BE-03. 위치 기반 장소 조회

**Type:** Story  
**Priority:** Highest  
**Estimate:** 8h  
**Sprint:** Day 2-3

**설명**
현재 위치 기준으로 장소를 조회한다.

**정렬**
* 기본: 거리순 (가까운 것 먼저)
* 조건 있으면: 조건 우선

**필수 필드**
```typescript
{
  id: string;
  name: string;
  lat: number;
  lng: number;
  distance: number; // meters
  category: string;
  tags?: string[]; // ["무료", "실내", "운영중"]
}
```

**완료 조건**
- [ ] 장소 리스트 반환
- [ ] 거리 계산 포함
- [ ] 반경 2km 내 필터링
- [ ] 최대 5개 결과 반환

**Deliverables:**
- `functions/src/services/placeService.ts`
- `functions/src/data/places.ts` (Mock 초기)

**Dependencies:**
- BE-02

**Labels:** `backend`, `database`, `p0`

---

### 🎫 BE-04. 조건 필터 (옵션)

**Type:** Story  
**Priority:** High  
**Estimate:** 3h  
**Sprint:** Day 3

**설명**
"지금 여는", "무료" 등 단일 조건 처리

**조건 키워드**
| 키워드 | 조건 |
|------|------|
| 근처, 가까운 | radius: 1000m |
| 지금 여는 | isOpen: true |
| 무료 | isFree: true |

**완료 조건**
- [ ] 조건 키워드 있을 때 필터 적용
- [ ] 조건 우선 정렬 작동
- [ ] 조건 없으면 거리순

**Deliverables:**
- `functions/src/utils/filterPlaces.ts`

**Dependencies:**
- BE-03

**Labels:** `backend`, `filter`, `p1`

---

### 🎫 BE-05. 응답 포맷 정리

**Type:** Story  
**Priority:** Highest  
**Estimate:** 2h  
**Sprint:** Day 3

**설명**
프론트 최적화된 응답 포맷

**응답 예**
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

**완료 조건**
- [ ] primary 분리 정확
- [ ] others 배열 정확
- [ ] FE에서 바로 사용 가능

**Deliverables:**
- `functions/src/utils/formatSearchResponse.ts`

**Dependencies:**
- BE-04

**Labels:** `backend`, `api`, `p0`

**Notes:**
👉 FE는 **primary만 바로 사용**

---

## 📊 로그 / 분석 티켓

---

### 🎫 LOG-01. 음성 검색 성공 로그

**Type:** Task  
**Priority:** High  
**Estimate:** 4h  
**Sprint:** Day 5

**설명**
MVP 성공 로그 수집 설정

**수집 항목**
* 음성 버튼 클릭
* 음성 인식 성공/실패
* 검색 결과 표시
* 길찾기 클릭 여부

**이벤트**
```typescript
// 1. 음성 버튼 클릭
logEvent("voice_button_click", { timestamp, userId });

// 2. 음성 인식 성공
logEvent("voice_recognition_success", { query, category });

// 3. 검색 결과 표시
logEvent("search_results_shown", { category, resultCount, primaryDistance });

// 4. "여기로 가기" 클릭
logEvent("navigation_clicked", { placeId, placeName, distance });

// 5. 음성 인식 실패
logEvent("voice_recognition_failed", { error });
```

**핵심 지표**
1. 음성 버튼 클릭률
2. 음성 → 결과 성공률
3. "여기로 가기" 클릭률

**완료 조건**
- [ ] 로그 수집 가능
- [ ] Firestore / Analytics 연동
- [ ] 대시보드 연동 가능

**Deliverables:**
- `src/utils/analytics.ts`
- `functions/src/utils/logEvent.ts`

**Labels:** `analytics`, `logging`, `p1`

---

# ⏱️ 현실적인 1주 스프린트 계획

## Day 1 (8h)
- [ ] FE-01: 지도 페이지 기본 세팅
- [ ] FE-02: 음성 검색 버튼 UI
- [ ] FE-03: 음성 인식 결과 처리
- [ ] BE-01: 음성 검색 API
- [ ] BE-02: 키워드 → 카테고리 매핑

## Day 2 (8h)
- [ ] FE-04: 지도 핀 표시
- [ ] BE-03: 위치 기반 장소 조회 (시작)

## Day 3 (8h)
- [ ] BE-03: 위치 기반 장소 조회 (완료)
- [ ] BE-04: 조건 필터
- [ ] BE-05: 응답 포맷 정리
- [ ] FE-05: 하단 결과 카드

## Day 4 (8h)
- [ ] FE-06: 길찾기 연결
- [ ] 통합 테스트
- [ ] 버그 수정

## Day 5 (8h)
- [ ] LOG-01: 음성 검색 성공 로그
- [ ] 내부 테스트
- [ ] 사용자 테스트
- [ ] 배포 준비

---

# 🧠 마지막으로 딱 하나만 기억해

> **이 MVP는
> "AI 잘함"을 보여주는 단계가 아니다.
>
> "말로 찾는 게 진짜 빠르다"를 증명하는 단계다.**

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

### 로그
- [ ] 음성 버튼 클릭 로그
- [ ] 음성 인식 성공/실패 로그
- [ ] 검색 결과 표시 로그
- [ ] "여기로 가기" 클릭 로그

---

## 🚀 다음 단계

이제 바로 이어서 할 수 있는 건:

1️⃣ **음성 인식 실패 UX 설계 (중요)**
2️⃣ **실제 사용자 테스트 스크립트 + 질문지**
3️⃣ **이 MVP를 기준으로 2번(AI/상태) 확장 로드맵**
