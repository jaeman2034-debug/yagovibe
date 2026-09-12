import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("MIGRATION 1B weekly report export wiring", () => {
  it("exports generateWeeklyReport via reporting barrel and index lazy list", () => {
    const root = process.cwd();
    const reporting = readFileSync(path.join(root, "functions/src/exports/reporting.ts"), "utf8");
    const index = readFileSync(path.join(root, "functions/index.ts"), "utf8");
    expect(reporting).toContain('export { generateWeeklyReport } from "../generateWeeklyReport"');
    expect(index).toContain('"generateWeeklyReport"');
  });

  it("HTTP handler returns summary in generateReportLogic success payload", () => {
    const root = process.cwd();
    const src = readFileSync(path.join(root, "functions/src/generateWeeklyReport.ts"), "utf8");
    expect(src).toContain("summary,");
  });
});
