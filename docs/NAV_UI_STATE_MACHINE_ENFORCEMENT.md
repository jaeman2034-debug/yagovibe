# 🔥 UI 상태 머신 강제 규칙 (코드 레벨)

> **UI는 UIState만 보고 렌더링한다는 규칙을 코드 레벨에서 "강제"한다**

---

## ✅ 정답 스켈레톤 구조

### MapPageContainer

```tsx
function MapPageContainer() {
  const { uiState } = useNavUI();   // SEARCH | SELECTED | PRE_NAV | NAVIGATING

  return (
    <>
      <TopLayer uiState={uiState} />
      <MapLayer />
      <BottomLayer uiState={uiState} />
    </>
  );
}
```

### BottomLayer

```tsx
function BottomLayer({ uiState }) {
  switch (uiState) {
    case "SEARCH":
      return <SearchPanel />;
    case "SELECTED":
      return <ConfirmPanel />;
    case "PRE_NAV":
      return <PreNavPanel />;
    case "NAVIGATING":
      return <NavigatingPanel />;
  }
}
```

---

## ❌ 절대 하면 안 되는 것

1. **`phase`로 조건 렌더**
   ```tsx
   {phase === 'SEARCHING' && <SearchPanel />} // ❌
   ```

2. **`shouldShow`로 컴포넌트 제거**
   ```tsx
   {shouldShow && <Component />} // ❌
   ```

3. **`key={uiState}`**
   ```tsx
   <Component key={uiState} /> // ❌ 재마운트 발생
   ```

4. **데이터 조건으로 UI 제거**
   ```tsx
   {data.length > 0 && <Component />} // ❌
   ```

---

## ✅ phase는 오직 "행동 제어"에만 사용

```tsx
function startSearch() {
  if (phase !== "SEARCHING") return; // ✅ 요청 차단 OK
  // fetch...
}
```

❌ 하지만 이걸로 UI 숨기면 안 된다.

---

## 🎯 핵심 원칙

> **phase는 '막는 용도'**
> **UIState는 '보여주는 용도'**

이 경계를 지키면:
- 검색 결과 깜빡임 ❌
- PRE_NAV 안정화 ✅
- 중고거래 연동 가능 ✅
