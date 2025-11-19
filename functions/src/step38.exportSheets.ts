import { onRequest } from "firebase-functions/v2/https";
import { BigQuery } from "@google-cloud/bigquery";
import { google } from "googleapis";

const bq = new BigQuery();
const DATASET = "yago_reports";
const TABLE = "quality_metrics";

/**
 * Step 38: BigQuery → Google Sheets 동기화
 * POST /exportQualityToSheets
 * 최근 30일간 일별 통계를 Google Sheets에 업데이트
 */
export const exportQualityToSheets = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const SHEET_ID = process.env.SHEETS_ID;
            const GOOGLE_CREDENTIALS_JSON = process.env.GOOGLE_CREDENTIALS_JSON;

            if (!SHEET_ID) {
                res.status(400).json({ error: "SHEETS_ID 환경 변수가 필요합니다" });
                return;
            }

            if (!GOOGLE_CREDENTIALS_JSON) {
                res.status(400).json({ error: "GOOGLE_CREDENTIALS_JSON 환경 변수가 필요합니다" });
                return;
            }

            console.log("📊 Google Sheets 동기화 시작...");

            // BigQuery에서 최근 30일간 일별 통계 조회
            const [rows] = await bq.query({
                query: `
                    SELECT 
                        DATE(created_at) as date, 
                        AVG(overallScore) as avg_score,
                        AVG(coverage) as avg_coverage,
                        SUM(gaps) as total_gaps,
                        SUM(overlaps) as total_overlaps
                    FROM \`${DATASET}.${TABLE}\`
                    WHERE created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
                    GROUP BY date 
                    ORDER BY date ASC
                `,
            });

            // Google Sheets 인증
            const SERVICE_ACCOUNT = JSON.parse(GOOGLE_CREDENTIALS_JSON);
            const auth = new google.auth.GoogleAuth({
                credentials: SERVICE_ACCOUNT,
                scopes: ["https://www.googleapis.com/auth/spreadsheets"],
            });

            const sheets = google.sheets({ version: "v4", auth });

            // 데이터 준비
            const values: any[][] = [["Date", "AvgScore", "Coverage", "Gaps", "Overlaps"]];
            rows.forEach((r: any) => {
                const dateValue = r.date?.value || r.date;
                values.push([
                    dateValue ? new Date(dateValue).toISOString().split("T")[0] : "",
                    (r.avg_score || 0).toFixed(2),
                    ((r.avg_coverage || 0) * 100).toFixed(1),
                    r.total_gaps || 0,
                    r.total_overlaps || 0,
                ]);
            });

            // Google Sheets 업데이트
            await sheets.spreadsheets.values.update({
                spreadsheetId: SHEET_ID,
                range: "Quality!A1",
                valueInputOption: "RAW",
                requestBody: { values },
            });

            console.log(`✅ Google Sheets 업데이트 완료: ${values.length - 1} 행`);

            res.status(200).json({ 
                ok: true,
                updated: values.length - 1,
                message: "Google Sheets 동기화 완료"
            });
        } catch (error: any) {
            console.error("❌ Google Sheets 동기화 오류:", error);
            res.status(500).json({ 
                error: error?.message || "Google Sheets export failed" 
            });
        }
    }
);

