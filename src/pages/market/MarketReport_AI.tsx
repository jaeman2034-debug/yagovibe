import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { buildReportPdf, AIProduct } from "@/utils/generateAIReport";
import { uploadBinary } from "@/utils/uploadToStorage";
import { useTTS } from "@/hooks/useTTS";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  product: AIProduct;
  analysis: {
    summary: string;
    highlights?: string[];
    priceSuggest?: number;
  };
};

const TTS_ENDPOINT = import.meta.env.VITE_TTS_URL || "/api/tts";

export default function MarketReport_AI({ product, analysis }: Props) {
  const [saving, setSaving] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [ttsUrl, setTtsUrl] = useState<string | null>(null);
  const { speak, lastUrl, loading: ttsLoading } = useTTS(TTS_ENDPOINT);

  const fullText = useMemo(() => {
    const lines = [
      `상품명 ${product.name}`,
      product.desc ? `설명 ${product.desc}` : "",
      product.category ? `카테고리 ${product.category}` : "",
      product.price ? `가격 ${product.price}원` : "",
      analysis.summary,
      analysis.priceSuggest ? `AI 제안가: ${analysis.priceSuggest}원` : "",
      analysis.highlights?.length ? `핵심 포인트: ${analysis.highlights.join(", ")}` : "",
    ].filter(Boolean);
    return lines.join(". ");
  }, [product, analysis]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (!analysis?.summary) return;

    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(analysis.summary);
    utter.lang = "ko-KR";
    window.speechSynthesis.speak(utter);
  }, [analysis?.summary]);

  const handleSpeak = async () => {
    const result = await speak(fullText, { voice: "alloy", filePrefix: "ai-market" });
    setTtsUrl(result.url);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const pdf = await buildReportPdf(product, analysis.summary);
      const pdfPath = `reports/${Date.now()}-${product.name}.pdf`;
      const { url: uploadedPdfUrl } = await uploadBinary(pdfPath, pdf, "application/pdf");
      setPdfUrl(uploadedPdfUrl);

      let audioUrl = ttsUrl;
      if (!audioUrl) {
        const generated = await speak(fullText, { voice: "alloy", filePrefix: "ai-report" });
        audioUrl = generated.url;
        setTtsUrl(audioUrl);
      }

      await addDoc(collection(db, "aiReports"), {
        title: `AI 분석 리포트 - ${product.name}`,
        pdfUrl: uploadedPdfUrl,
        ttsUrl: audioUrl,
        product,
        analysis,
        createdAt: serverTimestamp(),
      });

      alert("리포트 저장 완료!");
    } catch (error: any) {
      console.error(error);
      alert(`리포트 저장 실패: ${error?.message || error}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">🧠 AI 분석 리포트</h1>

      <Card className="shadow-sm">
        <CardContent className="space-y-2 pt-6">
          <div className="text-lg font-semibold">{product.name}</div>
          <div className="text-sm text-muted-foreground">
            {product.category ? `카테고리: ${product.category}` : "카테고리: -"}
          </div>
          <div className="text-sm">{product.desc || "-"}</div>
          <div className="text-sm">{product.price ? `가격: ${product.price}원` : "가격: -"}</div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="space-y-2 pt-6">
          <div className="text-base whitespace-pre-wrap">{analysis.summary}</div>
          {analysis.highlights?.length ? (
            <ul className="list-disc pl-6 text-sm">
              {analysis.highlights.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          ) : null}
          {analysis.priceSuggest ? (
            <div className="text-sm">
              💡 AI 제안가: <b>{analysis.priceSuggest.toLocaleString()}원</b>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={handleSpeak} disabled={ttsLoading}>
          {ttsLoading ? "음성 생성 중..." : "🔊 분석 결과 읽어주기"}
        </Button>
        <Button variant="secondary" onClick={handleSave} disabled={saving}>
          {saving ? "저장 중..." : "📄 PDF+TTS 저장"}
        </Button>
      </div>

      {(pdfUrl || ttsUrl || lastUrl) && (
        <div className="space-y-2">
          {pdfUrl && (
            <a className="underline text-blue-600" href={pdfUrl} target="_blank" rel="noreferrer">
              📄 PDF 열기
            </a>
          )}
          {(ttsUrl || lastUrl) && (
            <audio controls src={ttsUrl || lastUrl!} className="w-full" />
          )}
        </div>
      )}
    </div>
  );
}
