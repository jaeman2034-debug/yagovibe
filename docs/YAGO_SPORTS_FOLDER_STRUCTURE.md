# 🏗️ YAGO SPORTS 프론트엔드 폴더 구조 (React + Vite + Firebase)

## 📊 현재 프로젝트 구조

### 기술 스택
- **프레임워크**: Vite + React (React 19.0.0)
- **라우팅**: React Router DOM v7.0.0
- **백엔드**: Firebase (Firestore, Auth)
- **UI**: Tailwind CSS + shadcn/ui
- **상태 관리**: Context API

---

## 🗂️ 서비스 수준 폴더 구조

### 현재 구조 (기존 유지)
```
src/
├── pages/              # 페이지 컴포넌트
│   ├── recruit/
│   │   └── RecruitCreatePage.tsx ✅
│   ├── match/
│   │   └── MatchCreatePage.tsx ✅
│   └── guest/          # (구현 필요)
│
├── components/         # 재사용 컴포넌트
│   ├── recruit/       # (구현 필요)
│   ├── match/         # (구현 필요)
│   └── guest/         # (구현 필요)
│
├── services/          # Firestore 서비스 레이어 ✅
│   ├── recruitService.ts ✅
│   ├── matchService.ts ✅
│   └── guestService.ts ✅
│
├── hooks/             # 커스텀 훅
│   ├── useRecruits.ts ✅
│   ├── useMatches.ts ✅
│   └── useGuests.ts ✅
│
├── types/             # TypeScript 타입 정의
│   ├── recruit.ts ✅
│   ├── match.ts ✅
│   └── guest.ts ✅
│
└── lib/               # 유틸리티 및 공통 로직
    └── firebase.ts    # Firebase 초기화
```

---

## 📁 생성된 파일 목록

### ✅ 타입 정의
- `src/types/recruit.ts` - Recruit, RecruitApplication 타입
- `src/types/match.ts` - Match, MatchRequest 타입
- `src/types/guest.ts` - GuestPlayer, GuestPlayerApplication 타입

### ✅ 서비스 레이어
- `src/services/recruitService.ts` - 팀원 모집 Firestore 작업
- `src/services/matchService.ts` - 경기 매칭 Firestore 작업
- `src/services/guestService.ts` - 용병 Firestore 작업

### ✅ 커스텀 훅
- `src/hooks/useRecruits.ts` - 팀원 모집글 실시간 조회
- `src/hooks/useMatches.ts` - 경기 매칭글 실시간 조회
- `src/hooks/useGuests.ts` - 용병 모집글 실시간 조회

---

## 🔥 서비스 레이어 사용 예시

### RecruitCreatePage에서 사용
```typescript
import { createRecruit } from "@/services/recruitService";
import type { CreateRecruitInput } from "@/types/recruit";

const recruitInput: CreateRecruitInput = {
  teamId,
  teamName,
  position,
  slots,
  region,
  trainingDays,
  level,
  contact,
  description,
};

const recruitId = await createRecruit(recruitInput, user.uid);
```

### useRecruits 훅 사용
```typescript
import { useRecruits } from "@/hooks/useRecruits";

const { recruits, loading, error } = useRecruits({
  status: "open",
  limit: 20,
});
```

---

## 🚀 다음 단계 구현 필요

### 1️⃣ Guest Player 시스템
- [ ] `src/pages/guest/GuestPlayerCreatePage.tsx`
- [ ] `src/pages/guest/GuestPlayerListPage.tsx`
- [ ] `src/components/guest/GuestPlayerCard.tsx`
- [ ] `src/components/guest/GuestPlayerForm.tsx`

### 2️⃣ 목록 페이지
- [ ] `src/pages/recruit/RecruitListPage.tsx`
- [ ] `src/pages/match/MatchListPage.tsx`
- [ ] 공통 컴포넌트: `ListCard`, `FilterBar`

### 3️⃣ 상세 페이지
- [ ] `src/pages/recruit/RecruitDetailPage.tsx`
- [ ] `src/pages/match/MatchDetailPage.tsx`
- [ ] 지원/신청 시스템

---

## 📋 Firestore 컬렉션 구조

### Recruits
```
recruits/{recruitId}
recruit_applications/{applicationId}
```

### Matches
```
matches/{matchId}
match_requests/{requestId}
```

### Guest Players
```
guest_players/{guestId}
guest_applications/{applicationId}
```

---

## ✅ 완료 상태

| 항목 | 상태 |
|------|------|
| 타입 정의 | ✅ 완료 |
| 서비스 레이어 | ✅ 완료 |
| 커스텀 훅 | ✅ 완료 |
| RecruitCreatePage 통합 | ✅ 완료 |
| MatchCreatePage 통합 | ✅ 완료 |

---

## 🎯 프로젝트 정보

**프로젝트 이름**: YAGO SPORTS (yago-vibe-spt)
**플랫폼 목표**: 풋살/축구 팀 매칭 플랫폼
**현재 완성도**: 70% → 75% (서비스 레이어 추가)
