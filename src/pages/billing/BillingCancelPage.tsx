/**
 * 🔥 BillingCancelPage - 결제 취소 페이지
 */

import { useSearchParams, useNavigate } from "react-router-dom";
import { X } from "lucide-react";

export default function BillingCancelPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const teamId = searchParams.get("teamId");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <X className="w-10 h-10 text-gray-600 dark:text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          결제가 취소되었습니다
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          언제든지 다시 업그레이드할 수 있습니다.
        </p>
        {teamId && (
          <button
            onClick={() => navigate(`/t/${teamId}/upgrade`)}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold mb-3"
          >
            다시 시도
          </button>
        )}
        {teamId && (
          <button
            onClick={() => navigate(`/t/${teamId}`)}
            className="w-full py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            대시보드로 이동
          </button>
        )}
      </div>
    </div>
  );
}
