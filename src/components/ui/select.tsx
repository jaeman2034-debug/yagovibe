/**
 * Select 컴포넌트 (shadcn/ui 스타일)
 */

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export function Select({ value, onValueChange, children, disabled }: SelectProps) {
  const [open, setOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div ref={selectRef} className="relative">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            open,
            setOpen,
            value,
            onValueChange,
            disabled,
          });
        }
        return child;
      })}
    </div>
  );
}

export interface SelectTriggerProps extends React.HTMLAttributes<HTMLButtonElement> {
  open?: boolean;
  setOpen?: (open: boolean) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export function SelectTrigger({
  open,
  setOpen,
  disabled,
  children,
  className,
  ...props
}: SelectTriggerProps) {
  return (
    <button
      type="button"
      onClick={() => !disabled && setOpen?.(!open)}
      disabled={disabled}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  );
}

export interface SelectValueProps {
  placeholder?: string;
  value?: string;
  children?: React.ReactNode;
}

export function SelectValue({ placeholder, value, children }: SelectValueProps) {
  if (children) {
    return <>{children}</>;
  }
  if (value) {
    return <span>{value}</span>;
  }
  return <span className="text-muted-foreground">{placeholder}</span>;
}

export interface SelectContentProps {
  open?: boolean;
  setOpen?: (open: boolean) => void;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

export function SelectContent({
  open,
  setOpen,
  value,
  onValueChange,
  children,
}: SelectContentProps) {
  if (!open) return null;

  return (
    <div className="absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md mt-1 w-full">
      <div className="p-1">
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<any>, {
              value,
              onValueChange: (newValue: string) => {
                onValueChange?.(newValue);
                setOpen?.(false);
              },
            });
          }
          return child;
        })}
      </div>
    </div>
  );
}

export interface SelectItemProps {
  value: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function SelectItem({
  value,
  onValueChange,
  children,
  className,
}: SelectItemProps) {
  return (
    <div
      onClick={() => onValueChange?.(value)}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        className
      )}
    >
      {children}
    </div>
  );
}

