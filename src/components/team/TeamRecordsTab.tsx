/**
 * 🔥 기록 탭 컴포넌트
 * 
 * 추후 구현 예정
 */

interface TeamRecordsTabProps {
  teamId: string;
}

export function TeamRecordsTab({ teamId }: TeamRecordsTabProps) {
  return (
    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
      <p className="text-gray-600">경기 기록 기능은 추후 구현 예정입니다</p>
    </div>
  );
}
