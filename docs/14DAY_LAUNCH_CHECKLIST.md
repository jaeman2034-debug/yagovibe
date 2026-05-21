# 🚀 14일 실행 체크리스트 (서울 허브)

> **목표**: 2주 안에 지표가 잡히는 구조로 굴러가기

---

## 📋 공통 운영 룰 (매일 30분)

### 필수 체크리스트
- [ ] **대시보드 v2**: CTR / Booking CR / PayFail / SeedRate 확인
- [ ] **스토리 슬롯 5/5** 유지 (빈 슬롯 절대 금지)
- [ ] **하루 1개만 바꾼다** (실험/개선 원인 추적)

### 매일 확인 지표
```
GET /api/admin/dashboard/summary?region=seoul&date=YYYY-MM-DD
→ CTR, CR, PayFail, SeedRate 확인
→ 위험 신호 확인
```

---

## Day 1 — 오픈 점검 & 기준선 확보

### 작업 목록
- [ ] 스토리 5개 세팅
  - 협회 2개
  - 운영 2개
  - 사용자 1개
- [ ] 구장 3개 이상, 슬롯 6개 이상 존재 확인
- [ ] 결제 플로우 테스트
  - `reserve → pay(webhook)` 정상 플로우 1회 테스트
- [ ] 로그 확인
  - `story_impression` / `story_click` 찍히는지 확인
  - `payment_success` 찍히는지 확인
- [ ] KPI 롤업 확인
  - DailyKpi에 데이터 들어오는지 확인

### 성공 기준
✅ 첫날 CTR/CR "수치"가 보인다 (좋고 나쁨 상관 X)

### API 확인
```bash
# 스토리 확인
GET /api/stories?region=seoul

# 구장 확인
GET /api/ground?region=seoul

# KPI 확인
GET /api/admin/dashboard/kpi?region=seoul&date=2025-02-03
```

---

## Day 2 — CTA AB 시작

### 작업 목록
- [ ] `hub_story_cta` 실험 RUNNING 확인
  ```bash
  GET /api/admin/exp/hub_story_cta
  ```
- [ ] StoryZone CTA 카피 A/B 적용 확인
  - A: "일정 보기" / "팀 찾기" 등
  - B: "지금 확인" / "참여하기" 등
- [ ] "구장" 카테고리 스토리 1개를 슬롯 4번에 고정
  - 전환 통로 확보

### 성공 기준
✅ `exp_impression` / `exp_click` 로그가 쌓인다

### 확인 방법
```bash
# 실험 통계 확인
GET /api/admin/exp/hub_story_cta

# 로그 확인
POST /api/logs/story
{
  "eventName": "exp_impression",
  "experimentKey": "hub_story_cta",
  "variant": "A"
}
```

---

## Day 3 — 스토리 품질 정리(저CTR 컷)

### 작업 목록
- [ ] CTR < 1.5% 스토리 2개 교체
  - 운영 픽으로 교체
- [ ] 타이틀/서브 글자수 규칙 준수 확인
  - 타이틀: ≤ 40자
  - 서브: ≤ 60자
- [ ] 이미지 없는 스토리: 그라디언트+라벨로 통일

### 성공 기준
✅ CTR이 "상승 방향"을 보인다

### 확인 방법
```bash
# 스토리 CTR 확인
GET /api/admin/dashboard/summary?region=seoul

# 저CTR 스토리 확인
GET /api/admin/stories?region=seoul&status=PUBLISHED
```

---

## Day 4 — 구장 전환 루트 강화

### 작업 목록
- [ ] 구장 5개로 확대 (최소)
- [ ] 각 구장에 "다음 슬롯" 1개 이상 보장
- [ ] 퍼널 수치 확인
  - `ground_view → slot_select → reserve_create`

### 성공 기준
✅ `reserve_create`가 매일 발생

### 확인 방법
```bash
# 구장 목록
GET /api/ground?region=seoul

# 슬롯 확인
GET /api/ground/:groundId/slots

# 예약 이벤트 확인
GET /api/admin/dashboard/kpi?region=seoul
→ bookingStart 확인
```

---

## Day 5 — 첫 예약 혜택 캠페인 ON

### 작업 목록
- [ ] 캠페인 1개 생성: `discount` (서울)
  ```bash
  POST /api/admin/campaign
  {
    "region": "seoul",
    "trigger": "discount",
    "segment": "{}",
    "msgA": "첫 예약 10% 할인",
    "msgB": "오늘만 10% 할인"
  }
  ```
- [ ] 메시지 A/B 확인
- [ ] 발송 제한 1일 1회 유지 확인

### 성공 기준
✅ `msg_send` 이벤트 발생 + 구장 유입 증가

### 확인 방법
```bash
# 캠페인 확인
GET /api/admin/campaign

# 발송 로그 확인
GET /api/admin/campaign/:id
→ stats.sent 확인
```

---

## Day 6 — 결제 실패율 안정화

### 작업 목록
- [ ] PayFailRate > 5%면 원인 분류
  - 웹훅 지연
  - LOCK 만료
  - 사용자 이탈
- [ ] LOCK 해제 로직 점검
  - 5분 후 OPEN 복귀되는지 확인
- [ ] 결제 성공률이 낮으면 "결제 시작 화면" 문구 단순화
  - 1개 변경만

### 성공 기준
✅ PayFail가 안정 (≤5%)

### 확인 방법
```bash
# 결제 실패율 확인
GET /api/admin/dashboard/summary?region=seoul
→ risk 확인

# 결제 로그 확인
GET /api/admin/dashboard/kpi?region=seoul
→ payFail 확인
```

---

## Day 7 — 1주차 리포트 & 다음주 목표 재설정

### 작업 목록
- [ ] 1주 평균 정리
  - Story CTR
  - Booking CR
  - Revenue
  - SeedRate
- [ ] 성과 좋은 스토리 출처 비율을 혼합D에 반영
  - 운영 규칙 조정
- [ ] AB 실험 유지
  - 표본 부족이면 계속

### 성공 기준
✅ "무엇이 먹히는지" 1개는 확실해짐

### 확인 방법
```bash
# 1주 KPI 트렌드
GET /api/admin/dashboard/kpi/trend?region=seoul&days=7

# AB 실험 현황
GET /api/admin/dashboard/experiments
```

---

## Day 8 — 팀 10개 만들기(커뮤니티 점화)

### 작업 목록
- [ ] 운영이 팀 5개 시드 생성
  - 가짜여도 됨: 실존팀/동호회 기반
- [ ] 팀 생성 → 모집 스토리 자동 생성 확인
- [ ] ActionGrid에서 "팀 찾기" 1순위로 배치
  - 필요시 AB로

### 성공 기준
✅ 모집 스토리가 매일 1개 이상 노출

### 확인 방법
```bash
# 팀 생성
POST /api/team
{
  "region": "seoul",
  "name": "노원 FC",
  "level": "normal",
  "managerId": "user_123"
}

# 팀 목록
GET /api/team?region=seoul

# 모집 스토리 확인
GET /api/stories?region=seoul
→ category="모집" 확인
```

---

## Day 9 — 팀 가입 플로우 최적화

### 작업 목록
- [ ] 가입 버튼/동선 1탭 구조 확인
- [ ] 가입 성공 이벤트(`team_join_request`) 로깅 확인
- [ ] 인기 팀 3개를 상단 고정
  - 리스트에서

### 성공 기준
✅ `team_join_request`가 증가

### 확인 방법
```bash
# 팀 가입
POST /api/team/:id/join
{ "userId": "user_456" }

# 팀 멤버 확인
GET /api/team/:id/members
```

---

## Day 10 — 리그 1개 론칭(시즌 모드 고정)

### 작업 목록
- [ ] 리그 생성(서울) + 경기 2개 등록
  ```bash
  POST /api/league/community
  {
    "region": "seoul",
    "name": "서울 주말 리그",
    "season": "2025-1",
    "startAt": "2025-03-01T00:00:00Z",
    "endAt": "2025-03-31T23:59:59Z"
  }

  POST /api/league/community/match
  {
    "leagueId": "l_...",
    "homeTeam": "노원 FC",
    "awayTeam": "강남 FC",
    "groundId": "ground_seoul_1",
    "time": "2025-03-15T14:00:00Z"
  }
  ```
- [ ] 리그 스토리 생성 확인 → 시즌 판정 ON 확인
- [ ] 시즌 ON일 때 슬롯 우선순위 규칙이 적용되는지 확인

### 성공 기준
✅ season 모드로 전환되고 스토리 구성이 안정

### 확인 방법
```bash
# 리그 확인
GET /api/league/community?region=seoul

# 시즌 모드 확인
GET /api/stories?region=seoul
→ mode="season" 확인
→ decisionReason 확인
```

---

## Day 11 — 공유 루프 개시(팀/경기 공유)

### 작업 목록
- [ ] 팀 공유 URL 생성/OG 확인
  ```bash
  buildTeamShareUrl("team_123", "seoul")
  → https://hub.com/r/seoul/team/team_123
  ```
- [ ] 공유 클릭 이벤트(`share_click`) 로깅
- [ ] "초대 링크" 카피 2종 AB (가볍게)

### 성공 기준
✅ 외부 유입이 생김 (작아도 됨)

### 확인 방법
```bash
# 공유 URL 생성
import { buildTeamShareUrl } from "./domain/share";
const url = buildTeamShareUrl("team_123", "seoul");

# 딥링크 파싱
import { parseDeepLink } from "./domain/share";
const parsed = parseDeepLink(url);
```

---

## Day 12 — 개인화 ON (보수적으로)

### 작업 목록
- [ ] userId 있는 사용자에만 리랭킹 적용
  - 게스트는 기본 정렬
- [ ] 개인화 ON/OFF 실험 키 하나 추가 (가능하면)
- [ ] 카테고리 가중치 증가폭 제한
  - 하루 +0.3 유지

### 성공 기준
✅ 재방문/클릭이 "분명히" 상승 or 최소 유지

### 확인 방법
```bash
# 개인화 스토리 조회
GET /api/stories?region=seoul&userId=user_123

# 프로필 확인
GET /api/admin/dashboard/health?region=seoul
```

---

## Day 13 — AB 승자 후보 확정

### 작업 목록
- [ ] 표본/기간 충족 여부 확인
  - 표본: ≥ 3000
  - 기간: ≥ 7일
- [ ] uplift ≥ 10%면 자동 WIN 처리 확인
- [ ] 승자 고정 후 CTR 변동 확인

### 성공 기준
✅ 하나의 실험이 "결론" 남김

### 확인 방법
```bash
# AB 실험 현황
GET /api/admin/dashboard/experiments

# 승자 확인
GET /api/admin/exp/hub_story_cta
→ status="WIN", winner="A" or "B" 확인
```

---

## Day 14 — 2주차 최종 리포트 & 다음 스케일 플랜

### 작업 목록
- [ ] 지역 확장 후보 선정
  - 부산/경기 중 택1
- [ ] 구장 공급/팀 공급/협회 연동 준비도 체크
- [ ] 다음 2주 목표 결정
  - 예약 2배 or 팀 2배

### 성공 기준
✅ 다음 지역으로 복제 가능한 "운영 레시피" 완성

### 확인 방법
```bash
# 2주 KPI 트렌드
GET /api/admin/dashboard/kpi/trend?region=seoul&days=14

# 전체 요약
GET /api/admin/dashboard/summary?region=seoul
```

---

## 🔥 절대 건드리면 안 되는 3가지

### 1. 스토리 슬롯 5/5 (비면 끝)
- 스토리가 5개 미만이면 즉시 seed로 채우기
- 빈 슬롯은 서비스 신뢰도 하락

### 2. 결제 성공률 (실패율 5% 넘기면 먼저 고쳐야 함)
- PayFail > 5%면 다른 작업 중단
- 결제가 안 되면 수익 0

### 3. 하루 변경 1개 원칙 (원인 추적)
- 여러 개 동시 변경 시 원인 파악 불가
- A/B 테스트 결과 신뢰도 하락

---

## 📊 매일 확인 지표 (대시보드 v2)

### 필수 위젯 6개
1. **Story CTR** (목표: ≥2%)
2. **Booking CR** (목표: ≥15%)
3. **PayFail** (목표: ≤5건)
4. **SeedRate** (목표: ≤10%)
5. **Story Fill Rate** (목표: 100%)
6. **Revenue** (일별 추이)

### 확인 방법
```bash
GET /api/admin/dashboard/summary?region=seoul&date=YYYY-MM-DD
```

---

## 🚨 위험 신호 대응

### CTR < 1%
→ 즉시 스토리 교체 (운영 픽 2개)

### PayFail > 10건
→ 결제 플로우 점검 (웹훅/LOCK 확인)

### SeedRate > 20%
→ 협회 동기화 확인 + 운영 스토리 추가

### Story Fill Rate < 50%
→ 즉시 seed로 채우기

---

## ✅ 론치 준비 완료 체크리스트

- [ ] 스토리 5개 이상
- [ ] 구장 3개 이상
- [ ] 팀 5개 이상
- [ ] 리그 1개 이상
- [ ] AB 실험 1개 이상
- [ ] 캠페인 1개 이상
- [ ] 로그 수집 정상
- [ ] KPI 롤업 정상
- [ ] 헬스 체크 통과

```bash
npm run launch:check
```
