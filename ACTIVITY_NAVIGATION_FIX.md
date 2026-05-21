# 🔥 Activity Feed → Market Detail Navigation 수정 완료

## ✅ 수정 내용

### ActivityCard.tsx 클릭 핸들러 개선

**문제**: Activity Feed에서 `equipment_created`, `market_created` 타입 카드 클릭 시 거래 상세 페이지로 이동하지 않음.

**해결**: `handleClick` 함수에 Market 관련 타입 처리 로직 추가.

---

## 📋 수정된 타입 처리

### Market 관련 타입 (→ `/sports/:sport/market/:postId`)

다음 타입들은 모두 거래 상세 페이지로 이동합니다:

- `equipment_created` → 장비 거래
- `market_created` → 일반 거래
- `recruit_created` → 팀원 모집
- `match_created` → 경기 매칭
- `market` (레거시)
- `market_upload` (레거시)

### Team 관련 타입 (→ `/teams/:teamId`)

- `team_created`
- `team`

### Event 관련 타입 (→ `/events/:eventId`)

- `team_event`
- `event`

---

## 🔧 구현 세부사항

### 1. refId 우선 사용

```typescript
// v1 아키텍처: refId가 표준 필드
const postId = item.refId || item.sourceId;
```

### 2. Sport 필수 추출

```typescript
const sport = item.sport || "soccer"; // 기본값: soccer
```

### 3. 통합 라우팅 로직

```typescript
const isMarketType = 
  item.type === "equipment_created" ||
  item.type === "market_created" ||
  item.type === "recruit_created" ||
  item.type === "match_created" ||
  // ... 기타 market 타입

if (isMarketType) {
  navigate(`/sports/${sport}/market/${postId}`);
}
```

---

## 📊 정상 동작 흐름

```
Activity Feed (/activity)
    ↓
[equipment_created · 장비 · 농구]
[공공공] 카드 클릭
    ↓
/sports/basketball/market/OLikrnRWCvHzAnMzgS8
    ↓
MarketPostDetailPage
```

---

## ✅ 테스트 체크리스트

- [ ] Activity Feed에서 `equipment_created` 카드 클릭 → 거래 상세 이동 확인
- [ ] Activity Feed에서 `market_created` 카드 클릭 → 거래 상세 이동 확인
- [ ] Activity Feed에서 `recruit_created` 카드 클릭 → 거래 상세 이동 확인
- [ ] Activity Feed에서 `match_created` 카드 클릭 → 거래 상세 이동 확인
- [ ] Sport 파라미터가 올바르게 전달되는지 확인
- [ ] refId가 없는 경우 경고 로그 출력 확인

---

## 🚀 다음 단계 (선택사항)

Activity 시스템에서 추가로 구현하면 좋은 기능:

1. **좋아요 기능**: Activity 카드에서 직접 좋아요
2. **댓글 기능**: Activity 카드에서 댓글 작성
3. **공유 기능**: Activity 카드 공유
4. **필터링**: 타입별, 종목별 필터링

이 기능들을 추가하면 **피드 UX가 완전히 살아납니다.**
