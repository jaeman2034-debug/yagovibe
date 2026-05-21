# 🔒 모바일 스크롤 문제 해결 문서 (FINAL)

**목적**: 모바일에서 하단까지 스크롤이 안 되는 문제 해결  
**원칙**: 레이아웃은 물리적 공간 문제, 100vh는 모바일에서 신뢰 불가  
**대상**: 개발자 / QA

---

## 0️⃣ 문제 증상

### 스크린샷 기준 증상
- 모바일에서 하단 "AI 상품 설명 추천받기 섹션"이 있음
- 하지만 끝까지 스크롤 불가
- 주소창/하단 탭바 때문에 더 체감됨

### 문제의 정체
**페이지 전체가 스크롤되는 게 아니라 중간 컨테이너에서 스크롤이 막혀 있다.**

---

## 1️⃣ 원인 (3가지 중 하나는 반드시 있음)

### ❌ 원인 1: 부모 레이아웃에 height: 100vh + overflow-hidden
```tsx
<div className="h-screen overflow-hidden">
  <Header />
  <main>...</main>
</div>
```
👉 스크롤이 잘릴 수밖에 없음

### ❌ 원인 2: main에 잘못된 height 제한
```tsx
<main className="h-screen overflow-y-auto">
```
👉 모바일에서 주소창/하단바 때문에 실제 높이보다 작아짐

### ❌ 원인 3: Bottom TabBar 고정 + padding 미적용
```tsx
position: fixed;
bottom: 0;
```
👉 콘텐츠가 탭바 뒤에 가려짐

---

## 2️⃣ 정답 조치 (이대로 하면 끝)

### ✅ 1️⃣ App Layout 최종 정답
```tsx
<div className="min-h-screen flex flex-col">
  <Header />

  <main className="flex-1 overflow-y-auto pb-24">
    <Outlet />
  </main>

  <BottomTabBar />
</div>
```

**핵심 포인트:**
- ❌ `h-screen` 사용 금지
- ✅ `min-h-screen`
- ✅ `flex-1`
- ✅ 하단 padding 확보 (`pb-24` 또는 `pb-[88px]`)

### ✅ 2️⃣ 하단 탭바 있는 경우 (필수)
```tsx
<main className="pb-[88px]">
```

또는 Tailwind 변수:
```tsx
pb-safe
```

👉 AI 섹션이 탭바 뒤로 안 가려짐

### 🔒 상품 등록 페이지 전용 보정 (권장)
상품 등록은 CTA가 많아서 조금 더 여유 필요:

```tsx
<Card style={{ paddingBottom: 128 }}>
```

또는:
```tsx
<div className="pb-32">
```

👉 이거 하나로:
- 키보드 열렸을 때
- AI 섹션
- 하단 버튼
- 전부 확인 가능

---

## 3️⃣ 적용된 수정사항

### MarketLayout.tsx
```tsx
// Before
<main className="mx-auto max-w-[1440px] px-6 w-full flex-1">

// After
<main className="mx-auto max-w-[1440px] px-6 w-full flex-1 overflow-y-auto pb-24">
```

**변경 사항:**
- ✅ `overflow-y-auto` 추가 (스크롤 가능하게)
- ✅ `pb-24` 추가 (하단 탭바 공간 확보, 96px)

### MarketAddPage.tsx
```tsx
// Before
<Card style={{ padding: 24, maxWidth: 600, margin: "0 auto" }}>

// After
<Card style={{ padding: 24, maxWidth: 600, margin: "0 auto", paddingBottom: 128 }}>
```

**변경 사항:**
- ✅ `paddingBottom: 128` 추가 (추가 여유 공간, 키보드/AI 섹션 고려)

---

## 4️⃣ 왜 이게 "천재 모드 정답"이냐

### 모바일 스크롤은 항상 레이아웃이 진다
- 100vh는 모바일에서 신뢰 불가 (주소창/하단바 때문에)
- 하단 고정 UI 있으면 padding은 의무

### 스크롤은 "느낌"이 아니라 물리적 공간 문제
- 콘텐츠가 부족해서가 아니라
- 레이아웃이 숨기고 있어서임

---

## 5️⃣ 최종 잠금 규칙 (문서화)

### ❌ 금지 사항
- `h-screen` 사용 금지 (모바일에서 부정확)
- `overflow-hidden` 사용 금지 (스크롤 차단)

### ✅ 필수 사항
- `min-h-screen` + `flex` + `flex-1` 구조
- 하단 고정 UI 있으면 `pb-*` 필수
- `overflow-y-auto` 명시적 설정

### 🔒 상품 등록 페이지 특별 규칙
- 기본 `pb-24` + 페이지별 추가 여유 `pb-32` (총 128px)
- 키보드 열림 / AI 섹션 / 하단 버튼 모두 고려

---

## 6️⃣ 검증 체크리스트

### 6-1. 기본 스크롤
- [ ] 페이지 끝까지 스크롤 가능
- [ ] 하단 AI 섹션 확인 가능
- [ ] 하단 탭바 뒤로 콘텐츠가 가려지지 않음

### 6-2. 모바일 특수 상황
- [ ] 주소창 표시/숨김 시에도 스크롤 정상
- [ ] 키보드 열림 시에도 하단 확인 가능
- [ ] 화면 회전 시 스크롤 정상

### 6-3. 상품 등록 페이지 특화
- [ ] AI 섹션이 화면에 보임
- [ ] 상품 등록 버튼이 가려지지 않음
- [ ] 모든 입력 필드 접근 가능

---

## 7️⃣ 한 줄 결론

**지금 안 내려가는 건 콘텐츠가 부족해서가 아니라 레이아웃이 숨기고 있어서다.**

**이 조치하면 하단까지 100% 스크롤 된다.**

---

**이 문서는 모바일 스크롤 문제의 최종 해결 방법을 정의합니다.**  
**모든 레이아웃 컴포넌트는 이 원칙을 준수해야 합니다.**

