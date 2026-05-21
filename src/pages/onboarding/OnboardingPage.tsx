/**
 * 🔥 온보딩 페이지 컨트롤러
 * 
 * 역할:
 * - 현재 단계에 따라 적절한 Step 컴포넌트 렌더링
 * - 새로고침 / 앱 종료 / 재접속 시 이어서 진행
 * - 완료 시 onboardingCompleted = true
 * - A/B 실험 분기 처리
 */

import { useOnboarding } from "@/hooks/useOnboarding";
import { useAuthUser } from "@/hooks/useAuthUser";
import StepName from "./steps/StepName";
import StepPurpose from "./steps/StepPurpose";
import StepSport from "./steps/StepSport";
import StepRegion from "./steps/StepRegion";
import StepDone from "./steps/StepDone";

export default function OnboardingPage() {
  const { step, data, saveStep, goBack, complete, loading: onboardingLoading } = useOnboarding();
  const { profile, loading } = useAuthUser();
  
  // 🔥 로딩 중일 때 로딩 화면 표시
  if (loading || onboardingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }
  
  // 🔥 A/B 실험군 확인 (기본값: "A")
  const variant = profile?.experiment?.onboarding_v1 ?? "A";

  // 🔥 단계별 컴포넌트 렌더링
  // TODO: variant === "B"일 때 다른 컴포넌트 렌더링 가능
  // 예: if (variant === "B") return <OnboardingVariantB />;
  
  switch (step) {
    case 0:
      return <StepName variant={variant} data={data} saveStep={saveStep} />;
    case 1:
      return <StepPurpose variant={variant} data={data} saveStep={saveStep} goBack={goBack} />;
    case 2:
      return <StepSport variant={variant} data={data} saveStep={saveStep} goBack={goBack} />;
    case 3:
      return <StepRegion variant={variant} data={data} saveStep={saveStep} goBack={goBack} />;
    case 4:
      return <StepDone variant={variant} data={data} complete={complete} goBack={goBack} />;
    default:
      // 🔥 알 수 없는 단계면 처음부터 시작
      return <StepName variant={variant} data={data} saveStep={saveStep} />;
  }
}
