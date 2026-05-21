# 🧠 네비 상태 머신 사고로 앱 전체 설계하기

> 핵심 한 줄:
> **지도 페이지가 특이한 게 아니다.**
> **다른 페이지들이 지금까지 잘못 만들어져 있었을 뿐이다.**

---

## 1️⃣ 모든 페이지는 "화면"이 아니라 **상태 머신**이다

### ❌ 보통 앱

```
홈 화면
검색 화면
상세 화면
```

### ✅ 천재 앱

```
탐색 중
선택됨
행동 대기
진행 중
완료 / 종료
```

👉 지도 네비랑 **구조가 똑같다**

---

## 2️⃣ 검색 페이지 (리스트/장소/상품 공통)

### 상태 머신

```
IDLE → SEARCHING → RESULT_SELECTED → ACTION_READY
```

### UI 대응

| 상태 | UI |
|------|-----|
| IDLE | 검색바 + 추천 |
| SEARCHING | 로딩 or 결과 |
| RESULT_SELECTED | 상세 미리보기 |
| ACTION_READY | CTA 버튼 |

### 구현 예시

```typescript
type SearchUIState = "IDLE" | "SEARCHING" | "RESULT_SELECTED" | "ACTION_READY";

function SearchPage() {
  const [uiState, setUIState] = useState<SearchUIState>("IDLE");
  const [searchState, setSearchState] = useState<"IDLE" | "LOADING" | "SUCCESS" | "FAIL">("IDLE");
  
  return (
    <>
      <TopLayer state={uiState} />
      <ContentLayer state={uiState} />
      <BottomLayer state={uiState} />
    </>
  );
}
```

**핵심**: 검색 결과 클릭했는데 아무 변화 없으면 → **UI 실패**

---

## 3️⃣ 리스트 페이지 (찜 / 기록 / 즐겨찾기)

### 상태 머신

```
EMPTY → LIST → ITEM_SELECTED
```

### UI 규칙

- **EMPTY** → 안내 메시지 + CTA
- **LIST** → 목록만
- **ITEM_SELECTED** → **하단 액션 카드 등장**

👉 지도에서 "출발 대기"랑 **완전히 동일**

### 구현 예시

```typescript
type ListUIState = "EMPTY" | "LIST" | "ITEM_SELECTED";

function ListPage() {
  const [uiState, setUIState] = useState<ListUIState>("LIST");
  
  const handleItemSelect = (item) => {
    setUIState("ITEM_SELECTED");
    // 하단 액션 카드 등장 (지도 출발 대기와 동일)
  };
  
  return (
    <>
      <ListContent state={uiState} onSelect={handleItemSelect} />
      {uiState === "ITEM_SELECTED" && (
        <ActionCard onConfirm={handleConfirm} />
      )}
    </>
  );
}
```

---

## 4️⃣ 마이 페이지 / 설정 페이지

### 상태 머신

```
VIEW → EDITING → SAVING → DONE
```

### UI 핵심

- **EDITING** 중엔 **다른 액션 금지**
- **SAVING**은 UI 상태 ❌
  → VIEW 유지 + 로딩 표시

### 구현 예시

```typescript
type ProfileUIState = "VIEW" | "EDITING" | "DONE";
type SaveState = "IDLE" | "SAVING" | "SUCCESS" | "FAIL";

function ProfilePage() {
  const [uiState, setUIState] = useState<ProfileUIState>("VIEW");
  const [saveState, setSaveState] = useState<SaveState>("IDLE");
  
  const handleSave = async () => {
    // UI 상태는 VIEW 유지
    setSaveState("SAVING");
    
    try {
      await saveProfile();
      setSaveState("SUCCESS");
      setUIState("DONE");
    } catch (error) {
      setSaveState("FAIL");
      // UI 상태는 VIEW 유지
    }
  };
  
  return (
    <>
      {uiState === "VIEW" && <ViewMode />}
      {uiState === "EDITING" && <EditMode />}
      {saveState === "SAVING" && <LoadingOverlay />}
    </>
  );
}
```

---

## 5️⃣ 공통 천재 규칙 (이거 하나면 됨)

### ❌ 이러면 망함

```typescript
UI = 데이터 상태
```

### ✅ 이게 정답

```typescript
UI = 사용자 의도 상태
```

- 데이터 없음 ≠ EMPTY UI
- 로딩 중 ≠ 다른 화면
- 실패 ≠ 리셋

### 예시

```typescript
// ❌ 잘못된 방법
if (data.length === 0) {
  return <EmptyState />;
}
if (isLoading) {
  return <LoadingScreen />;
}

// ✅ 정답
const [uiState, setUIState] = useState<"IDLE" | "SEARCHING" | "RESULT">("IDLE");

// 데이터는 기능 상태로 관리
const [dataState, setDataState] = useState<"LOADING" | "SUCCESS" | "EMPTY" | "FAIL">("LOADING");

// UI는 UI 상태만 본다
{uiState === "IDLE" && <SearchBar />}
{uiState === "SEARCHING" && dataState === "LOADING" && <LoadingIndicator />}
{uiState === "SEARCHING" && dataState === "EMPTY" && <EmptyState />}
{uiState === "SEARCHING" && dataState === "SUCCESS" && <ResultList />}
```

---

## 6️⃣ 상태 머신 기반 앱의 공통 구조

```typescript
// 모든 페이지 공통 구조
type PageState = {
  uiState: UIState;        // 사용자 의도 상태
  featureState: FeatureState; // 기능 상태
  networkState: NetworkState; // 통신 상태
};

// UI는 UIState만 본다
function Page({ state }: { state: PageState }) {
  return (
    <>
      <TopLayer state={state.uiState} />
      <ContentLayer 
        state={state.uiState}
        featureState={state.featureState}
        networkState={state.networkState}
      />
      <BottomLayer state={state.uiState} />
    </>
  );
}
```

**핵심**: UI는 **UIState만 본다**. 나머지는 메시지/배지/로딩으로만 표현.

---

## 7️⃣ QA가 좋아하는 앱의 특징

### QA 질문

> **"이 화면 지금 뭐 하는 중이에요?"**

### 천재 앱

- 화면만 봐도 답 나옴
- 디버그 배지로 상태 확인 가능
- 설명 없이도 이해 가능

### 보통 앱

- 눌러봐야 앎
- 설명해야 앎
- 문서 필요

### 구현 예시

```typescript
// 모든 페이지에 디버그 배지
{process.env.NODE_ENV === "development" && (
  <DebugBadge 
    uiState={uiState}
    featureState={featureState}
    networkState={networkState}
  />
)}
```

---

## 8️⃣ 이 철학의 진짜 위력

### 이 구조의 결과

1. **기능 늦어도 QA 통과**
   - UI 상태 머신이 명확하면 기능 미완이어도 UX는 완성

2. **디자인 바뀌어도 구조 유지**
   - 상태 머신 구조는 디자인과 독립적

3. **팀원 바뀌어도 설명 쉬움**
   - 상태 머신 구조가 문서 역할

4. **앱 전체 UX 일관성 확보**
   - 모든 페이지가 같은 사고방식

👉 지도 페이지는 **연습 문제**였을 뿐

---

## 9️⃣ 페이지별 상태 머신 템플릿

### 검색 페이지

```typescript
type SearchUIState = "IDLE" | "SEARCHING" | "RESULT_SELECTED" | "ACTION_READY";

// IDLE: 검색바 + 추천
// SEARCHING: 검색바 + 결과 리스트
// RESULT_SELECTED: 검색바(고정) + 상세 미리보기
// ACTION_READY: 검색바 숨김 + 액션 카드
```

### 리스트 페이지

```typescript
type ListUIState = "EMPTY" | "LIST" | "ITEM_SELECTED";

// EMPTY: 안내 메시지 + CTA
// LIST: 목록만
// ITEM_SELECTED: 목록 + 하단 액션 카드
```

### 상세 페이지

```typescript
type DetailUIState = "VIEWING" | "EDITING" | "SAVING" | "DONE";

// VIEWING: 상세 정보
// EDITING: 편집 모드
// SAVING: VIEWING 유지 + 로딩
// DONE: 완료 메시지
```

### 설정 페이지

```typescript
type SettingsUIState = "VIEW" | "EDITING" | "SAVING";

// VIEW: 설정 목록
// EDITING: 편집 모드
// SAVING: VIEW 유지 + 로딩
```

---

## 🔟 최종 결론

> **잘 만든 네비 UI 하나는**
> **앱 전체의 설계 철학을 증명한다**

지금 네 프로젝트는:

- "지도 페이지 잘 만든 앱" ❌
- **"상태 사고를 하는 앱"** ✅

---

## 📋 앱 전체 설계 체크리스트

새 페이지를 만들 때:

- [ ] 페이지가 상태 머신으로 설계되었는가?
- [ ] UI 상태와 기능 상태가 분리되었는가?
- [ ] 상태별 UI가 명확히 정의되었는가?
- [ ] 상태 전환이 사용자 액션으로만 발생하는가?
- [ ] 디버그 배지가 있는가?
- [ ] 지도 페이지와 같은 사고방식인가?

모두 ✅면 **앱 전체 일관성 확보**
