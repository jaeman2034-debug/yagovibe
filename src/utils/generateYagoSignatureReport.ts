// src/utils/generateYagoSignatureReport.ts
import PDFDocument from "pdfkit";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import fs from "fs";
import dayjs from "dayjs";

type Stats = Record<string, number>;

export async function generateYagoSignatureReport(
    intents: Stats,
    keywords: Stats,
    summary: string,
    totalCommands: number = 0
) {
    const date = dayjs().format("YYYY-MM-DD");
    const doc = new PDFDocument({
        margin: 50,
        size: 'A4',
        info: {
            Title: `YAGO VIBE AI Signature Report - ${date}`,
            Author: 'YAGO VIBE AI System',
            Subject: 'AI-Powered Voice Command Analysis Report',
            Creator: 'YAGO VIBE AI System'
        }
    });

    const outPath = `YAGO_VIBE_Signature_Report_${date}.pdf`;
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);

    // 💜 헤더 - 브랜드 그라데이션
    const headerHeight = 100;
    doc.rect(0, 0, doc.page.width, headerHeight).fill("#4F46E5");

    // 로고 영역
    doc
        .fillColor("white")
        .fontSize(28)
        .font("Helvetica-Bold")
        .text("YAGO VIBE", 50, 25, { align: "left" });

    doc
        .fontSize(16)
        .font("Helvetica")
        .text("AI REPORT", 50, 50, { align: "left" });

    // 날짜 및 통계
    doc
        .fontSize(12)
        .text(`📅 ${date}`, { align: "right" })
        .text(`🎙️ 총 ${totalCommands}건`, { align: "right" });

    doc.moveDown(3);

    // 📊 의도별 막대 그래프
    doc
        .fontSize(18)
        .fillColor("#111")
        .text("🎯 Intent별 사용 통계", 50, 120);

    try {
        const chartCanvas = new ChartJSNodeCanvas({
            width: 600,
            height: 300,
            backgroundColour: 'white'
        });

        const barImg = await chartCanvas.renderToBuffer({
            type: "bar",
            data: {
                labels: Object.keys(intents),
                datasets: [
                    {
                        label: "명령 횟수",
                        data: Object.values(intents),
                        backgroundColor: [
                            "#6366F1",
                            "#8B5CF6",
                            "#A855F7",
                            "#C084FC",
                            "#DDD6FE",
                            "#F3E8FF"
                        ],
                        borderColor: "#4F46E5",
                        borderWidth: 2,
                        borderRadius: 8,
                        borderSkipped: false,
                    },
                ],
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Intent별 명령 사용량',
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#E5E7EB' },
                        ticks: { stepSize: 1 }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });

        doc.image(barImg, 50, 150, { width: 480 });
    } catch (error) {
        console.warn("막대 그래프 생성 실패, 텍스트로 대체:", error);
        // 차트 생성 실패 시 텍스트로 대체
        let yPos = 150;
        Object.entries(intents).forEach(([intent, count]) => {
            doc
                .fontSize(12)
                .fillColor("#333")
                .text(`• ${intent}: ${count}건`, 50, yPos);
            yPos += 20;
        });
    }

    // 🔵 키워드 도넛 차트
    doc
        .fontSize(18)
        .fillColor("#111")
        .text("🔥 Top 5 Keywords", 50, 480);

    try {
        const donutCanvas = new ChartJSNodeCanvas({
            width: 300,
            height: 300,
            backgroundColour: 'white'
        });

        const topKeywords = Object.entries(keywords)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        if (topKeywords.length > 0) {
            const donutImg = await donutCanvas.renderToBuffer({
                type: "doughnut",
                data: {
                    labels: topKeywords.map(([keyword]) => keyword),
                    datasets: [
                        {
                            data: topKeywords.map(([, count]) => count),
                            backgroundColor: [
                                "#818CF8",
                                "#A78BFA",
                                "#C084FC",
                                "#E879F9",
                                "#F472B6"
                            ],
                            borderColor: "#FFFFFF",
                            borderWidth: 2
                        },
                    ],
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: '인기 키워드 분포',
                            font: { size: 14, weight: 'bold' }
                        },
                        legend: {
                            position: "right",
                            labels: { font: { size: 10 } }
                        }
                    }
                }
            });

            doc.image(donutImg, 150, 520, { width: 300 });
        } else {
            doc
                .fontSize(12)
                .fillColor("#666")
                .text("키워드 데이터가 없습니다.", 150, 520);
        }
    } catch (error) {
        console.warn("도넛 차트 생성 실패, 텍스트로 대체:", error);
        // 차트 생성 실패 시 텍스트로 대체
        const topKeywords = Object.entries(keywords)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        let yPos = 520;
        topKeywords.forEach(([keyword, count], index) => {
            doc
                .fontSize(12)
                .fillColor("#333")
                .text(`${index + 1}. ${keyword}: ${count}회`, 150, yPos);
            yPos += 20;
        });
    }

    // 🧠 AI 요약 버블
    const summaryY = 850;
    doc
        .roundedRect(40, summaryY, 520, 140, 15)
        .fillOpacity(0.1)
        .fill("#4F46E5");

    doc
        .fillColor("#4F46E5")
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("🧠 AI Summary", 60, summaryY + 20);

    doc
        .fontSize(11)
        .fillColor("#333")
        .font("Helvetica")
        .text(summary || "오늘의 요약 내용이 없습니다.", 60, summaryY + 45, {
            width: 480,
            lineGap: 3
        });

    // 📎 푸터 - 브랜드 그라데이션
    const footerHeight = 50;
    doc.rect(0, doc.page.height - footerHeight, doc.page.width, footerHeight).fill("#4F46E5");

    doc
        .fillColor("white")
        .fontSize(10)
        .font("Helvetica")
        .text("Generated automatically by YAGO VIBE AI System", 50, doc.page.height - 35);

    doc
        .fontSize(8)
        .text(`Report generated at: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`, 50, doc.page.height - 20);

    doc.end();

    await new Promise<void>((resolve) => stream.on("finish", () => resolve()));
    console.log(`✅ 시그니처 PDF 생성 완료: ${outPath}`);
    return outPath;
}

// 🧪 테스트 함수
export async function testSignatureReport() {
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
        "병원": 2,
        "주유소": 1
    };

    const testSummary = `오늘 가장 많이 사용된 명령은 '근처검색'이며 편의점 요청이 30%를 차지했습니다. 
사용자들이 주로 편의시설을 찾는 패턴을 보이고 있으며, 특히 오후 시간대에 검색이 집중되었습니다.
AI 시스템의 성공률은 95.5%로 매우 높은 수준을 유지하고 있습니다. 
내일은 더 많은 사용자에게 도움이 될 수 있도록 개선된 검색 알고리즘을 적용할 예정입니다.`;

    return await generateYagoSignatureReport(
        testIntents,
        testKeywords,
        testSummary,
        44
    );
}
