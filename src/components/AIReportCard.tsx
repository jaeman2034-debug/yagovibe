import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";

interface AIReportCardProps {
  report: any;
}

export default function AIReportCard({ report }: AIReportCardProps) {
  const apiBase = import.meta.env.VITE_API_BASE_URL || "";
  const functionsBase =
    import.meta.env.VITE_FUNCTIONS_URL || import.meta.env.VITE_API_BASE_URL || "";

  const handlePlayTTS = async () => {
    if (!report) return;

    const toastId = toast.loading("AI 음성 생성 중...");
    try {
      const response = await axios.post(
        `${apiBase}/generate-tts`,
        {
          text: `상품명: ${report.name || "이름 없음"}. 카테고리: ${report.category || "미분류"}. 분석 요약: ${
            report.analysis?.summary || "요약 없음"
          }. 추천 가격은 ${report.analysis?.priceSuggest || "없음"}원입니다.`,
        },
        { responseType: "blob" },
      );

      toast.dismiss(toastId);
      const url = URL.createObjectURL(response.data);
      const audio = new Audio(url);
      audio.play().catch(() => {
        toast.warning("자동 재생이 차단되었습니다. 사용자 상호작용 후 다시 시도하세요.");
      });
      audio.onended = () => URL.revokeObjectURL(url);
      toast.success("🎧 AI 음성 리포트 재생 중...");
    } catch (error) {
      console.error(error);
      toast.dismiss(toastId);
      toast.error("TTS 생성 실패 ❌");
    }
  };

  const handleGenerateAssets = async () => {
    if (!report?.id) return;

    const toastId = toast.loading("PDF + 음성파일 생성 중...");
    try {
      const response = await axios.post(`${functionsBase}/generateReportAssets`, {
        reportId: report.id,
        reportData: report,
      });

      toast.dismiss(toastId);
      if (response.data?.pdfUrl) {
        toast.success("✅ PDF + 음성 저장 완료!");
        window.open(response.data.pdfUrl, "_blank");
      } else {
        toast.warning("PDF URL을 가져오지 못했습니다.");
      }
    } catch (error) {
      console.error(error);
      toast.dismiss(toastId);
      toast.error("PDF 생성 실패 ❌");
    }
  };

  return (
    <Card className="w-full shadow-lg border border-gray-200 dark:border-gray-700">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-lg font-semibold">{report.name}</CardTitle>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={handleGenerateAssets}>
            📄 PDF 생성
          </Button>
          <Button variant="default" size="sm" className="flex-1 sm:flex-none" onClick={handlePlayTTS}>
            🎧 AI 음성 리포트
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          카테고리: {report.category || "-"} | 가격: {report.price ? report.price.toLocaleString() : "-"} 원
        </p>
        <p className="text-sm leading-relaxed mb-2 text-gray-800 dark:text-gray-100">
          {report.analysis?.summary || "AI 분석 요약 없음"}
        </p>
        {report.analysis?.priceSuggest && (
          <p className="text-blue-600 font-medium">
            💡 AI 추천 가격: {report.analysis.priceSuggest.toLocaleString()} 원
          </p>
        )}
      </CardContent>
    </Card>
  );
}
