# 🎨 YAGO VIBE SPORTS - UI Design System

> **작성일**: 2024년  
> **목적**: UI가 완전히 통일된 플랫폼 - 컬러, 타이포그래피, 컴포넌트 스타일

---

## 📋 목차

1. [컬러 시스템](#1-컬러-시스템)
2. [타이포그래피](#2-타이포그래피)
3. [컴포넌트 스타일](#3-컴포넌트-스타일)
4. [카드 디자인](#4-카드-디자인)
5. [대시보드 디자인](#5-대시보드-디자인)
6. [Tailwind Config](#6-tailwind-config)

---

## 1️⃣ 컬러 시스템

### 기본 컬러 팔레트

```typescript
// tailwind.config.ts
const colors = {
  // Primary (협회 브랜드 컬러)
  primary: {
    50: "#f0f9ff",
    100: "#e0f2fe",
    200: "#bae6fd",
    300: "#7dd3fc",
    400: "#38bdf8",
    500: "#0ea5e9",  // Main
    600: "#0284c7",
    700: "#0369a1",
    800: "#075985",
    900: "#0c4a6e",
  },
  
  // Secondary (액센트)
  secondary: {
    50: "#f0fdf4",
    100: "#dcfce7",
    200: "#bbf7d0",
    300: "#86efac",
    400: "#4ade80",
    500: "#22c55e",  // Main
    600: "#16a34a",
    700: "#15803d",
    800: "#166534",
    900: "#14532d",
  },
  
  // Neutral (그레이스케일)
  gray: {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
  },
  
  // Status Colors
  success: {
    50: "#f0fdf4",
    500: "#22c55e",
    600: "#16a34a",
  },
  warning: {
    50: "#fffbeb",
    500: "#f59e0b",
    600: "#d97706",
  },
  error: {
    50: "#fef2f2",
    500: "#ef4444",
    600: "#dc2626",
  },
  info: {
    50: "#eff6ff",
    500: "#3b82f6",
    600: "#2563eb",
  },
};
```

### 협회별 커스텀 컬러

```typescript
// 협회는 primaryColor, secondaryColor를 가짐
// 동적으로 CSS 변수로 적용
:root {
  --federation-primary: #0F172A;
  --federation-secondary: #16A34A;
}
```

---

## 2️⃣ 타이포그래피

### 폰트 시스템

```typescript
// tailwind.config.ts
const fontFamily = {
  sans: ["Inter", "system-ui", "sans-serif"],
  heading: ["Inter", "system-ui", "sans-serif"],
  mono: ["Fira Code", "monospace"],
};

const fontSize = {
  xs: ["0.75rem", { lineHeight: "1rem" }],
  sm: ["0.875rem", { lineHeight: "1.25rem" }],
  base: ["1rem", { lineHeight: "1.5rem" }],
  lg: ["1.125rem", { lineHeight: "1.75rem" }],
  xl: ["1.25rem", { lineHeight: "1.75rem" }],
  "2xl": ["1.5rem", { lineHeight: "2rem" }],
  "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
  "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
  "5xl": ["3rem", { lineHeight: "1" }],
};
```

### 타이포그래피 스타일

```typescript
// Typography classes
const typography = {
  h1: "text-4xl font-bold text-gray-900",
  h2: "text-3xl font-bold text-gray-900",
  h3: "text-2xl font-semibold text-gray-900",
  h4: "text-xl font-semibold text-gray-900",
  body: "text-base text-gray-700",
  caption: "text-sm text-gray-500",
  label: "text-sm font-medium text-gray-700",
};
```

---

## 3️⃣ 컴포넌트 스타일

### 3.1 Button

```typescript
// components/shared/Button.tsx
import { cn } from "@/lib/utils/cn";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const buttonVariants = {
  default: "bg-primary-600 text-white hover:bg-primary-700",
  outline: "border border-gray-300 bg-white hover:bg-gray-50",
  ghost: "hover:bg-gray-100",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const buttonSizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
};

export function Button({
  variant = "default",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "rounded-lg font-medium transition-colors",
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      {...props}
    />
  );
}
```

### 3.2 Card

```typescript
// components/shared/Card.tsx
import { cn } from "@/lib/utils/cn";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className, hover = false }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-lg shadow-sm border border-gray-200 p-6",
        hover && "hover:shadow-md transition-shadow",
        className
      )}
    >
      {children}
    </div>
  );
}
```

### 3.3 Input

```typescript
// components/shared/Input.tsx
import { cn } from "@/lib/utils/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export function Input({ className, error, ...props }: InputProps) {
  return (
    <div>
      <input
        className={cn(
          "w-full px-4 py-2 border rounded-lg",
          "focus:outline-none focus:ring-2 focus:ring-primary-500",
          error ? "border-red-500" : "border-gray-300",
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
```

---

## 4️⃣ 카드 디자인

### 4.1 StatCard

```typescript
// components/shared/StatCard.tsx
import { Card } from "./Card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatCard({ title, value, icon, trend }: StatCardProps) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
          {trend && (
            <div className="flex items-center mt-2">
              {trend.isPositive ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span
                className={`text-sm ml-1 ${
                  trend.isPositive ? "text-green-600" : "text-red-600"
                }`}
              >
                {trend.isPositive ? "+" : ""}{trend.value}%
              </span>
            </div>
          )}
        </div>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
    </Card>
  );
}
```

### 4.2 MatchCard

```typescript
// components/matches/MatchCard.tsx
import { Card } from "@/components/shared/Card";
import { Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface MatchCardProps {
  match: {
    id: string;
    matchDate: Date;
    matchTime: string;
    venue: string;
    homeTeamName: string;
    awayTeamName: string;
    homeScore?: number;
    awayScore?: number;
    status: string;
  };
  onClick?: () => void;
}

export function MatchCard({ match, onClick }: MatchCardProps) {
  return (
    <Card hover={!!onClick} className={onClick ? "cursor-pointer" : ""} onClick={onClick}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Calendar className="w-4 h-4" />
            <span>
              {format(match.matchDate, "M월 d일 (E)", { locale: ko })}
            </span>
            <span>{match.matchTime}</span>
            <MapPin className="w-4 h-4 ml-2" />
            <span>{match.venue}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1 text-right">
              <p className="font-semibold text-gray-900">{match.homeTeamName}</p>
            </div>
            <div className="text-center">
              {match.status === "completed" ? (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{match.homeScore}</span>
                  <span className="text-gray-400">:</span>
                  <span className="text-2xl font-bold">{match.awayScore}</span>
                </div>
              ) : (
                <span className="text-gray-400">VS</span>
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-gray-900">{match.awayTeamName}</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
```

### 4.3 TournamentCard

```typescript
// components/tournaments/TournamentCard.tsx
import { Card } from "@/components/shared/Card";
import { Trophy, Calendar, Users } from "lucide-react";
import { format } from "date-fns";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface TournamentCardProps {
  tournament: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    teamCount: number;
    status: string;
    format?: string;
  };
  onClick?: () => void;
}

export function TournamentCard({ tournament, onClick }: TournamentCardProps) {
  return (
    <Card hover={!!onClick} className={onClick ? "cursor-pointer" : ""} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">{tournament.name}</h3>
          </div>
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>
                {format(tournament.startDate, "M월 d일")} - {format(tournament.endDate, "M월 d일")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{tournament.teamCount}팀 참가</span>
            </div>
            {tournament.format && (
              <span className="text-xs text-gray-500">{tournament.format}</span>
            )}
          </div>
        </div>
        <StatusBadge status={tournament.status} />
      </div>
    </Card>
  );
}
```

---

## 5️⃣ 대시보드 디자인

### 5.1 Admin Dashboard 스타일

```typescript
// 대시보드 레이아웃
const dashboardStyle = {
  sidebar: {
    width: "16rem", // 256px
    bg: "bg-white",
    border: "border-r border-gray-200",
  },
  main: {
    padding: "p-6",
    bg: "bg-gray-50",
  },
  card: {
    bg: "bg-white",
    rounded: "rounded-lg",
    shadow: "shadow-sm",
    padding: "p-6",
  },
};
```

### 5.2 KPI Cards Grid

```typescript
// KPI Cards 레이아웃
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  <StatCard title="활성 리그" value={3} icon={<Trophy />} />
  <StatCard title="등록 팀" value={24} icon={<Users />} />
  <StatCard title="오늘 경기" value={6} icon={<Calendar />} />
  <StatCard title="승인 대기" value={3} icon={<Clock />} />
</div>
```

### 5.3 DataTable 스타일

```typescript
// DataTable 스타일
const tableStyle = {
  header: "bg-gray-50 border-b border-gray-200",
  headerCell: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase",
  body: "bg-white divide-y divide-gray-200",
  bodyCell: "px-6 py-4 whitespace-nowrap text-sm text-gray-900",
  rowHover: "hover:bg-gray-50",
};
```

---

## 6️⃣ Tailwind Config

### 완전한 Tailwind 설정

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
        },
        secondary: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
        },
        success: {
          50: "#f0fdf4",
          500: "#22c55e",
          600: "#16a34a",
        },
        warning: {
          50: "#fffbeb",
          500: "#f59e0b",
          600: "#d97706",
        },
        error: {
          50: "#fef2f2",
          500: "#ef4444",
          600: "#dc2626",
        },
        info: {
          50: "#eff6ff",
          500: "#3b82f6",
          600: "#2563eb",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        heading: ["Inter", "system-ui", "sans-serif"],
      },
      spacing: {
        "18": "4.5rem",
        "88": "22rem",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        "soft": "0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## ✅ UI Design System 완료

### 완성된 디자인 시스템

- ✅ 컬러 시스템 (Primary, Secondary, Status)
- ✅ 타이포그래피 (폰트, 크기, 스타일)
- ✅ 컴포넌트 스타일 (Button, Card, Input)
- ✅ 카드 디자인 (StatCard, MatchCard, TournamentCard)
- ✅ 대시보드 디자인 (레이아웃, 스타일)
- ✅ Tailwind Config (완전한 설정)

### 사용 방법

```typescript
// 모든 컴포넌트에서 일관된 스타일 사용
<Button variant="default" size="md">버튼</Button>
<Card hover>카드 내용</Card>
<StatCard title="제목" value={100} />
```

---

**작성일**: 2024년  
**상태**: ✅ YAGO UI Design System 완료
