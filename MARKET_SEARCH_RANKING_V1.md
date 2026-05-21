# 🔥 검색 랭킹 시스템 v1 구현 완료

## ✅ 완료된 작업

### 1. searchScore 계산식 구현
- **파일**: `src/utils/searchScoring.ts`
- **계산식**:
  ```
  searchScore = textMatchScore * 3 + rankScore * 0.4 + authorTrustScore * 1.5 - riskScore * 2 + recencyBoost
  ```
- **recencyBoost**:
  - 최근 24시간: +30
  - 최근 7일: +10
  - 그 외: 0

### 2. useSemanticSearch 훅 수정
- **파일**: `src/hooks/useSemanticSearch.ts`
- **변경사항**:
  - 검색 결과를 받은 뒤 작성자 정보 병렬 조회
  - 각 게시글에 대해 `searchScore` 계산
  - `searchScore` 기준 내림차순 정렬
  - ShadowBanned 글은 기존처럼 제외
  - 반환 타입을 `MarketPost[]`로 변경

### 3. 텍스트 매칭 점수 계산
- **파일**: `src/utils/searchScoring.ts`
- **점수 체계**:
  - 제목 완전 일치: 100점
  - 제목 시작 일치: 80점
  - 제목 포함: 60점
  - 제목 단어 일치: 40점
  - 설명 포함: 30점
  - 카테고리 일치: 20점
  - 종목 일치: 15점

## 📐 구조 설계

### searchScore 계산 플로우

```
시맨틱 검색 결과 수집
  ↓
ShadowBanned 글 필터링
  ↓
작성자 정보 병렬 조회
  ↓
각 게시글에 대해 searchScore 계산:
  - textMatchScore * 3 (검색어 관련성)
  - rankScore * 0.4 (인기도)
  - authorTrustScore * 1.5 (판매자 신뢰도)
  - riskScore * 2 (위험 점수 차감)
  - recencyBoost (최신성 부스트)
  ↓
searchScore 기준 내림차순 정렬
  ↓
상위 N개 반환
```

### searchScore 구성 요소

1. **textMatchScore (300%)**: 검색어 관련성
   - 제목/설명/카테고리/종목 매칭 점수
   - 높을수록 좋음 (가중치 3배)

2. **rankScore (40%)**: 게시글 인기도
   - `chatCount * 100 + likesCount * 10 + views`
   - 높을수록 좋음

3. **authorTrustScore (150%)**: 판매자 신뢰도
   - `ratingAvg*20 + min(completedSales*5,50) + min(recentPosts*2,20)`
   - 높을수록 좋음 (가중치 1.5배)

4. **riskScore (-200%)**: 위험 점수
   - 사기 의심 패턴 탐지 점수
   - 높을수록 나쁨 (차감, 가중치 2배)

5. **recencyBoost**: 최신성 부스트
   - 24시간 내: +30
   - 7일 내: +10
   - 그 외: 0

## 🔗 통합 지점

### useSemanticSearch 훅
- 기존 시맨틱 검색 로직 유지
- v1 추가: searchScore 계산 및 정렬
- 반환 타입을 `MarketPost[]`로 변경하여 UI에서 바로 사용 가능

### 검색 결과 UI
- 검색 결과를 표시하는 컴포넌트에서 "추천순" 정렬 표시 추가 필요
- (UI 컴포넌트는 프로젝트 구조에 따라 별도 구현 필요)

## 🎯 효과

### v1 vs 기존 비교

**기존**:
- 시맨틱 검색 결과를 그대로 반환
- 관련성만 고려 (벡터 유사도)

**v1**:
- searchScore 기반 정렬
- 관련성 + 인기도 + 신뢰도 + 안전성 + 최신성 모두 반영
- 검색 결과 품질 향상
- 거래 전환율 상승 기대

### 예상 결과

1. **관련성 높은 게시글 상위 노출**
   - `textMatchScore * 3` 가중치로 검색어와 관련성 높은 게시글 우선

2. **신뢰 판매자 게시글 자연스럽게 상위 노출**
   - `authorTrustScore * 1.5` 가중치로 신뢰 판매자 게시글 상위 노출

3. **위험 게시글 자동 하락**
   - `riskScore * 2` 차감으로 위험 게시글 하위 노출

4. **최신 게시글 부스트**
   - 24시간 내 게시글 +30점 부스트

## ✅ 검증 체크리스트

- [x] searchScore 계산식 구현
- [x] textMatchScore 계산 로직
- [x] recencyBoost 계산 로직 (feedScoring 재사용)
- [x] useSemanticSearch 훅 수정
- [x] 작성자 정보 병렬 조회
- [x] searchScore 기준 정렬
- [x] ShadowBanned 글 제외 유지
- [x] 반환 타입을 MarketPost[]로 변경

## 🚀 다음 단계

### 1️⃣ 검색 결과 UI 개선
- 검색 결과 상단에 "추천순" 정렬 표시
- 정렬 옵션 추가 (추천순 / 최신순 / 인기순)

### 2️⃣ 개인화 추천 v3
- 사용자 검색 이력 기반 가중치 조정
- 클릭/조회 이력 기반 학습

### 3️⃣ 검색 자동완성
- 인기 검색어 제안
- 검색어 자동완성

### 4️⃣ 가격 적정성 분석
- 가격 범위 기반 점수 조정
- 시장 가격 대비 적정성 반영

---

**검색 랭킹 시스템 v1 구현 완료! 이제 검색 결과가 단순 최신순이 아니라 인기 + 신뢰 + 안전 + 관련성 기반으로 정렬됩니다.** 🎉
