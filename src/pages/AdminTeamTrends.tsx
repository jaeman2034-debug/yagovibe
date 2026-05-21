import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AdminTeamTrends() {
  const [searchParams] = useSearchParams();
  const focus = searchParams.get("focus");
  const [inactiveTeamIds, setInactiveTeamIds] = useState<string[] | null>(null);
  const [kpiLoadError, setKpiLoadError] = useState<string | null>(null);
  const [kpiLoading, setKpiLoading] = useState(false);

  useEffect(() => {
    if (focus !== "inactive_30d") {
      setInactiveTeamIds(null);
      setKpiLoadError(null);
      setKpiLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setKpiLoading(true);
      setKpiLoadError(null);
      try {
        const snap = await getDoc(doc(db, "platformMetrics", "current"));
        if (cancelled) return;
        if (!snap.exists()) {
          setInactiveTeamIds([]);
          return;
        }
        const raw = snap.data().inactiveTeamIds;
        setInactiveTeamIds(Array.isArray(raw) ? (raw as string[]) : []);
      } catch (e: unknown) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e);
          setKpiLoadError(msg);
          setInactiveTeamIds(null);
        }
      } finally {
        if (!cancelled) setKpiLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [focus]);

  const generatePDF = async () => {
    const element = document.getElementById("report");
    if (!element) return;

    const canvas = await html2canvas(element);
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const imgWidth = 190;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 10;

    pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight, undefined, "FAST", 0);

    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight, undefined, "FAST", 0);
      heightLeft -= pageHeight;
    }

    pdf.save("AdminTeamTrends_Report.pdf");
  };

  return (
    <div className="p-4 space-y-6">
      {focus === "inactive_30d" && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/80 dark:bg-amber-950/30 p-4 space-y-2">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            관리자 홈에서 연결됨: 30일+ 미활동 팀 샘플 (full_rebuild 기준)
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            집계 문서 <code className="rounded bg-white/60 dark:bg-black/30 px-1">platformMetrics/current</code>의{" "}
            <code className="rounded bg-white/60 dark:bg-black/30 px-1">inactiveTeamIds</code>입니다.
          </p>
          {kpiLoading && <p className="text-xs text-gray-500">팀 ID 불러오는 중…</p>}
          {kpiLoadError && (
            <p className="text-xs text-red-600 dark:text-red-400">
              집계를 읽지 못했습니다(권한 또는 Rules). {kpiLoadError}
            </p>
          )}
          {!kpiLoading && !kpiLoadError && inactiveTeamIds && inactiveTeamIds.length === 0 && (
            <p className="text-xs text-gray-500">현재 샘플 ID가 없습니다. 관리자 홈에서 지표 새로고침을 실행해 보세요.</p>
          )}
          {!kpiLoading && inactiveTeamIds && inactiveTeamIds.length > 0 && (
            <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
              {inactiveTeamIds.map((id) => (
                <li key={id}>
                  <Link
                    className="text-blue-600 hover:underline dark:text-blue-400"
                    to={`/team/${encodeURIComponent(id)}?tab=home`}
                  >
                    {id}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link className="inline-block text-sm text-blue-600 hover:underline dark:text-blue-400" to="/app/admin/home">
            관리자 홈으로
          </Link>
        </div>
      )}

      <div id="report" className="border p-4 bg-white shadow dark:bg-gray-900 dark:border-gray-700 rounded-lg">
        <h2 className="text-lg font-bold mb-2 dark:text-white">팀 트렌드 리포트</h2>
        <p className="text-gray-700 dark:text-gray-300">AI 기반 주간 요약 및 분석 결과 표시</p>
      </div>
      <button
        type="button"
        onClick={() => void generatePDF()}
        className="mt-4 bg-blue-600 text-white rounded-xl px-4 py-2 hover:bg-blue-700"
      >
        PDF보내기
      </button>
    </div>
  );
}
