# 🎫 1번 MVP Jira 티켓 템플릿

> Jira / Notion / Linear 등에 바로 복사해서 사용

---

## 📋 Epic: 1번 MVP - 음성 검색 지도

**Description:**
키보드 없이 말만 해도 내 주변 장소·시설을 지도에서 바로 찾을 수 있는 MVP

**Acceptance Criteria:**
- [ ] 음성 버튼 클릭 → 인식 시작
- [ ] 검색 결과 → 지도 핀 표시
- [ ] 결과 카드 1개 표시
- [ ] "여기로 가기" 버튼 작동

**Labels:** `mvp`, `voice-search`, `map`

---

## 🎯 Story: FE-1. 음성 검색 트리거 UI

**Type:** Story  
**Priority:** Highest  
**Estimate:** 4h  
**Sprint:** Day 1

**Description:**
하단 영역을 "🎙️ 말로 장소 찾기" 버튼처럼 동작, 클릭 시 음성 인식 시작

**Acceptance Criteria:**
- [ ] 버튼 클릭 시 음성 인식 시작
- [ ] 인식 중 상태 표시 ("듣고 있어요…")
- [ ] 인식 완료 시 텍스트 반환
- [ ] 인식 실패 시 자연스럽게 복귀

**Deliverables:**
- `src/components/voice/VoiceSearchButton.tsx`
- `src/hooks/useVoiceRecognition.ts`

**Dependencies:**
None

**Labels:** `frontend`, `voice`, `p0`

**Notes:**
❗ 대화 UI ❌
❗ 채팅 로그 ❌

---

## 🎯 Story: FE-2. 음성 인식 결과 처리

**Type:** Story  
**Priority:** Highest  
**Estimate:** 3h  
**Sprint:** Day 1

**Description:**
텍스트로 변환된 음성 쿼리를 BE에 전달

**Acceptance Criteria:**
- [ ] 음성 텍스트 정확히 전달
- [ ] 현재 위치 포함
- [ ] 에러 핸들링

**Deliverables:**
- `src/services/voiceSearchService.ts`

**Dependencies:**
- FE-1
- BE-1

**Labels:** `frontend`, `api`, `p0`

---

## 🎯 Story: FE-3. 지도 핀 렌더링

**Type:** Story  
**Priority:** Highest  
**Estimate:** 6h  
**Sprint:** Day 2

**Description:**
검색 결과를 지도에 핀으로 표시, 가장 가까운 장소 1개 강조, 지도 자동 줌

**Acceptance Criteria:**
- [ ] 검색 결과 핀 표시 (3-5개)
- [ ] 가장 가까운 핀 강조 (크기 12px, 빨간색)
- [ ] 지도 자동 줌 정확
- [ ] 핀 클릭 시 카드 표시

**Deliverables:**
- `src/components/map/SearchResultMarkers.tsx`
- `src/utils/mapBounds.ts`

**Dependencies:**
- FE-2
- BE-3

**Labels:** `frontend`, `map`, `p0`

**Notes:**
❌ 리스트 먼저 ❌
⭕ 지도 먼저 ⭕

---

## 🎯 Story: FE-4. 하단 결과 카드 (1개만)

**Type:** Story  
**Priority:** Highest  
**Estimate:** 4h  
**Sprint:** Day 3

**Description:**
가장 가까운 장소만 카드 표시, 필수 정보 포함, "여기로 가기" 버튼

**Acceptance Criteria:**
- [ ] 가장 가까운 장소만 표시
- [ ] 필수 정보 3개 포함 (장소명, 거리, 태그)
- [ ] 카드 1개만 (리스트 아님)
- [ ] "여기로 가기" 버튼 작동

**Deliverables:**
- `src/components/map/ResultCard.tsx`

**Dependencies:**
- FE-3

**Labels:** `frontend`, `component`, `p0`

---

## 🎯 Story: FE-5. 길찾기 연결

**Type:** Story  
**Priority:** Highest  
**Estimate:** 3h  
**Sprint:** Day 4

**Description:**
"여기로 가기" 버튼 클릭 시 외부 지도 앱 연결

**Acceptance Criteria:**
- [ ] 버튼 클릭 시 외부 지도 앱 열기
- [ ] 목적지 좌표 정확히 전달
- [ ] 앱 없으면 웹 지도 열기

**Deliverables:**
- `src/utils/navigation.ts`

**Dependencies:**
- FE-4

**Labels:** `frontend`, `navigation`, `p0`

**Notes:**
* 내부 네비 ❌ (초기)
* 외부 지도 앱 연결 OK

---

## 🎯 Story: BE-1. 음성 검색 쿼리 처리 API

**Type:** Story  
**Priority:** Highest  
**Estimate:** 4h  
**Sprint:** Day 1

**Description:**
음성 쿼리 받아서 처리, 키워드 추출, 카테고리 매핑

**Acceptance Criteria:**
- [ ] 쿼리 파싱 성공
- [ ] 카테고리 매핑 정확
- [ ] 조건 추출 (있으면)

**Deliverables:**
- `functions/src/api/searchVoice.ts`

**Dependencies:**
- BE-2

**Labels:** `backend`, `api`, `p0`

---

## 🎯 Story: BE-2. 키워드 → 카테고리 매핑

**Type:** Story  
**Priority:** Highest  
**Estimate:** 3h  
**Sprint:** Day 1

**Description:**
키워드 하드코딩 매핑, NLP ❌ (초기엔)

**Acceptance Criteria:**
- [ ] 4개 카테고리 매핑 정확
- [ ] 조건 키워드 인식
- [ ] 매칭 실패 시 null 반환

**Deliverables:**
- `functions/src/utils/keywordMapper.ts`

**Dependencies:**
None

**Labels:** `backend`, `mapping`, `p0`

**Notes:**
👉 NLP ❌
👉 하드코딩 ⭕ (처음엔 충분)

---

## 🎯 Story: BE-3. 장소 데이터 조회

**Type:** Story  
**Priority:** Highest  
**Estimate:** 8h  
**Sprint:** Day 2-3

**Description:**
카테고리별 장소 조회, 반경 내 필터링, 거리 계산

**Acceptance Criteria:**
- [ ] 카테고리별 조회 성공
- [ ] 반경 2km 내 필터링
- [ ] 거리 계산 정확
- [ ] 최대 5개 결과 반환

**Deliverables:**
- `functions/src/services/placeService.ts`
- `functions/src/data/places.ts` (Mock 초기)

**Dependencies:**
- BE-2

**Labels:** `backend`, `database`, `p0`

---

## 🎯 Story: BE-4. 정렬 로직

**Type:** Story  
**Priority:** Highest  
**Estimate:** 3h  
**Sprint:** Day 3

**Description:**
기본 거리순, 조건 있으면 우선 정렬

**Acceptance Criteria:**
- [ ] 거리순 정렬 정확
- [ ] 조건 우선 정렬 작동
- [ ] 최대 5개 제한

**Deliverables:**
- `functions/src/utils/sortPlaces.ts`

**Dependencies:**
- BE-3

**Labels:** `backend`, `algorithm`, `p0`

---

## 🎯 Story: BE-5. 응답 포맷 (프론트 최적화)

**Type:** Story  
**Priority:** Highest  
**Estimate:** 2h  
**Sprint:** Day 3

**Description:**
프론트 최적화된 응답 포맷, primary (가장 가까운 1곳) 분리

**Acceptance Criteria:**
- [ ] primary 분리 정확
- [ ] others 배열 정확
- [ ] FE 바로 사용 가능한 포맷

**Deliverables:**
- `functions/src/utils/formatSearchResponse.ts`

**Dependencies:**
- BE-4

**Labels:** `backend`, `api`, `p0`

**Notes:**
👉 FE는 **primary만 바로 사용**

---

## 🎯 Task: 로그 수집 설정

**Type:** Task  
**Priority:** High  
**Estimate:** 4h  
**Sprint:** Day 5

**Description:**
MVP 성공 로그 수집 설정 (음성 버튼 클릭, 인식 성공/실패, 검색 결과 표시, "여기로 가기" 클릭)

**Acceptance Criteria:**
- [ ] 5개 이벤트 로그 수집
- [ ] Firestore / Analytics 연동
- [ ] 핵심 지표 계산 가능

**Deliverables:**
- `src/utils/analytics.ts`
- `functions/src/utils/logEvent.ts`

**Labels:** `analytics`, `logging`, `p1`

---

## 📊 Sprint Planning

### Day 1
- FE-1, FE-2
- BE-1, BE-2

### Day 2
- FE-3
- BE-3

### Day 3
- FE-4
- BE-4, BE-5

### Day 4
- FE-5
- 통합 테스트

### Day 5
- 실사용 테스트
- 로그 수집 설정
- 배포 준비

---

## 🏷️ Label 정의

- `mvp`: MVP 기능
- `voice-search`: 음성 검색
- `map`: 지도 관련
- `frontend`: 프론트엔드 작업
- `backend`: 백엔드 작업
- `api`: API 개발
- `component`: UI 컴포넌트
- `navigation`: 길찾기
- `analytics`: 분석/로깅
- `p0`: Critical
- `p1`: High
