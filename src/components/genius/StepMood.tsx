/**
 * 🔥 Step 3: 지금 기분은?
 */

interface StepMoodProps {
  onSelect: (value: "calm" | "excited" | "focus" | "light") => void;
  initialValue?: "calm" | "excited" | "focus" | "light";
}

const MOOD_OPTIONS: { value: "calm" | "excited" | "focus" | "light"; label: string; emoji: string }[] = [
  { value: "calm", label: "조용", emoji: "🤫" },
  { value: "excited", label: "신남", emoji: "🔥" },
  { value: "focus", label: "집중", emoji: "🎯" },
  { value: "light", label: "가볍게", emoji: "✨" },
];

import { useState } from "react";

export function StepMood({ onSelect, initialValue }: StepMoodProps) {
  const [selectedValue, setSelectedValue] = useState<"calm" | "excited" | "focus" | "light" | null>(initialValue || null);
  const [clickedValue, setClickedValue] = useState<"calm" | "excited" | "focus" | "light" | null>(null);

  const handleClick = (value: "calm" | "excited" | "focus" | "light") => {
    setSelectedValue(value);
    setClickedValue(value);
    
    // 🔥 v1.2: GENIUS_CONTEXT 이벤트 발송 (실시간 반영)
    const moodHint = value === "calm" ? "quiet" :
                    value === "excited" ? "excited" :
                    value === "focus" ? "focused" : "light";
    window.dispatchEvent(
      new CustomEvent("GENIUS_CONTEXT", {
        detail: {
          moodHint,
        },
      })
    );
    
    // 🔥 클릭 피드백: 짧은 딜레이 후 다음 단계로
    setTimeout(() => {
      onSelect(value);
      setClickedValue(null);
    }, 200);
  };

  return (
    <div className="animate-fadeIn">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 text-center animate-slideDown">
        지금 기분은?
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {MOOD_OPTIONS.map((option) => {
          const isSelected = selectedValue === option.value;
          const isClicked = clickedValue === option.value;
          return (
            <button
              key={option.value}
              onClick={() => handleClick(option.value)}
              className={`
                p-4 rounded-xl border-2 transition-all duration-200 transform
                ${isSelected
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-105 shadow-lg"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:scale-102"
                }
                ${isClicked ? "animate-pulse scale-110" : ""}
              `}
            >
              <div className={`text-3xl mb-2 transition-transform duration-200 ${isSelected ? "scale-110" : ""}`}>
                {option.emoji}
              </div>
              <div className={`font-medium text-sm transition-colors duration-200 ${isSelected ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}>
                {option.label}
              </div>
            </button>
          );
        })}
      </div>
      
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
