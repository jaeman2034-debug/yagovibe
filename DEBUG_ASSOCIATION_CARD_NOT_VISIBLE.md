# 🔥 DEBUG: 노원구 축구협회 카드 노출 안됨

**개발자에게 바로 전달 가능한 디버그 지시문 (복붙용)**

---

## 1️⃣ 확인 파일

**SportHub.tsx** (또는 축구 허브 카드 렌더링 담당 컴포넌트)

- 경로: `src/pages/sports/SportHub.tsx`
- 카드 리스트를 map/render 하는 JSX 영역

---

## 2️⃣ 확인 포인트 (순서대로)

### ✅ 포인트 1: 노원구 축구협회 카드 JSX가 카드 리스트에 실제로 추가되어 있는지

```typescript
// 배열 형태
cards = [
  { title: "우리 팀 관리", ... },
  { title: "팀 / FC 찾기", ... },
  // ❌ 노원구 축구협회 카드 없음?
]
```

```jsx
// JSX 직접 렌더링
<Grid>
  <HubCard title="우리 팀 관리" ... />
  <HubCard title="팀 / FC 찾기" ... />
  {/* ❌ 노원구 축구협회 카드 없음? */}
</Grid>
```

### ✅ 포인트 2: 조건부 렌더링 여부 확인

다음과 같은 조건이 있나 확인:

```jsx
{isLoggedIn && <HubCard ... />}
{role === 'admin' && <HubCard ... />}
{associationId === 'xxx' && <HubCard ... />}
```

**❗️ 일단 조건 없이 무조건 렌더링되게 테스트**

```jsx
// 테스트용 (조건 제거)
<HubCard
  title="노원구 축구협회"
  subtitle="공식 운영 주체"
  onClick={() => navigate('/association/assoc-nowon-football')}
/>
```

### ✅ 포인트 3: Grid 영역 내부에 들어가 있는지 확인

```jsx
// ✅ 올바른 구조
<div className="grid">
  <HubCard title="노원구 축구협회" ... />  {/* grid 안에 */}
  <HubCard title="우리 팀 관리" ... />
</div>

// ❌ 잘못된 구조
<div className="grid">
  <HubCard title="우리 팀 관리" ... />
</div>
<HubCard title="노원구 축구협회" ... />  {/* grid 밖 */}
```

### ✅ 포인트 4: 클릭 경로 확인

```typescript
onClick → /association/assoc-nowon-football
```

---

## 3️⃣ 예상 원인 (확률순)

1. **✅ 95%**: 카드 JSX 자체 미추가
2. **3%**: 조건 렌더링에 의해 숨김
3. **2%**: Grid 밖에 렌더링됨

---

## 4️⃣ 해결 기준

1. ✅ 축구 허브 첫 화면에 "노원구 축구협회" 카드가 다른 카드와 동일한 스타일로 노출
2. ✅ 클릭 시 `/association/assoc-nowon-football` 정상 이동
3. ✅ 로그인 여부와 무관하게 모든 사용자에게 노출
4. ✅ 모바일/데스크탑 모두 정상 표시

---

## 📝 추가 예시 코드

### 파일: `src/pages/sports/SportHub.tsx`

```typescript
// type === "football"일 때만 공식 카드 추가
{type === "football" && (
  <HubCard
    title="노원구 축구협회"
    subtitle="공식 운영 주체 · 대회 · 대관"
    icon="🏛️"
    onClick={() => navigate('/association/assoc-nowon-football')}
  />
)}

<ActionGrid
  actions={ACTIONS}
  context={{ sport: type }}
  onActionClick={handleActionClick}
/>
```

또는 ACTIONS 배열 맨 앞에 추가:

```typescript
const ACTIONS = [
  // 공식 카드 추가
  { 
    key: "official-association", 
    label: "노원구 축구협회",
    subtitle: "공식 운영 주체 · 대회 · 대관",
    route: "/association/assoc-nowon-football"
  },
  { key: "team-manage", label: "우리 팀 관리", paywall: true },
  // ... 기존 카드들
];
```

---

## 🎯 중요 판단

**❝ 이 문제는 더 이상 기획이나 IA를 만질 단계가 아니다 ❞**

- ✅ IA: 맞음
- ✅ 라우트: 맞음
- ✅ 페이지: 이미 존재함
- ❌ **문제: JSX 한 줄 누락**

**이건 개발자 5분짜리 수정이고, 카드만 뜨는 순간, 바로 다음 단계(Hero 문구 확정)로 간다.**

---

## ✅ 다음 단계 예고

카드 노출 확인 후:
- 노원구 축구협회 카드 문구 최종 확정
- Hero Section (구청용 / 회원용) 문장 확정

---

**작성일**: 2025-01-XX  
**버전**: v3.0 (최종 실행용)  
**상태**: 디버그 지시문 완료 (개발자 전달 가능)
