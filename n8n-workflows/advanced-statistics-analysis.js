// n8n Code Node: 고급 통계 분석 및 요약
// 📁 파일명: advanced-statistics-analysis.js

// 고급 통계 분석 함수
const logs = items[0].json.documents || [];
const today = new Date().toISOString().split('T')[0];

// 기본 통계
const intents = {};
const keywords = {};
const hourlyStats = {};
const dailyStats = {};

// 각 로그 분석
for (const log of logs) {
    const intent = log.fields.intent?.stringValue || '미확인';
    const keyword = log.fields.keyword?.stringValue || '';
    const timestamp = log.fields.ts?.timestampValue || '';

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

    // 요일별 통계
    if (timestamp) {
        const dayOfWeek = new Date(timestamp).getDay();
        const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
        dailyStats[dayNames[dayOfWeek]] = (dailyStats[dayNames[dayOfWeek]] || 0) + 1;
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

// 가장 활발한 요일
const peakDay = Object.entries(dailyStats)
    .sort(([, a], [, b]) => b - a)[0];

// 성공률 계산 (미확인 제외)
const totalCommands = logs.length;
const successfulCommands = logs.filter(log =>
    log.fields.intent?.stringValue !== '미확인'
).length;
const successRate = totalCommands > 0 ? (successfulCommands / totalCommands * 100).toFixed(1) : 0;

// 통계 요약 객체
const summary = {
    date: today,
    total: totalCommands,
    successful: successfulCommands,
    successRate: `${successRate}%`,
    intents,
    topKeywords,
    peakHour: peakHour ? `${peakHour[0]}시 (${peakHour[1]}건)` : '데이터 없음',
    peakDay: peakDay ? `${peakDay[0]} (${peakDay[1]}건)` : '데이터 없음',
    hourlyStats,
    dailyStats
};

return [{ json: summary }];
