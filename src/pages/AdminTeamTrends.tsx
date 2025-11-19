import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import React from "react";

export default function AdminTeamTrends() {
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
    <div className="p-4">
      <div id="report" className="border p-4 bg-white shadow">
        <h2 className="text-lg font-bold mb-2">팀 트렌드 리포트</h2>
        <p>AI 기반 주간 요약 및 분석 결과 표시</p>
      </div>
      <button
        onClick={generatePDF}
        className="mt-4 bg-blue-600 text-white rounded-xl px-4 py-2"
      >
        PDF 내보내기
      </button>
    </div>
  );
}
