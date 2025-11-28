/**
 * 리포트 관련 Cloud Functions
 * 
 * 모든 리포트 생성 및 자동화 함수들을 그룹화하여 export
 */

export { generateWeeklyReportJob as generateWeeklyReportJobOld } from "../reportAutoGenerator";
export { generateWeeklyReportJob } from "../weeklyReportAI";
export { generateWeeklyReportAndEmail } from "../weeklyReportWithEmail";
export { generateMonthlyReportAndEmail } from "../monthlyReportAI";
export { generateAndSendMonthlyTeamReport } from "../teamReportAutomation";
export { generateVoiceAndPdfReport } from "../monthlyVoiceReportJob";
export { generatePlayerInsightReports } from "../playerInsightReportJob";
export { generateInsightChartReport } from "../insightChartReportJob";
export { notifyWeeklyReport } from "../reportNotifier";
export { generateOpsReport } from "../autoOpsReport";
export { selfLearningGovernance } from "../selfLearningGovernance";
export { runDigitalTwinSimulation } from "../digitalTwinSimulator";
export { generatePredictiveInsights } from "../predictiveInsightGenerator";
export { autonomousActionEngine } from "../autonomousActionEngine";
export { orchestrateAIModules } from "../orchestratorCore";

