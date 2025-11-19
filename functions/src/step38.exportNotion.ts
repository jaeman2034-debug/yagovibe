import { onRequest } from "firebase-functions/v2/https";
import { BigQuery } from "@google-cloud/bigquery";
import fetch from "node-fetch";

const bq = new BigQuery();
const DATASET = "yago_reports";
const TABLE = "quality_metrics";

/**
 * Step 38: BigQuery → Notion Database 동기화
 * POST /exportQualityToNotion
 * 최근 7일간 일별 통계를 Notion Database에 업데이트
 */
export const exportQualityToNotion = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const NOTION_DB = process.env.NOTION_DB;
            const NOTION_TOKEN = process.env.NOTION_TOKEN;

            if (!NOTION_DB) {
                res.status(400).json({ error: "NOTION_DB 환경 변수가 필요합니다" });
                return;
            }

            if (!NOTION_TOKEN) {
                res.status(400).json({ error: "NOTION_TOKEN 환경 변수가 필요합니다" });
                return;
            }

            console.log("📊 Notion 동기화 시작...");

            // BigQuery에서 최근 7일간 일별 통계 조회
            const [rows] = await bq.query({
                query: `
                    SELECT 
                        DATE(created_at) as date, 
                        AVG(overallScore) as avg_score,
                        AVG(coverage) as avg_coverage,
                        SUM(gaps) as total_gaps,
                        SUM(overlaps) as total_overlaps
                    FROM \`${DATASET}.${TABLE}\`
                    WHERE created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
                    GROUP BY date 
                    ORDER BY date ASC
                `,
            });

            let inserted = 0;
            const errors: string[] = [];

            // Notion Database에 각 날짜별로 페이지 생성
            for (const r of rows) {
                try {
                    const dateValue = r.date?.value || r.date;
                    const dateStr = dateValue ? new Date(dateValue).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];

                    const response = await fetch("https://api.notion.com/v1/pages", {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${NOTION_TOKEN}`,
                            "Content-Type": "application/json",
                            "Notion-Version": "2022-06-28",
                        },
                        body: JSON.stringify({
                            parent: { database_id: NOTION_DB },
                            properties: {
                                Date: {
                                    date: { start: dateStr }
                                },
                                "Average Score": {
                                    number: parseFloat((r.avg_score || 0).toFixed(2))
                                },
                                "Coverage": {
                                    number: parseFloat(((r.avg_coverage || 0) * 100).toFixed(1))
                                },
                                "Gaps": {
                                    number: r.total_gaps || 0
                                },
                                "Overlaps": {
                                    number: r.total_overlaps || 0
                                },
                            },
                        }),
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        errors.push(`날짜 ${dateStr}: ${errorText}`);
                        console.error(`❌ Notion 페이지 생성 실패 (${dateStr}):`, errorText);
                    } else {
                        inserted++;
                        console.log(`✅ Notion 페이지 생성 완료: ${dateStr}`);
                    }
                } catch (error: any) {
                    errors.push(`날짜 ${r.date?.value || r.date}: ${error?.message || "Unknown error"}`);
                    console.error(`❌ Notion 페이지 생성 오류:`, error);
                }
            }

            console.log(`✅ Notion 동기화 완료: ${inserted}/${rows.length} 페이지 생성`);

            res.status(200).json({ 
                ok: true,
                inserted,
                total: rows.length,
                errors: errors.length > 0 ? errors : undefined,
                message: "Notion 동기화 완료"
            });
        } catch (error: any) {
            console.error("❌ Notion 동기화 오류:", error);
            res.status(500).json({ 
                error: error?.message || "Notion export failed" 
            });
        }
    }
);

