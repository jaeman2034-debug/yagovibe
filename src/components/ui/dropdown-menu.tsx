/**
 * Dropdown Menu 컴포넌트
 * 
 * 간단한 드롭다운 메뉴 구현
 */

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "./button";

interface DropdownMenuProps {
  children: React.ReactNode;
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
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
    <div ref={ref} className="relative inline-block">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (child.type === DropdownMenuTrigger) {
            return React.cloneElement(child as React.ReactElement<any>, {
              onClick: () => setOpen(!open),
              open,
            });
          }
          if (child.type === DropdownMenuContent && open) {
            return React.cloneElement(child as React.ReactElement<any>, {
              open,
            });
          }
        }
        return null;
      })}
    </div>
  );
}

interface DropdownMenuTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
  onClick?: () => void;
  open?: boolean;
}

export function DropdownMenuTrigger({ children, asChild, onClick, open }: DropdownMenuTriggerProps) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick,
      className: `${children.props.className || ""} ${open ? "open" : ""}`,
    });
  }

  return (
    <Button variant="outline" onClick={onClick} className="flex items-center gap-2">
      {children}
      <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
    </Button>
  );
}

interface DropdownMenuContentProps {
  children: React.ReactNode;
  open?: boolean;
}

export function DropdownMenuContent({ children, open }: DropdownMenuContentProps) {
  if (!open) return null;

  return (
    <div className="absolute z-50 mt-2 w-56 rounded-md border bg-white shadow-lg">
      <div className="p-1">{children}</div>
    </div>
  );
}

interface DropdownMenuItemProps {
  children: React.ReactNode;
  onClick?: () => void;
}

export function DropdownMenuItem({ children, onClick }: DropdownMenuItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-gray-100 transition-colors"
    >
      {children}
    </button>
  );
}

