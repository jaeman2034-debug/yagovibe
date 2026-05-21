/**
 * 🎨 StateBar 컴포넌트
 * 
 * Figma: StateBar (Variant: Idle / Listening / Navigating)
 * 하단 상태 응답 바 (버튼이 아님, 상태 표시만)
 */

type StateBarVariant = "idle" | "listening" | "navigating";

interface StateBarProps {
  variant: StateBarVariant;
  onClick?: () => void; // 🔥 버튼 클릭 핸들러
}

export function StateBar({ variant, onClick }: StateBarProps) {
  const content = {
    idle: {
      hint: "🎙️ 말로 장소 찾기",
      sub: null,
    },
    listening: {
      hint: "듣고 있어요…",
      sub: null,
    },
    navigating: {
      hint: "계속 안내 중이에요",
      sub: null,
    },
  }[variant];

  return (
    <section className="mt-4">
      <div 
        onClick={variant === "idle" ? onClick : undefined}
        className={`rounded-xl border px-4 py-3 text-center transition-all ${
          variant === "idle" 
            ? "bg-black/85 text-white border-white/10 shadow-lg cursor-pointer hover:bg-black/90 active:scale-95" 
            : "bg-gray-50 border-gray-200"
        }`}
      >
        <p className={`text-sm ${variant === "idle" ? "font-medium" : "text-gray-600"}`}>
          {content.hint}
        </p>
        {content.sub && (
          <p className="text-xs text-gray-500 mt-1 opacity-70">{content.sub}</p>
        )}
      </div>
    </section>
  );
}
