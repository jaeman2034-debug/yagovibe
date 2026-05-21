# 🔥 Cursor 개발자 수정 지시문: Activity 카드 클릭 라우팅 수정

## 📋 문제

Activity 카드 클릭 시 라우팅이 변경되지 않음.

**현재 동작**:
```
/activity 페이지
  ↓
[공공공 카드 클릭]
  ↓
/activity 페이지 (변경 없음) ❌
```

**정상 동작**:
```
/activity 페이지
  ↓
[공공공 카드 클릭]
  ↓
/sports/volleyball/market/{postId} ✅
```

---

## ✅ 수정 완료

### ActivityCard.tsx 수정

1. **디버깅 로그 추가**: 클릭 시 Activity 데이터 확인
2. **라우팅 로직 명확화**: switch 문으로 타입별 분기
3. **에러 처리 강화**: postId 없을 때 알림 표시
4. **Team 라우팅 수정**: `/teams/${postId}` → `/sports/${sport}/team/${postId}`

---

## 📋 라우팅 규칙

### 1️⃣ 거래 (Market)
| Activity Type | 이동 경로 |
|--------------|----------|
| `equipment_created` | `/sports/:sport/market/:postId` |
| `market_created` | `/sports/:sport/market/:postId` |
| `recruit_created` | `/sports/:sport/market/:postId` |
| `match_created` | `/sports/:sport/market/:postId` |

**예시**:
```
/sports/volleyball/market/abc123
```

### 2️⃣ 팀 생성
| Activity Type | 이동 경로 |
|--------------|----------|
| `team_created` | `/sports/:sport/team/:teamId` |
| `team` | `/sports/:sport/team/:teamId` |

**예시**:
```
/sports/soccer/team/xyz789
```

### 3️⃣ 이벤트
| Activity Type | 이동 경로 |
|--------------|----------|
| `team_event` | `/sports/:sport/event/:eventId` |
| `event` | `/sports/:sport/event/:eventId` |

**예시**:
```
/sports/basketball/event/def456
```

---

## 🔧 수정된 코드

### handleClick 함수

```typescript
const handleClick = (e?: React.MouseEvent) => {
  // 🔥 이벤트 전파 방지
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // 🔥 디버깅: Activity 데이터 확인
  console.log("🔥 [ActivityCard] 클릭됨:", {
    type: item.type,
    refId: item.refId,
    sourceId: item.sourceId,
    sport: item.sport,
    refType: item.sourceType,
  });

  // 🔥 refId 우선, 없으면 sourceId 사용
  const postId = item.refId || item.sourceId;
  const refType = item.sourceType || "market";

  if (!postId) {
    console.error("❌ [ActivityCard] refId/sourceId가 없습니다:", item);
    alert("게시글 ID를 찾을 수 없습니다.");
    return;
  }

  // 🔥 sport 추출 (필수)
  const sport = item.sport || "soccer";

  // 🔥 타입별 라우팅 분기
  switch (item.type) {
    case "equipment_created":
    case "market_created":
    case "recruit_created":
    case "match_created":
      const marketPath = `/sports/${sport}/market/${postId}`;
      console.log("✅ [ActivityCard] Market 상세로 이동:", marketPath);
      navigate(marketPath);
      return;

    case "team_created":
    case "team":
      const teamPath = `/sports/${sport}/team/${postId}`;
      console.log("✅ [ActivityCard] Team 상세로 이동:", teamPath);
      navigate(teamPath);
      return;

    case "team_event":
    case "event":
      const eventPath = `/sports/${sport}/event/${postId}`;
      console.log("✅ [ActivityCard] Event 상세로 이동:", eventPath);
      navigate(eventPath);
      return;

    default:
      // 🔥 refType으로 판단 (레거시 호환)
      if (refType === "market" || refType === "marketPosts") {
        navigate(`/sports/${sport}/market/${postId}`);
        return;
      }
      
      // 🔥 알 수 없는 타입
      console.warn("⚠️ [ActivityCard] 알 수 없는 타입:", item.type);
      navigate(`/sports/${sport}/market/${postId}`);
  }
};
```

---

## 📊 Activity 데이터 구조

### 예시 Activity Document
```json
{
  "type": "equipment_created",
  "refType": "market",
  "refId": "abc123",
  "sport": "volleyball",
  "category": "equipment",
  "title": "공공공",
  "authorId": "user123",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### 필수 필드
- `type`: Activity 타입 (예: "equipment_created")
- `refId`: 원본 게시글 ID (예: "abc123")
- `sport`: 종목 (예: "volleyball")

### 선택 필드
- `sourceId`: 레거시 호환용 (refId 없을 때 사용)
- `sourceType`: 원본 컬렉션 타입 (예: "market")
- `category`: 카테고리 (예: "equipment")

---

## 🧪 테스트 방법

### 1. Activity 카드 클릭 테스트
1. `/activity` 페이지 열기
2. "거래 · 장비 · 배구" 카드 클릭
3. 콘솔에서 다음 로그 확인:
   ```
   🔥 [ActivityCard] 클릭됨: { type: "equipment_created", ... }
   ✅ [ActivityCard] Market 상세로 이동: /sports/volleyball/market/abc123
   ```
4. `/sports/volleyball/market/abc123`로 이동하는지 확인

### 2. 디버깅
- **postId 없을 때**: "게시글 ID를 찾을 수 없습니다." 알림 표시
- **sport 없을 때**: 기본값 "soccer" 사용
- **알 수 없는 타입**: 경고 로그 출력 후 market으로 처리

---

## 🔍 문제 해결 체크리스트

### Activity 카드가 클릭되지 않는 경우
- [ ] `onClick={handleClick}` 연결 확인
- [ ] CSS `pointer-events: none` 확인
- [ ] 다른 요소가 클릭 이벤트를 가로채는지 확인

### 라우팅이 작동하지 않는 경우
- [ ] 콘솔에서 "🔥 [ActivityCard] 클릭됨" 로그 확인
- [ ] `refId` 또는 `sourceId` 값 확인
- [ ] `sport` 값 확인
- [ ] `navigate` 함수가 제대로 호출되는지 확인

### 잘못된 페이지로 이동하는 경우
- [ ] Activity `type` 값 확인
- [ ] `switch` 문의 case 매칭 확인
- [ ] `refType` fallback 로직 확인

---

## 📝 참고사항

### 이벤트 전파 방지
```typescript
if (e) {
  e.preventDefault();
  e.stopPropagation();
}
```

### 디버깅 로그
모든 라우팅 시도는 콘솔에 로그를 남깁니다:
- `🔥 [ActivityCard] 클릭됨`: 클릭 이벤트 발생
- `✅ [ActivityCard] Market 상세로 이동`: 라우팅 성공
- `⚠️ [ActivityCard] 알 수 없는 타입`: 타입 불일치
- `❌ [ActivityCard] refId/sourceId가 없습니다`: 데이터 누락

---

## 🚀 최종 정상 흐름

```
1. 상품 등록
   ↓
2. Activity 생성
   type: "equipment_created"
   refId: "abc123"
   sport: "volleyball"
   ↓
3. Activity Feed 표시
   "거래 · 장비 · 배구"
   "공공공"
   ↓
4. 카드 클릭
   ↓
5. handleClick 실행
   ↓
6. /sports/volleyball/market/abc123 이동
   ↓
7. MarketPostDetailPage 렌더링
```

---

## ⚠️ 중요 원칙

### Activity 페이지 역할
```
Activity 페이지 = 피드만 담당
실제 컨텐츠 페이지 아님
```

### Activity 카드 클릭 동작
```
Activity 카드 클릭 → 원본 컨텐츠 상세 페이지로 이동
절대 Activity 페이지에 머무르지 않음
```

---

이 수정으로 **Activity 카드 클릭 시 올바른 상세 페이지로 이동**합니다.
