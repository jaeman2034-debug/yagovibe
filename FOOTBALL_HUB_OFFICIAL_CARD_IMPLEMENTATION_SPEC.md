# 축구 허브 「노원구 축구협회 공식 카드」 구현 명세

**목적**: 축구 허브 최상단에 공식 카드를 추가하여 IA 기준선 확립 (실제 구현 가능한 수준으로 명세화)

---

## 1️⃣ 카드 위치 (구현 위치)

### 파일
- `src/pages/sports/SportHub.tsx`

### 삽입 위치
```typescript
// 종목 타이틀 아래, ActionGrid 위에 삽입
<div className="flex justify-center items-center gap-2 my-4 mb-6">
  <span className="text-2xl">{SPORT_ICON[type || ""] || "🏃"}</span>
  <h1 className="text-2xl font-bold text-gray-900 m-0">{sportLabel}</h1>
</div>

{/* 🔥 NEW: 공식 협회 카드 (축구만) */}
{type === "football" && (
  <OfficialAssociationCard />
)}

<ActionGrid
  actions={ACTIONS}
  context={{ sport: type }}
  onActionClick={handleActionClick}
/>
```

---

## 2️⃣ 컴포넌트 구조

### 컴포넌트 파일
- `src/components/association/OfficialAssociationCard.tsx` (새로 생성)

### Props
```typescript
interface OfficialAssociationCardProps {
  associationId?: string; // 기본값: "assoc-nowon-football"
  associationName?: string; // 기본값: "노원구 축구협회"
}
```

---

## 3️⃣ UI 구조 (실제 구현)

### 카드 레이아웃
```typescript
<div className="w-full max-w-md mx-auto mb-6">
  <button
    onClick={() => navigate("/association/assoc-nowon-football")}
    className="w-full p-6 bg-gray-50 border-2 border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all text-left"
  >
    <div className="flex items-start gap-4">
      {/* 아이콘 */}
      <div className="text-3xl flex-shrink-0">🏛</div>
      
      {/* 텍스트 영역 */}
      <div className="flex-1">
        {/* 타이틀 + 배지 */}
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-xl font-bold text-gray-900">
            노원구 축구협회
          </h2>
          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
            공식
          </span>
        </div>
        
        {/* 서브 문구 */}
        <p className="text-sm text-gray-600 leading-relaxed">
          노원구 축구 행정 · 대회 · 대관 공식 운영
        </p>
      </div>
    </div>
  </button>
</div>
```

---

## 4️⃣ 스타일 세부사항

### 배경색
- 기본: `bg-gray-50` (다른 카드보다 약간 진하게)
- Hover: `bg-gray-100`

### 테두리
- 기본: `border-2 border-gray-200`
- Hover: `border-gray-300`

### 아이콘
- 크기: `text-3xl`
- 아이콘: `🏛` (고정)

### 타이틀
- 크기: `text-xl`
- 굵기: `font-bold`
- 색상: `text-gray-900`

### 배지
- 텍스트: "공식"
- 배경: `bg-blue-100`
- 텍스트 색상: `text-blue-700`
- 크기: `text-xs`
- 패딩: `px-2 py-0.5`

### 서브 문구
- 크기: `text-sm`
- 색상: `text-gray-600`

---

## 5️⃣ 반응형 처리

### 모바일
- 카드 너비: `w-full` (전체 너비)
- 패딩: `p-6` 유지
- 텍스트 크기: 동일

### 데스크탑
- 카드 너비: `max-w-md` (중앙 정렬)
- 마진: `mx-auto mb-6`

---

## 6️⃣ 클릭 동작

### 클릭 시
```typescript
navigate("/association/assoc-nowon-football")
```

### 권한 체크
- ❌ 없음 (Public 접근)
- ❌ 로그인 요구 없음
- ❌ 새 창 열기 없음

---

## 7️⃣ 조건부 렌더링

### 표시 조건
- `type === "football"`일 때만 표시
- 다른 종목에서는 표시하지 않음

### 이유
- 현재 노원구 축구협회만 대상
- 다른 종목/지역 협회는 Phase 5 이후 확장

---

## 8️⃣ 구현 체크리스트

### 파일 생성
- [ ] `src/components/association/OfficialAssociationCard.tsx` 생성

### 파일 수정
- [ ] `src/pages/sports/SportHub.tsx` 수정
  - [ ] `OfficialAssociationCard` import 추가
  - [ ] 종목 타이틀 아래, ActionGrid 위에 카드 삽입
  - [ ] `type === "football"` 조건부 렌더링 추가

### 스타일 확인
- [ ] 카드가 다른 카드보다 시각적으로 구분되는가?
- [ ] 배지("공식")가 명확히 보이는가?
- [ ] 클릭 시 협회 페이지로 정상 이동하는가?

---

## 9️⃣ 테스트 항목

### 화면 테스트
1. `/sports/football` 접근 시 카드가 최상단에 표시되는가?
2. 카드 클릭 시 `/association/assoc-nowon-football`로 이동하는가?
3. 다른 종목(`/sports/basketball` 등)에서는 카드가 표시되지 않는가?

### 반응형 테스트
1. 모바일 화면에서 카드가 정상 표시되는가?
2. 데스크탑 화면에서 카드가 정상 표시되는가?

---

## 🔟 다음 단계 (구현 후)

1. 실제 화면 확인
2. IA 기준으로 재점검
3. 사용자 테스트

---

**작성일**: 2025-01-XX  
**버전**: v1.0  
**상태**: 구현 명세 완료 (코드 작성 준비 완료)

