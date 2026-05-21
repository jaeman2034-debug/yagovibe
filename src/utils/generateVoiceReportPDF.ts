// src/utils/generateVoiceReportPDF.ts
import PDFDocument from "pdfkit";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import fs from "fs";
import dayjs from "dayjs";

type Stats = { [key: string]: number };

export async function generateVoiceReportPDF(
  intents: Stats,
  keywords: Stats,
  summary: string,
  totalCommands: number = 0
) {
  const date = dayjs().format("YYYY-MM-DD");
  const doc = new PDFDocument({
    margin: 40,
    size: 'A4',
    info: {
      Title: `YAGO SPORTS AI Daily Voice Report - ${date}`,
      Author: 'YAGO SPORTS AI System',
      Subject: 'Daily Voice Command Analysis Report',
      Creator: 'YAGO SPORTS AI System'
    }
  });

  const outPath = `YAGO_VIBE_Report_${date}.pdf`;
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  // 🎨 헤더 섹션
  doc
    .fontSize(28)
    .fillColor("#4F46E5")
    .text("YAGO SPORTS", { align: "center" });

  doc
    .fontSize(18)
    .fillColor("#6366F1")
    .text("AI Daily Voice Report", { align: "center" });

  doc
    .fontSize(12)
    .fillColor("#888")
    .text(`📅 ${date}`, { align: "center" });

  doc.moveDown(1.5);

  // 📊 요약 카드
  doc
    .fontSize(16)
    .fillColor("#111")
    .text("📊 Daily Summary");

  doc
    .fontSize(12)
    .fillColor("#333")
    .text(`총 명령 수: ${totalCommands}건`);

  // 성공률 계산
  const successfulCommands = totalCommands - (intents['미확인'] || 0);
  const successRate = totalCommands > 0 ? ((successfulCommands / totalCommands) * 100).toFixed(1) : '0';
  doc.text(`성공률: ${successRate}%`);

  doc.moveDown(1);

  // 🧩 의도별 그래프
  doc
    .fontSize(16)
    .fillColor("#111")
    .text("🎯 Intent별 사용 통계");

  try {
    const chartCanvas = new ChartJSNodeCanvas({
      width: 600,
      height: 300,
      backgroundColour: 'white'
    });

    const chartBuffer = await chartCanvas.renderToBuffer({
      type: "bar",
      data: {
        labels: Object.keys(intents),
        datasets: [
          {
            label: "명령 횟수",
            data: Object.values(intents),
            backgroundColor: [
              "#4F46E5",
              "#6366F1",
              "#8B5CF6",
              "#A855F7",
              "#C084FC",
              "#DDD6FE"
            ],
            borderColor: "#4F46E5",
            borderWidth: 1
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Intent별 명령 사용량',
            font: {
              size: 16
            }
          },
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });

    doc.image(chartBuffer, { fit: [500, 250], align: "center" });
  } catch (error) {
    console.warn("차트 생성 실패, 텍스트로 대체:", error);
    // 차트 생성 실패 시 텍스트로 대체
    Object.entries(intents).forEach(([intent, count]) => {
      doc.text(`• ${intent}: ${count}건`);
    });
  }

  doc.moveDown(1.5);

  // 🔥 키워드 Top 5
  doc
    .fontSize(16)
    .fillColor("#111")
    .text("🔥 Top 5 Keywords");

  const topKeywords = Object.entries(keywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (topKeywords.length > 0) {
    topKeywords.forEach(([keyword, count], index) => {
      doc
        .fontSize(12)
        .fillColor("#333")
        .text(`${index + 1}. ${keyword} — ${count}회`);
    });
  } else {
    doc
      .fontSize(12)
      .fillColor("#666")
      .text("키워드 데이터가 없습니다.");
  }

  doc.moveDown(1.5);

  // 💬 AI 요약
  doc
    .fontSize(16)
    .fillColor("#111")
    .text("🧠 AI Summary");

  doc
    .fontSize(12)
    .fillColor("#333")
    .text(summary || "요약 내용이 없습니다.", {
      align: "left",
      lineGap: 2
    });

  doc.moveDown(2);

  // 📍 푸터
  doc
    .fontSize(10)
    .fillColor("#888")
    .text("Generated automatically by YAGO SPORTS AI System", {
      align: "center",
    });

  doc
    .fontSize(8)
    .fillColor("#999")
    .text(`Report generated at: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`, {
      align: "center",
    });

  doc.end();

  await new Promise<void>((resolve) => stream.on("finish", () => resolve()));
  console.log(`✅ PDF 생성 완료: ${outPath}`);
  return outPath;
}

// 🧪 테스트 함수
export async function testPDFGeneration() {
  const testIntents = {
    "지도열기": 15,
    "근처검색": 20,
    "위치이동": 6,
    "홈이동": 1,
    "미확인": 2
  };

  const testKeywords = {
    "편의점": 12,
    "식당": 8,
    "카페": 5,
    "약국": 3,
    "병원": 2
  };

  const testSummary = `오늘은 근처검색 명령이 가장 많았으며, 편의점 관련 요청이 전체의 30%를 차지했습니다. 
사용자들이 주로 편의시설을 찾는 패턴을 보이고 있으며, 특히 오후 시간대에 검색이 집중되었습니다.
AI 시스템의 성공률은 95.5%로 매우 높은 수준을 유지하고 있습니다.`;

  return await generateVoiceReportPDF(
    testIntents,
    testKeywords,
    testSummary,
    44
  );
}
