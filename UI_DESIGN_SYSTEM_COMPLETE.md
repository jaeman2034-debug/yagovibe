# 🎨 노원구 축구협회 UI Design System 완전 설계

> **디자인 시스템 - 실제 개발 기준 완성형**

---

## 📋 목차

1. [Design System 전체 구조](#1-design-system-전체-구조)
2. [컬러 시스템](#2-컬러-시스템)
3. [Typography 시스템](#3-typography-시스템)
4. [Spacing 시스템](#4-spacing-시스템)
5. [Layout 시스템](#5-layout-시스템)
6. [컴포넌트 시스템](#6-컴포넌트-시스템)
7. [Icon 시스템](#7-icon-시스템)
8. [Motion 시스템](#8-motion-시스템)
9. [모바일 최적화](#9-모바일-최적화)
10. [실제 구현 코드](#10-실제-구현-코드)

---

## 1️⃣ Design System 전체 구조

### 디자인 시스템 모듈

```
Design System
 ├─ Foundation (기초)
 │   ├─ Colors (컬러)
 │   ├─ Typography (타이포그래피)
 │   ├─ Spacing (간격)
 │   └─ Shadows (그림자)
 ├─ Components (컴포넌트)
 │   ├─ Button
 │   ├─ Card
 │   ├─ Badge
 │   ├─ Avatar
 │   ├─ Input
 │   └─ Table
 ├─ Layout (레이아웃)
 │   ├─ Container
 │   ├─ Grid
 │   └─ Section
 └─ Platform Components (플랫폼 컴포넌트)
     ├─ MatchCard
     ├─ TeamCard
     ├─ PlayerCard
     └─ ActivityCard
```

---

## 2️⃣ 컬러 시스템

### 2-1. Tailwind Config 설정

**파일**: `tailwind.config.ts`

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary (Deep Blue - 축구 플랫폼 느낌)
        primary: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#0F3D75", // 메인 Primary
          600: "#0D3563",
          700: "#0A2D51",
          800: "#08253F",
          900: "#051D2D",
        },
        
        // Accent (Football Green - 축구장 느낌)
        accent: {
          50: "#F0FDF4",
          100: "#DCFCE7",
          200: "#BBF7D0",
          300: "#86EFAC",
          400: "#4ADE80",
          500: "#16A34A", // 메인 Accent
          600: "#15803D",
          700: "#166534",
          800: "#14532D",
          900: "#14532D",
        },
        
        // Neutral
        background: "#F8FAFC",
        surface: "#FFFFFF",
        border: "#E5E7EB",
        text: {
          primary: "#0F172A",
          secondary: "#64748B",
          muted: "#94A3B8",
        },
        
        // Status Colors
        success: {
          DEFAULT: "#16A34A",
          light: "#DCFCE7",
          dark: "#15803D",
        },
        warning: {
          DEFAULT: "#F59E0B",
          light: "#FEF3C7",
          dark: "#D97706",
        },
        danger: {
          DEFAULT: "#EF4444",
          light: "#FEE2E2",
          dark: "#DC2626",
        },
        info: {
          DEFAULT: "#3B82F6",
          light: "#DBEAFE",
          dark: "#2563EB",
        },
        
        // Live Status
        live: {
          DEFAULT: "#EF4444",
          pulse: "#FEE2E2",
        },
      },
      
      borderRadius: {
        sm: "0.5rem",
        DEFAULT: "0.75rem",
        md: "1rem",
        lg: "1.5rem",
        xl: "2rem",
        "2xl": "2.5rem",
      },
      
      boxShadow: {
        sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        DEFAULT: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
        md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
        lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
        xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
      },
    },
  },
  plugins: [],
};

export default config;
```

---

### 2-2. CSS 변수 설정

**파일**: `src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Primary Colors */
    --primary: 15 61 117; /* #0F3D75 */
    --primary-foreground: 255 255 255;
    
    /* Accent Colors */
    --accent: 22 163 74; /* #16A34A */
    --accent-foreground: 255 255 255;
    
    /* Background */
    --background: 248 250 252; /* #F8FAFC */
    --surface: 255 255 255;
    
    /* Text */
    --text-primary: 15 23 42; /* #0F172A */
    --text-secondary: 100 116 139; /* #64748B */
    --text-muted: 148 163 184; /* #94A3B8 */
    
    /* Border */
    --border: 229 231 235; /* #E5E7EB */
    
    /* Status */
    --success: 22 163 74;
    --warning: 245 158 11;
    --danger: 239 68 68;
    --info: 59 130 246;
    
    /* Live */
    --live: 239 68 68;
  }
}

@layer components {
  /* Card Base */
  .card-base {
    @apply bg-white border border-slate-200 rounded-2xl shadow-sm;
  }
  
  /* Button Base */
  .btn-base {
    @apply inline-flex items-center justify-center rounded-lg font-medium transition-all;
    @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2;
    @apply disabled:pointer-events-none disabled:opacity-50;
  }
  
  /* Badge Base */
  .badge-base {
    @apply inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold;
  }
}
```

---

## 3️⃣ Typography 시스템

### 3-1. 폰트 설정

**파일**: `src/index.css`

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap');

@layer base {
  * {
    font-family: 'Inter', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
}
```

### 3-2. Typography 스케일

```typescript
// Typography Scale
const typography = {
  h1: "text-4xl font-bold tracking-tight",      // 36px
  h2: "text-3xl font-bold tracking-tight",      // 30px
  h3: "text-2xl font-semibold tracking-tight",  // 24px
  h4: "text-xl font-semibold",                  // 20px
  h5: "text-lg font-semibold",                  // 18px
  h6: "text-base font-semibold",                // 16px
  body: "text-base",                            // 16px
  bodySmall: "text-sm",                         // 14px
  caption: "text-xs",                           // 12px
  tiny: "text-[10px]",                          // 10px
};
```

### 3-3. Typography 컴포넌트

**파일**: `src/components/ui/Typography.tsx`

```typescript
import { cn } from "@/lib/utils";

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  variant?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "body" | "bodySmall" | "caption" | "tiny";
  as?: keyof JSX.IntrinsicElements;
  children: React.ReactNode;
}

const variantClasses = {
  h1: "text-4xl font-bold tracking-tight text-slate-900",
  h2: "text-3xl font-bold tracking-tight text-slate-900",
  h3: "text-2xl font-semibold tracking-tight text-slate-900",
  h4: "text-xl font-semibold text-slate-900",
  h5: "text-lg font-semibold text-slate-900",
  h6: "text-base font-semibold text-slate-900",
  body: "text-base text-slate-700",
  bodySmall: "text-sm text-slate-600",
  caption: "text-xs text-slate-500",
  tiny: "text-[10px] text-slate-400",
};

export function Typography({
  variant = "body",
  as,
  className,
  children,
  ...props
}: TypographyProps) {
  const Component = as || (variant.startsWith("h") ? variant : "p");
  const classes = variantClasses[variant];

  return (
    <Component className={cn(classes, className)} {...props}>
      {children}
    </Component>
  );
}
```

---

## 4️⃣ Spacing 시스템

### Spacing Scale

```typescript
// Tailwind 기본 Spacing (4px 기준)
const spacing = {
  0: "0px",
  1: "4px",   // p-1
  2: "8px",   // p-2
  3: "12px",  // p-3
  4: "16px",  // p-4
  5: "20px",  // p-5
  6: "24px",  // p-6
  8: "32px",  // p-8
  10: "40px", // p-10
  12: "48px", // p-12
  16: "64px", // p-16
  20: "80px", // p-20
  24: "96px", // p-24
};
```

### Spacing 사용 예시

```typescript
// Card Padding
className="p-4"      // 16px
className="p-6"      // 24px

// Gap
className="gap-4"    // 16px
className="gap-6"    // 24px

// Margin
className="mb-4"     // 16px
className="mt-6"     // 24px
```

---

## 5️⃣ Layout 시스템

### 5-1. Container 컴포넌트

**파일**: `src/components/layout/Container.tsx`

```typescript
import { cn } from "@/lib/utils";

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

const sizeClasses = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-7xl",
  xl: "max-w-[1536px]",
  full: "max-w-full",
};

export function Container({
  children,
  size = "lg",
  className,
  ...props
}: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto px-4 sm:px-6 lg:px-8",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
```

### 5-2. Section 컴포넌트

**파일**: `src/components/layout/Section.tsx`

```typescript
import { cn } from "@/lib/utils";

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  spacing?: "sm" | "md" | "lg";
}

const spacingClasses = {
  sm: "py-6",
  md: "py-10",
  lg: "py-16",
};

export function Section({
  children,
  spacing = "md",
  className,
  ...props
}: SectionProps) {
  return (
    <section
      className={cn(spacingClasses[spacing], className)}
      {...props}
    >
      {children}
    </section>
  );
}
```

### 5-3. Section Header 컴포넌트

**파일**: `src/components/ui/SectionHeader.tsx`

```typescript
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  href,
  linkLabel = "전체 보기",
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-end justify-between gap-4 mb-4", className)}>
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      {href && (
        <Link
          to={href}
          className="text-sm font-medium text-slate-700 hover:text-primary-600 flex items-center gap-1 transition-colors"
        >
          {linkLabel}
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
```

---

## 6️⃣ 컴포넌트 시스템

### 6-1. Button 컴포넌트 (확장)

**파일**: `src/components/ui/button.tsx` (기존 확장)

```typescript
import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive" | "accent";
  size?: "sm" | "default" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  children: React.ReactNode;
}

export function Button({
  children,
  variant = "default",
  size = "default",
  loading = false,
  icon,
  iconPosition = "left",
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = "btn-base";
  
  const variantClasses = {
    default: "bg-primary-500 text-white hover:bg-primary-600 focus-visible:ring-primary-500",
    accent: "bg-accent-500 text-white hover:bg-accent-600 focus-visible:ring-accent-500",
    outline: "border-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-500",
    ghost: "text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-500",
    destructive: "bg-danger text-white hover:bg-danger-dark focus-visible:ring-danger",
  };
  
  const sizeClasses = {
    sm: "h-9 px-3 text-sm",
    default: "h-10 px-4 text-base",
    lg: "h-12 px-6 text-lg",
  };

  const isDisabled = disabled || loading;

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        isDisabled && "opacity-50 cursor-not-allowed",
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          {children}
        </>
      ) : (
        <>
          {icon && iconPosition === "left" && (
            <span className="mr-2">{icon}</span>
          )}
          {children}
          {icon && iconPosition === "right" && (
            <span className="ml-2">{icon}</span>
          )}
        </>
      )}
    </button>
  );
}
```

---

### 6-2. Badge 컴포넌트 (확장)

**파일**: `src/components/ui/badge.tsx` (기존 확장)

```typescript
import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "outline" | "success" | "warning" | "danger" | "info" | "live";
  size?: "sm" | "default";
  children: React.ReactNode;
}

export function Badge({
  children,
  variant = "default",
  size = "default",
  className = "",
  ...props
}: BadgeProps) {
  const baseClasses = "badge-base";
  
  const variantClasses = {
    default: "bg-slate-100 text-slate-700 border border-slate-200",
    outline: "border-2 border-slate-300 text-slate-700 bg-white",
    success: "bg-success-light text-success-dark border border-success",
    warning: "bg-warning-light text-warning-dark border border-warning",
    danger: "bg-danger-light text-danger-dark border border-danger",
    info: "bg-info-light text-info-dark border border-info",
    live: "bg-live text-white border border-live animate-pulse",
  };
  
  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px]",
    default: "px-2.5 py-0.5 text-xs",
  };

  return (
    <span
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
```

---

### 6-3. Status Badge 컴포넌트

**파일**: `src/components/ui/StatusBadge.tsx`

```typescript
import { Badge } from "./badge";
import { cn } from "@/lib/utils";

type StatusType = "scheduled" | "live" | "completed" | "cancelled" | "pending" | "approved" | "rejected";

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; variant: "default" | "outline" | "success" | "warning" | "danger" | "info" | "live" }> = {
  scheduled: { label: "예정", variant: "outline" },
  live: { label: "LIVE", variant: "live" },
  completed: { label: "종료", variant: "default" },
  cancelled: { label: "취소", variant: "danger" },
  pending: { label: "승인 대기", variant: "warning" },
  approved: { label: "승인됨", variant: "success" },
  rejected: { label: "거절됨", variant: "danger" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge variant={config.variant} className={cn(className)}>
      {config.label}
    </Badge>
  );
}
```

---

### 6-4. Avatar 컴포넌트 (확장)

**파일**: `src/components/ui/avatar.tsx`

```typescript
import React from "react";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  name?: string;
  size?: "sm" | "default" | "lg" | "xl";
  fallback?: React.ReactNode;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  default: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

export function Avatar({
  src,
  alt,
  name,
  size = "default",
  fallback,
  className,
  ...props
}: AvatarProps) {
  const initials = name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "";

  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full bg-slate-200 text-slate-600 font-semibold overflow-hidden",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {src ? (
        <img
          src={src}
          alt={alt || name || "Avatar"}
          className="h-full w-full object-cover"
        />
      ) : (
        fallback || (
          <span className="flex items-center justify-center h-full w-full">
            {initials || <User className="h-1/2 w-1/2" />}
          </span>
        )
      )}
    </div>
  );
}
```

---

### 6-5. Card 컴포넌트 (확장)

**파일**: `src/components/ui/card.tsx` (기존 확장)

```typescript
import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hover?: boolean;
  interactive?: boolean;
}

export function Card({
  children,
  hover = false,
  interactive = false,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "card-base",
        hover && "hover:shadow-md transition-shadow",
        interactive && "cursor-pointer hover:-translate-y-0.5 transition-transform",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padding?: "sm" | "md" | "lg";
}

const paddingClasses = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function CardContent({
  children,
  padding = "md",
  className,
  ...props
}: CardContentProps) {
  return (
    <div
      className={cn(paddingClasses[padding], className)}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardHeader({
  children,
  className,
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 p-6 pb-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

export function CardTitle({
  children,
  className,
  ...props
}: CardTitleProps) {
  return (
    <h3
      className={cn("text-xl font-semibold leading-none tracking-tight text-slate-900", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export function CardDescription({
  children,
  className,
  ...props
}: CardDescriptionProps) {
  return (
    <p
      className={cn("text-sm text-slate-500", className)}
      {...props}
    >
      {children}
    </p>
  );
}
```

---

### 6-6. Empty State 컴포넌트

**파일**: `src/components/ui/EmptyState.tsx`

```typescript
import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline";
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  message,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-4 text-6xl opacity-20">{icon}</div>
      )}
      <h3 className="text-lg font-semibold text-slate-900 mb-2">
        {title}
      </h3>
      {message && (
        <p className="text-sm text-slate-500 mb-6 max-w-sm">
          {message}
        </p>
      )}
      {action && (
        <Button
          variant={action.variant || "default"}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
```

---

## 7️⃣ Icon 시스템

### 7-1. Icon 사용 규칙

**추천 라이브러리**: Lucide React

```typescript
import {
  Trophy,
  Users,
  Calendar,
  MapPin,
  Clock,
  Target,
  Image,
  MessageCircle,
  Share2,
  Heart,
  UserPlus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  Settings,
  LayoutDashboard,
} from "lucide-react";
```

### 7-2. Icon 컴포넌트 래퍼

**파일**: `src/components/ui/Icon.tsx`

```typescript
import React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface IconProps {
  icon: LucideIcon;
  size?: "sm" | "default" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  default: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-8 w-8",
};

export function Icon({ icon: IconComponent, size = "default", className }: IconProps) {
  return (
    <IconComponent
      className={cn(sizeClasses[size], className)}
    />
  );
}
```

---

## 8️⃣ Motion 시스템

### 8-1. Transition 클래스

```typescript
// 기본 Transition
const transitions = {
  default: "transition-all duration-200",
  fast: "transition-all duration-150",
  slow: "transition-all duration-300",
};

// Hover 효과
const hoverEffects = {
  lift: "hover:-translate-y-0.5 hover:shadow-md transition-all",
  scale: "hover:scale-105 transition-transform",
  glow: "hover:shadow-lg hover:shadow-primary-500/20 transition-shadow",
};
```

### 8-2. Animation 클래스

```typescript
// Pulse (Live Badge)
className="animate-pulse"

// Spin (Loading)
className="animate-spin"

// Fade In
className="animate-fade-in"
```

---

## 9️⃣ 모바일 최적화

### 9-1. 반응형 그리드

```typescript
// 기본: 모바일 1열, 태블릿 2열, 데스크탑 3열
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"

// Stats Cards: 모바일 2열, 데스크탑 4열
className="grid grid-cols-2 md:grid-cols-4 gap-4"
```

### 9-2. 모바일 터치 최적화

```typescript
// 최소 터치 영역: 44x44px
className="min-h-[44px] min-w-[44px]"

// 터치 피드백 제거 (Android)
className="touch-none"
```

### 9-3. 모바일 네비게이션

```typescript
// 모바일: 햄버거 메뉴
// 데스크탑: 사이드바
className="hidden md:block" // 데스크탑만
className="md:hidden"       // 모바일만
```

---

## 🔟 실제 구현 코드

### 10-1. 플랫폼 컴포넌트: MatchCard

**파일**: `src/components/platform/MatchCard.tsx`

```typescript
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Calendar, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { Match } from "@/types/match";

interface MatchCardProps {
  match: Match;
  associationSlug: string;
}

export function MatchCard({ match, associationSlug }: MatchCardProps) {
  return (
    <Link to={`/a/${associationSlug}/matches/${match.id}`}>
      <Card hover interactive>
        <CardContent padding="md">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-slate-500">
              {match.tournamentName}
            </div>
            <StatusBadge status={match.status} />
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 mb-4">
            <div className="text-right">
              <div className="font-semibold text-slate-900">
                {match.homeTeamName}
              </div>
            </div>
            <div className="text-center">
              {match.status === "completed" && match.homeScore !== undefined ? (
                <div className="text-2xl font-bold text-slate-900">
                  {match.homeScore} : {match.awayScore}
                </div>
              ) : (
                <div className="text-lg font-semibold text-slate-400">VS</div>
              )}
            </div>
            <div className="text-left">
              <div className="font-semibold text-slate-900">
                {match.awayTeamName}
              </div>
            </div>
          </div>

          <div className="space-y-1 text-xs text-slate-500">
            {match.date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                {format(match.date.toDate(), "yyyy년 MM월 dd일", { locale: ko })}
              </div>
            )}
            {match.time && (
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3" />
                {match.time}
              </div>
            )}
            {match.venueName && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3 w-3" />
                {match.venueName}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
```

---

### 10-2. 플랫폼 컴포넌트: TeamCard

**파일**: `src/components/platform/TeamCard.tsx`

```typescript
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin } from "lucide-react";
import type { Team } from "@/types/team";

interface TeamCardProps {
  team: Team;
  associationSlug: string;
}

export function TeamCard({ team, associationSlug }: TeamCardProps) {
  return (
    <Link to={`/a/${associationSlug}/teams/${team.id}`}>
      <Card hover interactive>
        <CardContent padding="md">
          <div className="flex items-start gap-4">
            <Avatar
              src={team.logoUrl}
              alt={team.name}
              name={team.name}
              size="lg"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-slate-900 truncate">
                  {team.name}
                </h3>
                {team.membership === "member" && (
                  <Badge variant="success" size="sm">
                    정회원
                  </Badge>
                )}
              </div>
              <div className="space-y-1 text-sm text-slate-600">
                {team.region && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {team.region}
                  </div>
                )}
                {team.memberCount !== undefined && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {team.memberCount}명
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
```

---

### 10-3. 플랫폼 컴포넌트: PlayerCard

**파일**: `src/components/platform/PlayerCard.tsx`

```typescript
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Users, Target } from "lucide-react";
import type { Player } from "@/types/player";

interface PlayerCardProps {
  player: Player;
  associationSlug: string;
}

export function PlayerCard({ player, associationSlug }: PlayerCardProps) {
  return (
    <Link to={`/a/${associationSlug}/players/${player.id}`}>
      <Card hover interactive>
        <CardContent padding="md">
          <div className="flex items-center gap-4">
            <Avatar
              src={player.photoUrl}
              alt={player.name}
              name={player.name}
              size="lg"
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                {player.name}
                {player.jerseyNumber && (
                  <span className="ml-2 text-sm text-slate-500">
                    #{player.jerseyNumber}
                  </span>
                )}
              </h3>
              <div className="space-y-1 text-sm text-slate-600">
                {player.teamName && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {player.teamName}
                  </div>
                )}
                {player.position && (
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    {player.position}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
```

---

### 10-4. 컴포넌트 폴더 구조

```
src/components/
├─ ui/                          # 기본 UI 컴포넌트
│  ├─ button.tsx
│  ├─ card.tsx
│  ├─ badge.tsx
│  ├─ avatar.tsx
│  ├─ input.tsx
│  ├─ select.tsx
│  ├─ textarea.tsx
│  ├─ tabs.tsx
│  ├─ dialog.tsx
│  ├─ dropdown-menu.tsx
│  ├─ StatusBadge.tsx
│  ├─ Typography.tsx
│  ├─ EmptyState.tsx
│  └─ LoadingSpinner.tsx
├─ layout/                      # 레이아웃 컴포넌트
│  ├─ Container.tsx
│  ├─ Section.tsx
│  └─ PageContainer.tsx
├─ platform/                    # 플랫폼 특화 컴포넌트
│  ├─ MatchCard.tsx
│  ├─ TeamCard.tsx
│  ├─ PlayerCard.tsx
│  ├─ ActivityCard.tsx
│  └─ TimelineItem.tsx
├─ admin/                       # Admin 컴포넌트
│  ├─ AdminSidebar.tsx
│  ├─ AdminHeader.tsx
│  ├─ StatCard.tsx
│  ├─ TeamApprovalRow.tsx
│  └─ PlayerApprovalRow.tsx
└─ match/                       # Match 컴포넌트
   ├─ MatchHeader.tsx
   ├─ MatchTabs.tsx
   ├─ LiveTimeline.tsx
   └─ EventRecordingPanel.tsx
```

---

### 10-5. 디자인 토큰 파일

**파일**: `src/styles/design-tokens.ts`

```typescript
/**
 * 디자인 토큰 (Design Tokens)
 * 모든 디자인 값의 단일 소스
 */

export const designTokens = {
  colors: {
    primary: {
      50: "#EFF6FF",
      100: "#DBEAFE",
      500: "#0F3D75",
      600: "#0D3563",
    },
    accent: {
      50: "#F0FDF4",
      100: "#DCFCE7",
      500: "#16A34A",
      600: "#15803D",
    },
    text: {
      primary: "#0F172A",
      secondary: "#64748B",
      muted: "#94A3B8",
    },
    status: {
      success: "#16A34A",
      warning: "#F59E0B",
      danger: "#EF4444",
      info: "#3B82F6",
      live: "#EF4444",
    },
  },
  
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    "2xl": "48px",
    "3xl": "64px",
  },
  
  borderRadius: {
    sm: "0.5rem",
    md: "0.75rem",
    lg: "1rem",
    xl: "1.5rem",
    "2xl": "2rem",
    full: "9999px",
  },
  
  shadows: {
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
  },
  
  typography: {
    fontFamily: {
      sans: ["Inter", "Noto Sans KR", "sans-serif"],
    },
    fontSize: {
      xs: "12px",
      sm: "14px",
      base: "16px",
      lg: "18px",
      xl: "20px",
      "2xl": "24px",
      "3xl": "30px",
      "4xl": "36px",
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
  },
  
  breakpoints: {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1536px",
  },
};
```

---

## ✅ 구현 체크리스트

### Phase 1: Foundation (기초)
- [ ] Tailwind Config 설정
- [ ] CSS 변수 설정
- [ ] Typography 시스템 구현
- [ ] Spacing 시스템 정의

### Phase 2: 기본 컴포넌트
- [ ] Button 컴포넌트 확장
- [ ] Card 컴포넌트 확장
- [ ] Badge 컴포넌트 확장
- [ ] Avatar 컴포넌트 구현
- [ ] StatusBadge 컴포넌트 구현

### Phase 3: Layout 컴포넌트
- [ ] Container 컴포넌트 구현
- [ ] Section 컴포넌트 구현
- [ ] SectionHeader 컴포넌트 구현

### Phase 4: 플랫폼 컴포넌트
- [ ] MatchCard 컴포넌트 구현
- [ ] TeamCard 컴포넌트 구현
- [ ] PlayerCard 컴포넌트 구현
- [ ] ActivityCard 컴포넌트 구현

---

## 📚 디자인 시스템 사용 가이드

### 컬러 사용

```typescript
// Primary
className="bg-primary-500 text-white"

// Accent
className="bg-accent-500 text-white"

// Status
className="bg-success text-white"
className="bg-warning text-white"
className="bg-danger text-white"
```

### Spacing 사용

```typescript
// Padding
className="p-4"  // 16px
className="p-6"  // 24px

// Gap
className="gap-4"  // 16px
className="gap-6"  // 24px
```

### Typography 사용

```typescript
// Heading
<Typography variant="h1">제목</Typography>
<Typography variant="h2">부제목</Typography>

// Body
<Typography variant="body">본문</Typography>
<Typography variant="bodySmall">작은 본문</Typography>
```

### 컴포넌트 사용

```typescript
// Button
<Button variant="default" size="lg">버튼</Button>
<Button variant="accent" icon={<Trophy />}>버튼</Button>

// Card
<Card hover interactive>
  <CardContent>
    내용
  </CardContent>
</Card>

// Badge
<Badge variant="success">승인됨</Badge>
<StatusBadge status="live" />
```

---

**작성일**: 2024년  
**상태**: ✅ 설계 완료 (개발 시작 가능)
