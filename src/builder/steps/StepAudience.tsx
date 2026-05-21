/**
 * StepAudience
 * Step 3: 참가 대상 선택
 */

import { useBuilder } from "../BuilderContext";
import SelectCard from "../components/SelectCard";
import StepShell from "../components/StepShell";
import WizardFooter from "../components/WizardFooter";
import { audiences } from "../data/builderData";
import { AlertCircle } from "lucide-react";

export default function StepAudience() {
  const { values, setValues, next, back, error, setError } = useBuilder();

  const handleNext = () => {
    if (!values.audience) {
      setError("참가 대상을 선택해주세요");
      return;
    }
    setError(null);
    next();
  };

  return (
    <StepShell
        stepNumber={4}
        totalSteps={7}
        title="참가 대상을 선택하세요"
        description="참가 대상에 따라 맞춤형 서비스가 제공됩니다"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {audiences.map((audience) => (
            <SelectCard
              key={audience.id}
              selected={values.audience === audience.id}
              onClick={() => {
                setValues({ ...values, audience: audience.id });
                setError(null); // 선택 시 에러 초기화
              }}
            >
              <div className="text-left">
                <div className="font-bold text-lg text-gray-900 dark:text-white mb-1">
                  {audience.label}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {audience.description}
                </div>
              </div>
            </SelectCard>
          ))}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm mt-4">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <WizardFooter
          onNext={handleNext}
          onBack={back}
        />
      </StepShell>
  );
}
