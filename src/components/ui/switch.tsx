import React from "react";
import { cn } from "@/lib/utils";

interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "type"> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ checked, onCheckedChange, className, disabled, ...props }, ref) => (
    <label
      className={cn(
        "relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full bg-gray-300 transition-colors",
        checked && "bg-purple-600",
        disabled && "opacity-60 cursor-not-allowed",
        className
      )}
    >
      <input
        ref={ref}
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange?.(event.target.checked)}
        {...props}
      />
      <span
        className={cn(
          "inline-block h-5 w-5 translate-x-1 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-5"
        )}
      />
    </label>
  )
);

Switch.displayName = "Switch";

