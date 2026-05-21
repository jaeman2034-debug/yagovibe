import { generateMonthlyReportForTeam } from "../src/monthlyReportPDFGenerator";

(async () => {
  console.log("=== PDF 로컬 테스트 시작 ===");
  await generateMonthlyReportForTeam("TEST_TEAM_ID");
  console.log("=== PDF 로컬 테스트 완료 ===");
})();
