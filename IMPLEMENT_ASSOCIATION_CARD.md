# [필수 구현] 축구 허브 노원구 축구협회 카드 추가

**개발자에게 바로 전달 가능한 실행 지시문**

---

## 구현 요구사항

축구 허브(SportHub) 카드 그리드에

**'노원구 축구협회' 공식 카드 JSX를 추가하세요.**

---

## 구현 사양

### 위치
- 축구 허브 카드 그리드 최상단

### 카드 성격
- 공식 주체 (Association)

### 카드 클릭 시 이동
```
/association/assoc-nowon-football
```

### 렌더링 규칙
- ❌ 조건부 렌더링 금지
- ❌ 권한 체크 금지
- ⭕ 항상 노출

---

## 구현 파일

- `src/pages/sports/SportHub.tsx`

---

## 예시 코드

```typescript
// type === "football"일 때만 공식 카드 표시
{type === "football" && (
  <HubCard
    title="노원구 축구협회"
    subtitle="공식 운영 주체 · 대회 · 대관"
    icon="🏛️"
    onClick={() => navigate('/association/assoc-nowon-football')}
  />
)}
```

또는 ACTIONS 배열 맨 앞에 추가:

```typescript
const ACTIONS = [
  { 
    key: "official-association", 
    label: "노원구 축구협회",
    subtitle: "공식 운영 주체 · 대회 · 대관",
    route: "/association/assoc-nowon-football"
  },
  // ... 기존 카드들
];
```

---

## 완료 기준

1. ✅ 축구 허브 접속 시 카드 최상단에 노출
2. ✅ 클릭 시 `/association/assoc-nowon-football` 정상 이동
3. ✅ 로그인 여부와 무관하게 항상 노출

---

**작성일**: 2025-01-XX  
**버전**: v1.0  
**상태**: 실행 지시문 완료

