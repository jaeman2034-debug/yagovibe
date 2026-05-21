/**
 * 🔥 납부 계좌 안내 카드
 */

import { Card, CardContent } from "@/components/ui/card";
import { Building2 } from "lucide-react";

interface PaymentInfo {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  memoFormat?: string;
  notes?: string;
}

interface PaymentInfoCardProps {
  paymentInfo: PaymentInfo;
}

/**
 * 납부 계좌 안내 카드 컴포넌트
 */
export function PaymentInfoCard({ paymentInfo }: PaymentInfoCardProps) {
  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600" />
          <div className="font-semibold text-blue-900">🏦 납부 계좌 안내</div>
        </div>
        <div className="text-sm space-y-1">
          <div className="text-gray-700">
            은행: <span className="font-medium">{paymentInfo.bankName}</span>
          </div>
          <div className="text-gray-700">
            계좌: <span className="font-medium">{paymentInfo.accountNumber}</span>
          </div>
          <div className="text-gray-700">
            예금주: <span className="font-medium">{paymentInfo.accountHolder}</span>
          </div>
          {paymentInfo.memoFormat && (
            <div className="text-gray-700">
              입금자명: <span className="font-medium">{paymentInfo.memoFormat}</span>
            </div>
          )}
          {paymentInfo.notes && (
            <div className="text-xs text-gray-600 mt-2 pt-2 border-t border-blue-200">
              {paymentInfo.notes}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

