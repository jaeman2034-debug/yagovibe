# 🔥 프로필 온보딩 → 맞춤 추천 플로우 완전 분석

## 📋 개요

"프로필을 원한다면 맞춤 추천을 받을 수 있어요" 버튼의 실제 기능과 데이터 흐름을 정리한 문서입니다.

---

## 1️⃣ 버튼 위치 및 트리거

### 컴포넌트: `NextActionBanner.tsx`

```typescript
// 메시지 생성 로직
if (!isProfileComplete) {
  setMessage("프로필을 완성하면 맞춤 추천을 받을 수 있어요! 👤");
}

// 클릭 핸들러
if (!isProfileComplete) {
  navigate("/profile/setup");
}
```

**위치**: 로그인 직후 홈 화면에 표시되는 배너

---

## 2️⃣ 프로필 온보딩 페이지

### 파일: `src/pages/profile/ProfileSetupPage.tsx`

### 수집하는 데이터

```typescript
const SPORTS = [
  "축구", "농구", "야구", "배구", "골프", "테니스", 
  "러닝", "수영", "헬스/피트니스", "배드민턴", 
  "탁구", "요가/필라테스", "클라이밍"
];

const REGIONS = [
  "서울", "경기", "인천", "부산", "대구", "광주", 
  "대전", "울산", "세종", "강원", "충북", "충남", 
  "전북", "전남", "경북", "경남", "제주"
];
```

### 입력 필드

1. **종목 (sport)** - 필수
   - 드롭다운 선택
   - 13개 종목 중 선택

2. **활동 지역 (region)** - 필수
   - 드롭다운 선택
   - 17개 지역 중 선택

3. **간단 소개 (bio)** - 선택
   - 텍스트 입력

---

## 3️⃣ Firestore 저장 구조

### 저장 위치: `users/{uid}`

```typescript
await setDoc(
  userRef,
  {
    uid: user.uid,
    email: user.email || null,
    sport,              // 🔥 추천 엔진 입력 1
    region,             // 🔥 추천 엔진 입력 2
    bio: bio.trim() || null,
    profileCompleted: true,
    isProfileComplete: true,    // 🔥 추천 활성화 플래그
    onboardingCompleted: true,
    updatedAt: serverTimestamp(),
  },
  { merge: true }
);
```

### 저장된 데이터 예시

```json
{
  "uid": "user123",
  "sport": "축구",
  "region": "서울",
  "bio": "주말에 축구하는 개발자입니다",
  "isProfileComplete": true,
  "trustScore": 50,
  "trustTier": "basic"
}
```

---

## 4️⃣ 추천 엔진 활용 방식

### A. 지도 장소 추천 (`MapController.tsx`)

**현재 구현 상태**: 
- 프로필 데이터를 직접 필터링에 사용하는 로직은 **아직 구현되지 않음**
- 현재는 `serverPreferences` (과거 선택 기록) 기반 추천만 사용

**향후 확장 가능성**:
```typescript
// 예시: 프로필 기반 필터링 (구현 필요)
const filterByProfile = (places: MapPlace[], userProfile: UserProfile) => {
  return places.filter(place => {
    // 종목 기반 필터링
    if (userProfile.sport === "축구" && place.category?.includes("축구")) {
      return true;
    }
    // 지역 기반 필터링
    if (userProfile.region && place.address?.includes(userProfile.region)) {
      return true;
    }
    return false;
  });
};
```

### B. 스토리 추천 (`server/src/domain/personal.rank.ts`)

**실제 구현됨**:

```typescript
export async function rerankStories(
  userId: string | null,
  stories: Story[]
): Promise<Story[]> {
  // 프로필 조회
  const profile = await prisma.userProfile.findUnique({
    where: { id: userId },
  });

  // 개인화 점수 계산
  const ranked = stories.map((s) => {
    const base = baseScore(s);
    const category = categoryWeight(s, profile);  // 🔥 종목 기반 가중치
    const regionBonus = profile.region === s.region ? 15 : 0;  // 🔥 지역 보너스

    const finalScore =
      base * 0.6 +           // 기본 점수 60%
      category * 40 +        // 카테고리 가중치 40%
      regionBonus;            // 지역 보너스

    return { ...s, _personalScore: finalScore };
  });

  return ranked.sort((a, b) => b._personalScore - a._personalScore);
}
```

**가중치 구조**:
- 기본 점수: 60%
- 카테고리 가중치 (종목 매칭): 40%
- 지역 보너스: +15점

### C. 중고거래 상품 추천 (`functions/src/getRecommendedFeed.ts`)

**AI 기반 추천**:

```typescript
const prompt = `
### 사용자 정보:
- UID: ${userInfo.uid}
- 관심사: ${userInfo.interests.join(", ")}
- 위치: ${userInfo.location}
- 선호 카테고리: ${userInfo.categories.join(", ")}

### 추천 기준 (가중치):
1) 사용자 관심사와 카테고리 매칭 (30%)
2) 최근 본 상품과의 유사도 (20%)
3) 태그/설명/이미지의 의미적 유사도 (15%)
4) 거리 (가까울수록 가중치 ↑) (15%)
5) AI 종합 등급이 높을수록 우선 (10%)
6) 가격 적정성 (5%)
7) 구성품 충실도 (3%)
8) 사기 위험도 낮은 상품 우선 (2%)
`;
```

---

## 5️⃣ 실제 화면 변화

### 프로필 완성 전

- **지도**: 모든 장소 표시 (공통 추천)
- **스토리**: 기본 정렬 (인기순)
- **상품**: 전체 상품 표시

### 프로필 완성 후

- **지도**: (향후) 종목/지역 기반 필터링
- **스토리**: 개인화 리랭킹 적용
  - 종목 매칭: +40% 가중치
  - 지역 매칭: +15점 보너스
- **상품**: AI 추천 피드 활성화
  - 관심사 기반 매칭: 30% 가중치

---

## 6️⃣ 데이터 흐름 다이어그램

```
[사용자 클릭]
    ↓
[NextActionBanner] → navigate("/profile/setup")
    ↓
[ProfileSetupPage]
    ↓
[입력: sport, region, bio]
    ↓
[Firestore 저장]
users/{uid} {
  sport: "축구",
  region: "서울",
  isProfileComplete: true
}
    ↓
[추천 엔진 재계산]
    ├─ 스토리: rerankStories() → 개인화 점수 적용
    ├─ 상품: getRecommendedFeed() → AI 추천
    └─ 지도: (향후) 프로필 기반 필터링
    ↓
[화면 리로드]
    ↓
[개인화된 추천 표시]
```

---

## 7️⃣ 현재 구현 상태

| 기능 | 상태 | 비고 |
|------|------|------|
| 프로필 온보딩 | ✅ 완료 | 종목, 지역, 소개 입력 |
| Firestore 저장 | ✅ 완료 | users/{uid} 문서 |
| 스토리 추천 | ✅ 완료 | personal.rank.ts |
| 상품 추천 | ✅ 완료 | getRecommendedFeed.ts |
| 지도 추천 | ⏳ 미구현 | serverPreferences만 사용 |

---

## 8️⃣ 향후 개선 방향

### 지도 추천 개선

```typescript
// MapController.tsx에 추가 가능
const filterPlacesByProfile = (places: MapPlace[], userProfile: UserProfile) => {
  if (!userProfile.isProfileComplete) return places;
  
  return places.map(place => {
    let score = 0;
    
    // 종목 매칭 점수
    if (place.category?.includes(userProfile.sport)) {
      score += 30;
    }
    
    // 지역 매칭 점수
    if (place.address?.includes(userProfile.region)) {
      score += 20;
    }
    
    return { ...place, _profileScore: score };
  }).sort((a, b) => b._profileScore - a._profileScore);
};
```

---

## 9️⃣ 확인 가능한 코드 위치

### 프로필 온보딩
- `src/components/retention/NextActionBanner.tsx` - 버튼/배너
- `src/pages/profile/ProfileSetupPage.tsx` - 온보딩 페이지
- `src/components/onboarding/FirstActionModal.tsx` - 첫 행동 모달

### 추천 엔진
- `server/src/domain/personal.rank.ts` - 스토리 개인화
- `functions/src/getRecommendedFeed.ts` - 상품 AI 추천
- `src/utils/serverMemory.ts` - 지도 추천 (과거 선택 기반)

### 데이터 저장
- `users/{uid}` - Firestore 문서 구조
- `users/{uid}/mapPreferences/{preferenceId}` - 지도 선호도

---

## ✅ 결론

**현재 상태**:
- 프로필 온보딩: ✅ 완전 구현
- 스토리 추천: ✅ 프로필 기반 개인화 적용
- 상품 추천: ✅ AI 기반 추천 적용
- 지도 추천: ⏳ 프로필 기반 필터링 미구현 (serverPreferences만 사용)

**다음 단계**:
- 지도 추천에 프로필 데이터 통합
- 종목/지역 기반 장소 필터링 추가
