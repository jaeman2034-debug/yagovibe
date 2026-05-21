# 🔥 네비 UI 상태 머신 구현 가이드 (Web React)

## 📋 완성된 구조

### 1. 상태 정의 (단일 소스 오브 트루스)

```typescript
// src/components/map/NavUIStateMachine.tsx
export type NavUIState = 'SEARCH' | 'SELECTED' | 'PRE_NAV' | 'NAVIGATING' | 'ARRIVED';
```

### 2. 화면 레이어 구조 (3개 고정)

```
┌─────────────────────────┐
│   TopLayer              │  ← 검색바 / 상태바 / 턴바이턴
├─────────────────────────┤
│                         │
│   MapLayer              │  ← 지도 (항상 존재)
│                         │
├─────────────────────────┤
│   BottomLayer           │  ← 결과 리스트 / 카드 / ETA
└─────────────────────────┘
```

### 3. 상태별 UI 컴포넌트 매핑

| 상태 | TopLayer | BottomLayer |
|------|----------|-------------|
| SEARCH | SearchBar | ResultList |
| SELECTED | SearchBar (고정) | ConfirmCard |
| PRE_NAV | StatusBar | PreNavCard |
| NAVIGATING | TurnByTurnBar | NavCard |
| ARRIVED | StatusBar | ArrivedCard |

### 4. 출발 버튼 전환 애니메이션 (3연타)

```typescript
// 1. 버튼 피드백 (150ms)
setIsStartButtonPressed(true);

// 2. 지도 연출 (300ms)
setTimeout(() => {
  handleStartNavigation(); // fitBounds 자동 실행
}, 150);

// 3. UI 스왑 (즉시)
setTimeout(() => {
  setIsStartButtonPressed(false);
  // 상단/하단 UI 교체 완료
}, 300);
```

## 🎯 핵심 원칙

**"상태가 바뀌면 UI 세트가 통째로 갈아끼워진다"**

- 조건문을 컴포넌트 단위로 자른다
- 부분 수정이 아니라 컴포넌트 교체
- 디버그 배지로 상태 확인 가능
