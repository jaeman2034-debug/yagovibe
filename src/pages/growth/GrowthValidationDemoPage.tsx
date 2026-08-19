/**
 * `/growth/demo` — YAGO Growth Validation Console (Step 1~5) 심사·데모 전용
 */
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AIGrowthValidationConsole from "@/pages/team/AIGrowthValidationConsole";
import {
  GROWTH_ACADEMY_DEMO_TEAM_ID,
  growthValidationDemoLoginPath,
} from "@/lib/growth/growthPublicDemoConfig";

export default function GrowthValidationDemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-slate-100">
      <header className="border-b border-violet-200/80 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1000px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            to="/growth"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-800 hover:text-violet-950"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            /growth 데모 홈
          </Link>
          <p className="text-[10px] text-violet-700 sm:text-xs">
            Whisper · AI 태깅 · 코치 검증 · FII · PDF
          </p>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1000px] px-3 py-4 sm:px-6 sm:py-6">
        <AIGrowthValidationConsole
          teamId={GROWTH_ACADEMY_DEMO_TEAM_ID}
          teamName="YAGO Growth Demo"
          demoAutoIngestOnSampleSelect
        />
        <p className="mt-4 text-center text-[11px] text-slate-500">
          데모 팀 ID: <code className="text-[10px]">{GROWTH_ACADEMY_DEMO_TEAM_ID}</code>
          {" · "}
          실제 Whisper·PDF 연동은 로그인 계정이 데모 팀 코치/운영진이어야 합니다.{" "}
          <Link to={growthValidationDemoLoginPath()} className="text-violet-700 underline">
            데모 계정으로 로그인
          </Link>
        </p>
      </main>
    </div>
  );
}
