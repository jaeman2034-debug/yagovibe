import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive";
  size?: "sm" | "md" | "lg";
  /** true면 자식 단일 엘리먼트(예: Link)에 스타일·props 병합 — DOM에 `asChild`를 넘기지 않음 */
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const baseStyles =
      "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

    const variants = {
      default: "bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500",
      outline: "border border-gray-300 dark:border-zinc-700 bg-transparent hover:bg-gray-100 dark:hover:bg-zinc-800",
      ghost: "hover:bg-gray-100 dark:hover:bg-zinc-800",
      secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-400 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700",
      destructive: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500",
    } as const;

    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-base",
      lg: "px-6 py-3 text-lg",
    };

    return (
      <Comp ref={ref} className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
        {children}
      </Comp>
    );
  }
);

Button.displayName = "Button";

