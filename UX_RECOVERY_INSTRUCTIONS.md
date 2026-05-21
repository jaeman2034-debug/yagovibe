# 📌 커서 개발자에게 전달할 UX 복구 지시문 (완전 통제형)

## 🎯 목적

현재 MarketPage에서 빠진 UX 핵심 기능 3개를 복구한다.

**새 기능 개발 금지**
**UI 재설계 금지**
**기존 구조 변경 금지**

👉 **오직 기능 연결만 수행**

---

# 1️⃣ 상품 등록 플로우 연결

## 현재 상태
- `+ 상품 등록` 버튼이 MarketPage에 없음
- 등록 플로우가 끊김

## 수행 작업

### 1-1. FAB (Floating Action Button) 추가

위치: `src/pages/market/MarketPage.tsx` return 블록 내부 (맨 아래, 상품 리스트 뒤)

```tsx
{/* ✅ 상품 등록 FAB */}
<button
  type="button"
  className="fixed right-6 bottom-24 z-50 px-6 py-3 rounded-full bg-blue-500 text-white font-semibold shadow-lg active:scale-95 transition hover:bg-blue-600"
  style={{
    bottom: `calc(64px + 16px + env(safe-area-inset-bottom, 0px))` // BottomNav 위
  }}
  onClick={() => navigate("/app/market/create")}
  aria-label="상품 등록"
>
  + 상품 등록
</button>
```

### 1-2. 등록 페이지 경로 확인

확인 대상:
- `/app/market/create` 경로가 존재하는지
- 존재하지 않으면 `/app/market/add` 또는 다른 경로 확인
- 실제 등록 페이지 경로로 `navigate()` 수정

### 1-3. 금지 사항
- ❌ 토글 메뉴 추가 금지
- ❌ 모달 추가 금지
- ❌ 등록 타입 선택 UI 추가 금지
- 👉 **단순히 페이지 이동만 연결**

---

# 2️⃣ 리스트 / 지도 토글 복구

## 현재 상태
- 리스트/지도 토글이 완전히 사라짐
- MapPage는 존재함 (`/app/market/map`)

## 수행 작업

### 2-1. 토글 버튼 추가

위치: `src/pages/market/MarketPage.tsx` return 블록 내부
- 검색바 아래
- 정렬 필터 위

```tsx
{/* ✅ 뷰 모드 토글 (리스트 / 지도) */}
<div className="mb-4 px-4 flex justify-end">
  <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
    <button
      type="button"
      onClick={() => {
        // 현재 쿼리 파라미터 유지하면서 리스트 뷰 유지
        // (이미 리스트 뷰이므로 아무 동작 안 해도 됨)
      }}
      className="px-3 py-1.5 rounded-md text-sm font-medium bg-white text-blue-600 shadow-sm"
      aria-label="리스트 뷰"
    >
      📋 리스트
    </button>
    <button
      type="button"
      onClick={() => {
        // 현재 쿼리 파라미터를 유지하면서 지도 페이지로 이동
        const currentParams = new URLSearchParams(window.location.search);
        navigate(`/app/market/map?${currentParams.toString()}`);
      }}
      className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900"
      aria-label="지도 뷰"
    >
      🗺️ 지도
    </button>
  </div>
</div>
```

### 2-2. MapPage에서도 동일한 토글 추가

위치: `src/pages/market/MapPage.tsx` return 블록 내부
- 검색바 아래
- 지도 위

```tsx
{/* ✅ 뷰 모드 토글 (리스트 / 지도) */}
<div className="mb-4 px-4 flex justify-end">
  <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
    <button
      type="button"
      onClick={() => {
        const currentParams = new URLSearchParams(window.location.search);
        navigate(`/app/market?${currentParams.toString()}`);
      }}
      className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900"
      aria-label="리스트 뷰"
    >
      📋 리스트
    </button>
    <button
      type="button"
      onClick={() => {
        // 이미 지도 뷰이므로 아무 동작 안 해도 됨
      }}
      className="px-3 py-1.5 rounded-md text-sm font-medium bg-white text-blue-600 shadow-sm"
      aria-label="지도 뷰"
    >
      🗺️ 지도
    </button>
  </div>
</div>
```

### 2-3. 금지 사항
- ❌ viewMode state 추가 금지
- ❌ 조건부 렌더링 복잡화 금지
- ❌ 새 컴포넌트 생성 금지
- 👉 **단순히 페이지 이동만 연결**

---

# 3️⃣ 카테고리 전환 UX 강화

## 현재 상태
- MarketSubHeader에 탭 버튼 있음
- 하지만 전환 시 시각적 피드백 약함

## 수행 작업

### 3-1. MarketSubHeader 스타일 확인

위치: `src/components/market/MarketSubHeader.tsx`

현재 구조 확인:
- `SERVICE_TABS` 배열
- `isActive` 조건
- `onServiceTypeChange` 핸들러

### 3-2. 시각적 피드백 강화

수정 대상: `src/components/market/MarketSubHeader.tsx` 223-244줄

```tsx
<button
  key={tab.type}
  type="button"
  onClick={() => onServiceTypeChange(tab.type)}
  className={`
    flex-1 flex items-center justify-center gap-1.5
    px-3 py-2 rounded-md
    text-sm font-medium
    transition-all duration-200
    ${
      isActive
        ? "bg-white text-blue-600 shadow-sm font-semibold scale-105" // 🔥 강화: font-semibold + scale 추가
        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50" // 🔥 강화: hover 배경 추가
    }
  `}
  aria-selected={isActive}
  role="tab"
>
  <span className="text-base">{tab.icon}</span>
  <span>{tab.label}</span>
</button>
```

### 3-3. 전환 애니메이션 (선택사항)

CSS에 추가 (이미 transition-all 있으면 생략):

```css
/* MarketSubHeader 탭 전환 애니메이션 */
.tabs-bar button {
  transition: all 0.2s ease-in-out;
}
```

### 3-4. 금지 사항
- ❌ 새 애니메이션 라이브러리 추가 금지
- ❌ 복잡한 상태 관리 추가 금지
- ❌ 탭 구조 변경 금지
- 👉 **오직 스타일만 강화**

---

# 4️⃣ 완료 조건

다음 3개가 모두 충족되면 완료:

1. ✅ FAB 클릭 시 등록 페이지로 이동
2. ✅ 리스트/지도 토글 버튼 작동 (양방향 이동)
3. ✅ 탭 전환 시 시각적 피드백 명확함

---

# 5️⃣ 절대 금지 사항

❌ 새로운 컴포넌트 생성 금지
❌ 복잡한 상태 관리 추가 금지
❌ UI 재설계 금지
❌ 애니메이션 라이브러리 추가 금지
❌ 모달/드로어 추가 금지

👉 **오직 기능 연결만 수행**

---

# 📌 최종 명령

> 현재 작업은 기능 개발이 아니라 UX 복구다.
> 기존 구조를 유지한 채 기능만 연결하라.
> 복잡한 로직 추가 없이 단순 이동/스타일만 적용하라.

---

# 🎯 작업 순서

1. FAB 추가 (1-1)
2. 등록 페이지 경로 확인 및 연결 (1-2)
3. 리스트/지도 토글 추가 (2-1, 2-2)
4. 탭 시각적 피드백 강화 (3-2)

**총 예상 시간: 10분**
**코드 변경량: 최소 (50줄 이하)**
