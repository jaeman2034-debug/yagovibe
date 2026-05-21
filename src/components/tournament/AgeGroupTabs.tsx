/**
 * 🔥 연령대별 탭 컴포넌트
 * 
 * 여러 연령대의 대회를 한 화면에서 관리하기 위한 탭 UI
 */

const AGE_TABS = [
  { key: "20_30", label: "20/30대" },
  { key: "40", label: "40대" },
  { key: "50", label: "50대" },
  { key: "60", label: "60대" },
];

interface AgeGroupTabsProps {
  active: string;
  onChange: (key: string) => void;
}

export function AgeGroupTabs({ active, onChange }: AgeGroupTabsProps) {
  return (
    <div className="flex gap-2 mb-4 border-b border-gray-200">
      {AGE_TABS.map((tab) => (
        <button
          key={tab.key}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
            active === tab.key
              ? "bg-blue-600 text-white border-b-2 border-blue-600"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}


