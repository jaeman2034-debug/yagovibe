import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * YAGO global mobile width policy (<768px):
 * - usable width ~93–96% of viewport (px-3 gutters)
 * - no max-w-sm/md on shell; cards use w-full inside
 *
 * md+: centered column (max-w-3xl default).
 */
export const mobileFullWidthContainerClassName =
  "w-full max-w-none px-3 md:mx-auto md:max-w-3xl";

/** Horizontal scroll bleed aligned to shell gutters (px-3) */
export const mobileFullWidthScrollBleedClassName = "-mx-3 px-3";

export type MobileFullWidthContainerProps = HTMLAttributes<HTMLDivElement> & {
  /** md+ max width override (default 3xl) */
  mdMaxWidth?: "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "7xl" | "none";
};

const mdMaxWidthClass: Record<NonNullable<MobileFullWidthContainerProps["mdMaxWidth"]>, string> = {
  md: "md:max-w-md",
  lg: "md:max-w-lg",
  xl: "md:max-w-xl",
  "2xl": "md:max-w-2xl",
  "3xl": "md:max-w-3xl",
  "4xl": "md:max-w-4xl",
  "5xl": "md:max-w-5xl",
  "7xl": "md:max-w-7xl",
  none: "md:max-w-none",
};

export function MobileFullWidthContainer({
  className,
  mdMaxWidth = "3xl",
  ...props
}: MobileFullWidthContainerProps) {
  return (
    <div
      className={cn(
        "w-full max-w-none px-3 md:mx-auto",
        mdMaxWidthClass[mdMaxWidth],
        className
      )}
      {...props}
    />
  );
}
