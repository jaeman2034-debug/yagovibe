/**
 * 공지 KPI 카드 컴포넌트
 * 
 * 원칙:
 * - 대시보드 상단에 표시되는 핵심 지표
 * - 한눈에 운영 상태 파악 가능
 */

interface NoticeKPIProps {
  label: string;
  value: number;
  icon?: string;
  color?: "blue" | "yellow" | "green" | "red" | "gray";
  onClick?: () => void;
}

export function NoticeKPI({ label, value, icon, color = "blue", onClick }: NoticeKPIProps) {
  const colorClasses = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-700",
    green: "bg-green-50 border-green-200 text-green-700",
    red: "bg-red-50 border-red-200 text-red-700",
    gray: "bg-gray-50 border-gray-200 text-gray-700",
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-lg border p-4 ${colorClasses[color]} ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium opacity-80">{label}</div>
          <div className="text-2xl font-bold mt-1">{value.toLocaleString()}</div>
        </div>
        {icon && (
          <div className="text-3xl opacity-60">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

