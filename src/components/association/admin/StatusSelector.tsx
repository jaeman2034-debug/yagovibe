/**
 * 상태 선택 컴포넌트 (Admin)
 * 
 * 의사결정 최소화를 위한 간단한 선택기
 */

interface StatusSelectorProps {
  value: "draft" | "scheduled" | "published";
  onChange: (value: "draft" | "scheduled" | "published") => void;
  publishType?: "now" | "scheduled";
  onPublishTypeChange?: (value: "now" | "scheduled") => void;
}

export function StatusSelector({
  value,
  onChange,
  publishType,
  onPublishTypeChange,
}: StatusSelectorProps) {
  if (value === "draft") {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          게시 방식
        </label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as "draft" | "scheduled" | "published")}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="draft">임시 저장</option>
          <option value="scheduled">예약 게시</option>
          <option value="published">즉시 게시</option>
        </select>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        게시 방식
      </label>
      <div className="flex gap-4">
        <label className="flex items-center">
          <input
            type="radio"
            value="now"
            checked={publishType === "now"}
            onChange={(e) => onPublishTypeChange?.(e.target.value as "now" | "scheduled")}
            className="mr-2"
          />
          <span className="text-sm">즉시 게시</span>
        </label>
        <label className="flex items-center">
          <input
            type="radio"
            value="scheduled"
            checked={publishType === "scheduled"}
            onChange={(e) => onPublishTypeChange?.(e.target.value as "now" | "scheduled")}
            className="mr-2"
          />
          <span className="text-sm">예약 게시</span>
        </label>
      </div>
    </div>
  );
}

