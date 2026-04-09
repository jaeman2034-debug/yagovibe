import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { STADIUM_SUGGESTIONS } from "./stadiumSuggestions";

const CONTROL_BASE =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 disabled:opacity-50";

type StadiumAutocompleteProps = {
  id: string;
  value: string;
  disabled?: boolean;
  placeholder?: string;
  /** 바깥 래퍼 (flex 레이아웃용: `min-w-0 sm:flex-1` 등) */
  className?: string;
  /** input 스타일 */
  inputClassName?: string;
  onValueChange: (next: string) => void;
};

export function StadiumAutocomplete({
  id,
  value,
  disabled,
  placeholder = "구장 검색 · 이름을 입력하세요",
  className = "relative",
  inputClassName,
  onValueChange,
}: StadiumAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    return STADIUM_SUGGESTIONS.filter((s) => s.toLowerCase().includes(q));
  }, [value]);

  const showList = open && value.trim().length > 0 && filtered.length > 0;

  return (
    <div className={className} ref={wrapRef}>
      <Input
        id={id}
        type="text"
        name="stadium"
        role="combobox"
        aria-expanded={showList}
        aria-autocomplete="list"
        autoComplete="off"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => {
          onValueChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className={inputClassName ?? CONTROL_BASE}
      />
      {showList ? (
        <ul
          className="absolute z-[70] mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-md"
          role="listbox"
        >
          {filtered.map((s) => (
            <li key={s} role="option">
              <button
                type="button"
                className="w-full px-3 py-2.5 text-left text-sm text-gray-900 hover:bg-gray-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onValueChange(s);
                  setOpen(false);
                }}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
