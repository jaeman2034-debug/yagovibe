# 🔥 "나만의 스포츠 감각 켜기" 온보딩 리뉴얼 완료

## 📋 개요

**철학**: 사용자는 최소 입력 (30초), 앱이 관찰하고 제안

**목표**: "앱이 나를 이해하기 시작하는 순간"을 만드는 경험

---

## ✅ 완성된 기능

### 1. 온보딩 모달 (`SportsSenseOnboarding.tsx`)

**3단계 질문**:
1. 오늘 뭐 하러 왔어? (todayIntent)
   - 경기 보기 ⚽
   - 운동하기 🏃
   - 놀기 🎉
   - 혼자 시간 🧘

2. 누구랑? (context)
   - 혼자 👤
   - 친구 👥
   - 연인 💑
   - 가족 👨‍👩‍👧‍👦

3. 기분은? (mood)
   - 조용 🤫
   - 신남 🔥
   - 집중 🎯
   - 가볍게 ✨

**특징**:
- 진행 바 표시 (1/3, 2/3, 3/3)
- 이모지 기반 직관적 선택
- 30초 완료 목표

---

### 2. Firestore 스키마 확장

**저장 위치**: `users/{uid}`

```typescript
{
  sportsSense: {
    todayIntent: "watch" | "exercise" | "play" | "alone",
    context: "alone" | "friends" | "partner" | "family",
    mood: "quiet" | "excited" | "focused" | "light",
    activatedAt: Timestamp,
    behaviorScore: number, // 초기 0, 이후 자동 증가
  },
  recommendationProfile: {
    preferredMood: mood,
    preferredContext: context,
    preferredIntent: todayIntent,
    lastUpdated: Timestamp,
  }
}
```

---

### 3. 추천 재계산 로직 (`sportsSenseRecommendation.ts`)

**가중치 구조**:
- mood 매칭: 40%
- context 매칭: 30%
- todayIntent 매칭: 20%
- 거리: 10%

**점수 계산 예시**:
```typescript
// 예: mood="quiet", context="alone", todayIntent="alone"
// → 카페, 도서관, 공원 우선순위 상승
// → 펍, 클럽, 노래방 우선순위 하락
```

**리랭킹 함수**:
- `rerankPlacesBySportsSense()`: 장소 배열을 스포츠 감각 기반으로 재정렬
- `generateTodayCourse()`: "오늘의 코스" 생성 (상위 3개 장소)

---

### 4. 배너 UX 개편 (`NextActionBanner.tsx`)

**메시지 로직**:
- 프로필 완료 + 스포츠 감각 없음 → "나만의 스포츠 감각 켜기 ✨"
- 프로필 완료 + 스포츠 감각 있음 → 배너 숨김
- 프로필 미완성 → "프로필을 완성하면 맞춤 추천을 받을 수 있어요! 👤"

**클릭 동작**:
- "나만의 스포츠 감각 켜기" 클릭 → `SportsSenseOnboarding` 모달 표시
- 완료 후 → 지도 페이지로 이동 (즉시 변화 체감)

---

### 5. 지도 추천 통합 (`MapController.tsx`)

**자동 리랭킹**:
- 스포츠 감각 프로필 로드
- `allPlaces` 변경 시 자동으로 스포츠 감각 기반 리랭킹
- 위치 정보가 있으면 거리까지 고려

**동작 흐름**:
```
1. 사용자 로그인
2. 스포츠 감각 프로필 로드
3. 장소 검색/로드
4. 스포츠 감각 기반 리랭킹
5. 지도에 재정렬된 마커 표시
```

---

## 🎯 사용자 경험 흐름

### 시나리오 1: 신규 유저

```
1. 앱 진입
2. "프로필을 완성하면 맞춤 추천을 받을 수 있어요! 👤" 배너 표시
3. 클릭 → /profile/setup 이동
4. 프로필 완성
5. "나만의 스포츠 감각 켜기 ✨" 배너 표시
6. 클릭 → 3단계 질문 모달
7. 완료 → 지도 페이지 이동
8. 장소가 기분/맥락에 맞게 재정렬됨 ✨
```

### 시나리오 2: 기존 유저 (프로필 완료, 스포츠 감각 없음)

```
1. 앱 진입
2. "나만의 스포츠 감각 켜기 ✨" 배너 표시
3. 클릭 → 3단계 질문 모달
4. 완료 → 지도 페이지 이동
5. 장소가 기분/맥락에 맞게 재정렬됨 ✨
```

### 시나리오 3: 스포츠 감각 활성화 유저

```
1. 앱 진입
2. 배너 숨김 (이미 활성화됨)
3. 지도 접속 시 자동으로 스포츠 감각 기반 추천 적용
```

---

## 🔥 핵심 차별점

### 기존 구조
- favoriteSports 저장
- aiProfile = true
- 끝
- **감동 없음**

### 새로운 구조
- mood, context, todayIntent 저장
- behaviorScore 자동 증가 (향후)
- 즉시 변화 체감
- **살아있는 프로필**

---

## 📊 추천 알고리즘 상세

### mood 기반 필터링

| mood | 우선순위 높음 | 우선순위 낮음 |
|------|-------------|-------------|
| quiet | 카페, 도서관, 공원, 박물관 | 펍, 클럽, 노래방 |
| excited | 펍, 스포츠바, 경기장 | 도서관 |
| focused | 도서관, 스터디카페, 헬스장 | - |
| light | 카페, 공원, 산책로 | - |

### context 기반 필터링

| context | 우선순위 높음 |
|---------|-------------|
| alone | 카페, 도서관, 공원 |
| friends | 펍, 식당, 노래방 |
| partner | 카페, 식당, 공원, 영화관 |
| family | 공원, 식당, 박물관, 놀이공원 |

### todayIntent 기반 필터링

| intent | 우선순위 높음 |
|--------|-------------|
| watch | 경기장, 스포츠바, 펍 |
| exercise | 헬스장, 공원, 수영장, 체육관 |
| play | 노래방, 펍, 클럽, 게임센터 |
| alone | 카페, 도서관, 공원 |

---

## 🚀 다음 단계 (향후 확장)

### 1. 행동 학습 (behaviorScore)
- 클릭 패턴 추적
- 체류 시간 분석
- 위치 기반 선호도 학습
- 자동으로 behaviorScore 증가

### 2. "오늘의 코스" UI
- 상위 3개 장소를 코스로 묶어서 표시
- "조용한 혼자 시간 코스" 같은 설명 추가

### 3. 동적 업데이트
- 사용자가 기분/맥락 변경 시 실시간 재랭킹
- "지금 기분 바뀌었어요" 버튼

---

## 📁 생성된 파일

1. `src/components/onboarding/SportsSenseOnboarding.tsx` - 온보딩 모달
2. `src/utils/sportsSenseRecommendation.ts` - 추천 엔진
3. `src/components/retention/NextActionBanner.tsx` - 배너 UX 개편
4. `src/components/map/MapController.tsx` - 지도 추천 통합

---

## ✅ 테스트 체크리스트

- [ ] 배너 "나만의 스포츠 감각 켜기 ✨" 표시 확인
- [ ] 클릭 시 모달 표시 확인
- [ ] 3단계 질문 정상 작동 확인
- [ ] Firestore 저장 확인
- [ ] 지도 페이지 이동 확인
- [ ] 장소 리랭킹 확인 (mood/context/intent 기반)
- [ ] 스포츠 감각 활성화 후 배너 숨김 확인

---

## 🎉 완성!

**"나만의 스포츠 감각 켜기"** 기능이 완전히 구현되었습니다.

이제 사용자는:
- 30초만 투자하면
- 앱이 자신을 이해하기 시작하고
- 즉시 변화를 체감할 수 있습니다.

**YAGO VIBE의 정체성이 결정되는 스위치**가 완성되었습니다! 🚀
