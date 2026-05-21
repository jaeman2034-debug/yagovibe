# 🎨 YAGO Figma 페이지 구조 (실전용)

> 디자이너가 Figma 열자마자 그대로 만들 수 있는 수준

---

## 📁 Figma 파일 이름

```
YAGO / Movement OS MVP
```

---

## 📄 Page 1 — `00_Cover`

> 공유용 / 팀 정렬용 (중요)

### Frame

```
Frame: Cover
Size: 1440 × 900
Layout: Center
Background: #FFFFFF
```

### 내용

```
YAGO
Movement OS for Runners

• 상태 중심 네비게이션
• 말 안 해도 되는 AI
• 이동 = 활동의 일부

[작은 텍스트]
디자이너 / 개발자 / 투자자
전부 이 페이지 보고 방향 맞춘다
```

### 레이아웃

```
Auto Layout / Vertical (Center, Gap: 32px)

├─ Text / Title
│   - "YAGO"
│   - Font: 64px / Bold
│   - Color: Gray-900
│
├─ Text / Subtitle
│   - "Movement OS for Runners"
│   - Font: 24px / Regular
│   - Color: Gray-600
│
└─ Auto Layout / Vertical (Gap: 16px)
    ├─ Text / Bullet
    │   - "• 상태 중심 네비게이션"
    │   - Font: 18px / Regular
    │   - Color: Gray-700
    │
    ├─ Text / Bullet
    │   - "• 말 안 해도 되는 AI"
    │
    └─ Text / Bullet
        - "• 이동 = 활동의 일부"
```

---

## 📄 Page 2 — `01_Design System (Lite)`

> 풀 디자인 시스템 ❌
> **이 MVP에 필요한 최소만**

---

### 🎨 Colors

```
Frame: Colors
Layout: Horizontal Auto Layout
Gap: 24px
```

#### Color Swatches

```
Swatch: Black / 85%
- Hex: #1A1A1A (85% Opacity)
- Usage: StateBar background

Swatch: White
- Hex: #FFFFFF
- Usage: Background, Text on dark

Swatch: Gray-900
- Hex: #111827
- Usage: Primary text

Swatch: Gray-700
- Hex: #374151
- Usage: Secondary text

Swatch: Gray-500
- Hex: #6B7280
- Usage: Tertiary text

Swatch: Gray-200
- Hex: #E5E7EB
- Usage: Borders

Swatch: Blue-600
- Hex: #2563EB
- Usage: Accent (Primary button)

Swatch: Blue-50
- Hex: #EFF6FF
- Usage: StatusHeader background (Navigating)

Swatch: Indigo-50
- Hex: #EEF2FF
- Usage: StatusHeader gradient end

Swatch: Gray-50
- Hex: #F9FAFB
- Usage: StatusHeader background (Idle), StateBar background
```

---

### 🔤 Typography

```
Frame: Typography
Layout: Vertical Auto Layout
Gap: 16px
```

#### Text Styles

```
Style: Title
- Font: 16px / Medium (Pretendard / SF Pro)
- Line Height: 20px
- Color: Gray-900
- Usage: StatusHeader title, Button text

Style: Body
- Font: 14px / Regular
- Line Height: 20px
- Color: Gray-700
- Usage: StateBar hint, ActionCue instruction

Style: Caption
- Font: 13px / Regular
- Line Height: 16px
- Color: Gray-500
- Usage: StatusHeader subtitle, ActionCue distance

Style: Large Title
- Font: 30px / Bold
- Line Height: 36px
- Color: Gray-900
- Usage: ArrivalPanel title

Style: Subtitle
- Font: 18px / Regular
- Line Height: 24px
- Color: Gray-700
- Usage: ArrivalPanel subtitle
```

📌 **규칙**
* 강조용 Bold 없음 (Large Title 제외)
* 상태는 차분해야 함

---

### 🧱 Base Components

```
Frame: Base Components
Layout: Grid (2 columns)
Gap: 24px
```

#### Component List

```
StatusHeader
- Variant: Idle / Navigating / Upcoming / Arrived
- Size: 390 × 60 (Auto Layout)

StateBar
- Variant: Idle / Listening / Navigating
- Size: 390 × 56 (Fixed)

ActionCue
- Variant: Straight / Left / Right / U-Turn
- Size: 360 × 64 (Auto Layout)

ArrivalPanel
- Default
- Size: 390 × 844 (Full Screen)
```

📌 **규칙**
* 모든 컴포넌트 **Text = Replaceable**
* 아이콘은 **Emoji or SVG 1종**

---

## 📄 Page 3 — `02_Components`

> **Auto Layout 필수**

---

### 🔹 Component Library

```
Frame: Component Library
Layout: Vertical Auto Layout
Gap: 32px
```

#### StatusHeader Variants

```
StatusHeader / Idle
├─ Background: Gray-50 → Gray-100 (Gradient)
├─ Border: Gray-200
└─ Text: "지금은 쉬는 중이에요"

StatusHeader / Navigating
├─ Background: Blue-50 → Indigo-50 (Gradient)
├─ Border: Blue-200
├─ Title: "🏃 러닝 크루 가는 중"
└─ Subtitle: "🚶 도보 · 11분 남음"

StatusHeader / Upcoming
├─ Background: Blue-50 → Indigo-50 (Gradient)
├─ Border: Blue-200
├─ Title: "오늘 러닝 크루 모임까지 42분"
└─ Subtitle: "러닝 크루"

StatusHeader / Arrived
├─ Background: Green-50 → Green-100 (Gradient)
├─ Border: Green-200
└─ Text: "🎉 도착했어요"
```

#### StateBar Variants

```
StateBar / Idle
├─ Background: Gray-50
├─ Border: Gray-200
└─ Text: "지금 말해도 돼요"

StateBar / Listening
├─ Background: Gray-50
├─ Border: Gray-200
├─ Text: "지금 말해도 돼요"
└─ Subtext: "듣고 있어요" (Opacity: 70%)

StateBar / Navigating
├─ Background: Gray-50
├─ Border: Gray-200
└─ Text: "계속 안내 중이에요"
```

#### ActionCue Variants

```
ActionCue / Straight
├─ Icon: "⬆️"
├─ Instruction: "직진"
└─ Distance: "120m"

ActionCue / Left
├─ Icon: "⬅️"
├─ Instruction: "좌회전"
└─ Distance: "50m"

ActionCue / Right
├─ Icon: "➡️"
├─ Instruction: "우회전"
└─ Distance: "80m"

ActionCue / U-Turn
├─ Icon: "↩️"
├─ Instruction: "유턴"
└─ Distance: "200m"
```

#### ArrivalPanel

```
ArrivalPanel / Default
├─ Background: White
├─ Title: "🎉 도착했어요"
├─ Subtitle: "오늘 러닝 시작할게요"
└─ Buttons:
    ├─ Primary: "크루 들어가기"
    ├─ Secondary: "혼자 뛰기"
    └─ Ghost: "닫기"
```

---

## 📄 Page 4 — `03_Main Flow (핵심)`

> 🚨 **이 페이지가 MVP의 80%**

---

### Frame 1 — `Home_Idle`

```
Frame: Home_Idle
Size: 390 × 844
Layout: Vertical Auto Layout
Gap: 16px
Padding: 16px
Background: #FFFFFF
```

#### Structure

```
Auto Layout / Vertical (Gap: 16px)

├─ StatusHeader / Idle
│   └─ Text: "지금은 쉬는 중이에요"
│
├─ MapContainer (Flex: 1)
│   ├─ MapView (Fill)
│   └─ UserLocationDot (Center, Absolute)
│
└─ StateBar / Idle
    └─ Text: "지금 말해도 돼요"
```

#### 텍스트 예시

```
StatusHeader:
"지금은 쉬는 중이에요"

StateBar:
"지금 말해도 돼요"
```

---

### Frame 2 — `Home_Listening`

```
Frame: Home_Listening
Size: 390 × 844
```

#### 변화는 딱 하나

```
StateBar / Listening
├─ Text: "지금 말해도 돼요"
└─ Subtext: "듣고 있어요"
```

👉 지도 / 헤더 그대로

---

### Frame 3 — `Home_Navigating`

```
Frame: Home_Navigating
Size: 390 × 844
Layout: Vertical Auto Layout
Gap: 16px
Padding: 16px
```

#### Structure

```
Auto Layout / Vertical (Gap: 16px)

├─ StatusHeader / Navigating
│   ├─ Title: "🏃 러닝 크루 가는 중"
│   └─ Subtitle: "🚶 도보 · 11분 남음"
│
├─ MapContainer (Flex: 1)
│   ├─ MapView (Fill)
│   ├─ UserLocationDot (Center, Absolute)
│   └─ RoutePolyline (Overlay)
│
└─ StateBar / Navigating
    └─ Text: "계속 안내 중이에요"
```

#### Overlay Layer (Absolute)

```
ActionCue / Straight
├─ Position: Bottom 96px, Center
├─ Icon: "⬆️"
├─ Instruction: "직진"
└─ Distance: "120m"
```

---

### 🔗 Prototype 연결

#### Interaction 1: Idle → Listening

```
Trigger: Auto (Delay 3s)
OR Manual (Click StateBar)

From: Home_Idle
To: Home_Listening

Animation:
- StateBar: Idle → Listening (Fade, 300ms)
- StatusHeader: (No Change)
- MapContainer: (No Change)
```

#### Interaction 2: Listening → Navigating

```
Trigger: Voice Command
("운동장 찾아줘")

From: Home_Listening
To: Home_Navigating

Animation:
- StatusHeader: Idle → Navigating (Slide Up, 400ms)
- StateBar: Listening → Navigating (Fade, 300ms)
- ActionCue: Show (Fade In, 500ms)
- MapContainer: (No Change)
```

#### Interaction 3: Navigating → Arrival

```
Trigger: Distance < 20m
OR Manual (Gesture: Swipe Up)

From: Home_Navigating
To: Arrival

Animation:
- MapContainer: Fade Out (300ms)
- ArrivalPanel: Fade In (400ms)
- StatusHeader: Hide
- StateBar: Hide
- ActionCue: Hide
```

---

## 📄 Page 5 — `04_Arrival`

> **지도 제거 페이지**

---

### Frame — `Arrival`

```
Frame: Arrival
Size: 390 × 844
Layout: Vertical Auto Layout
Background: #FFFFFF
```

#### Structure

```
Auto Layout / Vertical (Center, Gap: 24px, Padding: 24px)

├─ Text / Title
│   - "🎉 도착했어요"
│   - Font: 30px / Bold
│   - Color: Gray-900
│   - Align: Center
│
├─ Text / Subtitle
│   - "오늘 러닝 시작할게요"
│   - Font: 18px / Regular
│   - Color: Gray-700
│   - Align: Center
│
└─ Auto Layout / Vertical (Gap: 12px, Width: Fill)
    ├─ Button / Primary
    │   - "크루 들어가기"
    │   - Height: 48px
    │   - Background: Blue-600
    │   - Color: White
    │   - Corner Radius: 24px
    │
    ├─ Button / Secondary
    │   - "혼자 뛰기"
    │   - Height: 48px
    │   - Background: Gray-100
    │   - Color: Gray-700
    │   - Corner Radius: 24px
    │
    └─ TextButton / Ghost
        - "닫기"
        - Height: 40px
        - Color: Gray-500
```

📌 **중요**
* 이 페이지에서 **지도 컴포넌트 존재 ❌**
* MapContainer: Display: none

---

### 🔗 Prototype 연결

#### Interaction: Arrival → Home_Idle

```
Trigger: Button Click ("닫기")

From: Arrival
To: Home_Idle

Animation:
- ArrivalPanel: Fade Out (300ms)
- MapContainer: Fade In (400ms)
- StatusHeader: Show (Slide Down, 400ms)
- StateBar: Show (Fade In, 300ms)
```

---

## 📄 Page 6 — `05_User Test`

> 실제 테스트용 (강추)

---

### Frame 복제

```
Frame: Test_Home_Idle
- Copy from: Home_Idle

Frame: Test_Home_Navigating
- Copy from: Home_Navigating

Frame: Test_Arrival
- Copy from: Arrival
```

---

### 테스트 주석 (Sticky)

#### Frame: Test_Home_Idle

```
Sticky Note 1 (Top Left)
Q1. 지금 이 앱은 뭐 하는 앱 같나요?
→ 사용자 반응 기록

Sticky Note 2 (Center)
Q2. 뭘 눌러야 할지 헷갈리나요?
→ "헷갈린다" = 성공
→ "명확하다" = 실패 (버튼이 너무 명확함)
```

#### Frame: Test_Home_Navigating

```
Sticky Note 3 (Top Right)
Q3. 말 안 하면 불안한가요?
→ "불안하다" = 실패 (AI가 강요하는 느낌)
→ "괜찮다" = 성공 (상태만 보여줌)
```

#### Frame: Test_Arrival

```
Sticky Note 4 (Bottom)
Q4. 도착 후 지도 없어도 괜찮나요?
→ "괜찮다" = 성공 (컨텍스트 전환 성공)
→ "지도 보고 싶다" = 실패 (전환 실패)
```

---

### 테스트 시나리오 문서

```
Frame: Test_Scenario
Size: 390 × 844
Background: #F9FAFB
```

#### 내용

```
사용자 테스트 시나리오

1. 화면 보여주기 (설명 없음)
   → 반응 기록

2. "지금 뭘 하면 될까요?" 질문
   → 답변 기록

3. "말해도 되고 안 해도 돼요" 안내
   → 반응 기록

4. 이동 중 화면 보여주기
   → "불안한가요?" 질문

5. 도착 화면 보여주기
   → "지도 보고 싶나요?" 질문

성공 기준:
- Q2: "헷갈린다" = 성공
- Q3: "괜찮다" = 성공
- Q4: "괜찮다" = 성공
```

---

## 🧠 이 Figma 구조의 핵심 철학

> 페이지는 많아 보이지만
> **사용자가 경험하는 흐름은 하나다**

```
상태 → 이동 → 전환
```

---

## 📐 Frame Naming Convention

```
{Page}_{State}_{Variant}

예시:
- 03_Home_Idle
- 03_Home_Listening
- 03_Home_Navigating
- 04_Arrival_Default
```

---

## 🎯 디자이너 체크리스트

### 필수 작업
- [ ] Page 1 (Cover) 생성
- [ ] Page 2 (Design System) 생성
- [ ] Page 3 (Components) 생성
- [ ] Page 4 (Main Flow) 생성
  - [ ] Home_Idle
  - [ ] Home_Listening
  - [ ] Home_Navigating
- [ ] Page 5 (Arrival) 생성
- [ ] Page 6 (User Test) 생성

### 프로토타입 연결
- [ ] Idle → Listening (Auto / Delay 3s)
- [ ] Listening → Navigating (Voice Trigger)
- [ ] Navigating → Arrival (Distance / Gesture)
- [ ] Arrival → Home_Idle (Button Click)

### 테스트 준비
- [ ] Test Frames 복제
- [ ] Sticky Notes 추가
- [ ] Test Scenario 문서 작성

---

## 🚀 다음 단계

이제 이 Figma 기준으로:

1️⃣ **개발 태스크 쪼개기 (프론트/백 분리)**
2️⃣ **실제 러닝 크루 사용자 테스트 스크립트**
3️⃣ **투자자 데모 스토리**

번호 하나만 말해.
이제는 **만들고 → 검증하고 → 터뜨리는 단계**다.
