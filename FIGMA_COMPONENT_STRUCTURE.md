# 🎨 YAGO 메인 화면 — Figma 컴포넌트 구조

> 기준: 지금 화면 100% 유지, 레이아웃만 OS화, 상태 중심 설계

---

## 🧱 최상위 Frame

```
Frame: YAGO / Map Home
Size: Mobile (390 × 844 기준)
Layout: Vertical Auto Layout
Background: #FFFFFF
Padding: 16px (좌우)
Gap: 16px
```

---

## 1️⃣ Status Header (상단 상태 영역)

### 🔹 Component: `StatusHeader`

**Base Component**
```
StatusHeader (Auto Layout / Vertical)
Width: Fill
Padding: 16px (좌우), 12px (상하)
Gap: 4px
Background: Gradient (Blue-50 → Indigo-50)
Border: 1px solid Blue-200
Corner Radius: 12px
```

#### 내부 레이어

```
Text / StatusTitle
- Content: Dynamic (State-based)
- Font: 14px / Medium (Pretendard / SF Pro)
- Color: Gray-900 (#111827)
- Line Height: 20px

Text / StatusSub (Optional)
- Content: Dynamic (State-based)
- Font: 12px / Regular
- Color: Gray-600 (#4B5563)
- Line Height: 16px
- Opacity: 0.8
```

📌 **중요**
* 아이콘 ❌
* 버튼 ❌
* "?" ❌
👉 **단정문만 존재**

---

### Variant 설계

#### Variant 1: `StatusHeader / Idle`
```
StatusTitle: "지금은 쉬는 중이에요"
StatusSub: (없음)
Background: Gray-50 → Gray-100
Border: Gray-200
```

#### Variant 2: `StatusHeader / Navigating`
```
StatusTitle: "🏃 {목적지명} 가는 중"
StatusSub: "🚶 도보 · 11분 남음"
Background: Blue-50 → Indigo-50
Border: Blue-200
```

#### Variant 3: `StatusHeader / Upcoming`
```
StatusTitle: "오늘 {크루명} 모임까지 42분"
StatusSub: "{크루명}"
Background: Blue-50 → Indigo-50
Border: Blue-200
```

#### Variant 4: `StatusHeader / Arrived`
```
StatusTitle: "🎉 도착했어요"
StatusSub: (없음)
Background: Green-50 → Green-100
Border: Green-200
```

---

## 2️⃣ Map Container (지도 영역)

### 🔹 Component: `MapContainer`

```
MapContainer
Width: Fill
Height: Fill (Flex: 1)
Constraint: Fill
Corner Radius: 16px
Overflow: Hidden
Background: #F3F4F6 (로딩 중)
```

#### 내부 레이어 (Z-Index 순서)

```
Layer 1: MapView
- Type: Google Maps / Naver Maps / Kakao Maps
- Constraint: Fill
- Interactive: true

Layer 2: UserLocationDot
- Position: Absolute (Center)
- Size: 12px × 12px
- Color: Blue-600 (#2563EB)
- Border: 2px solid White
- Shadow: 0 2px 8px rgba(0,0,0,0.15)
```

📌 **중요**
* 지도 위에 **UI 절대 올리지 말 것**
* 카드 ❌
* 버튼 ❌
* 핀 리스트 ❌
👉 지도는 **배경 레이어**

---

## 3️⃣ State Bar (하단 상태 응답 바)

### 🔹 Component: `StateBar`

**Base Component**
```
StateBar
Width: Fill
Height: 56px
Padding: 16px
Background: Gray-50 (#F9FAFB)
Border: 1px solid Gray-200 (#E5E7EB)
Corner Radius: 12px
Layout: Center
```

#### 내부

```
Text / StateHint
- Content: Dynamic (State-based)
- Font: 14px / Medium
- Color: Gray-600 (#4B5563)
- Align: Center
- Line Height: 20px

Text / StateSub (Optional)
- Content: "듣고 있어요"
- Font: 12px / Regular
- Color: Gray-500 (#6B7280)
- Align: Center
- Line Height: 16px
- Margin Top: 4px
```

📌 **이건 버튼 아님**
* OnTap ❌
* Hover ❌
* Active State ❌
👉 **상태 표시 컴포넌트**

---

### Variant 설계

#### Variant 1: `StateBar / Idle`
```
StateHint: "지금 말해도 돼요"
StateSub: (없음)
Background: Gray-50
```

#### Variant 2: `StateBar / Listening`
```
StateHint: "지금 말해도 돼요"
StateSub: "듣고 있어요"
Background: Gray-50
StateSub Opacity: 0.7
```

#### Variant 3: `StateBar / Navigating`
```
StateHint: "계속 안내 중이에요"
StateSub: (없음)
Background: Gray-50
```

---

## 4️⃣ Action Cue (이동 중 하단 액션 표시)

### 🔹 Component: `ActionCue`

**Base Component**
```
ActionCue (Auto Layout / Horizontal)
Width: 90% (Max: 360px)
Padding: 12px 16px
Gap: 8px
Background: White / 95% (#FFFFFF, Opacity: 0.95)
Backdrop Blur: 8px
Border: 1px solid Gray-200
Corner Radius: 12px
Shadow: 0 4px 12px rgba(0,0,0,0.1)
Position: Absolute
Bottom: 96px (BottomNav 위)
Center: Horizontal
Z-Index: 30
```

#### 내부 레이어

```
Icon / Direction
- Content: "⬆️" (Dynamic)
- Size: 20px × 20px
- Font Size: 18px

Auto Layout / Vertical (Gap: 2px)
  ├─ Text / Action
  │   - Content: "직진" (Dynamic)
  │   - Font: 14px / Semibold
  │   - Color: Gray-900
  │   - Line Height: 20px
  │
  └─ Text / Distance
      - Content: "120m" (Dynamic)
      - Font: 12px / Regular
      - Color: Gray-600
      - Line Height: 16px
```

📌 **한 행동만**
* 다음 단계 ❌
* 이후 단계 ❌
👉 **현재 행동만 표시**

---

### Variant 설계

#### Variant 1: `ActionCue / Straight`
```
Icon: "⬆️"
Action: "직진"
```

#### Variant 2: `ActionCue / TurnLeft`
```
Icon: "⬅️"
Action: "좌회전"
```

#### Variant 3: `ActionCue / TurnRight`
```
Icon: "➡️"
Action: "우회전"
```

#### Variant 4: `ActionCue / UTurn`
```
Icon: "↩️"
Action: "유턴"
```

---

## 5️⃣ Arrival Panel (도착 화면)

### 🔹 Component: `ArrivalPanel`

**Base Component**
```
ArrivalPanel
Width: Fill (100%)
Height: Fill (100vh)
Position: Absolute
Top: 0, Left: 0, Right: 0, Bottom: 0
Background: White (#FFFFFF)
Z-Index: 50
Layout: Vertical
Align: Center
Padding: 24px
Gap: 24px
```

📌 **지도 Frame Display: none**
👉 컨텍스트 전환 명확

---

#### 내부 구조

```
Auto Layout / Vertical (Gap: 24px, Max Width: 360px, Center)

  ├─ Text / Title
  │   - Content: "🎉 도착했어요"
  │   - Font: 30px / Bold
  │   - Color: Gray-900
  │   - Line Height: 36px
  │   - Align: Center
  │
  ├─ Text / Subtitle
  │   - Content: "{목적지명}" or "오늘 러닝 시작할게요"
  │   - Font: 18px / Regular
  │   - Color: Gray-700
  │   - Line Height: 24px
  │   - Align: Center
  │
  └─ Auto Layout / Vertical (Gap: 12px, Width: Fill)
      ├─ Button / Primary
      │   - Content: "크루 들어가기" or "다음 활동 시작"
      │   - Height: 48px
      │   - Background: Blue-600 (#2563EB)
      │   - Color: White
      │   - Font: 16px / Medium
      │   - Corner Radius: 24px
      │   - Shadow: 0 4px 12px rgba(37, 99, 235, 0.3)
      │
      ├─ Button / Secondary (Optional)
      │   - Content: "혼자 뛰기"
      │   - Height: 48px
      │   - Background: Gray-100
      │   - Color: Gray-700
      │   - Font: 16px / Medium
      │   - Corner Radius: 24px
      │
      └─ TextButton / Ghost
          - Content: "닫기"
          - Height: 40px
          - Color: Gray-500
          - Font: 14px / Regular
          - Underline: false
```

---

## 🧭 전체 레이어 트리 (Figma)

```
Frame: YAGO / Map Home (390 × 844)
├─ Auto Layout / Vertical (Gap: 16px, Padding: 16px)
│   ├─ StatusHeader (Variant: Idle / Navigating / Upcoming / Arrived)
│   │   ├─ Text / StatusTitle
│   │   └─ Text / StatusSub (Optional)
│   │
│   ├─ MapContainer (Flex: 1)
│   │   ├─ MapView
│   │   └─ UserLocationDot
│   │
│   └─ StateBar (Variant: Idle / Listening / Navigating)
│       ├─ Text / StateHint
│       └─ Text / StateSub (Optional)
│
└─ Overlay Layer (Absolute, Z-Index: 30)
    ├─ ActionCue (Variant: Straight / TurnLeft / TurnRight / UTurn)
    │   ├─ Icon / Direction
    │   └─ Auto Layout / Vertical
    │       ├─ Text / Action
    │       └─ Text / Distance
    │
    └─ ArrivalPanel (Z-Index: 50, Display: none by default)
        └─ Auto Layout / Vertical
            ├─ Text / Title
            ├─ Text / Subtitle
            └─ Auto Layout / Vertical
                ├─ Button / Primary
                ├─ Button / Secondary (Optional)
                └─ TextButton / Ghost
```

---

## 🎨 색상 시스템

### Primary Colors
```
Blue-50: #EFF6FF
Blue-200: #BFDBFE
Blue-600: #2563EB
Indigo-50: #EEF2FF
Gray-50: #F9FAFB
Gray-100: #F3F4F6
Gray-200: #E5E7EB
Gray-500: #6B7280
Gray-600: #4B5563
Gray-700: #374151
Gray-900: #111827
White: #FFFFFF
```

### Background Gradients
```
Idle: Gray-50 → Gray-100
Navigating: Blue-50 → Indigo-50
Arrived: Green-50 → Green-100
```

---

## 📐 Spacing System

```
Base: 4px
- 4px: 4px
- 8px: 8px
- 12px: 12px
- 16px: 16px
- 24px: 24px
```

---

## 🔤 Typography System

### Font Family
- Primary: Pretendard (한국어)
- Fallback: SF Pro (영어)

### Font Sizes
```
12px: Regular (StatusSub, Distance)
14px: Medium (StatusTitle, StateHint, Action)
16px: Medium (Button)
18px: Regular (Subtitle)
30px: Bold (Title)
```

### Line Heights
```
12px → 16px (1.33)
14px → 20px (1.43)
16px → 24px (1.5)
18px → 24px (1.33)
30px → 36px (1.2)
```

---

## 🧪 Figma 프로토타입 연결

### Interaction 1: Idle → Navigating
```
Trigger: User Action (Button Click / Voice Command)
Action: 
  - StatusHeader: Idle → Navigating
  - StateBar: Idle → Navigating
  - ActionCue: Show
  - MapContainer: (No Change)
```

### Interaction 2: Navigating → Arrived
```
Trigger: Distance < 20m
Action:
  - StatusHeader: Navigating → Arrived
  - StateBar: Hide
  - ActionCue: Hide
  - MapContainer: Display: none
  - ArrivalPanel: Display: block
```

### Interaction 3: Arrived → Idle
```
Trigger: Button Click ("닫기")
Action:
  - ArrivalPanel: Display: none
  - MapContainer: Display: block
  - StatusHeader: Arrived → Idle
  - StateBar: Show (Idle)
```

---

## 🎯 사용자 테스트 포인트

디자이너에게 이 질문만 던져라:

> "이 화면에서
> 사용자가 **뭘 눌러야 할지 헷갈리면 성공**입니다."

---

## 🧠 이 구조의 핵심 한 줄

> **컴포넌트는 많아 보이지만
> 사용자가 인식하는 건 '상태' 하나뿐이다.**
