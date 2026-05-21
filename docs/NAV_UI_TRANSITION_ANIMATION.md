# 🎬 출발 전환 애니메이션 구현 가이드

## ✅ 완성된 구조

### 1. 버튼 즉시 피드백 (0-200ms)

```tsx
const [loading, setLoading] = useState(false);

const handleStart = () => {
  setLoading(true);
  setTimeout(() => {
    onStart();
    setLoading(false);
  }, 300);
};

<button
  disabled={loading}
  style={{
    opacity: loading ? 0.7 : 1,
    transform: loading ? "scale(0.98)" : "scale(1)",
    transition: "all 150ms ease",
  }}
>
  {loading ? "경로 계산 중…" : "출발"}
</button>
```

### 2. 지도 카메라 연출 (300-600ms)

```tsx
<div
  style={{
    transition: "transform 500ms ease, filter 300ms ease",
    transform: state === "NAVIGATING" ? "scale(1.05)" : "scale(1)",
    filter: state === "NAVIGATING" ? "saturate(1.1)" : "saturate(1)",
  }}
>
  지도 영역
</div>
```

### 3. 상단·하단 UI 통째 교체

```tsx
<div
  key={state} // 🔥 핵심: key={state}로 컴포넌트 통째 교체
  style={{
    animation: "slideUp 0.25s ease-out",
  }}
>
  {getContent()}
</div>
```

## 🎯 타이밍 정리 (황금 비율)

| 타이밍 | 사용자 인식 | 구현 |
|--------|------------|------|
| 0ms | 버튼 눌림 감지 | `setLoading(true)` |
| 150ms | "계산 중이구나" | 버튼 스타일 변경 |
| 300ms | 화면이 바뀐다 | `onStart()` 호출 |
| 500ms | 안내가 시작됐다 | 지도 카메라 연출 완료 |

## 🚫 절대 금기

- ❌ 출발 눌렀는데 UI 정적
- ❌ 지도만 바뀌고 상/하단 그대로
- ❌ 로딩만 길고 상태 변화 없음

## ✅ 핵심 원칙

1. **출발 버튼은 상태 전환 트리거**
2. **상태 전환은 애니메이션으로 의식적으로 보여줘야 함**
3. **복잡한 연출 필요 없음** - 즉시 반응 + 화면 교체면 충분
