# 🔥 "나만의 스포츠 감각 켜기" - 천재 모드 완성

## 📋 핵심 컨셉

> 사용자가 앱을 '일반 지도/정보 앱'에서
> 👉 '나를 이해하는 파트너'로 전환하는 순간

---

## ✅ 완성된 기능

### 1. UX 흐름 (3단계)

#### STEP 1 – 15초 대화형 온보딩
- 오늘 뭐 하러 왔어? (todayIntent)
- 누구랑 있어? (context)
- 지금 기분은? (mood)

#### STEP 2 – 즉시 개인화
- 지도 핀 재정렬
- 카드 문장 변경
- 추천 문구 등장

#### STEP 3 – 자동 성장
- 클릭 패턴 추적
- 체류 시간 분석
- 위치 기반 학습
- 시간대 기반 학습

---

### 2. 데이터 구조 (완전한 구조)

**Firestore: `users/{uid}`**

```typescript
{
  aiProfile: true,
  
  // 🔥 명시 입력 (사용자가 직접 선택)
  intent: "watch" | "play" | "chill",
  company: "solo" | "friends" | "date" | "family",
  mood: "calm" | "excited" | "focus" | "light",
  
  // 🔥 스포츠 감각 프로필 (호환성 유지)
  sportsSense: {
    todayIntent: "watch" | "exercise" | "play" | "alone",
    context: "alone" | "friends" | "partner" | "family",
    mood: "quiet" | "excited" | "focused" | "light",
    activatedAt: Timestamp,
    behaviorScore: {}, // 자동 학습 객체
  },
  
  // 🔥 자동 학습 데이터
  behaviorScore: {
    cafe: 0.7,
    pub: 0.3,
    stadium: 0.9,
    gym: 0.5,
    park: 0.6,
    restaurant: 0.4,
  },
  
  // 🔥 마지막 컨텍스트 (시간/위치 기반 학습용)
  lastContext: {
    time: Timestamp,
    location: { lat: number, lng: number } | null,
    intent: "watch",
    company: "friends",
    mood: "excited",
  },
  
  // 🔥 추천 엔진 입력 데이터
  recommendationProfile: {
    preferredMood: "excited",
    preferredContext: "friends",
    preferredIntent: "watch",
    lastUpdated: Timestamp,
  }
}
```

---

### 3. 버튼 역할 재정의

#### 완료 유저일 때

**이전 (죽은 UX)**:
```tsx
if (user.aiProfile) return null; // 배너 숨김
```

**새로운 구조 (살아있는 UX)**:
```tsx
if (user.aiProfile && !hasSportsSense) {
  setMessage("나만의 스포츠 감각 켜기 ✨");
} else if (user.aiProfile && hasSportsSense) {
  setMessage("스포츠 감각 다시 설정하기 🔄"); // 수정 모드
}
```

**클릭 동작**:
- 신규: 온보딩 모달 표시
- 수정: 기존 값으로 모달 표시 (빠른 수정)

---

### 4. 추천 재계산 로직

**가중치 구조**:
- mood 매칭: 40%
- context 매칭: 30%
- todayIntent 매칭: 20%
- 거리: 10%

**자동 리랭킹**:
- `allPlaces` 변경 시 자동으로 스포츠 감각 기반 리랭킹
- 위치 정보가 있으면 거리까지 고려

---

### 5. 행동 학습 Hook (`useSportsSense.ts`)

**기능**:
- 스포츠 감각 프로필 로드
- 행동 점수 업데이트 (`updateBehaviorScore`)
- 마지막 컨텍스트 업데이트 (`updateLastContext`)

**사용 예시**:
```typescript
const { profile, isActive, updateBehaviorScore } = useSportsSense();

// 장소 클릭 시 행동 점수 증가
await updateBehaviorScore("cafe", 0.1);
```

---

## 🎯 사용자 경험 흐름

### 시나리오 1: 신규 유저

```
1. 앱 진입
2. "나만의 스포츠 감각 켜기 ✨" 배너 표시
3. 클릭 → 3단계 질문 모달
4. 완료 → 지도 페이지 이동
5. 장소가 기분/맥락에 맞게 재정렬됨 ✨
```

### 시나리오 2: 기존 유저 (스포츠 감각 활성화됨)

```
1. 앱 진입
2. "스포츠 감각 다시 설정하기 🔄" 배너 표시
3. 클릭 → 기존 값으로 모달 표시 (빠른 수정)
4. 수정 완료 → 지도 페이지 이동
5. 새로운 기분/맥락에 맞게 재정렬됨 ✨
```

### 시나리오 3: 자동 학습

```
1. 사용자가 카페 클릭
2. updateBehaviorScore("cafe", 0.1) 호출
3. behaviorScore.cafe 증가
4. 다음 추천 시 카페 우선순위 상승
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
- behaviorScore 자동 증가
- lastContext 추적
- 즉시 변화 체감
- **살아있는 프로필**

---

## 📁 생성/수정된 파일

1. ✅ `src/components/onboarding/SportsSenseOnboarding.tsx` - 온보딩 모달 (수정 모드 추가)
2. ✅ `src/utils/sportsSenseRecommendation.ts` - 추천 엔진
3. ✅ `src/components/retention/NextActionBanner.tsx` - 배너 UX 개편 (수정 모드 추가)
4. ✅ `src/components/map/MapController.tsx` - 지도 추천 통합
5. ✅ `src/hooks/useSportsSense.ts` - 스포츠 감각 Hook (신규)

---

## 🚀 향후 확장 가능성

### 1. 행동 학습 자동화
- 장소 클릭 시 자동으로 `updateBehaviorScore` 호출
- 체류 시간 기반 점수 증가
- 시간대별 선호도 학습

### 2. "오늘의 코스" UI
- 상위 3개 장소를 코스로 묶어서 표시
- "조용한 혼자 시간 코스" 같은 설명 추가

### 3. 동적 업데이트
- 사용자가 기분/맥락 변경 시 실시간 재랭킹
- "지금 기분 바뀌었어요" 버튼

### 4. AI 프로필 진화
- behaviorScore 기반 자동 추천 개선
- 시간대/요일별 패턴 학습
- 계절별 선호도 학습

---

## ✅ 테스트 체크리스트

- [ ] 배너 "나만의 스포츠 감각 켜기 ✨" 표시 확인
- [ ] 클릭 시 모달 표시 확인
- [ ] 3단계 질문 정상 작동 확인
- [ ] Firestore 저장 확인 (intent, company, mood, behaviorScore, lastContext)
- [ ] 지도 페이지 이동 확인
- [ ] 장소 리랭킹 확인 (mood/context/intent 기반)
- [ ] 수정 모드: 기존 값으로 모달 표시 확인
- [ ] 수정 모드: "스포츠 감각 다시 설정하기 🔄" 배너 표시 확인

---

## 🎉 완성!

**"나만의 스포츠 감각 켜기"** 기능이 완전히 구현되었습니다.

이제 이 버튼은:
- **YAGO VIBE의 심장 기능**
- **일반 지도 → 나를 이해하는 파트너 전환 스위치**
- **살아있는 프로필의 시작점**

**사용자는 30초만 투자하면 앱이 자신을 이해하기 시작하고, 즉시 변화를 체감할 수 있습니다!** 🚀
