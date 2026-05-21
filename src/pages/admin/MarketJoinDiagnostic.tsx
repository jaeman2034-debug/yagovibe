/**
 * 🔥 매칭 참여 시스템 데이터 진단 페이지 (관리자용)
 * 
 * 사용법:
 * 1. /admin/market-join-diagnostic 접속
 * 2. postId 입력 또는 "전체 진단" 클릭
 * 3. 문제 확인 및 자동 수정
 */

import { useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { AlertCircle, CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";

interface DiagnosticResult {
  postId: string;
  issues: string[];
  warnings: string[];
  data: {
    post: any;
    joins: any[];
    actualCount: number;
    expectedCount: number;
    fieldMapping: {
      currentPeople: any;
      people: any;
      joined?: any;
      max?: any;
    };
  };
  fixes: string[];
  fixed: boolean;
}

export default function MarketJoinDiagnostic() {
  const { user } = useAuth();
  const [postId, setPostId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [allResults, setAllResults] = useState<any>(null);
  const [fixing, setFixing] = useState(false);

  // 🔥 단일 게시글 진단
  const handleDiagnose = async () => {
    if (!postId.trim()) {
      alert("postId를 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const diagnoseFn = httpsCallable(functions, "diagnoseMarketJoinData");
      const response = await diagnoseFn({ postId: postId.trim() });
      setResult(response.data as DiagnosticResult);
    } catch (error: any) {
      console.error("❌ 진단 실패:", error);
      alert(`진단 실패: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 전체 게시글 진단
  const handleDiagnoseAll = async () => {
    if (!confirm("전체 게시글을 진단하시겠습니까? (시간이 걸릴 수 있습니다)")) {
      return;
    }

    setLoading(true);
    try {
      const diagnoseAllFn = httpsCallable(functions, "diagnoseAllMarketPosts");
      const response = await diagnoseAllFn({});
      setAllResults(response.data);
    } catch (error: any) {
      console.error("❌ 전체 진단 실패:", error);
      alert(`전체 진단 실패: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 자동 수정
  const handleFix = async () => {
    if (!result || !result.postId) {
      alert("진단 결과가 없습니다.");
      return;
    }

    if (!confirm("데이터를 자동 수정하시겠습니까?")) {
      return;
    }

    setFixing(true);
    try {
      const fixFn = httpsCallable(functions, "fixMarketJoinData");
      const response = await fixFn({
        postId: result.postId,
        autoFix: true,
      });
      alert("수정 완료!");
      // 재진단
      await handleDiagnose();
    } catch (error: any) {
      console.error("❌ 수정 실패:", error);
      alert(`수정 실패: ${error.message}`);
    } finally {
      setFixing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">매칭 참여 시스템 데이터 진단</h1>

        {/* 입력 영역 */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              value={postId}
              onChange={(e) => setPostId(e.target.value)}
              placeholder="postId 입력"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
            />
            <button
              onClick={handleDiagnose}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "진단"}
            </button>
            <button
              onClick={handleDiagnoseAll}
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "전체 진단"}
            </button>
          </div>
        </div>

        {/* 단일 진단 결과 */}
        {result && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">진단 결과: {result.postId}</h2>
              {result.fixes.length > 0 && (
                <button
                  onClick={handleFix}
                  disabled={fixing}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 flex items-center gap-2"
                >
                  {fixing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  자동 수정
                </button>
              )}
            </div>

            {/* 문제점 */}
            {result.issues.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-red-600 mb-2 flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  문제점 ({result.issues.length})
                </h3>
                <ul className="list-disc list-inside space-y-1">
                  {result.issues.map((issue, idx) => (
                    <li key={idx} className="text-red-700">
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 경고 */}
            {result.warnings.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-yellow-600 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  경고 ({result.warnings.length})
                </h3>
                <ul className="list-disc list-inside space-y-1">
                  {result.warnings.map((warning, idx) => (
                    <li key={idx} className="text-yellow-700">
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 정상 */}
            {result.issues.length === 0 && result.warnings.length === 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-green-600 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  정상
                </h3>
                <p className="text-gray-600">문제가 없습니다.</p>
              </div>
            )}

            {/* 데이터 상세 */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">데이터 상세</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">currentPeople:</span>{" "}
                  {result.data.fieldMapping.currentPeople ?? "없음"}
                </div>
                <div>
                  <span className="font-medium">people:</span>{" "}
                  {result.data.fieldMapping.people ?? "없음"}
                </div>
                <div>
                  <span className="font-medium">실제 신청 수:</span> {result.data.actualCount}
                </div>
                <div>
                  <span className="font-medium">예상 카운트:</span> {result.data.expectedCount}
                </div>
                <div>
                  <span className="font-medium">신청 목록:</span> {result.data.joins.length}개
                </div>
                {result.data.fieldMapping.joined !== undefined && (
                  <div className="text-yellow-600">
                    <span className="font-medium">옛날 필드 'joined':</span>{" "}
                    {result.data.fieldMapping.joined}
                  </div>
                )}
                {result.data.fieldMapping.max !== undefined && (
                  <div className="text-yellow-600">
                    <span className="font-medium">옛날 필드 'max':</span>{" "}
                    {result.data.fieldMapping.max}
                  </div>
                )}
              </div>
            </div>

            {/* 수정 사항 */}
            {result.fixes.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold mb-2">수정 사항</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {result.fixes.map((fix, idx) => (
                    <li key={idx} className="text-blue-700">
                      {fix}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 전체 진단 결과 */}
        {allResults && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">전체 진단 결과</h2>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold">{allResults.total}</div>
                <div className="text-sm text-gray-600">전체 게시글</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {allResults.totalIssues}
                </div>
                <div className="text-sm text-gray-600">문제점</div>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {allResults.totalWarnings}
                </div>
                <div className="text-sm text-gray-600">경고</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {allResults.fixedCount}
                </div>
                <div className="text-sm text-gray-600">수정 완료</div>
              </div>
            </div>

            {/* 문제가 있는 게시글 목록 */}
            {allResults.results.filter((r: DiagnosticResult) => r.issues.length > 0)
              .length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2">문제가 있는 게시글</h3>
                <div className="space-y-2">
                  {allResults.results
                    .filter((r: DiagnosticResult) => r.issues.length > 0)
                    .map((r: DiagnosticResult) => (
                      <div
                        key={r.postId}
                        className="p-3 bg-red-50 rounded border border-red-200"
                      >
                        <div className="font-medium">{r.postId}</div>
                        <div className="text-sm text-red-700 mt-1">
                          {r.issues.join(", ")}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
