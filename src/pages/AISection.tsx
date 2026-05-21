// 🔒 AI 관련 코드를 격리한 컴포넌트 (범인 추적용)
// 이 컴포넌트가 실패해도 MarketAddPage는 정상 작동

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// 🔒 AI 관련 import를 하나씩 추가하면서 테스트
// import { aiAnalysisLogger } from "@/lib/analytics/aiAnalysisLogger";
// import { createFlowId, getFlowId, clearFlowId } from "@/lib/analytics/aiFlowTracker";
// import { AISummaryCard } from "@/components/ai/AISummaryCard";
// import { computeConfidence, ConfidenceResult } from "@/lib/analytics/confidenceCalculator";
// import { generateAISummary, convertAIResponseToSummaryInput } from "@/lib/ai/summaryGenerator";

type AIStatus = "idle" | "loading" | "success" | "error";

export default function AISection() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [aiStatus, setAiStatus] = useState<AIStatus>("idle");
  const [aiResult, setAiResult] = useState<string>("");

  // 🔒 AI 분석 시작 핸들러
  // 🔒 배포 안전: 실제 AI 연결 전까지 임시 비활성화
  const handleAnalyze = async () => {
    // 🔒 배포 안전: 거짓 결과 제거, 정직한 UX
    toast.info("AI 분석 기능은 곧 제공될 예정이에요.");
    return;
    
    // TODO: 실제 AI 분석 로직 구현 시 아래 주석 해제
    /*
    setAiStatus("loading");
    setAiResult("");

    try {
      // 실제 AI 분석 로직
      // const rawResult = await runAiAnalysis();
      // console.log("🔍 [AI] RAW RESULT:", rawResult);
      // console.log("🔍 [AI] Result Type:", typeof rawResult);
      // console.log("🔍 [AI] Result Length:", rawResult?.length || 0);
      
      // 🔒 빈 결과 체크 (필수)
      if (!rawResult || typeof rawResult !== "string" || rawResult.trim().length === 0) {
        throw new Error("AI_RESULT_EMPTY: AI 분석 결과가 비어있습니다.");
      }
      
      // 🔒 결과 파싱 (응답 구조에 따라 조정 필요)
      // const result = rawResult.data?.result || rawResult.result || rawResult;
      
      setAiResult(result);
      setAiStatus("success");
    } catch (error: any) {
      console.error("❌ [AI] 분석 실패:", error);
      setAiStatus("error");
      toast.error("AI 분석에 실패했어요. 잠시 후 다시 시도해 주세요.");
    }
    */
  };

  // 🔒 결과 적용 핸들러 (실제 구현은 props로 받아야 함)
  const handleApply = () => {
    // TODO: 부모 컴포넌트의 description state에 적용
    // onApply?.(aiResult);
    console.log("AI 결과 적용:", aiResult);
  };

  // 🔒 기본 상태 (접힘)
  if (!isExpanded) {
    return (
      <div 
        style={{ 
          marginTop: 16,
          cursor: "pointer",
          padding: "12px 0",
          color: "#6b7280",
          fontSize: 14,
        }}
        onClick={() => setIsExpanded(true)}
      >
        ▸ AI로 상품 설명 추천받기 (선택)
      </div>
    );
  }

  // 🔒 열렸을 때 상태
  return (
    <div style={{ 
      marginTop: 16, 
      padding: 16, 
      border: "1px solid #e5e7eb", 
      borderRadius: 8, 
      backgroundColor: "#fafafa"
    }}>
      {/* 제목 + 베타 배지 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: "bold", margin: 0 }}>AI 분석</h3>
        <span style={{ 
          fontSize: 10, 
          color: "#9ca3af", 
          padding: "2px 6px",
          backgroundColor: "#f3f4f6",
          borderRadius: 4,
        }}>
          BETA
        </span>
        <button
          onClick={() => setIsExpanded(false)}
          style={{
            marginLeft: "auto",
            background: "none",
            border: "none",
            color: "#9ca3af",
            cursor: "pointer",
            fontSize: 14,
            padding: 0,
          }}
        >
          ✕
        </button>
      </div>

      {/* 설명 */}
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16, lineHeight: 1.5 }}>
        AI가 이미지와 입력 정보를 바탕으로<br />
        상품 설명 작성을 도와드려요.
        <br />
        <span style={{ fontSize: 11, color: "#9ca3af", marginTop: 8, display: "block" }}>
          AI 분석 기능은 현재 준비 중이며,<br />
          곧 업데이트될 예정이에요.
        </span>
      </p>

      {/* 🔒 UI 분기: idle 상태 - 분석 시작 버튼 */}
      {aiStatus === "idle" && (
        <Button
          onClick={handleAnalyze}
          disabled={true}
          style={{
            width: "100%",
            padding: "10px 20px",
            fontSize: 14,
            opacity: 0.6,
            cursor: "not-allowed",
          }}
        >
          AI 분석 (준비 중)
        </Button>
      )}

      {/* 🔒 UI 분기: loading 상태 - 로딩 표시 */}
      {aiStatus === "loading" && (
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: 8, 
          color: "#6b7280",
          fontSize: 14,
          padding: "12px 0",
        }}>
          <div style={{
            width: 16,
            height: 16,
            border: "2px solid currentColor",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 0.6s linear infinite",
          }} />
          <span>AI가 이미지를 분석 중이에요… (평균 5~10초)</span>
        </div>
      )}

      {/* 🔒 UI 분기: success 상태 - 결과 미리보기 + 적용 버튼 */}
      {aiStatus === "success" && aiResult && (
        <div>
          {/* 🔑 AI 분석 완료 인지 메시지 */}
          <p style={{ 
            fontSize: 13, 
            color: "#059669", 
            marginBottom: 12,
            fontWeight: 500,
          }}>
            ✔ AI 분석이 완료되었어요
          </p>
          
          <div style={{ 
            fontSize: 14, 
            fontWeight: 500, 
            marginBottom: 8,
            color: "#374151",
          }}>
            추천 상품 설명
          </div>
          <div style={{
            padding: 12,
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            marginBottom: 12,
            fontSize: 13,
            color: "#374151",
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
          }}>
            {aiResult}
          </div>
          <Button
            onClick={handleApply}
            style={{
              width: "100%",
              padding: "10px 20px",
              fontSize: 14,
            }}
          >
            설명에 적용하기
          </Button>
        </div>
      )}

      {/* 🔒 UI 분기: error 상태 - 재시도 버튼 */}
      {aiStatus === "error" && (
        <Button
          onClick={handleAnalyze}
          variant="outline"
          style={{
            width: "100%",
            padding: "10px 20px",
            fontSize: 14,
          }}
        >
          다시 시도
        </Button>
      )}
    </div>
  );
}

