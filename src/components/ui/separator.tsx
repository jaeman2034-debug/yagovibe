import React from "react";
import { cn } from "@/lib/utils";

interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
}

export const Separator: React.FC<SeparatorProps> = ({
  orientation = "horizontal",
  className,
  ...props
}) => {
  return (
    <div
      role="separator"
      className={cn(
        orientation === "horizontal"
          ? "my-6 h-px w-full bg-gray-200 dark:bg-gray-700"
          : "mx-6 h-full w-px bg-gray-200 dark:bg-gray-700",
        className
      )}
      {...props}
    />
  );
};

