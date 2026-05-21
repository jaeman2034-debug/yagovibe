/**
 * 회원 회비 상태 컴포넌트
 * 
 * 전화 차단 원칙:
 * - 회비 상태 명확히 표시
 * - 미납 시 대회 참가 차단
 */

import { MembershipFee } from "@/types/fee";

interface MemberFeeStatusProps {
  fees: MembershipFee[];
}

export function MemberFeeStatus({ fees }: MemberFeeStatusProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getFeeTypeLabel = (type: string) => {
    switch (type) {
      case "annual":
        return "연회비";
      case "monthly":
        return "월회비";
      case "temporary":
        return "임시회비";
      case "donation":
        return "기부금";
      default:
        return type;
    }
  };

  const unpaidFees = fees.filter((fee) => fee.status === "unpaid");
  const paidFees = fees.filter((fee) => fee.status === "paid");

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">내 회비 상태</h3>
      
      {/* 납부 완료 */}
      {paidFees.length > 0 && (
        <div className="space-y-2">
          {paidFees.map((fee) => (
            <div
              key={fee.id}
              className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3"
            >
              <div>
                <span className="font-medium text-gray-900">
                  {getFeeTypeLabel(fee.type)}
                </span>
                <span className="ml-2 text-sm text-gray-600">
                  {fee.amount.toLocaleString()}원
                </span>
              </div>
              <span className="text-green-700 font-medium">✔ 납부 완료</span>
            </div>
          ))}
        </div>
      )}

      {/* 미납 */}
      {unpaidFees.length > 0 && (
        <div className="space-y-2">
          {unpaidFees.map((fee) => (
            <div
              key={fee.id}
              className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg p-3"
            >
              <div>
                <span className="font-medium text-gray-900">
                  {getFeeTypeLabel(fee.type)}
                </span>
                <span className="ml-2 text-sm text-gray-600">
                  {fee.amount.toLocaleString()}원
                </span>
                <div className="text-sm text-gray-500 mt-1">
                  기한: {formatDate(fee.dueDate.toDate())}
                </div>
              </div>
              <span className="text-red-700 font-medium">✖ 미납</span>
            </div>
          ))}
        </div>
      )}

      {fees.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          등록된 회비 정보가 없습니다.
        </div>
      )}
    </div>
  );
}

