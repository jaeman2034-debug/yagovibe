/**
 * PAI-032 — ParentIntelligenceSection must not own VisionPlatformNav
 * (canonical owner = host page)
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("PAI-032 ParentIntelligenceSection Nav ownership", () => {
  const sectionPath = join(
    process.cwd(),
    "src/components/vision/parent/ParentIntelligenceSection.tsx"
  );
  const pagePath = join(process.cwd(), "src/pages/vision/ParentVisionReportPage.tsx");
  const growthPath = join(process.cwd(), "src/pages/profile/PlayerGrowthProfilePage.tsx");

  it("does not import or render VisionPlatformNav inside ParentIntelligenceSection", () => {
    const src = readFileSync(sectionPath, "utf8");
    expect(src).not.toMatch(/from ["']@\/components\/vision\/VisionPlatformNav["']/);
    expect(src).not.toMatch(/<VisionPlatformNav[\s>]/);
  });

  it("ParentVisionReportPage keeps page-level VisionPlatformNav", () => {
    const src = readFileSync(pagePath, "utf8");
    expect(src).toMatch(/VisionPlatformNav/);
    expect(src).toMatch(/current="parent-report"/);
  });

  it("PlayerGrowthProfilePage keeps page-level VisionPlatformNav with player-profile", () => {
    const src = readFileSync(growthPath, "utf8");
    expect(src).toMatch(/VisionPlatformNav/);
    expect(src).toMatch(/current="player-profile"/);
  });
});
