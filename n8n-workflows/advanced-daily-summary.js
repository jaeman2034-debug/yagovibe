// n8n Code Node: 고급 일일 로그 요약 및 분석
// 📁 파일명: advanced-daily-summary.js

// Code Node: 고급 일일 로그 요약
const logs = items[0].json.documents || [];
const today = new Date().toISOString().split("T")[0];
const count = logs.length;

// Intent 통계
const intents = {};
const keywords = {};
const hourlyStats = {};

for (const log of logs) {
    const intent = log.fields.intent?.stringValue || "미확인";
    const keyword = log.fields.keyword?.stringValue || "";
    const timestamp = log.fields.ts?.timestampValue || "";

    // Intent 카운트
    intents[intent] = (intents[intent] || 0) + 1;

    // 키워드 카운트
    if (keyword) {
        keywords[keyword] = (keywords[keyword] || 0) + 1;
    }

    // 시간대별 통계
    if (timestamp) {
        const hour = new Date(timestamp).getHours();
        hourlyStats[hour] = (hourlyStats[hour] || 0) + 1;
    }
}

// 상위 키워드 Top 5
const topKeywords = Object.entries(keywords)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([keyword, count]) => ({ keyword, count }));

// 가장 활발한 시간대
const peakHour = Object.entries(hourlyStats)
    .sort(([, a], [, b]) => b - a)[0];

// AI 요약을 위한 데이터 준비
const summaryData = {
    date: today,
    total: count,
    intents,
    topKeywords,
    peakHour: peakHour ? `${peakHour[0]}시 (${peakHour[1]}건)` : "데이터 없음",
    hourlyStats
};

return [
    {
        json: {
            summary: summaryData,
            // Slack 메시지용 포맷팅
            slackMessage: `📊 [YAGO VIBE 일일 리포트]
🗓️ 날짜: ${today}
🎙️ 총 음성 명령: ${count}건

📈 Intent 통계:
${Object.entries(intents).map(([intent, count]) => `- ${intent}: ${count}`).join('\n')}

🔥 상위 키워드 Top 5:
${topKeywords.map(k => `- ${k.keyword}: ${k.count}회`).join('\n')}

⏰ 가장 활발한 시간: ${summaryData.peakHour}

📄 상세 리포트는 대시보드에서 확인하세요!`
        },
    },
];
