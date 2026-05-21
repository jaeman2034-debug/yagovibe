/**
 * 참가비 상태 표시 컴포넌트
 * 
 * Public/Member 화면:
 * - 참가비: 납부 완료 / 확인 중
 */

interface FeeStatusDisplayProps {
  feeAmount?: number;
  feeConfirmed: boolean;
}

export function FeeStatusDisplay({ feeAmount, feeConfirmed }: FeeStatusDisplayProps) {
  if (!feeAmount) {
    return <span className="text-sm text-gray-600">참가비 없음</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">
        참가비: {feeAmount.toLocaleString()}원
      </span>
      <span className={`text-sm ${feeConfirmed ? "text-green-600" : "text-yellow-600"}`}>
        {feeConfirmed ? "납부 완료" : "확인 중"}
      </span>
    </div>
  );
}

