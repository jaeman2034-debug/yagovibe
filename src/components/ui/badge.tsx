import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "outline";
}

export const Badge: React.FC<BadgeProps> = ({ 
  variant = "default", 
  className, 
  children, 
  ...props 
}) => {
  const variants = {
    default: "bg-purple-600 text-white",
    secondary: "bg-gray-200 dark:bg-zinc-700 text-gray-900 dark:text-gray-100",
    outline: "border border-gray-300 dark:border-zinc-600 bg-transparent text-gray-700 dark:text-gray-300",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

