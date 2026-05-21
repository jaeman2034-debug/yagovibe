# 🔥 /me 페이지 디자인 시스템 (STEP 9)

## 목표

마이페이지에서 쓰이는 모든 UI를 "Card Variant + Tone" 조합으로 통제한다.

## 1. Card Variant (딱 4개만 허용)

### ① info (기본 정보)
- **용도**: 프로필, 요약, 기록
- **PersonaSection의 70%**
- **특징**:
  - 강조 없음
  - CTA 없음
  - 가장 중립적인 톤
  - 카드 클릭 가능 (onClick)

### ② summary (상태 요약)
- **용도**: 이번 달 요약, 활동 요약
- **P1, P2에서 핵심**
- **특징**:
  - 숫자/상태 강조
  - 행동 유도 없음

### ③ hint (안내 / 맥락 제공)
- **용도**: ActivityHintCard
- **"없음"을 대체하는 카드**
- **특징**:
  - 배경 연함 (gradient)
  - 버튼 ❌
  - 문장 1~2줄

### ④ action (선택 유도)
- **OpportunitySection 전용**
- **CTA가 있는 유일한 카드**
- **특징**:
  - 버튼 1개만 허용
  - PersonaSection에서 사용 ❌

## 2. 텍스트 계층 (고정)

```
CardTitle        ← 항상 1개
PrimaryText      ← 선택
SubText          ← 선택
Action(Button)   ← action variant에서만
```

### ❌ 금지
- 제목 2개
- 버튼 2개
- 경고/에러 문구

## 3. PersonaSection × Card Variant 매트릭스

| Persona | info | summary | hint | action |
|---------|------|---------|------|--------|
| P0      | ⭕   | ❌      | ⭕   | ❌     |
| P1      | ⭕   | ⭕      | ⭕   | ❌     |
| P2      | ⭕   | ⭕      | ❌   | ❌     |
| P3      | ⭕   | ⭕      | ❌   | ❌     |
| P4      | ⭕   | ⭕      | ❌   | ❌     |

**👉 PersonaSection에는 action 카드가 절대 들어오지 않는다**

## 4. OpportunitySection 규칙

- OpportunitySection은 **action 카드만 허용**
- 버튼은 항상 1개
- "지금 안 하면 안 됨" 톤 ❌
- "할 수 있어요" 톤 ⭕

## 5. 실제 적용 예 (P1 개인 체육인)

```tsx
<P1_Individual>
  <Card variant="info" />     // MySportProfile
  <Card variant="summary" />   // MonthlySummary
  <Card variant="info" />     // RecommendedContent
  <Card variant="hint" />     // ActivityHint
</P1_Individual>

<OpportunitySection>
  <Card variant="action" />   // JoinTeam
</OpportunitySection>
```

## 6. 사용법

### MeCard 컴포넌트

```tsx
import { MeCard } from "@/components/me/MeCard";

// info variant
<MeCard
  variant="info"
  icon={<Trophy />}
  title="내 종목"
  onClick={() => navigate("/profile/edit")}
>
  {/* 커스텀 콘텐츠 */}
</MeCard>

// summary variant
<MeCard
  variant="summary"
  icon={<Calendar />}
  title="이번 달 훈련 요약"
>
  {/* 숫자/상태 표시 */}
</MeCard>

// hint variant
<MeCard
  variant="hint"
  icon={<Lightbulb />}
  title="다양한 활동을 시작해보세요"
>
  {/* 안내 문구 */}
</MeCard>

// action variant (OpportunitySection 전용)
<MeCard
  variant="action"
  icon={<Users />}
  title="팀에 소속되기"
  subText="이미 활동 중인 팀에 합류할 수 있어요."
  actionLabel="팀 찾기"
  onAction={() => navigate("/team/join")}
/>
```

## 7. 핵심 원칙

**"UI 자유도를 줄여야 제품의 자유도가 커진다."**

- 마이페이지 UI 규칙 봉인
- "이 카드 어디다 둬야 하지?" 고민 종료
- 새 기능 추가 시 variant만 고르면 됨
