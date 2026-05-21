import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import PdfPrinter from "pdfmake";
import { TDocumentDefinitions, Content, StyleDictionary } from "pdfmake/interfaces";

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

// pdfmake 폰트 설정 (기본 폰트 사용)
const fonts = {
    Roboto: {
        normal: "Helvetica",
        bold: "Helvetica-Bold",
        italics: "Helvetica-Oblique",
        bolditalics: "Helvetica-BoldOblique",
    },
};

const printer = new PdfPrinter(fonts);

interface SentenceTimestamp {
    start: number;
    end: number;
}

/**
 * Heatmap 색상 반환 함수 (4단계)
 * 키워드 빈도에 따라 light → vivid amber 색상 반환
 */
function colorByHeat(score: number): string {
    if (score === 0) return "#ffffff"; // 흰색
    if (score === 1) return "#fef3c7"; // light amber
    if (score === 2) return "#fde68a"; // medium amber
    if (score >= 3) return "#f59e0b"; // vivid amber
    return "#ffffff";
}

/**
 * Step 31: 리포트 PDF 내보내기
 * GET /generateReportPdf?reportId=REPORT_ID
 */
export const generateReportPdf = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            // GET query 또는 POST body에서 reportId 가져오기
            const reportId = (req.query.reportId as string) || (req.body?.reportId as string);
            
            if (!reportId) {
                res.status(400).send("reportId is required");
                return;
            }

            logger.info("📄 PDF 생성 시작:", { reportId });

            // Firestore에서 리포트 데이터 가져오기
            const reportDoc = await db.collection("reports").doc(reportId).get();
            
            if (!reportDoc.exists) {
                res.status(404).send("Report not found");
                return;
            }

            const reportData = reportDoc.data();
            const content = reportData?.content || reportData?.summary || "";
            const keywords = reportData?.keywords || [];
            const sentenceTimestamps: SentenceTimestamp[] = reportData?.sentenceTimestamps || [];
            const audioUrl = reportData?.audioUrl || "";
            const createdAt = reportData?.createdAt?.toDate?.() || reportData?.createdAt || new Date();
            
            // Firestore URL 생성
            const reportUrl = `https://console.firebase.google.com/project/${process.env.GCLOUD_PROJECT || "yago-vibe-spt"}/firestore/data/~2Freports~2F${reportId}`;

            // 문장 분할
            const SENTENCE_SPLIT_REGEX = /(?<=[.!?。！？\n|。|\.|?|!|？|！|。])\s+/g;
            const sentences = content.split(SENTENCE_SPLIT_REGEX).filter(Boolean).map(s => s.trim()).filter(Boolean);

            // 타임스탬프를 mm:ss 형식으로 변환
            const formatTimestamp = (seconds: number): string => {
                const mins = Math.floor(seconds / 60);
                const secs = Math.floor(seconds % 60);
                return `${mins}:${secs.toString().padStart(2, "0")}`;
            };

            // Destination ID 배열 생성
            const destIds = sentences.map((_, idx) => `sentence_${idx}`);

            // Heatmap 점수 계산: 각 문장 내 키워드 개수
            const heatScores = sentences.map((sentence) => {
                const lowerSentence = sentence.toLowerCase();
                return keywords.filter((k: string) => lowerSentence.includes(k.toLowerCase())).length;
            });

            // 키워드 인덱스 생성: 각 키워드의 첫 등장 문장 찾기
            const keywordIndex: Content[] = keywords.map((k: string) => {
                const idx = sentences.findIndex((s) => 
                    s.toLowerCase().includes(k.toLowerCase())
                );
                const dest = idx !== -1 ? destIds[idx] : undefined;
                return {
                    columns: [
                        { text: k, bold: true, width: "*", link: dest },
                        { text: dest ? `→ 문장 ${idx + 1}` : "", width: 80, alignment: "right", color: "#555" }
                    ],
                    margin: [0, 2, 0, 2]
                } as Content;
            });

            // 문서 제목
            const docTitle = `AI Report - ${reportId.substring(0, 8)}`;

            // 본문 생성 (Heatmap 색상 적용)
            const body: Content[] = sentences.map((s, i) => {
                const timestamps = sentenceTimestamps[i];
                return {
                    stack: [
                        {
                            text: `¶ ${i + 1}  ${timestamps ? `[${formatTimestamp(timestamps.start)}–${formatTimestamp(timestamps.end)}]` : ""}`,
                            style: "paraIndex",
                            id: destIds[i]
                        },
                        {
                            text: s,
                            margin: [0, 2, 0, 12],
                            background: colorByHeat(heatScores[i])
                        }
                    ]
                } as Content;
            });

            // PDF 문서 정의 (Step 31.1 확장판)
            const docDef: TDocumentDefinitions = {
                info: {
                    title: docTitle,
                    subject: "AI Report with Heatmap + Keyword Index",
                    keywords: keywords.join(", "),
                    author: "YAGO SPORTS AI Assistant",
                    creator: "YAGO SPORTS AI Assistant",
                    producer: "pdfmake",
                    modDate: new Date(),
                    creationDate: createdAt,
                },
                pageMargins: [40, 50, 40, 50],
                content: [
                    { text: docTitle, style: "h1", margin: [0, 0, 0, 6] },
                    { text: createdAt.toLocaleString(), style: "meta", margin: [0, 0, 0, 10] },
                    
                    // 🔥 Keyword Index
                    { text: "🔥 Keyword Index", style: "h2", margin: [0, 8, 0, 4] },
                    ...keywordIndex,
                    
                    // 🧠 Report Content (Heatmap)
                    { text: "🧠 Report Content (Heatmap)", style: "h2", pageBreak: "before", margin: [0, 12, 0, 8] },
                    ...body,
                    
                    // 📎 External References
                    { text: "\n\n📎 External References", style: "h2", margin: [0, 12, 0, 8] },
                    {
                        ul: [
                            reportUrl ? { text: "View Report Online", link: reportUrl, color: "#3366cc" } : null,
                            audioUrl ? { text: "Listen Audio", link: audioUrl, color: "#3366cc" } : null,
                            { text: "Generated by YAGO SPORTS AI Assistant", italics: true, color: "#666" }
                        ].filter(Boolean)
                    }
                ],
                styles: {
                    h1: { 
                        fontSize: 20, 
                        bold: true,
                        color: "#1f2937",
                        margin: [0, 0, 0, 6]
                    },
                    h2: { 
                        fontSize: 14, 
                        bold: true, 
                        color: "#555",
                        margin: [0, 12, 0, 8]
                    },
                    meta: { 
                        fontSize: 9, 
                        color: "#666",
                        margin: [0, 0, 0, 10]
                    },
                    paraIndex: { 
                        fontSize: 10, 
                        color: "#888",
                        font: "Roboto"
                    }
                } as StyleDictionary,
                defaultStyle: {
                    font: "Roboto",
                    fontSize: 11,
                },
            };

            // PDF 생성
            const pdfDoc = printer.createPdfKitDocument(docDef);
            const chunks: Buffer[] = [];

            pdfDoc.on("data", (chunk: Buffer) => chunks.push(chunk));
            pdfDoc.on("end", () => {
                const pdf = Buffer.concat(chunks);
                res.setHeader("Content-Type", "application/pdf");
                res.setHeader(
                    "Content-Disposition",
                    `attachment; filename=AIReport_${reportId}_Heatmap.pdf`
                );
                res.status(200).send(pdf);
            });

            pdfDoc.end();

        } catch (e: any) {
            logger.error("PDF 생성 오류:", e);
            res.status(500).send(e?.message || "PDF generation error");
        }
    }
);

interface SentimentData {
    label: "Positive" | "Negative" | "Neutral";
    icon: string;
    color: string;
}

/**
 * Step 32: AI 요약 + 감정·톤 분석 + 북마크 PDF 생성
 * GET /generateReportPdfSummary?reportId=REPORT_ID
 */
export const generateReportPdfSummary = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            // GET query 또는 POST body에서 reportId 가져오기
            const reportId = (req.query.reportId as string) || (req.body?.reportId as string);
            
            if (!reportId) {
                res.status(400).send("reportId is required");
                return;
            }

            logger.info("📘 PDF Summary 생성 시작:", { reportId });

            // Firestore에서 리포트 데이터 가져오기
            const reportDoc = await db.collection("reports").doc(reportId).get();
            
            if (!reportDoc.exists) {
                res.status(404).send("Report not found");
                return;
            }

            const reportData = reportDoc.data();
            const content = reportData?.content || reportData?.summary || "";
            const keywords = reportData?.keywords || [];
            const sentenceTimestamps: SentenceTimestamp[] = reportData?.sentenceTimestamps || [];
            const audioUrl = reportData?.audioUrl || "";
            const createdAt = reportData?.createdAt?.toDate?.() || reportData?.createdAt || new Date();
            
            // Step 32 전용 데이터
            const summaryText = reportData?.summaryText || reportData?.summary || "";
            const sentiments: SentimentData[] = reportData?.sentiments || [];
            const toneStats: string[] = reportData?.toneStats || [];

            // Firestore URL 생성
            const reportUrl = `https://console.firebase.google.com/project/${process.env.GCLOUD_PROJECT || "yago-vibe-spt"}/firestore/data/~2Freports~2F${reportId}`;

            // 문장 분할
            const SENTENCE_SPLIT_REGEX = /(?<=[.!?。！？\n|。|\.|?|!|？|！|。])\s+/g;
            const sentences = content.split(SENTENCE_SPLIT_REGEX).filter(Boolean).map(s => s.trim()).filter(Boolean);

            // 타임스탬프를 mm:ss 형식으로 변환
            const formatTimestamp = (seconds: number): string => {
                const mins = Math.floor(seconds / 60);
                const secs = Math.floor(seconds % 60);
                return `${mins}:${secs.toString().padStart(2, "0")}`;
            };

            // 감정 분포 계산
            const counts = { Positive: 0, Negative: 0, Neutral: 0 };
            sentiments.forEach((s) => {
                if (s.label in counts) {
                    counts[s.label as keyof typeof counts] += 1;
                }
            });

            // 감정 분포 바차트 (pdfmake 단순 도형)
            const total = sentences.length || 1;
            const chartBars: Content[] = [
                { text: "감정 분포", style: "h2", margin: [0, 8, 0, 4] },
                {
                    columns: [
                        { text: `😊 긍정: ${counts.Positive}`, fillColor: "#C8E6C9", width: (counts.Positive / total) * 300 },
                        { text: `😞 부정: ${counts.Negative}`, fillColor: "#FFCDD2", width: (counts.Negative / total) * 300 },
                        { text: `😐 중립: ${counts.Neutral}`, fillColor: "#E0E0E0", width: (counts.Neutral / total) * 300 }
                    ],
                    margin: [0, 4, 0, 8]
                } as Content
            ];

            // 본문 구성 (감정/톤 분석 포함)
            const body: Content[] = sentences.map((s, i) => {
                const senti = sentiments[i] || { label: "Neutral" as const, icon: "😐", color: "#E0E0E0" };
                const tone = toneStats[i] || "정보형";
                const timestamps = sentenceTimestamps[i];
                
                return {
                    stack: [
                        {
                            text: `¶ ${i + 1} ${timestamps ? `[${formatTimestamp(timestamps.start)}–${formatTimestamp(timestamps.end)}]` : ""} ${senti.icon} (${tone})`,
                            style: "paraIndex",
                            margin: [0, 2, 0, 2],
                            background: senti.color
                        },
                        { text: s, margin: [0, 0, 0, 10] }
                    ]
                } as Content;
            });

            // 문서 제목
            const docTitle = `AI Report Summary - ${reportId.substring(0, 8)}`;

            // 스타일 정의
            const styles: StyleDictionary = {
                h1: { fontSize: 20, bold: true },
                h2: { fontSize: 14, bold: true, color: "#444" },
                meta: { fontSize: 9, color: "#777" },
                paraIndex: { fontSize: 10, color: "#222" }
            };

            // PDF 문서 정의
            const docDef: TDocumentDefinitions = {
                info: {
                    title: docTitle,
                    subject: "AI Report Summary + Sentiment",
                    keywords: keywords.join(", "),
                    author: "YAGO SPORTS AI Assistant",
                    creator: "YAGO SPORTS AI Assistant",
                    producer: "pdfmake",
                    modDate: new Date(),
                    creationDate: createdAt,
                },
                pageMargins: [40, 50, 40, 50],
                content: [
                    { text: docTitle, style: "h1", margin: [0, 0, 0, 4], tocItem: true },
                    { text: createdAt.toLocaleString(), style: "meta", margin: [0, 0, 0, 8] },
                    
                    // 요약 (AI Generated)
                    { text: "요약 (AI Generated)", style: "h2", tocItem: true },
                    { text: summaryText, margin: [0, 4, 0, 10] },
                    
                    // 감정 분포 차트
                    ...chartBars,
                    
                    // 본문 (감정/톤 분석)
                    { text: "본문 (감정/톤 분석)", style: "h2", pageBreak: "before", tocItem: true },
                    ...body,
                    
                    // 부록 (메타데이터)
                    { text: "\n\n부록 (메타데이터)", style: "h2", tocItem: true },
                    {
                        ul: [
                            { text: `Report URL: ${reportUrl}`, link: reportUrl, color: "#3366cc" },
                            audioUrl ? { text: `Audio URL: ${audioUrl}`, link: audioUrl, color: "#3366cc" } : null,
                            { text: `Generated by YAGO SPORTS AI Assistant`, italics: true, color: "#666" }
                        ].filter(Boolean)
                    }
                ],
                styles
                // 북마크는 tocItem 속성으로 자동 생성됨
            };

            // PDF 생성
            const pdfDoc = printer.createPdfKitDocument(docDef);
            const chunks: Buffer[] = [];

            pdfDoc.on("data", (c: Buffer) => chunks.push(c));
            pdfDoc.on("end", () => {
                const pdf = Buffer.concat(chunks);
                res.setHeader("Content-Type", "application/pdf");
                res.setHeader(
                    "Content-Disposition",
                    `attachment; filename=AIReport_${reportId}_Summary.pdf`
                );
                res.status(200).send(pdf);
            });

            pdfDoc.end();

        } catch (e: any) {
            logger.error("PDF Summary 생성 오류:", e);
            res.status(500).send(e?.message || "PDF generation failed");
        }
    }
);

/**
 * Step 33: EPUB 내보내기
 * GET /generateReportEpub?reportId=REPORT_ID
 */
export const generateReportEpub = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            // GET query 또는 POST body에서 reportId 가져오기
            const reportId = (req.query.reportId as string) || (req.body?.reportId as string);
            
            if (!reportId) {
                res.status(400).send("reportId is required");
                return;
            }

            logger.info("📚 EPUB 생성 시작:", { reportId });

            // Firestore에서 리포트 데이터 가져오기
            const reportDoc = await db.collection("reports").doc(reportId).get();
            
            if (!reportDoc.exists) {
                res.status(404).send("Report not found");
                return;
            }

            const reportData = reportDoc.data();
            const content = reportData?.content || reportData?.summary || "";
            const keywords = reportData?.keywords || [];
            const sentenceTimestamps: SentenceTimestamp[] = reportData?.sentenceTimestamps || [];
            const audioUrl = reportData?.audioUrl || "";
            const createdAt = reportData?.createdAt?.toDate?.() || reportData?.createdAt || new Date();

            // EPUB 메타데이터
            const title = `AI Report - ${reportId.substring(0, 8)}`;
            const author = "YAGO SPORTS AI Assistant";
            const reportLink = `https://console.firebase.google.com/project/${process.env.GCLOUD_PROJECT || "yago-vibe-spt"}/firestore/data/~2Freports~2F${reportId}`;

            // 문장 분할
            const SENTENCE_SPLIT_REGEX = /(?<=[.!?。！？\n|。|\.|?|!|？|！|。])\s+/g;
            const sentences = content.split(SENTENCE_SPLIT_REGEX).filter(Boolean).map(s => s.trim()).filter(Boolean);

            // 타임스탬프를 mm:ss 형식으로 변환
            const formatTimestamp = (seconds: number): string => {
                const mins = Math.floor(seconds / 60);
                const secs = Math.floor(seconds % 60);
                return `${mins}:${secs.toString().padStart(2, "0")}`;
            };

            // Destination ID 배열 생성 (EPUB용 s-N 형식)
            const destIds = sentences.map((_, idx) => `s-${idx}`);

            // 오디오 데이터 URI 생성 (있는 경우) - node-fetch 사용
            let audioDataUri: string | undefined;
            if (audioUrl) {
                try {
                    const fetch = (await import("node-fetch")).default;
                    const response = await fetch(audioUrl);
                    if (response.ok) {
                        const audioBuffer = await response.buffer();
                        audioDataUri = `data:audio/mpeg;base64,${audioBuffer.toString("base64")}`;
                    }
                } catch (e) {
                    logger.warn("오디오 다운로드 실패:", e);
                }
            }

            // CSS 스타일시트
            const stylesheet = `
                body { font-family: "Noto Sans KR", Arial, sans-serif; line-height: 1.6; padding: 20px; }
                .h1 { font-size: 24px; font-weight: bold; margin: 20px 0; color: #1f2937; }
                .h2 { font-size: 18px; font-weight: bold; margin: 16px 0; color: #374151; }
                .meta { font-size: 12px; color: #6b7280; margin: 8px 0; }
                .chip { display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 12px; font-size: 11px; margin: 2px; }
                .kw { background: #fef3c7; color: #92400e; font-weight: bold; padding: 2px 4px; }
                .sent { margin: 20px 0; padding: 12px; border-left: 3px solid #e5e7eb; }
                .ts { font-size: 10px; color: #9ca3af; }
                nav ol { list-style: decimal; padding-left: 20px; }
                nav li { margin: 8px 0; }
                nav a { text-decoration: none; color: #3b82f6; }
                nav a:hover { text-decoration: underline; }
                audio { width: 100%; margin: 10px 0; }
            `;

            // 표지
            const coverHtml = `
                <div>
                    <div class="h1">${title}</div>
                    <div class="meta">Generated by ${author}</div>
                    ${audioDataUri ? `<audio controls src="${audioDataUri}"></audio>` : ""}
                    <div class="meta">Report Link: <a href="${reportLink}">${reportLink}</a></div>
                    <div class="h2">Keywords</div>
                    <div>
                        ${(keywords || []).map((k: string) => `<span class="chip">${k}</span>`).join(" ")}
                    </div>
                </div>
            `;

            // TOC (문장 링크)
            const tocHtml = `
                <div>
                    <div class="h2">Table of Contents</div>
                    <nav>
                        <ol>
                            ${sentences.map((s, i) => {
                                const text = s.length > 90 ? s.slice(0, 90) + "…" : s;
                                const ts = sentenceTimestamps[i] 
                                    ? `<span class="ts"> [${formatTimestamp(sentenceTimestamps[i].start)}–${formatTimestamp(sentenceTimestamps[i].end)}]</span>` 
                                    : "";
                                return `<li><a href="#${destIds[i]}">${i + 1}. ${text}</a>${ts}</li>`;
                            }).join("")}
                        </ol>
                    </nav>
                </div>
            `;

            // 본문
            const bodyHtml = `
                <div>
                    <div class="h2">Report</div>
                    ${sentences.map((s, i) => {
                        const ts = sentenceTimestamps[i] 
                            ? ` [${formatTimestamp(sentenceTimestamps[i].start)}–${formatTimestamp(sentenceTimestamps[i].end)}]` 
                            : "";
                        const found = (keywords || []).filter((k: string) => 
                            s.toLowerCase().includes(k.toLowerCase())
                        );
                        const keywordRegex = new RegExp(`\\b(${(keywords || []).join("|")})\\b`, "gi");
                        return `
                            <section id="${destIds[i]}" class="sent">
                                <div class="meta">¶ ${i + 1}${ts}</div>
                                <p>${s.replace(keywordRegex, '<span class="kw">$1</span>')}</p>
                                ${found.length ? `<div>${found.slice(0, 6).map((k: string) => `<span class="chip">${k}</span>`).join(" ")}</div>` : ""}
                            </section>
                        `;
                    }).join("\n")}
                </div>
            `;

            // epub-gen 패키지 사용 (CommonJS)
            const epubGen = require("epub-gen");
            const Epub = epubGen.default || epubGen;
            const fs = await import("fs");
            const path = await import("path");
            const os = await import("os");

            // 임시 파일 경로
            const tempDir = os.tmpdir();
            const epubPath = path.join(tempDir, `AIReport_${reportId}.epub`);

            // EPUB 옵션 (epub-gen API에 맞게)
            const options: any = {
                title,
                author,
                publisher: "YAGO SPORTS",
                cover: undefined,
                verbose: false,
                content: [
                    { title: "Cover", data: coverHtml },
                    { title: "Contents", data: tocHtml },
                    { title: "Report", data: bodyHtml }
                ],
                css: stylesheet,
                version: 3
            };

            // EPUB 생성 (epub-gen API)
            const book = new Epub(options, epubPath);
            await book.promise;

            // 파일 읽어서 응답
            const buf = fs.readFileSync(epubPath);
            
            // 임시 파일 삭제
            try {
                fs.unlinkSync(epubPath);
            } catch (e) {
                logger.warn("임시 파일 삭제 실패:", e);
            }

            res.setHeader("Content-Type", "application/epub+zip");
            res.setHeader("Content-Disposition", `attachment; filename=AIReport_${reportId}.epub`);
            res.status(200).send(buf);

        } catch (e: any) {
            logger.error("EPUB 생성 오류:", e);
            res.status(500).send(e?.message || "EPUB generation failed");
        }
    }
);

