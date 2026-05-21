/**
 * BuilderPage
 * YAGO Builder 메인 페이지
 * 
 * 협회/아카데미/클럽 생성 Wizard
 */

import { BuilderProvider, useBuilder } from "./BuilderContext";
import StepName from "./steps/StepName";
import StepSport from "./steps/StepSport";
import StepAudience from "./steps/StepAudience";
import StepHero from "./steps/StepHero";
import StepTemplate from "./steps/StepTemplate";
import StepReview from "./steps/StepReview";
import ProgressBar from "./components/ProgressBar";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

function BuilderContent() {
  const { step } = useBuilder();
  const TOTAL_STEPS = 7;

  return (
    <>
      {/* 진행 바 */}
      <ProgressBar currentStep={step} totalSteps={TOTAL_STEPS} />

      {/* Step 콘텐츠 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 md:p-10">
        {step === 0 || step === 1 ? (
          <StepName />
        ) : step === 2 ? (
          <StepSport />
        ) : step === 3 ? (
          <StepAudience />
        ) : step === 4 ? (
          <StepHero />
        ) : step === 5 ? (
          <StepTemplate />
        ) : step === 6 ? (
          <StepReview />
        ) : null}
      </div>
    </>
  );
}

export default function BuilderPage() {
  const navigate = useNavigate();

  return (
    <BuilderProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-start justify-center pt-16 pb-12">
        <div className="container mx-auto px-4 w-full max-w-2xl">
          {/* 헤더 */}
          <div className="mb-8 text-center">
            <button
              onClick={() => navigate("/admin")}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6 inline-flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              관리자 콘솔로 돌아가기
            </button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              협회 생성
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              몇 단계만 입력하면 협회 홈페이지가 자동으로 생성됩니다
            </p>
          </div>

          {/* Wizard 콘텐츠 */}
          <BuilderContent />
        </div>
      </div>
    </BuilderProvider>
  );
}
