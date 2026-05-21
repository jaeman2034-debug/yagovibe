import fs from "fs";

const ANALYTICS_LOG = "analytics.log";

// 📊 간단한 분석 함수
export function logEvent(event, data = {}) {
  const timestamp = Date.now();
  const logLine = `${timestamp},${event},${JSON.stringify(data)}\n`;
  
  try {
    fs.appendFileSync(ANALYTICS_LOG, logLine);
  } catch (error) {
    console.error("Analytics 로그 실패:", error);
  }
}

// 📈 7일 지표 계산
export function getMetrics(days = 7) {
  if (!fs.existsSync(ANALYTICS_LOG)) {
    return {
      appOpen: 0,
      voiceClick: 0,
      searchSuccess: 0,
      searchFailure: 0,
      navigationClick: 0,
    };
  }

  const logs = fs.readFileSync(ANALYTICS_LOG, "utf-8").split("\n").filter(Boolean);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  const metrics = {
    appOpen: 0,
    voiceClick: 0,
    searchSuccess: 0,
    searchFailure: 0,
    navigationClick: 0,
  };

  logs.forEach((line) => {
    const [timestamp, event] = line.split(",");
    if (parseInt(timestamp) < cutoff) return;

    switch (event) {
      case "app_open":
        metrics.appOpen++;
        break;
      case "voice_button_click":
        metrics.voiceClick++;
        break;
      case "search_success":
        metrics.searchSuccess++;
        break;
      case "search_failure":
        metrics.searchFailure++;
        break;
      case "navigation_click":
        metrics.navigationClick++;
        break;
    }
  });

  return metrics;
}

// 📊 지표 요약
export function getSummary(days = 7) {
  const metrics = getMetrics(days);
  
  const voiceClickRate = metrics.appOpen > 0 
    ? (metrics.voiceClick / metrics.appOpen * 100).toFixed(1)
    : 0;
  
  const totalSearches = metrics.searchSuccess + metrics.searchFailure;
  const searchSuccessRate = totalSearches > 0
    ? (metrics.searchSuccess / totalSearches * 100).toFixed(1)
    : 0;
  
  const navigationClickRate = metrics.searchSuccess > 0
    ? (metrics.navigationClick / metrics.searchSuccess * 100).toFixed(1)
    : 0;

  return {
    ...metrics,
    voiceClickRate: `${voiceClickRate}%`,
    searchSuccessRate: `${searchSuccessRate}%`,
    navigationClickRate: `${navigationClickRate}%`,
    verdict: {
      voiceClick: voiceClickRate >= 40 ? "✅" : "❌",
      searchSuccess: searchSuccessRate >= 70 ? "✅" : "❌",
      navigation: navigationClickRate >= 20 ? "✅" : "❌",
    },
  };
}
