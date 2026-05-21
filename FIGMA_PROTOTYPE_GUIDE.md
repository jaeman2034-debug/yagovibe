# 🔗 YAGO Figma 프로토타입 연결 가이드

> 디자이너가 프로토타입을 연결할 때 사용하는 실전 가이드

---

## 📋 프로토타입 연결 목록

### 1️⃣ Idle → Listening

```
From: Home_Idle
To: Home_Listening

Trigger: Auto (Delay 3s)
OR Manual (Click StateBar)

Animation:
- Type: Smart Animate
- Duration: 300ms
- Easing: Ease Out

Changes:
- StateBar: Idle → Listening
  - Subtext: "듣고 있어요" (Fade In)
```

---

### 2️⃣ Listening → Navigating

```
From: Home_Listening
To: Home_Navigating

Trigger: Voice Command
("운동장 찾아줘")
OR Manual (Click Map)

Animation:
- Type: Smart Animate
- Duration: 400ms
- Easing: Ease In Out

Changes:
- StatusHeader: Idle → Navigating
  - Slide Up (Y: -20px)
  - Background: Gray → Blue Gradient
- StateBar: Listening → Navigating
  - Fade (300ms)
- ActionCue: Show
  - Fade In (500ms)
  - Position: Bottom 96px
```

---

### 3️⃣ Navigating → Arrival

```
From: Home_Navigating
To: Arrival

Trigger: Distance < 20m
OR Manual (Gesture: Swipe Up)

Animation:
- Type: Smart Animate
- Duration: 400ms
- Easing: Ease In Out

Changes:
- MapContainer: Fade Out (300ms)
- ArrivalPanel: Fade In (400ms)
- StatusHeader: Hide (Fade Out, 200ms)
- StateBar: Hide (Fade Out, 200ms)
- ActionCue: Hide (Fade Out, 200ms)
```

---

### 4️⃣ Arrival → Home_Idle

```
From: Arrival
To: Home_Idle

Trigger: Button Click ("닫기")

Animation:
- Type: Smart Animate
- Duration: 400ms
- Easing: Ease In Out

Changes:
- ArrivalPanel: Fade Out (300ms)
- MapContainer: Fade In (400ms)
- StatusHeader: Show (Slide Down, 400ms)
- StateBar: Show (Fade In, 300ms)
```

---

## 🎨 Animation Settings

### Fade In/Out
```
Opacity: 0 → 100 (or 100 → 0)
Duration: 200-300ms
Easing: Ease Out
```

### Slide Up/Down
```
Y Position: 0 → -20px (or 20px → 0)
Duration: 400ms
Easing: Ease In Out
```

### Smart Animate
```
Use for: Background Color, Border Color
Duration: 300-400ms
Easing: Ease In Out
```

---

## 🔧 Figma 프로토타입 설정

### Interaction Settings

```
Trigger: On Click / On Drag / After Delay
Action: Navigate to
Destination: [Target Frame]
Animation: Smart Animate / Instant
Duration: [ms]
Easing: [Ease Type]
```

### Overlay Settings (ActionCue)

```
Position: Bottom
Offset: 96px
Background: None (Transparent)
```

---

## 📱 테스트 방법

### 1. Figma Prototype 모드
```
1. 우측 상단 "Prototype" 탭 클릭
2. Frame 선택
3. Interaction 추가
4. "Play" 버튼으로 테스트
```

### 2. 모바일 미리보기
```
1. Figma Mobile App 실행
2. 프로토타입 열기
3. 실제 터치로 테스트
```

---

## ⚠️ 주의사항

### ❌ 하지 말 것
- 너무 빠른 애니메이션 (100ms 이하)
- 복잡한 경로 애니메이션
- 여러 요소 동시 움직임 (3개 이상)

### ✅ 해야 할 것
- 단순한 Fade / Slide
- 200-400ms 범위 유지
- 한 번에 하나씩 변화

---

## 🧠 핵심 원칙

> 프로토타입은 **"느낌"**을 보여주는 도구다
> 완벽한 애니메이션이 아니라
> **사용자 경험의 흐름**을 보여줘야 한다
