# 🎨 YAGO 메인 화면 — 디자이너/프론트엔드 빠른 시작 가이드

> **이 문서는 디자이너와 프론트엔드 개발자가 바로 사용할 수 있는 실전 가이드입니다.**

---

## 📋 체크리스트

### 디자이너
- [ ] `FIGMA_COMPONENT_STRUCTURE.md` 파일 열기
- [ ] Figma에서 컴포넌트 구조대로 Frame 생성
- [ ] Variant 설정 (StatusHeader, StateBar, ActionCue)
- [ ] 프로토타입 연결 (Idle → Navigating → Arrived)

### 프론트엔드
- [ ] `src/components/movement/` 폴더 확인
- [ ] 컴포넌트 import 경로 확인
- [ ] `GeneralMapPage.tsx`에서 사용 예시 확인

---

## 🧱 컴포넌트 위치

### Figma 컴포넌트
```
StatusHeader (Variant: Idle / Navigating / Upcoming / Arrived)
StateBar (Variant: Idle / Listening / Navigating)
ActionCue (Variant: Straight / TurnLeft / TurnRight / UTurn)
ArrivalPanel
```

### 코드 컴포넌트
```
src/components/movement/
├── StatusHeader.tsx
├── StateBar.tsx
├── ActionCue.tsx
└── ArrivalPanel.tsx
```

---

## 🎯 핵심 원칙 (절대 어기지 말 것)

### 1️⃣ StatusHeader
- ❌ 아이콘 추가 금지
- ❌ 버튼 추가 금지
- ❌ "?" 도움말 추가 금지
- ✅ **단정문만 존재**

### 2️⃣ StateBar
- ❌ 버튼으로 만들지 말 것
- ❌ OnTap 이벤트 추가 금지
- ✅ **상태 표시만**

### 3️⃣ ActionCue
- ❌ 다음 단계 표시 금지
- ❌ 이후 단계 표시 금지
- ✅ **현재 행동만**

### 4️⃣ ArrivalPanel
- ❌ 지도와 함께 표시 금지
- ✅ **지도는 Display: none**

---

## 🧪 테스트 시나리오

### 시나리오 1: Idle → Navigating
```
1. StatusHeader: "지금은 쉬는 중이에요"
2. StateBar: "지금 말해도 돼요"
3. 사용자가 "운동장 찾아줘" 말함
4. StatusHeader: "🏃 서울광장 가는 중"
5. StateBar: "계속 안내 중이에요"
6. ActionCue: "⬆️ 직진 120m"
```

### 시나리오 2: Navigating → Arrived
```
1. 목적지까지 20m 이내 도착
2. MapContainer: Display: none
3. ArrivalPanel: Display: block
4. "🎉 도착했어요" + 선택지 2개
```

---

## 📐 Spacing & Typography

### Spacing (4px 기준)
- 4px: 4px
- 8px: 8px
- 12px: 12px
- 16px: 16px
- 24px: 24px

### Typography
- 12px: StatusSub, Distance
- 14px: StatusTitle, StateHint, Action
- 16px: Button
- 18px: Subtitle
- 30px: Title

---

## 🎨 색상 팔레트

### Primary
```
Blue-50: #EFF6FF
Blue-200: #BFDBFE
Blue-600: #2563EB
Indigo-50: #EEF2FF
```

### Gray Scale
```
Gray-50: #F9FAFB
Gray-100: #F3F4F6
Gray-200: #E5E7EB
Gray-500: #6B7280
Gray-600: #4B5563
Gray-700: #374151
Gray-900: #111827
```

### Background Gradients
```
Idle: Gray-50 → Gray-100
Navigating: Blue-50 → Indigo-50
Arrived: Green-50 → Green-100
```

---

## 🚀 다음 단계

### 디자이너
1. Figma에서 컴포넌트 구조대로 Frame 생성
2. Variant 설정
3. 프로토타입 연결
4. 사용자 테스트 시나리오 실행

### 프론트엔드
1. 컴포넌트 import 확인
2. `GeneralMapPage.tsx`에서 사용 예시 확인
3. 상태 관리 로직 확인
4. 실제 화면에서 테스트

---

## ❓ 질문

**Q: StatusHeader에 아이콘을 추가해도 되나요?**
A: ❌ 안 됩니다. 단정문만 존재해야 합니다.

**Q: StateBar를 버튼으로 만들어도 되나요?**
A: ❌ 안 됩니다. 상태 표시만 해야 합니다.

**Q: ActionCue에 다음 단계를 표시해도 되나요?**
A: ❌ 안 됩니다. 현재 행동만 표시해야 합니다.

**Q: ArrivalPanel을 지도 위에 오버레이로 표시해도 되나요?**
A: ❌ 안 됩니다. 지도는 Display: none이어야 합니다.

---

## 🧠 핵심 한 줄

> **컴포넌트는 많아 보이지만
> 사용자가 인식하는 건 '상태' 하나뿐이다.**
