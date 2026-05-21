/**
 * 🔥 Quick Input Buttons 컴포넌트
 * 
 * 역할:
 * - 빠른 입력 버튼 (+/-)
 * - 모바일 최적화
 */

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickInputButtonsProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  className?: string;
}

export function QuickInputButtons({
  value,
  onChange,
  min = 0,
  max = 10,
  label,
  className = "",
}: QuickInputButtonsProps) {
  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {label && (
        <span className="text-sm text-gray-600 whitespace-nowrap">{label}</span>
      )}
      <div className="flex items-center gap-1 border rounded-lg">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleDecrement}
          disabled={value <= min}
          className="h-10 w-10 p-0"
        >
          <Minus className="w-4 h-4" />
        </Button>
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const newValue = parseInt(e.target.value) || min;
            if (newValue >= min && newValue <= max) {
              onChange(newValue);
            }
          }}
          min={min}
          max={max}
          className="w-16 h-10 text-center border-0 focus:outline-none focus:ring-0"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleIncrement}
          disabled={value >= max}
          className="h-10 w-10 p-0"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
