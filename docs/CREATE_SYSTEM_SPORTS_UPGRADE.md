# ⚽ YAGO VIBE Create System 스포츠 플랫폼 업그레이드

## 📋 완료된 작업

### ✅ CreateModal 스포츠 특화 옵션 추가

**파일**: `src/components/create/CreateModal.tsx`

**추가된 옵션**:
1. ⚽ 팀원 모집 (`/market/create?category=recruit`)
2. 🤝 경기 매칭 (`/market/create?category=match`)

**최종 구조**:
```
작성하기

📅 일정 만들기
   팀 일정, 대회 등록

👥 팀 만들기
   새로운 팀 생성

🛒 거래 글쓰기
   중고 장비, 용품 판매

────────────

⚽ 팀원 모집
   팀 멤버 모집

🤝 경기 매칭
   상대팀 찾기

────────────

⚡ AI 추천 작성 [준비중]
```

---

## 🔄 ActivityFeed 연동

**파일**: `src/features/activity/ActivityFeed.tsx`

**변경 사항**:
- 거래 탭 필터에 `recruit_created`, `match_created` 타입 추가
- 이제 거래 탭에서 팀원 모집, 경기 매칭 글도 표시됨

**활성화된 Activity 타입**:
```typescript
"market_created"      // 일반 거래
"recruit_created"     // 팀원 모집
"match_created"       // 경기 매칭
"equipment_created"   // 장비 판매
```

---

## 📐 데이터 구조

### 팀원 모집 (Recruit)

**Firestore 구조**:
```
market/{postId}
{
  category: "recruit",
  sport: "soccer",
  title: "노원구 축구팀 멤버 모집",
  description: "...",
  people: 5,
  currentPeople: 2,
  position: ["FW", "MF"],
  level: "아마",
  practiceDay: ["일요일"],
  practiceLocation: "노원구",
  ...
}
```

**Activity 생성**:
```
activities/{activityId}
{
  type: "recruit_created",
  refType: "market",
  refId: "{postId}",
  title: "노원구 축구팀 멤버 모집",
  ...
}
```

---

### 경기 매칭 (Match)

**Firestore 구조**:
```
market/{postId}
{
  category: "match",
  sport: "soccer",
  title: "상대팀 구합니다",
  description: "...",
  matchDate: Timestamp,
  matchType: "11v11",
  fee: 50000,
  location: "노원구",
  ...
}
```

**Activity 생성**:
```
activities/{activityId}
{
  type: "match_created",
  refType: "market",
  refId: "{postId}",
  title: "상대팀 구합니다",
  ...
}
```

---

## 🚀 라우팅 구조

### 현재 라우트

```
/market/create                    → MarketAddPage (기본: equipment)
/market/create?category=recruit  → MarketAddPage (팀원 모집)
/market/create?category=match    → MarketAddPage (경기 매칭)
```

### MarketWritePage 처리

`MarketWritePage`는 이미 `category` 파라미터를 처리합니다:
- `category=recruit` → `RecruitForm` 렌더링
- `category=match` → `MatchForm` 렌더링
- 기본값 → `EquipmentForm` 렌더링

---

## 📊 플랫폼 완성도

| 기능 | 상태 | 경로 |
|------|------|------|
| 활동 피드 | ✅ 완료 | `/activity` |
| 팀 생성 | ✅ 완료 | `/team/create` |
| 거래 등록 | ✅ 완료 | `/market/create` |
| 팀원 모집 | ✅ 완료 | `/market/create?category=recruit` |
| 경기 매칭 | ✅ 완료 | `/market/create?category=match` |
| 일정 생성 | ✅ 완료 | `/activity/schedule/create` |

---

## 🎯 다음 단계 (선택)

### 1️⃣ 별도 라우트 생성 (향후)

현재는 `/market/create?category=recruit`로 처리되지만, 더 명확한 UX를 위해:

```
/recruit/create  → MarketWritePage (category=recruit)
/match/create    → MarketWritePage (category=match)
```

**구현 방법**:
```typescript
// App.tsx
<Route 
  path="/recruit/create" 
  element={<Navigate to="/market/create?category=recruit" replace />} 
/>
<Route 
  path="/match/create" 
  element={<Navigate to="/market/create?category=match" replace />} 
/>
```

또는 직접 라우트:
```typescript
<Route 
  path="/recruit/create" 
  element={<MarketWritePage defaultCategory="recruit" />} 
/>
```

---

### 2️⃣ 지도 + 경기 매칭 통합 (v2.0)

**목표**: 지도에서 경기, 팀, 모집 찾기

**구조**:
```
/map
  ├ 경기 찾기
  ├ 팀 찾기
  └ 모집 찾기
```

**데이터 소스**:
- `activities` 컬렉션에서 `type` 필터링
- `recruit_created`, `match_created` 타입만 표시
- 위치 정보(`address`, `location`) 기반 지도 마커 표시

---

## ✅ 체크리스트

- [x] CreateModal에 팀원 모집 옵션 추가
- [x] CreateModal에 경기 매칭 옵션 추가
- [x] ActivityFeed 거래 탭 필터 업데이트
- [x] recruit_created, match_created 타입 활성화
- [ ] 별도 라우트 생성 (선택)
- [ ] 지도 통합 (v2.0)

---

## 📚 관련 파일

- `src/components/create/CreateModal.tsx`: Create 모달 (스포츠 옵션 포함)
- `src/features/market/pages/MarketWritePage.tsx`: 거래/모집/매칭 작성 페이지
- `src/features/market/components/forms/RecruitForm.tsx`: 팀원 모집 폼
- `src/features/market/components/forms/MatchForm.tsx`: 경기 매칭 폼
- `src/features/activity/ActivityFeed.tsx`: 활동 피드 (필터 업데이트)
- `src/types/activity.ts`: Activity 타입 정의

---

## 💡 사용자 경험

### CreateModal에서 선택

1. 사용자가 FAB 버튼 클릭
2. CreateModal 표시
3. "⚽ 팀원 모집" 또는 "🤝 경기 매칭" 선택
4. MarketWritePage로 이동 (해당 category로 자동 설정)
5. 폼 작성 및 제출
6. ActivityFeed에 자동 표시

### ActivityFeed에서 확인

1. 거래 탭 클릭
2. 팀원 모집, 경기 매칭 글 표시
3. 클릭 시 상세 페이지로 이동

---

## 🎉 결과

이제 YAGO VIBE는 **진짜 스포츠 플랫폼**이 되었습니다!

- ✅ 팀 생성
- ✅ 팀원 모집
- ✅ 경기 매칭
- ✅ 거래
- ✅ 일정 관리

모든 기능이 통합되어 있습니다.
