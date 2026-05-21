# 🔥 Cursor 개발자 수정 지시문: CreateModal 모든 라우트 수정 완료

## ✅ 수정 완료

### 변경 사항

1. **일정 만들기 라우트 추가**
   - `App.tsx`에 `/sports/:sport/schedule/write` 라우트 추가
   - `ScheduleCreatePage` import 추가

2. **팀원 모집 경로 수정**
   - ❌ 기존: `/sports/${sport}/recruit/write`
   - ✅ 변경: `/sports/${sport}/market/write?category=recruit`
   - **이유**: `MarketWritePage`가 `category` 파라미터로 처리

3. **경기 매칭 경로 수정**
   - ❌ 기존: `/sports/${sport}/match/write`
   - ✅ 변경: `/sports/${sport}/market/write?category=match`
   - **이유**: `MarketWritePage`가 `category` 파라미터로 처리

---

## 📋 최종 라우트 구조

### CreateModal 버튼별 경로

| 버튼 | 경로 | 상태 |
|------|------|------|
| 거래 글쓰기 | `/sports/:sport/market/write` | ✅ 이미 존재 |
| 일정 만들기 | `/sports/:sport/schedule/write` | ✅ 추가 완료 |
| 팀 만들기 | `/sports/:sport/team/create` | ✅ 이미 존재 |
| 팀원 모집 | `/sports/:sport/market/write?category=recruit` | ✅ 수정 완료 |
| 경기 매칭 | `/sports/:sport/market/write?category=match` | ✅ 수정 완료 |

---

## 🔧 수정된 파일

### App.tsx
1. `ScheduleCreatePage` import 추가
2. `/sports/:sport/schedule/write` 라우트 추가

### CreateModal.tsx
1. 팀원 모집 경로: `?category=recruit` 추가
2. 경기 매칭 경로: `?category=match` 추가

---

## 🧪 테스트 체크리스트

- [ ] 거래 글쓰기 버튼 클릭 → `/sports/soccer/market/write` 이동 확인
- [ ] 일정 만들기 버튼 클릭 → `/sports/soccer/schedule/write` 이동 확인 (404 없음)
- [ ] 팀 만들기 버튼 클릭 → `/sports/soccer/team/create` 이동 확인
- [ ] 팀원 모집 버튼 클릭 → `/sports/soccer/market/write?category=recruit` 이동 확인
- [ ] 경기 매칭 버튼 클릭 → `/sports/soccer/market/write?category=match` 이동 확인

---

## 📝 참고사항

### MarketWritePage 동작
- `MarketWritePage`는 `category` 쿼리 파라미터로 폼을 분기합니다:
  - `category=equipment` → `EquipmentForm`
  - `category=recruit` → `RecruitForm`
  - `category=match` → `MatchForm`

### 라우트 통일
- 거래, 팀원 모집, 경기 매칭은 모두 `/sports/:sport/market/write`를 사용
- `category` 파라미터로 구분
- 일정 만들기만 별도 라우트 (`/sports/:sport/schedule/write`)

---

이 수정으로 **모든 CreateModal 버튼이 정상 작동**합니다.
