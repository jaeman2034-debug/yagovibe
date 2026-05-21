/**
 * Dropdown Menu 컴포넌트
 *
 * `portal`: true면 메뉴를 document.body에 렌더 — 부모 overflow:hidden 에 잘리지 않음
 */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
  useMemo,
  createContext,
  useContext,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "./button";

const DropdownMenuCloseContext = createContext<(() => void) | null>(null);

function mergeRefs<T>(...refs: (React.Ref<T> | null | undefined)[]) {
  return (value: T | null) => {
    refs.forEach((ref) => {
      if (ref == null) return;
      if (typeof ref === "function") (ref as (v: T | null) => void)(value);
      else (ref as React.MutableRefObject<T | null>).current = value;
    });
  };
}

function menuWidthFromClassName(className?: string): number {
  if (!className) return 224;
  if (/\bw-72\b/.test(className)) return 288;
  if (/\bw-64\b/.test(className)) return 256;
  if (/\bw-56\b/.test(className)) return 224;
  if (/\bw-48\b/.test(className)) return 192;
  if (/\bw-40\b/.test(className)) return 160;
  return 224;
}

interface DropdownMenuContentProps {
  children: React.ReactNode;
  open?: boolean;
  className?: string;
  align?: "start" | "end";
}

interface DropdownMenuProps {
  children: React.ReactNode;
  /** true면 본문을 body 포털 + fixed 배치 (카드 overflow 회피) */
  portal?: boolean;
  /** 제어 모드 */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DropdownMenu({ children, portal = false, open: openControlled, onOpenChange }: DropdownMenuProps) {
  const [openUncontrolled, setOpenUncontrolled] = useState(false);
  const isControlled = openControlled !== undefined;
  const open = isControlled ? Boolean(openControlled) : openUncontrolled;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setOpenUncontrolled(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  const toggleOpen = useCallback(() => {
    setOpen(!open);
  }, [open, setOpen]);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const contentPanelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 224 });

  const childrenArr = useMemo(() => React.Children.toArray(children), [children]);
  const contentChild = useMemo(() => {
    const found = childrenArr.find(
      (c): c is React.ReactElement<DropdownMenuContentProps> =>
        React.isValidElement(c) && c.type === DropdownMenuContent
    );
    return found;
  }, [childrenArr]);

  const contentAlign = contentChild?.props.align ?? "start";
  const contentClassName = contentChild?.props.className;

  const updateCoords = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const w = menuWidthFromClassName(contentClassName);
    let left = contentAlign === "end" ? r.right - w : r.left;
    const margin = 8;
    left = Math.max(margin, Math.min(left, window.innerWidth - w - margin));
    const top = r.bottom + margin;
    setCoords({ top, left, width: w });
  }, [contentAlign, contentClassName]);

  useLayoutEffect(() => {
    if (!open || !portal) return;
    updateCoords();
    const onWin = () => updateCoords();
    window.addEventListener("scroll", onWin, true);
    window.addEventListener("resize", onWin);
    return () => {
      window.removeEventListener("scroll", onWin, true);
      window.removeEventListener("resize", onWin);
    };
  }, [open, portal, updateCoords]);

  const closeMenu = useCallback(() => setOpen(false), [setOpen]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      const t = event.target as Node;
      if (wrapperRef.current?.contains(t)) return;
      if (contentPanelRef.current?.contains(t)) return;
      closeMenu();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, closeMenu]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeMenu();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closeMenu]);

  const portalZ = "z-[100050]";

  return (
    <DropdownMenuCloseContext.Provider value={closeMenu}>
      <div ref={wrapperRef} className={portal ? "inline-block" : "relative inline-block"}>
        {childrenArr.map((child) => {
          if (!React.isValidElement(child)) return null;
          if (child.type === DropdownMenuTrigger) {
            const anchorSetter = (node: HTMLElement | null) => {
              anchorRef.current = node;
            };
            return React.cloneElement(child as React.ReactElement<DropdownMenuTriggerProps>, {
              onClick: (e: React.MouseEvent) => {
                e.stopPropagation();
                (child.props as DropdownMenuTriggerProps).onClick?.(e as React.MouseEvent<HTMLElement>);
                toggleOpen();
              },
              open,
              ...(portal ? { ref: anchorSetter } : {}),
            });
          }
          if (child.type === DropdownMenuContent) {
            if (!open) return null;
            if (portal) return null;
            return React.cloneElement(child, { open });
          }
          return null;
        })}
      </div>
      {portal && open && contentChild && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={contentPanelRef}
              role="menu"
              className={clsx(
                portalZ,
                "fixed max-h-[min(70dvh,calc(100vh-16px))] overflow-y-auto rounded-md border bg-white shadow-lg",
                contentClassName
              )}
              style={{
                top: coords.top,
                left: coords.left,
                width: coords.width,
                minWidth: coords.width,
              }}
            >
              <div className="p-1">{contentChild.props.children}</div>
            </div>,
            document.body
          )
        : null}
    </DropdownMenuCloseContext.Provider>
  );
}

interface DropdownMenuTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
  onClick?: React.MouseEventHandler<HTMLElement>;
  open?: boolean;
}

export const DropdownMenuTrigger = React.forwardRef<HTMLElement, DropdownMenuTriggerProps>(
  function DropdownMenuTrigger({ children, asChild, onClick, open }, ref) {
    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{
        ref?: React.Ref<HTMLElement>;
        onClick?: React.MouseEventHandler<HTMLElement>;
      }>;
      return React.cloneElement(child, {
        ref: mergeRefs(child.ref, ref),
        onClick: (e: React.MouseEvent<HTMLElement>) => {
          child.props.onClick?.(e);
          onClick?.(e);
        },
        className: `${child.props.className || ""} ${open ? "open" : ""}`,
      });
    }

    return (
      <Button variant="outline" onClick={onClick} className="flex items-center gap-2">
        {children}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>
    );
  }
);
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

export function DropdownMenuContent({
  children,
  open,
  className,
  align = "start",
}: DropdownMenuContentProps) {
  if (!open) return null;

  return (
    <div
      className={clsx(
        "absolute z-50 mt-2 w-56 rounded-md border bg-white shadow-lg",
        align === "end" && "left-auto right-0",
        className
      )}
    >
      <div className="p-1">{children}</div>
    </div>
  );
}

interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  /** false면 항목 클릭 후에도 메뉴를 열어둠 */
  closeOnSelect?: boolean;
  className?: string;
}

export function DropdownMenuItem({
  children,
  onClick,
  closeOnSelect = true,
  className,
  disabled,
  ...rest
}: DropdownMenuItemProps) {
  const closeMenu = useContext(DropdownMenuCloseContext);

  return (
    <button
      {...rest}
      type="button"
      disabled={disabled}
      onClick={(e) => {
        if (disabled) return;
        onClick?.(e);
        if (closeOnSelect) closeMenu?.();
      }}
      className={clsx(
        "w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-gray-100 transition-colors disabled:pointer-events-none disabled:opacity-50",
        className
      )}
    >
      {children}
    </button>
  );
}
