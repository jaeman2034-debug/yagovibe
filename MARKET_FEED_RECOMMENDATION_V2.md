# 🔥 추천 피드 알고리즘 v2 구현 완료

## ✅ 완료된 작업

### 1. feedScore 계산식 구현
- **파일**: `src/utils/feedScoring.ts`
- **계산식**:
  ```
  feedScore = rankScore * 0.6 + authorTrustScore * 2 - riskScore * 1.5 + recencyBoost
  ```
- **recencyBoost**:
  - 최근 24시간: +30
  - 최근 7일: +10
  - 그 외: 0

### 2. useMarketFeedRecommended 훅 수정
- **파일**: `src/hooks/useMarketFeedRecommended.ts`
- **변경사항**:
  - 쿼리 결과를 받은 뒤 클라이언트에서 작성자 정보 조회
  - `feedScore` 계산 및 정렬
  - ShadowBanned 글은 기존처럼 제외

### 3. 추천 섹션 UI 개선
- **파일**: `src/components/market/HomeMarketFeed.tsx`
- **변경사항**:
  - 제목: "🔥 신뢰 추천"
  - 설명: "인기 + 신뢰 + 안전 + 최신이 균형 잡힌 추천"

## 📐 구조 설계

### feedScore 계산 플로우

```
게시글 수집 (관심 40% + 인기 40% + 최신 20%)
  ↓
작성자 정보 병렬 조회
  ↓
각 게시글에 대해 feedScore 계산:
  - rankScore * 0.6
  - authorTrustScore * 2
  - riskScore * 1.5 (차감)
  - recencyBoost (24h: +30, 7d: +10)
  ↓
feedScore 기준 내림차순 정렬
  ↓
상위 N개 반환
```

### feedScore 구성 요소

1. **rankScore (60%)**: 게시글 인기도
   - `chatCount * 100 + likesCount * 10 + views`
   - 높을수록 좋음

2. **authorTrustScore (200%)**: 판매자 신뢰도
   - `ratingAvg*20 + min(completedSales*5,50) + min(recentPosts*2,20)`
   - 높을수록 좋음 (가중치 2배)

3. **riskScore (-150%)**: 위험 점수
   - 사기 의심 패턴 탐지 점수
   - 높을수록 나쁨 (차감)

4. **recencyBoost**: 최신성 부스트
   - 24시간 내: +30
   - 7일 내: +10
   - 그 외: 0

## 🔗 통합 지점

### useMarketFeedRecommended 훅
- 기존 v1 로직 유지 (관심 40% + 인기 40% + 최신 20%)
- v2 추가: feedScore 계산 및 정렬

### HomeMarketFeed 컴포넌트
- 추천 섹션 제목/설명 개선
- "🔥 신뢰 추천" 표시

## 🎯 효과

### v1 vs v2 비교

**v1**:
- 단순 비율 기반 (관심 40% + 인기 40% + 최신 20%)
- 신뢰도/위험도 미반영

**v2**:
- feedScore 기반 정렬
- 신뢰 판매자 자연스럽게 상위 노출
- 위험 게시글 자동 하락
- 최신성 부스트로 활발한 거래 유도

### 예상 결과

1. **신뢰 판매자 노출 증가**
   - `authorTrustScore * 2` 가중치로 신뢰 판매자 게시글 상위 노출

2. **위험 게시글 자동 하락**
   - `riskScore * 1.5` 차감으로 위험 게시글 하위 노출

3. **균형 잡힌 추천**
   - 인기 + 신뢰 + 안전 + 최신이 모두 반영된 추천

## ✅ 검증 체크리스트

- [x] feedScore 계산식 구현
- [x] recencyBoost 계산 로직
- [x] useMarketFeedRecommended 훅 수정
- [x] 작성자 정보 병렬 조회
- [x] feedScore 기준 정렬
- [x] ShadowBanned 글 제외 유지
- [x] 추천 섹션 UI 개선

## 🚀 다음 단계

### 1️⃣ 검색 랭킹 개선
- 검색 결과에도 feedScore 반영
- 키워드 매칭 + feedScore 조합

### 2️⃣ 개인화 추천 강화
- 사용자 관심사 기반 가중치 조정
- 클릭/조회 이력 기반 학습

### 3️⃣ 거래 속도/응답률 점수 추가
- 채팅 응답 시간
- 거래 완료 속도
- feedScore에 반영

---

**추천 피드 알고리즘 v2 구현 완료! 이제 인기 + 신뢰 + 안전 + 최신이 균형 잡힌 추천이 제공됩니다.** 🎉
