/**
 * 🎨 StatusHeader 컴포넌트
 * 
 * Figma: StatusHeader (Variant: Idle / Navigating / Upcoming / Arrived)
 * 상단 상태 표시 영역 (OS 관점)
 */

type StatusHeaderVariant = "idle" | "navigating" | "upcoming" | "arrived";

interface StatusHeaderProps {
  variant: StatusHeaderVariant;
  title: string;
  subtitle?: string;
}

export function StatusHeader({ variant, title, subtitle }: StatusHeaderProps) {
  const bgClass = {
    idle: "bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200",
    navigating: "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200",
    upcoming: "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200",
    arrived: "bg-gradient-to-r from-green-50 to-green-100 border-green-200",
  }[variant];

  return (
    <section className="mb-4">
      <div className={`rounded-xl border px-4 py-3 ${bgClass}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">{title}</p>
            {subtitle && (
              <p className="text-xs text-gray-600 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
