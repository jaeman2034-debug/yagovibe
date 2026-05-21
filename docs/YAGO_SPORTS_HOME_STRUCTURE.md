# 🏠 YAGO SPORTS 홈 화면 구조 (트래픽 터지는 구조)

## 📊 핵심 원칙

**게시판처럼 만들면 망한다. 반드시 "지금 경기 / 오늘 용병" 중심이어야 한다.**

---

## 🎯 홈 화면 레이아웃

```
HEADER

🔥 오늘 용병 (가장 위 - 사용률 1위)
  - 오늘 날짜의 guest_players
  - 시간순 정렬
  - [지원하기] 버튼

🔥 오늘 경기 매칭
  - 오늘 날짜의 matches
  - 시간순 정렬
  - [신청하기] 버튼

🔥 최신 팀원 모집
  - 최근 3일 내 recruits
  - 최신순 정렬
  - [지원하기] 버튼

🔥 우리 지역 팀
  - 유저 region 기반 teams
  - 활동 많은 순
  - [가입하기] 버튼
```

---

## ✅ 생성된 컴포넌트

### 1. TodayGuestSection
- **파일**: `src/components/home/TodayGuestSection.tsx`
- **기능**: 오늘 용병 모집 표시
- **쿼리**: `useGuests({ status: "open", date: today, limit: 5 })`

### 2. TodayMatchSection
- **파일**: `src/components/home/TodayMatchSection.tsx`
- **기능**: 오늘 경기 매칭 표시
- **쿼리**: `useMatches({ status: "open", date: today, limit: 5 })`

### 3. LatestRecruitSection
- **파일**: `src/components/home/LatestRecruitSection.tsx`
- **기능**: 최신 팀원 모집 표시
- **쿼리**: `useRecruits({ status: "open", limit: 5 })` + 3일 필터

### 4. LocalTeamsSection
- **파일**: `src/components/home/LocalTeamsSection.tsx`
- **기능**: 우리 지역 팀 표시
- **쿼리**: `teams where region == user.region`

---

## 🔥 사용 방법

### HomePage 또는 HomeHub에 추가

```typescript
import TodayGuestSection from "@/components/home/TodayGuestSection";
import TodayMatchSection from "@/components/home/TodayMatchSection";
import LatestRecruitSection from "@/components/home/LatestRecruitSection";
import LocalTeamsSection from "@/components/home/LocalTeamsSection";

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <TodayGuestSection />
      <TodayMatchSection />
      <LatestRecruitSection />
      <LocalTeamsSection />
    </div>
  );
}
```

---

## 📋 다음 단계

1. **HomePage 또는 HomeHub에 섹션 추가**
2. **Guest Player 페이지 구현** (목록/상세)
3. **Recruit/Match 목록 페이지 구현**
4. **지원/신청 시스템 구현**
