/**
 * 🔥 파트너 대시보드 컴포넌트 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 파트너 등록
 * - API 키 관리
 * - 수익 현황
 * - 웹훅 설정
 */

import { useState, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Key, TrendingUp, Webhook, Copy } from "lucide-react";

export default function PartnerDashboard() {
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiSecret, setApiSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revenue, setRevenue] = useState(0);
  const [callCount, setCallCount] = useState(0);

  const handleRegister = async () => {
    setLoading(true);
    setError(null);

    try {
      const registerPartner = httpsCallable(functions, "registerPartnerCallable");
      const result = await registerPartner({
        name: "내 상점",
        type: "STORE",
        scopes: ["WRITE_ITEM", "READ_TRADE", "WEBHOOK"],
        webhookUrl: "",
      });

      const data = result.data as {
        success: boolean;
        partnerId: string;
        apiKey: string;
        apiSecret: string;
      };

      if (data.success) {
        setPartnerId(data.partnerId);
        setApiKey(data.apiKey);
        setApiSecret(data.apiSecret);
      }
    } catch (err: any) {
      console.error("❌ [PartnerDashboard] 파트너 등록 실패:", err);
      setError(err.message || "파트너 등록 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("복사되었습니다!");
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">파트너 대시보드</h1>

      {!partnerId ? (
        <div className="p-6 bg-white rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">파트너 등록</h2>
          <p className="text-sm text-gray-600 mb-4">
            API를 통해 매물을 등록하고 거래를 관리할 수 있습니다.
          </p>
          <Button onClick={handleRegister} disabled={loading}>
            {loading ? "등록 중..." : "파트너 등록하기"}
          </Button>
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* 🔥 API 키 정보 */}
          <div className="p-6 bg-white rounded-lg border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Key className="w-5 h-5" />
              API 키
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">API Key</label>
                <div className="flex items-center gap-2 mt-1">
                  <Input value={apiKey || ""} readOnly className="font-mono text-sm" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => apiKey && handleCopy(apiKey)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">API Secret</label>
                <div className="flex items-center gap-2 mt-1">
                  <Input value={apiSecret || ""} readOnly className="font-mono text-sm" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => apiSecret && handleCopy(apiSecret)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="mt-1 text-xs text-yellow-600">
                  ⚠️ API Secret은 이번에만 표시됩니다. 안전하게 보관하세요.
                </p>
              </div>
            </div>
          </div>

          {/* 🔥 수익 현황 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">총 수익</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {revenue.toLocaleString()}원
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Webhook className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700">API 호출</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {callCount.toLocaleString()}회
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
